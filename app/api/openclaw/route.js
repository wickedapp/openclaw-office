/**
 * OpenClaw Integration API
 * 
 * Endpoints for agent assignment and status
 */

import { createRequest, updateRequest, getRequestById, addEvent, incrementMessages, findByTgMessageId, findOldestReceived } from '../../../lib/db.js'
import { eventBus, EVENTS } from '../../../lib/event-bus.js'
import { AGENTS, STATE_CONFIG } from '../../../lib/workflow.js'
import { sendTelegramNotification, formatDelegationNotification } from '../../../lib/telegram.js'
import { getStatus, setCurrentRequest, getCurrentRequest } from '../../../lib/openclaw-ws.js'

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  })
}

function createDashboardEvent(requestId, state, agent, message) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    requestId,
    state,
    agent,
    agentColor: AGENTS[agent]?.color || '#888',
    agentName: AGENTS[agent]?.name || agent,
    message,
    time: timeStr(),
    timestamp: Date.now(),
  }
  addEvent(event)
  eventBus.emit(EVENTS.WORKFLOW_EVENT, event)
  return event
}

function emitRequestUpdate(requestId) {
  const req = getRequestById(requestId)
  if (req) {
    eventBus.emit(EVENTS.REQUEST_UPDATE, req)
  }
}

export async function GET() {
  return Response.json({
    status: 'ok',
    websocket: getStatus(),
    currentRequest: getCurrentRequest(),
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    
    // ─────────────────────────────────────────────────────────
    // ACTION: assign - Assign task to an agent (triggers animation)
    // ─────────────────────────────────────────────────────────
    if (action === 'assign') {
      const { agent, reason, content, messageId, notify = false, notifyDetails = [] } = body
      
      if (!agent) {
        return Response.json({ error: 'agent is required' }, { status: 400 })
      }
      
      // Find or create the request
      let req = null
      
      // Try to find by messageId first
      if (messageId) {
        req = findByTgMessageId(messageId)
      }
      
      // Try current WebSocket request
      if (!req) {
        const currentId = getCurrentRequest()
        if (currentId) {
          req = getRequestById(currentId)
        }
      }
      
      // Try oldest received
      if (!req) {
        req = findOldestReceived()
      }
      
      // Create new if nothing found
      if (!req) {
        req = createRequest({
          id: `req_${Date.now()}`,
          content: content || 'Task assigned',
          from: 'Boss',
          state: 'received',
          assignedTo: null,
          task: null,
          createdAt: Date.now(),
          source: 'api',
        })
        incrementMessages('received')
        createDashboardEvent(req.id, 'received', 'wickedman', `📥 Request received`)
        emitRequestUpdate(req.id)
      }
      
      // Update content if provided
      if (content && req.content === 'Processing...') {
        updateRequest(req.id, { content: content.slice(0, 200) })
      }
      
      // Create task
      const task = {
        id: `task_${Date.now()}`,
        title: (content || req.content).slice(0, 50),
        detail: content || req.content,
        targetAgent: agent,
        reason: reason || 'Assigned by WickedMan',
      }
      
      updateRequest(req.id, { 
        state: 'task_created', 
        task,
        assignedTo: agent,
      })
      
      const agentInfo = AGENTS[agent] || { name: agent, emoji: '🤖' }
      createDashboardEvent(req.id, 'task_created', 'wickedman', 
        `📋 Task created → ${agentInfo.name}: ${reason || 'Assigned'}`)
      emitRequestUpdate(req.id)
      
      // Animate assignment after short delay
      setTimeout(() => {
        updateRequest(req.id, { state: 'assigned' })
        createDashboardEvent(req.id, 'assigned', agent, 
          `${agentInfo.emoji} ${agentInfo.name} received task`)
        emitRequestUpdate(req.id)
        
        // Move to in_progress
        setTimeout(() => {
          const current = getRequestById(req.id)
          if (current && current.state === 'assigned') {
            updateRequest(req.id, { state: 'in_progress' })
            createDashboardEvent(req.id, 'in_progress', agent, 
              `⚡ ${agentInfo.name} working...`)
            emitRequestUpdate(req.id)
          }
        }, 1500)
      }, 1000)
      
      // Send Telegram notification if requested
      if (notify && agent !== 'wickedman') {
        const notifyMsg = formatDelegationNotification(
          agentInfo.name,
          agentInfo.emoji,
          (content || req.content).slice(0, 100),
          notifyDetails
        )
        sendTelegramNotification(notifyMsg).catch(err => {
          console.error('[assign] Failed to send notification:', err)
        })
      }
      
      // Track this request for WebSocket events
      setCurrentRequest(req.id)
      
      return Response.json({
        success: true,
        requestId: req.id,
        agent,
        message: `Task assigned to ${agentInfo.name}`,
      })
    }
    
    // ─────────────────────────────────────────────────────────
    // ACTION: complete - Mark current task as complete
    // ─────────────────────────────────────────────────────────
    if (action === 'complete') {
      const { requestId, result, messageId } = body
      
      let req = null
      
      if (requestId) {
        req = getRequestById(requestId)
      } else if (messageId) {
        req = findByTgMessageId(messageId)
      } else {
        const currentId = getCurrentRequest()
        if (currentId) {
          req = getRequestById(currentId)
        }
      }
      
      if (!req) {
        return Response.json({ error: 'No active request found' }, { status: 404 })
      }
      
      updateRequest(req.id, { 
        state: 'completed', 
        completedAt: Date.now(),
        result: result || 'Completed',
      })
      
      const agent = req.assignedTo || 'wickedman'
      createDashboardEvent(req.id, 'completed', agent, 
        `✅ Completed: ${(result || 'Done').slice(0, 50)}`)
      emitRequestUpdate(req.id)
      
      setCurrentRequest(null)
      
      return Response.json({
        success: true,
        requestId: req.id,
      })
    }
    
    return Response.json({ error: 'Unknown action' }, { status: 400 })
    
  } catch (error) {
    console.error('[openclaw-api] Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
