// Task API for OpenClaw Office Dashboard
// Receives tasks and manages delegation flow

let tasks = []
let activityLog = []

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  if (type === 'activity') {
    return Response.json({ activities: activityLog.slice(-50) })
  }
  
  return Response.json({ tasks, activities: activityLog.slice(-20) })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, taskDetail, from, to, agentId, status } = body
    
    const timestamp = new Date().toISOString()
    const timeStr = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    })
    
    if (action === 'new_task') {
      // New task received by WickedMan
      const task = {
        id: `task_${Date.now()}`,
        detail: taskDetail,
        status: 'received',
        receivedBy: 'wickedman',
        delegatedTo: null,
        createdAt: timestamp,
      }
      tasks.push(task)
      
      activityLog.push({
        id: `log_${Date.now()}`,
        time: timeStr,
        type: 'received',
        agent: 'WickedMan',
        agentColor: '#ff006e',
        message: `received task: "${taskDetail}"`,
        taskId: task.id,
      })
      
      return Response.json({ success: true, task, action: 'task_received' })
    }
    
    if (action === 'delegate') {
      // WickedMan delegates task to another agent
      const task = tasks.find(t => t.id === body.taskId) || tasks[tasks.length - 1]
      if (task) {
        task.status = 'delegated'
        task.delegatedTo = to
      }
      
      const agentNames = {
        py: 'PY',
        vigil: 'Vigil',
        quill: 'Quill',
        savy: 'Savy',
      }
      
      const agentColors = {
        py: '#00f5ff',
        vigil: '#ff0040',
        quill: '#ffd700',
        savy: '#9d4edd',
      }
      
      activityLog.push({
        id: `log_${Date.now()}`,
        time: timeStr,
        type: 'delegated',
        agent: 'WickedMan',
        agentColor: '#ff006e',
        message: `delegated "${taskDetail}" to ${agentNames[to]}`,
        taskId: task?.id,
      })
      
      // Add "working on" entry for the receiving agent
      setTimeout(() => {
        activityLog.push({
          id: `log_${Date.now()}`,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          type: 'working',
          agent: agentNames[to],
          agentColor: agentColors[to],
          message: `working on "${taskDetail}"`,
          taskId: task?.id,
        })
      }, 500)
      
      return Response.json({ 
        success: true, 
        action: 'delegated',
        from: 'wickedman',
        to,
        taskDetail
      })
    }
    
    if (action === 'complete') {
      // Agent completes task
      const task = tasks.find(t => t.id === body.taskId)
      if (task) {
        task.status = 'completed'
      }
      
      const agentNames = {
        wickedman: 'WickedMan',
        py: 'PY',
        vigil: 'Vigil',
        quill: 'Quill',
        savy: 'Savy',
      }
      
      const agentColors = {
        wickedman: '#ff006e',
        py: '#00f5ff',
        vigil: '#ff0040',
        quill: '#ffd700',
        savy: '#9d4edd',
      }
      
      activityLog.push({
        id: `log_${Date.now()}`,
        time: timeStr,
        type: 'completed',
        agent: agentNames[agentId],
        agentColor: agentColors[agentId],
        message: `completed "${taskDetail}"`,
        status: 'completed',
        taskId: task?.id,
      })
      
      return Response.json({ success: true, action: 'completed' })
    }
    
    return Response.json({ error: 'Unknown action' }, { status: 400 })
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// Clear old data periodically (keep last 100 items)
setInterval(() => {
  if (tasks.length > 100) tasks = tasks.slice(-100)
  if (activityLog.length > 100) activityLog = activityLog.slice(-100)
}, 60000)
