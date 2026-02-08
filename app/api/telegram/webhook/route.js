// Telegram Webhook Handler for OpenClaw Office Dashboard
// With nginx mirror: receives webhook for dashboard display ONLY
// nginx handles forwarding to OpenClaw separately
//
// Flow: Telegram → nginx → OpenClaw Office (dashboard) + OpenClaw (processing)

import { createRequest, getRequestById, updateRequest, incrementMessages, addEvent, findByTgMessageId } from '../../../../lib/db'
import { eventBus, EVENTS } from '../../../../lib/event-bus'
import { AGENTS } from '../../../../lib/workflow'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const SECRET_HEADER = 'x-telegram-bot-api-secret-token'

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  })
}

function extractMessageText(update) {
  if (update.message?.text) return update.message.text
  if (update.edited_message?.text) return update.edited_message.text
  if (update.callback_query?.data) return `callback: ${update.callback_query.data}`
  if (update.message?.caption) return update.message.caption
  if (update.message?.photo) return '[Photo]'
  if (update.message?.video) return '[Video]'
  if (update.message?.document) return `[Document: ${update.message.document.file_name || 'file'}]`
  if (update.message?.voice) return '[Voice message]'
  if (update.message?.sticker) return `[Sticker: ${update.message.sticker.emoji || ''}]`
  return null
}

function extractMessageId(update) {
  return update.message?.message_id || 
         update.edited_message?.message_id || 
         update.callback_query?.message?.message_id ||
         null
}

function extractSenderName(update) {
  const from = update.message?.from || update.edited_message?.from || update.callback_query?.from
  if (!from) return 'Unknown'
  return from.first_name || from.username || `User ${from.id}`
}

function isFromBot(update) {
  const from = update.message?.from || update.edited_message?.from
  return from?.is_bot === true
}

function isCommand(text) {
  return text && text.startsWith('/')
}

function isSystemMessage(text) {
  if (!text) return false
  if (text.startsWith('callback:')) return true
  if (text.includes('HEARTBEAT')) return true
  if (text.startsWith('Read HEARTBEAT.md')) return true
  return false
}

export async function POST(request) {
  try {
    // Verify webhook secret
    const secret = request.headers.get(SECRET_HEADER)
    if (secret !== WEBHOOK_SECRET) {
      console.warn('[telegram-webhook] Invalid secret, rejecting')
      return new Response('Unauthorized', { status: 401 })
    }

    const update = await request.json()
    
    const text = extractMessageText(update)
    const sender = extractSenderName(update)
    const fromBot = isFromBot(update)
    const tgMessageId = extractMessageId(update)
    
    // Only create dashboard entries for real user messages
    if (text && !fromBot && !isCommand(text) && !isSystemMessage(text)) {
      
      // DEDUPLICATION: Check if we already have an entry for this message
      if (tgMessageId) {
        const existing = findByTgMessageId(tgMessageId)
        if (existing) {
          console.log(`[telegram-webhook] Skipping duplicate tg_message_id=${tgMessageId}`)
          return new Response('OK', { status: 200 })
        }
      }
      
      const content = text.length > 120 ? text.slice(0, 120) + '...' : text
      
      // Create "received" request for dashboard
      const req = createRequest({
        id: `req_${Date.now()}`,
        content,
        from: sender,
        state: 'received',
        assignedTo: null,
        task: null,
        createdAt: Date.now(),
        source: 'telegram_webhook',
        tgMessageId,
      })
      
      incrementMessages('received')
      
      // Create activity event
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        requestId: req.id,
        state: 'received',
        agent: 'wickedman',
        agentColor: AGENTS.wickedman?.color || '#888',
        agentName: AGENTS.wickedman?.name || 'WickedMan',
        message: `📥 Message from ${sender}: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        time: timeStr(),
        timestamp: Date.now(),
      }
      addEvent(event)
      
      // Push to SSE clients INSTANTLY
      eventBus.emit(EVENTS.WORKFLOW_EVENT, event)
      eventBus.emit(EVENTS.REQUEST_UPDATE, req)
      
      console.log(`[telegram-webhook] Dashboard: "${content.slice(0, 50)}..." from ${sender} (tg_id=${tgMessageId})`)
      
      // Auto-progress to "analyzing" after 800ms
      const reqId = req.id
      const contentForAnalyze = content // capture for closure
      setTimeout(() => {
        const current = getRequestById(reqId)
        if (current && current.state === 'received') {
          updateRequest(reqId, { state: 'analyzing' })
          
          const analyzeEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            requestId: reqId,
            state: 'analyzing',
            agent: 'wickedman',
            agentColor: AGENTS.wickedman?.color || '#888',
            agentName: AGENTS.wickedman?.name || 'WickedMan',
            message: `🔍 Analyzing: "${contentForAnalyze.slice(0, 50)}${contentForAnalyze.length > 50 ? '...' : ''}"`,
            time: timeStr(),
            timestamp: Date.now(),
          }
          addEvent(analyzeEvent)
          eventBus.emit(EVENTS.WORKFLOW_EVENT, analyzeEvent)
          const updated = getRequestById(reqId)
          if (updated) eventBus.emit(EVENTS.REQUEST_UPDATE, updated)
        }
      }, 800)
    }
    
    // NOTE: With nginx mirror, we do NOT forward to OpenClaw here
    // nginx already sends the webhook to OpenClaw directly
    
    return new Response('OK', { status: 200 })
    
  } catch (error) {
    console.error('[telegram-webhook] Error:', error)
    return new Response('OK', { status: 200 })
  }
}

export async function GET() {
  return Response.json({ 
    status: 'ok', 
    service: 'OpenClaw Office Telegram Webhook',
    timestamp: new Date().toISOString(),
  })
}
