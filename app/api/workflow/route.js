// Workflow API for OpenClaw Office
// Refactored to task-driven architecture
// Request = incoming message record (immutable after creation)
// Task = work unit with independent lifecycle (pending → assigned → in_progress → completed/failed)

import { analyzeTask, AGENTS, STATE_CONFIG } from '../../../lib/workflow'
import { sendTelegramNotification, formatDelegationNotification } from '../../../lib/telegram'
import { 
  createRequest, 
  updateRequest, 
  getRequestById, 
  getRequests, 
  addEvent, 
  getEvents,
  getEventsPaginated,
  incrementMessages,
  addTokens,
  recordTaskCompletion,
  findOldestReceived,
  findByTgMessageId,
  findLastCompletedInChain,
  completeAllActive,
  fixPlaceholderEvents,
  repairAllPlaceholderEvents,
  createTask,
  updateTask,
  getTaskById,
  getTaskByRequestId,
  getActiveTaskByAgent,
  getActiveTasks,
  getRecentTasks,
  completeAllActiveTasks,
} from '../../../lib/db'
import { eventBus, EVENTS } from '../../../lib/event-bus'

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  })
}

function createEvent(requestId, state, agent, message, extra = {}) {
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
    ...extra,
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

function emitTaskUpdate(taskId) {
  const task = getTaskById(taskId)
  if (task) {
    eventBus.emit(EVENTS.TASK_UPDATE, task)
    // Also emit request update for backward compat (syncs request state from task)
    if (task.requestId) {
      syncRequestStateFromTask(task)
      emitRequestUpdate(task.requestId)
    }
  }
}

// Keep request.state in sync with task.status for backward compatibility
// This ensures the frontend (which reads request state) still works
function syncRequestStateFromTask(task) {
  if (!task || !task.requestId) return
  const stateMap = {
    pending: 'received',
    assigned: 'assigned',
    in_progress: 'in_progress',
    completed: 'completed',
    failed: 'completed',
  }
  const newState = stateMap[task.status] || task.status
  const updates = { state: newState, assignedTo: task.assignedAgent }
  if (task.status === 'in_progress') updates.workStartedAt = task.startedAt || Date.now()
  if (task.status === 'completed' || task.status === 'failed') {
    updates.completedAt = task.completedAt || Date.now()
    updates.result = task.result
  }
  updateRequest(task.requestId, updates)
}

function cleanContent(content) {
  return (content || '').replace(/^\[Telegram[^\]]*\]\s*/s, '').replace(/\[message_id:\s*\d+\]\s*$/, '').trim()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  if (type === 'events') {
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const result = getEventsPaginated(limit, offset)
    return Response.json(result)
  }
  
  if (type === 'active') {
    const active = getRequests(10, true)
    return Response.json({ requests: active })
  }

  if (type === 'tasks') {
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const activeOnly = searchParams.get('active') === 'true'
    const tasks = activeOnly ? getActiveTasks(limit) : getRecentTasks(limit)
    return Response.json({ tasks })
  }
  
  return Response.json({ 
    requests: getRequests(20),
    events: getEvents(30),
    tasks: getRecentTasks(10),
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    
    // ─────────────────────────────────────────────────────────
    // ACTION: start_flow - Called when agent starts processing
    // Creates request + task. Returns both IDs.
    // ─────────────────────────────────────────────────────────
    if (action === 'start_flow') {
      const { content, from = 'Boss', agent = 'wickedman', messageId, delegatedTo } = body
      
      if (!content) {
        return Response.json({ error: 'content is required' }, { status: 400 })
      }

      // Chain support: auto-generate chainId if not provided
      const chainId = body.chainId || `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      
      // Check if this is a chain continuation (existing chainId with completed requests)
      const previousInChain = body.chainId ? findLastCompletedInChain(body.chainId) : null
      const isChainContinuation = !!previousInChain

      const finalAgent = delegatedTo || agent
      const cleanText = cleanContent(content)
      
      // DEDUP: Check if we already have an entry for this message
      let req = null
      let adopted = false

      if (messageId) {
        req = findByTgMessageId(messageId)
        if (req) {
          adopted = true
          updateRequest(req.id, { assignedTo: finalAgent, content: content || req.content, chainId })
          if (content) {
            fixPlaceholderEvents(req.id, content)
            createEvent(req.id, 'received', 'wickedman', `📥 Request from ${from}: "${cleanText.slice(0, 60)}${cleanText.length > 60 ? '...' : ''}"`)
          }
        }
      }

      // FIFO fallback
      if (!req) {
        const placeholder = findOldestReceived()
        if (placeholder && (placeholder.state === 'received' || placeholder.state === 'analyzing')) {
          req = placeholder
          adopted = true
          updateRequest(placeholder.id, { assignedTo: finalAgent, content: content || placeholder.content, tgMessageId: messageId || null, chainId })
          if (content) {
            fixPlaceholderEvents(placeholder.id, content)
            createEvent(placeholder.id, 'received', 'wickedman', `📥 Request from Boss: "${cleanText.slice(0, 60)}${cleanText.length > 60 ? '...' : ''}"`)
          }
        }
      }

      // Create new request if no adoption
      if (!req) {
        req = createRequest({
          id: `req_${Date.now()}`,
          content,
          from,
          state: 'received',
          assignedTo: finalAgent,
          task: null,
          createdAt: Date.now(),
          tgMessageId: messageId || null,
          chainId,
        })
        incrementMessages('received')
        createEvent(req.id, 'received', 'wickedman', `📥 Request from ${from}: "${cleanText.slice(0, 60)}${cleanText.length > 60 ? '...' : ''}"`)
      }

      emitRequestUpdate(req.id)

      // Create Task with proper initial status
      const taskStatus = delegatedTo ? 'pending' : 'in_progress'
      const taskStartedAt = delegatedTo ? null : Date.now()
      const task = createTask({
        requestId: req.id,
        title: cleanText.slice(0, 80) + (cleanText.length > 80 ? '...' : ''),
        detail: cleanText,
        assignedAgent: finalAgent,
        status: taskStatus,
        createdAt: Date.now(),
        startedAt: taskStartedAt,
      })

      // Sync request state from task
      syncRequestStateFromTask(task)
      emitRequestUpdate(req.id)
      emitTaskUpdate(task.id)

      // Animation events (delayed for visual effect)
      // For chain continuations, add extra delay for return animation + reviewing
      const chainDelay = isChainContinuation ? 2500 : 0
      const previousAgent = previousInChain?.assignedTo || null

      if (delegatedTo && delegatedTo !== 'wickedman') {
        // Chain continuation: emit return animation event first
        if (isChainContinuation && previousAgent) {
          // Immediately emit chain_continue event so frontend can show return mail
          eventBus.emit(EVENTS.WORKFLOW_EVENT, {
            id: `evt_chain_${Date.now()}`,
            requestId: req.id,
            state: 'chain_return',
            agent: previousAgent,
            agentColor: AGENTS[previousAgent]?.color || '#888',
            agentName: AGENTS[previousAgent]?.name || previousAgent,
            message: `📨 ${AGENTS[previousAgent]?.name || previousAgent} returning results to WickedMan`,
            targetAgent: 'wickedman',
            time: timeStr(),
            timestamp: Date.now(),
            chainId,
          })

          // After return animation, show WickedMan reviewing
          setTimeout(() => {
            const t = getTaskById(task.id)
            if (!t || t.status === 'completed' || t.status === 'failed') return
            updateRequest(req.id, { state: 'reviewing' })
            createEvent(req.id, 'reviewing', 'wickedman', `🔄 Reviewing results from ${AGENTS[previousAgent]?.name || previousAgent}...`)
            emitRequestUpdate(req.id)
          }, 1500)
        }

        // DELEGATION FLOW animations (with chainDelay offset)
        setTimeout(() => {
          const t = getTaskById(task.id)
          if (!t || t.status === 'completed' || t.status === 'failed') return
          updateRequest(req.id, { state: 'analyzing' })
          createEvent(req.id, 'analyzing', 'wickedman', `🔍 Analyzing: "${cleanText.slice(0, 50)}${cleanText.length > 50 ? '...' : ''}"`)
          emitRequestUpdate(req.id)
        }, chainDelay + 500)

        setTimeout(() => {
          const t = getTaskById(task.id)
          if (!t || t.status === 'completed' || t.status === 'failed') return
          updateRequest(req.id, { state: 'task_created', task: { id: task.id, title: task.title, detail: task.detail, targetAgent: delegatedTo } })
          createEvent(req.id, 'task_created', 'wickedman', `📋 Task → ${AGENTS[delegatedTo]?.emoji || '🤖'} ${AGENTS[delegatedTo]?.name || delegatedTo}: "${task.title}"`)
          emitRequestUpdate(req.id)
        }, chainDelay + 1200)

        setTimeout(() => {
          const t = getTaskById(task.id)
          if (!t || t.status === 'completed' || t.status === 'failed') return
          updateTask(task.id, { status: 'assigned' })
          updateRequest(req.id, { state: 'assigned', assignedTo: delegatedTo })
          createEvent(req.id, 'assigned', delegatedTo, `📧 ${AGENTS[delegatedTo]?.emoji || '🤖'} ${AGENTS[delegatedTo]?.name || delegatedTo} taking over`)
          emitRequestUpdate(req.id)
          emitTaskUpdate(task.id)
        }, chainDelay + 1800)

        setTimeout(() => {
          const t = getTaskById(task.id)
          if (!t || t.status === 'completed' || t.status === 'failed') return
          updateTask(task.id, { status: 'in_progress', startedAt: Date.now() })
          syncRequestStateFromTask(getTaskById(task.id))
          createEvent(req.id, 'in_progress', delegatedTo, `⚡ ${AGENTS[delegatedTo]?.name || delegatedTo} working...`)
          emitRequestUpdate(req.id)
          emitTaskUpdate(task.id)
        }, chainDelay + 3500)
      } else {
        // SELF-HANDLED: analyzing animation then WS handles rest
        setTimeout(() => {
          const t = getTaskById(task.id)
          if (!t || t.status === 'completed' || t.status === 'failed') return
          updateRequest(req.id, { state: 'analyzing' })
          createEvent(req.id, 'analyzing', 'wickedman', `🔍 Analyzing: "${cleanText.slice(0, 50)}${cleanText.length > 50 ? '...' : ''}"`)
          emitRequestUpdate(req.id)
        }, 500)
      }

      console.log(`[start_flow] ${adopted ? 'Adopted' : 'Created'} request ${req.id}, task ${task.id}: "${cleanText.slice(0, 50)}..." → ${finalAgent}${delegatedTo ? ' (delegated)' : ''}${isChainContinuation ? ` (chain continuation from ${previousAgent})` : ''}`)

      return Response.json({
        success: true,
        requestId: req.id,
        taskId: task.id,
        chainId,
        adopted,
        message: `Request created: ${content.slice(0, 50)}... → ${AGENTS[finalAgent]?.name || finalAgent}`,
        agent: finalAgent,
        delegated: !!delegatedTo,
        chainContinuation: isChainContinuation,
        previousAgent,
      })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: agent_complete - Complete active task by agent ID
    // Finds the active task for that agent and marks it completed.
    // ─────────────────────────────────────────────────────────
    if (action === 'agent_complete') {
      const { agent, result, success = true } = body
      if (!agent) return Response.json({ error: 'agent is required' }, { status: 400 })

      const task = getActiveTaskByAgent(agent)
      if (!task) return Response.json({ success: true, message: `No active task for ${agent}`, noop: true })
      if (task.status === 'completed' || task.status === 'failed') {
        return Response.json({ success: true, message: 'Task already completed', noop: true })
      }

      const completedAt = Date.now()
      const taskTimeMs = task.startedAt ? completedAt - task.startedAt : 5000
      
      updateTask(task.id, {
        status: success ? 'completed' : 'failed',
        completedAt,
        result: result || (success ? 'Completed' : 'Failed'),
      })
      emitTaskUpdate(task.id)

      const savings = recordTaskCompletion(agent, taskTimeMs)
      incrementMessages('sent')

      const agentName = AGENTS[agent]?.name || agent
      const emoji = success ? '✅' : '❌'
      const title = cleanContent(task.title || task.detail || '')
      createEvent(task.requestId, 'completed', agent, `${emoji} ${agentName} completed: "${title.slice(0, 50)}${title.length > 50 ? '...' : ''}"`)

      // Chain: emit return-to-WickedMan animation after agent completes
      // This shows the result flowing back to WickedMan (the orchestrator)
      if (task.requestId && agent !== 'wickedman') {
        const req = getRequestById(task.requestId)
        if (req) {
          setTimeout(() => {
            eventBus.emit(EVENTS.WORKFLOW_EVENT, {
              id: `evt_return_${Date.now()}`,
              requestId: task.requestId,
              state: 'chain_return',
              agent,
              agentColor: AGENTS[agent]?.color || '#888',
              agentName: AGENTS[agent]?.name || agent,
              message: `📨 ${agentName} returning results to WickedMan`,
              targetAgent: 'wickedman',
              time: timeStr(),
              timestamp: Date.now(),
            })
          }, 500)

          // Show WickedMan receiving + delivering
          setTimeout(() => {
            createEvent(task.requestId, 'delivering', 'wickedman', `📬 WickedMan received results from ${agentName}`)
            emitRequestUpdate(task.requestId)
          }, 2500)
        }
      }

      return Response.json({ success: true, requestId: task.requestId, taskId: task.id, savings, taskTimeMs })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: delegate_complete - Mark a delegated task as complete
    // By request ID or task ID
    // ─────────────────────────────────────────────────────────
    if (action === 'delegate_complete') {
      const { requestId, taskId, agent, result, success = true } = body
      
      let task = null
      if (taskId) {
        task = getTaskById(taskId)
      } else if (requestId) {
        task = getTaskByRequestId(requestId)
      }
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })

      if (task.status === 'completed' || task.status === 'failed') {
        return Response.json({ success: true, taskId: task.id, alreadyCompleted: true })
      }

      const completedAt = Date.now()
      const taskTimeMs = task.startedAt ? completedAt - task.startedAt : 5000

      updateTask(task.id, {
        status: success ? 'completed' : 'failed',
        completedAt,
        result: result || (success ? 'Completed' : 'Failed'),
      })
      emitTaskUpdate(task.id)

      const effectiveAgent = agent || task.assignedAgent || 'wickedman'
      const savings = recordTaskCompletion(effectiveAgent, taskTimeMs)
      incrementMessages('sent')

      const agentName = AGENTS[effectiveAgent]?.name || effectiveAgent
      const emoji = success ? '✅' : '❌'
      createEvent(task.requestId, 'completed', effectiveAgent, `${emoji} ${agentName} completed: "${(task.title || '').slice(0, 50)}"`)

      return Response.json({ success: true, requestId: task.requestId, taskId: task.id, savings, taskTimeMs })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: quick_flow - Full workflow in one call (for AI use)
    // Backward compatible — creates request + task
    // ─────────────────────────────────────────────────────────
    if (action === 'quick_flow') {
      const { content, from = 'Boss', agent, reason, autoComplete = true, workDurationMs = 5000, tokensInput = 0, tokensOutput = 0, notify = false, notifyDetails = [], messageId } = body
      
      if (!content || !agent) {
        return Response.json({ error: 'content and agent are required' }, { status: 400 })
      }
      
      // Send Telegram notification when delegating
      if (notify && agent !== 'wickedman') {
        const agentInfo = AGENTS[agent] || { name: agent, emoji: '🤖' }
        const notifyMsg = formatDelegationNotification(agentInfo.name, agentInfo.emoji, content.slice(0, 100), notifyDetails)
        sendTelegramNotification(notifyMsg).catch(err => console.error('[quick_flow] Notification failed:', err))
      }
      
      // Adopt or create request
      let req = null
      let webhookAdopted = false
      
      if (messageId) {
        req = findByTgMessageId(messageId)
        if (req) {
          webhookAdopted = true
          updateRequest(req.id, { assignedTo: agent })
        }
      }
      
      if (!req) {
        const pending = findOldestReceived()
        if (pending && (pending.state === 'received' || pending.state === 'analyzing')) {
          req = pending
          webhookAdopted = true
          updateRequest(req.id, { assignedTo: agent })
        }
      }
      
      if (!req) {
        req = createRequest({
          id: `req_${Date.now()}`,
          content, from,
          state: 'received',
          assignedTo: agent,
          task: null,
          createdAt: Date.now(),
        })
        incrementMessages('received')
        createEvent(req.id, 'received', 'wickedman', `📥 Request from ${from}: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`)
        emitRequestUpdate(req.id)
      }
      
      if (tokensInput > 0 || tokensOutput > 0) addTokens(tokensInput, tokensOutput)
      
      const requestId = req.id
      
      // Create task
      const task = createTask({
        requestId,
        title: content.slice(0, 80) + (content.length > 80 ? '...' : ''),
        detail: content,
        assignedAgent: agent,
        status: 'pending',
        createdAt: Date.now(),
      })
      
      const alreadyAnalyzing = webhookAdopted && req.state === 'analyzing'
      const baseDelay = alreadyAnalyzing ? 0 : (webhookAdopted ? 200 : 800)
      
      // Guard: check task status before advancing
      function canAdvanceTask(taskId) {
        const t = getTaskById(taskId)
        return t && t.status !== 'completed' && t.status !== 'failed'
      }

      // Analyzing
      if (!alreadyAnalyzing) {
        setTimeout(() => {
          if (!canAdvanceTask(task.id)) return
          updateRequest(requestId, { state: 'analyzing' })
          emitRequestUpdate(requestId)
          createEvent(requestId, 'analyzing', 'wickedman', `🔍 Analyzing: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`)
        }, baseDelay)
      }
      
      // Task created
      setTimeout(() => {
        if (!canAdvanceTask(task.id)) return
        updateTask(task.id, { status: 'assigned', assignedAgent: agent })
        updateRequest(requestId, { state: 'task_created', task: { id: task.id, title: task.title, detail: task.detail, targetAgent: agent, reason: reason || 'Assigned by WickedMan' } })
        emitRequestUpdate(requestId)
        emitTaskUpdate(task.id)
        createEvent(requestId, 'task_created', 'wickedman', `📋 Task created → ${AGENTS[agent]?.name || agent}: ${reason || 'Assigned by WickedMan'}`)
      }, baseDelay + 1500)
      
      // Assigned
      setTimeout(() => {
        if (!canAdvanceTask(task.id)) return
        updateRequest(requestId, { state: 'assigned', assignedTo: agent })
        emitRequestUpdate(requestId)
        const isSelf = agent === 'wickedman'
        const r = getRequestById(requestId)
        createEvent(requestId, 'assigned', 'wickedman', 
          isSelf ? `📧 Taking this one myself: "${r?.task?.title}"` : `📧 Delegating to ${AGENTS[agent]?.name || agent}: "${r?.task?.title}"`,
          { targetAgent: agent }
        )
      }, baseDelay + 2300)
      
      // In progress
      setTimeout(() => {
        if (!canAdvanceTask(task.id)) return
        updateTask(task.id, { status: 'in_progress', startedAt: Date.now() })
        syncRequestStateFromTask(getTaskById(task.id))
        emitRequestUpdate(requestId)
        emitTaskUpdate(task.id)
        createEvent(requestId, 'in_progress', agent, `⚡ Working on: "${task.title}"`)
      }, baseDelay + 3300)
      
      // Complete (only if autoComplete)
      if (autoComplete) {
        setTimeout(() => {
          if (!canAdvanceTask(task.id)) return
          const t = getTaskById(task.id)
          const completedAt = Date.now()
          const taskTimeMs = t?.startedAt ? completedAt - t.startedAt : workDurationMs
          updateTask(task.id, { status: 'completed', completedAt })
          syncRequestStateFromTask(getTaskById(task.id))
          emitRequestUpdate(requestId)
          emitTaskUpdate(task.id)
          recordTaskCompletion(agent, taskTimeMs)
          incrementMessages('sent')
          createEvent(requestId, 'completed', agent, `✅ Completed: "${task.title}"`)
        }, baseDelay + 3300 + workDurationMs)
      }
      
      return Response.json({
        success: true,
        requestId,
        taskId: task.id,
        message: `Workflow started: ${content.slice(0, 50)}... → ${AGENTS[agent]?.name || agent}`,
        agent,
        estimatedCompletionMs: autoComplete ? 4100 + workDurationMs : null,
      })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: new_request - Legacy: start the workflow pipeline
    // ─────────────────────────────────────────────────────────
    if (action === 'new_request') {
      const { content, from = 'Boss', tokensInput = 0, tokensOutput = 0 } = body
      
      const req = createRequest({
        id: `req_${Date.now()}`,
        content, from,
        state: 'received',
        assignedTo: null,
        task: null,
        createdAt: Date.now(),
      })
      
      incrementMessages('received')
      if (tokensInput > 0 || tokensOutput > 0) addTokens(tokensInput, tokensOutput)
      
      createEvent(req.id, 'received', 'wickedman', `📥 Request from ${from}: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`)
      emitRequestUpdate(req.id)
      
      return Response.json({ success: true, request: req, nextState: 'analyzing', stateConfig: STATE_CONFIG.received })
    }
    
    // ─────────────────────────────────────────────────────────
    // ACTION: complete - Legacy: task finished by requestId
    // ─────────────────────────────────────────────────────────
    if (action === 'complete') {
      const { requestId, result, tokensInput = 0, tokensOutput = 0 } = body
      const req = getRequestById(requestId)
      if (!req) return Response.json({ error: 'Request not found' }, { status: 404 })
      
      const completedAt = Date.now()
      const taskTimeMs = req.workStartedAt ? completedAt - req.workStartedAt : 5000
      
      // Complete the task if one exists
      const task = getTaskByRequestId(requestId)
      if (task && task.status !== 'completed' && task.status !== 'failed') {
        updateTask(task.id, { status: 'completed', completedAt, result })
        emitTaskUpdate(task.id)
      }
      
      updateRequest(requestId, { state: 'completed', completedAt, result })
      emitRequestUpdate(requestId)
      
      const savings = recordTaskCompletion(req.assignedTo || 'wickedman', taskTimeMs)
      incrementMessages('sent')
      if (tokensInput > 0 || tokensOutput > 0) addTokens(tokensInput, tokensOutput)
      
      createEvent(req.id, 'completed', req.assignedTo, `✅ Completed: "${req.task?.title}"`, { result })
      
      return Response.json({ success: true, request: getRequestById(requestId), stateConfig: STATE_CONFIG.completed, savings, taskTimeMs })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: manual_complete - Mark a task as complete manually
    // ─────────────────────────────────────────────────────────
    if (action === 'manual_complete') {
      const { requestId, result, tokensInput = 0, tokensOutput = 0 } = body
      const req = getRequestById(requestId)
      if (!req) return Response.json({ error: 'Request not found' }, { status: 404 })
      if (req.state === 'completed') {
        return Response.json({ success: true, request: req, savings: 0, taskTimeMs: 0, alreadyCompleted: true })
      }
      
      const completedAt = Date.now()
      const taskTimeMs = req.workStartedAt ? completedAt - req.workStartedAt : 5000
      
      // Complete associated task
      const task = getTaskByRequestId(requestId)
      if (task && task.status !== 'completed' && task.status !== 'failed') {
        updateTask(task.id, { status: 'completed', completedAt, result })
        emitTaskUpdate(task.id)
      }
      
      updateRequest(requestId, { state: 'completed', completedAt, result })
      emitRequestUpdate(requestId)
      
      const savings = recordTaskCompletion(req.assignedTo || 'wickedman', taskTimeMs)
      incrementMessages('sent')
      if (tokensInput > 0 || tokensOutput > 0) addTokens(tokensInput, tokensOutput)
      
      createEvent(req.id, 'completed', req.assignedTo || 'wickedman', `✅ Completed: "${req.task?.title}" - ${result || 'Done'}`)
      
      return Response.json({ success: true, request: getRequestById(requestId), savings, taskTimeMs })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: clear_pipeline - Complete all active requests + tasks
    // ─────────────────────────────────────────────────────────
    if (action === 'clear_pipeline') {
      const { reason = 'Session reset' } = body
      const clearedRequests = completeAllActive(reason)
      const clearedTasks = completeAllActiveTasks(reason)
      
      if (clearedRequests > 0 || clearedTasks > 0) {
        createEvent(null, 'system', 'wickedman', `🔄 Pipeline cleared: ${clearedRequests} request${clearedRequests !== 1 ? 's' : ''}, ${clearedTasks} task${clearedTasks !== 1 ? 's' : ''} completed (${reason})`)
        const recent = getRequests(clearedRequests + 5)
        for (const req of recent) {
          if (req.result === reason) eventBus.emit(EVENTS.REQUEST_UPDATE, req)
        }
      }
      
      return Response.json({ success: true, cleared: clearedRequests, clearedTasks })
    }

    // ─────────────────────────────────────────────────────────
    // ACTION: cleanup_stale - Removed. Tasks complete ONLY via explicit API calls.
    // Kept as no-op for backward compatibility.
    // ─────────────────────────────────────────────────────────
    if (action === 'cleanup_stale') {
      return Response.json({ success: true, cleaned: 0, message: 'Timer-based cleanup removed. Use agent_complete or delegate_complete.' })
    }

    // ─────────────────────────────────────────────────────────
    // Legacy actions kept for backward compat
    // ─────────────────────────────────────────────────────────
    if (action === 'analyze') {
      const { requestId } = body
      const req = getRequestById(requestId)
      if (!req) return Response.json({ error: 'Request not found' }, { status: 404 })
      updateRequest(requestId, { state: 'analyzing' })
      emitRequestUpdate(requestId)
      const analysis = analyzeTask(req.content)
      createEvent(req.id, 'analyzing', 'wickedman', `🔍 Analyzing: "${req.content.slice(0, 40)}..."`)
      return Response.json({ success: true, request: getRequestById(requestId), analysis, nextState: 'task_created', stateConfig: STATE_CONFIG.analyzing })
    }

    if (action === 'create_task') {
      const { requestId, analysis } = body
      const req = getRequestById(requestId)
      if (!req) return Response.json({ error: 'Request not found' }, { status: 404 })
      const taskData = {
        id: `task_${Date.now()}`,
        title: req.content.slice(0, 50) + (req.content.length > 50 ? '...' : ''),
        detail: req.content,
        targetAgent: analysis.agent,
        reason: analysis.reason,
        createdAt: Date.now(),
      }
      // Create real task
      const task = createTask({
        id: taskData.id,
        requestId,
        title: taskData.title,
        detail: taskData.detail,
        assignedAgent: analysis.agent,
        status: 'assigned',
        createdAt: Date.now(),
      })
      updateRequest(requestId, { state: 'task_created', task: taskData })
      emitRequestUpdate(requestId)
      emitTaskUpdate(task.id)
      createEvent(req.id, 'task_created', 'wickedman', `📋 Task created → ${AGENTS[analysis.agent]?.name || analysis.agent}: ${analysis.reason}`)
      return Response.json({ success: true, request: getRequestById(requestId), task: taskData, nextState: 'assigned', stateConfig: STATE_CONFIG.task_created })
    }

    if (action === 'assign') {
      const { requestId } = body
      const req = getRequestById(requestId)
      if (!req || !req.task) return Response.json({ error: 'Request/task not found' }, { status: 404 })
      updateRequest(requestId, { state: 'assigned', assignedTo: req.task.targetAgent })
      const task = getTaskByRequestId(requestId)
      if (task) { updateTask(task.id, { status: 'assigned' }); emitTaskUpdate(task.id) }
      emitRequestUpdate(requestId)
      const isSelf = req.task.targetAgent === 'wickedman'
      createEvent(req.id, 'assigned', 'wickedman', isSelf ? `📧 Taking this one myself: "${req.task.title}"` : `📧 Delegating to ${AGENTS[req.task.targetAgent]?.name}: "${req.task.title}"`, { targetAgent: req.task.targetAgent })
      return Response.json({ success: true, request: getRequestById(requestId), assignedTo: req.task.targetAgent, isSelfAssigned: isSelf, nextState: 'in_progress', stateConfig: STATE_CONFIG.assigned, animation: { from: 'wickedman', to: req.task.targetAgent, taskTitle: req.task.title } })
    }

    if (action === 'start_work') {
      const { requestId } = body
      const req = getRequestById(requestId)
      if (!req) return Response.json({ error: 'Request not found' }, { status: 404 })
      updateRequest(requestId, { state: 'in_progress', workStartedAt: Date.now() })
      const task = getTaskByRequestId(requestId)
      if (task) { updateTask(task.id, { status: 'in_progress', startedAt: Date.now() }); emitTaskUpdate(task.id) }
      emitRequestUpdate(requestId)
      createEvent(req.id, 'in_progress', req.assignedTo, `⚡ Working on: "${req.task?.title}"`)
      return Response.json({ success: true, request: getRequestById(requestId), agent: req.assignedTo, stateConfig: STATE_CONFIG.in_progress })
    }

    // ─────────────────────────────────────────────────────────
    // Debug/repair actions (unchanged)
    // ─────────────────────────────────────────────────────────
    if (action === 'debug_events') {
      const { limit: dbLimit = 50 } = body
      const result = getEventsPaginated(dbLimit, 0)
      const broken = result.events.filter(e => e.message?.includes('Processing...') || e.message?.includes('"task"') || e.message?.includes('"response"'))
      return Response.json({ total: result.total, checked: result.events.length, brokenCount: broken.length, broken: broken.map(e => ({ id: e.id, requestId: e.requestId, message: e.message, time: e.time })) })
    }

    if (action === 'repair_events') {
      const fixed = repairAllPlaceholderEvents()
      return Response.json({ success: true, fixed })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
    
  } catch (error) {
    console.error('Workflow API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
