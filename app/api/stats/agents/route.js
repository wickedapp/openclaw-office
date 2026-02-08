// Per-agent stats API for OpenClaw Office
// Returns breakdown of tasks, events, time, and savings per agent from SQLite

import db, { AGENT_HOURLY_RATES } from '../../../../lib/db'

export async function GET() {
  try {
    // Per-agent task stats from requests table
    const agentTasks = db.prepare(`
      SELECT 
        assigned_to as agent,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
        SUM(CASE WHEN completed_at IS NOT NULL AND work_started_at IS NOT NULL 
            THEN completed_at - work_started_at ELSE 0 END) as total_task_time_ms
      FROM requests
      WHERE assigned_to IS NOT NULL AND assigned_to != ''
      GROUP BY assigned_to
    `).all()

    // Per-agent event counts from events table
    const agentEvents = db.prepare(`
      SELECT agent, COUNT(*) as event_count
      FROM events
      WHERE agent IS NOT NULL AND agent != ''
      GROUP BY agent
    `).all()

    // Build a lookup map for events
    const eventMap = {}
    for (const row of agentEvents) {
      eventMap[row.agent] = row.event_count
    }

    // Build per-agent response
    const agents = agentTasks.map(row => {
      const agent = row.agent
      const hourlyRate = AGENT_HOURLY_RATES[agent] || 50
      const humanTimeMs = row.total_task_time_ms * 10 // 10x multiplier (same as recordTaskCompletion)
      const savingsUsd = (humanTimeMs / 3600000) * hourlyRate

      return {
        id: agent,
        total_tasks: row.total_tasks,
        tasks_completed: row.tasks_completed,
        total_task_time_ms: row.total_task_time_ms,
        estimated_human_time_ms: humanTimeMs,
        events: eventMap[agent] || 0,
        hourly_rate: hourlyRate,
        savings_usd: Math.round(savingsUsd * 100) / 100,
      }
    })

    // Also include agents that only have events but no tasks
    for (const evtAgent of Object.keys(eventMap)) {
      if (!agents.find(a => a.id === evtAgent)) {
        agents.push({
          id: evtAgent,
          total_tasks: 0,
          tasks_completed: 0,
          total_task_time_ms: 0,
          estimated_human_time_ms: 0,
          events: eventMap[evtAgent],
          hourly_rate: AGENT_HOURLY_RATES[evtAgent] || 11,
          savings_usd: 0,
        })
      }
    }

    // Sort by savings descending
    agents.sort((a, b) => b.savings_usd - a.savings_usd)

    return Response.json({ agents })
  } catch (error) {
    console.error('Agent stats API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
