// SSE Streaming endpoint for real-time workflow updates
// Replaces polling with persistent server-push connection

import { eventBus, EVENTS } from '../../../../lib/event-bus'
import { getEvents, getRequests, getActiveTasks } from '../../../../lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const encoder = new TextEncoder()
  let alive = true

  const stream = new ReadableStream({
    start(controller) {
      const send = (eventType, data) => {
        if (!alive) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch (e) {
          // Client disconnected
          alive = false
          cleanup()
        }
      }

      // Send initial snapshot so client has full state immediately
      // Include ALL recent requests (not just active) so client can reconcile completed states
      try {
        const events = getEvents(50)
        const allRecent = getRequests(20, false)
        const now = Date.now()
        const recentRequests = allRecent.filter(r => (now - r.createdAt) < 120000)
        const tasks = getActiveTasks(20)
        send('snapshot', { events, requests: recentRequests, tasks })
      } catch (e) {
        console.error('[SSE] Failed to send snapshot:', e.message)
      }

      // Listen for new workflow events
      const onWorkflowEvent = (event) => send('activity', event)
      const onRequestUpdate = (request) => send('request', request)
      const onTaskUpdate = (task) => send('task', task)
      const onMessage = (message) => send('message', message)

      eventBus.on(EVENTS.WORKFLOW_EVENT, onWorkflowEvent)
      eventBus.on(EVENTS.REQUEST_UPDATE, onRequestUpdate)
      eventBus.on(EVENTS.TASK_UPDATE, onTaskUpdate)
      eventBus.on(EVENTS.MESSAGE, onMessage)

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        if (!alive) {
          clearInterval(heartbeat)
          return
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch (e) {
          alive = false
          cleanup()
        }
      }, 15000)

      function cleanup() {
        alive = false
        clearInterval(heartbeat)
        eventBus.off(EVENTS.WORKFLOW_EVENT, onWorkflowEvent)
        eventBus.off(EVENTS.REQUEST_UPDATE, onRequestUpdate)
        eventBus.off(EVENTS.TASK_UPDATE, onTaskUpdate)
        eventBus.off(EVENTS.MESSAGE, onMessage)
      }

      // Handle client disconnect
      // Note: ReadableStream cancel is called when client disconnects
    },
    cancel() {
      alive = false
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx/CF buffering
    },
  })
}
