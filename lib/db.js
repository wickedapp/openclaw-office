// SQLite Database for OpenClaw Office
// Provides persistent storage for requests and workflow events

import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync, readFileSync, renameSync } from 'fs'

const DB_PATH = join(process.cwd(), 'data', 'openclaw-office.db')

// Ensure data directory exists
const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    messages_received INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    total_task_time_ms INTEGER DEFAULT 0,
    estimated_human_time_ms INTEGER DEFAULT 0,
    savings_myr REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    from_user TEXT DEFAULT 'Boss',
    state TEXT DEFAULT 'received',
    assigned_to TEXT,
    task_id TEXT,
    task_title TEXT,
    task_detail TEXT,
    task_target_agent TEXT,
    task_reason TEXT,
    created_at INTEGER,
    work_started_at INTEGER,
    completed_at INTEGER,
    result TEXT,
    source TEXT DEFAULT 'api'
  );
  
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    state TEXT,
    agent TEXT,
    agent_color TEXT,
    agent_name TEXT,
    message TEXT,
    target_agent TEXT,
    time TEXT,
    timestamp INTEGER,
    result TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id)
  );
  
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    title TEXT,
    detail TEXT,
    assigned_agent TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    result TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id)
  );

  CREATE INDEX IF NOT EXISTS idx_requests_state ON requests(state);
  CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_request ON events(request_id);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent);
  CREATE INDEX IF NOT EXISTS idx_tasks_request ON tasks(request_id);
`)

// Migration: add task_id column to events if missing
try {
  db.prepare("SELECT task_id FROM events LIMIT 1").get()
} catch {
  db.exec("ALTER TABLE events ADD COLUMN task_id TEXT")
  db.exec("CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id)")
  console.log('[DB] Added task_id column to events table')
}

// Migration: add source column if missing
try {
  db.prepare("SELECT source FROM requests LIMIT 1").get()
} catch {
  db.exec("ALTER TABLE requests ADD COLUMN source TEXT DEFAULT 'api'")
  console.log('[DB] Added source column to requests table')
}

// Migration: add tg_message_id column for deterministic correlation
try {
  db.prepare("SELECT tg_message_id FROM requests LIMIT 1").get()
} catch {
  db.exec("ALTER TABLE requests ADD COLUMN tg_message_id INTEGER")
  db.exec("CREATE INDEX IF NOT EXISTS idx_requests_tg_msg ON requests(tg_message_id)")
  console.log('[DB] Added tg_message_id column to requests table')
}

// Migration: add chain_id column for multi-step delegation chains
try {
  db.prepare("SELECT chain_id FROM requests LIMIT 1").get()
} catch {
  db.exec("ALTER TABLE requests ADD COLUMN chain_id TEXT")
  db.exec("CREATE INDEX IF NOT EXISTS idx_requests_chain ON requests(chain_id)")
  console.log('[DB] Added chain_id column to requests table')
}

// ─────────────────────────────────────────────────────────
// Request Functions
// ─────────────────────────────────────────────────────────
const insertRequestStmt = db.prepare(`
  INSERT INTO requests (id, content, from_user, state, assigned_to, task_id, task_title, task_detail, task_target_agent, task_reason, created_at, work_started_at, completed_at, result, source, tg_message_id, chain_id)
  VALUES (@id, @content, @from_user, @state, @assigned_to, @task_id, @task_title, @task_detail, @task_target_agent, @task_reason, @created_at, @work_started_at, @completed_at, @result, @source, @tg_message_id, @chain_id)
`)

const updateRequestStmt = db.prepare(`
  UPDATE requests SET
    content = @content,
    from_user = @from_user,
    state = @state,
    assigned_to = @assigned_to,
    task_id = @task_id,
    task_title = @task_title,
    task_detail = @task_detail,
    task_target_agent = @task_target_agent,
    task_reason = @task_reason,
    created_at = @created_at,
    work_started_at = @work_started_at,
    completed_at = @completed_at,
    result = @result,
    chain_id = @chain_id
  WHERE id = @id
`)

const getRequestByIdStmt = db.prepare('SELECT * FROM requests WHERE id = ?')
const getRequestsStmt = db.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT ?')
const getActiveRequestsStmt = db.prepare("SELECT * FROM requests WHERE state != 'completed' ORDER BY created_at DESC LIMIT ?")
// FIFO: oldest first — messages are processed in order (fallback for non-Telegram sources)
// Include 'analyzing' because the webhook auto-progresses from received → analyzing at 800ms
const findOldestPendingStmt = db.prepare("SELECT * FROM requests WHERE state IN ('received', 'analyzing') ORDER BY created_at ASC LIMIT 1")
const findOldestIncompleteStmt = db.prepare("SELECT * FROM requests WHERE state NOT IN ('completed') ORDER BY created_at ASC LIMIT 1")

// Deterministic correlation: find request by Telegram message_id
const findByTgMessageIdStmt = db.prepare("SELECT * FROM requests WHERE tg_message_id = ? LIMIT 1")

export function createRequest(data) {
  const row = {
    id: data.id,
    content: data.content,
    from_user: data.from || 'Boss',
    state: data.state || 'received',
    assigned_to: data.assignedTo || null,
    task_id: data.task?.id || null,
    task_title: data.task?.title || null,
    task_detail: data.task?.detail || null,
    task_target_agent: data.task?.targetAgent || null,
    task_reason: data.task?.reason || null,
    created_at: data.createdAt || Date.now(),
    work_started_at: data.workStartedAt || null,
    completed_at: data.completedAt || null,
    result: data.result || null,
    source: data.source || 'api',
    tg_message_id: data.tgMessageId || null,
    chain_id: data.chainId || null,
  }
  insertRequestStmt.run(row)
  return getRequestById(data.id)
}

export function updateRequest(id, data) {
  const existing = getRequestByIdStmt.get(id)
  if (!existing) return null
  
  const row = {
    id,
    content: data.content ?? existing.content,
    from_user: data.from ?? existing.from_user,
    state: data.state ?? existing.state,
    assigned_to: data.assignedTo ?? existing.assigned_to,
    task_id: data.task?.id ?? existing.task_id,
    task_title: data.task?.title ?? existing.task_title,
    task_detail: data.task?.detail ?? existing.task_detail,
    task_target_agent: data.task?.targetAgent ?? existing.task_target_agent,
    task_reason: data.task?.reason ?? existing.task_reason,
    created_at: data.createdAt ?? existing.created_at,
    work_started_at: data.workStartedAt ?? existing.work_started_at,
    completed_at: data.completedAt ?? existing.completed_at,
    result: data.result ?? existing.result,
    chain_id: data.chainId ?? existing.chain_id ?? null,
  }
  updateRequestStmt.run(row)
  return getRequestById(id)
}

export function getRequestById(id) {
  const row = getRequestByIdStmt.get(id)
  return row ? rowToRequest(row) : null
}

export function getRequests(limit = 20, activeOnly = false) {
  const rows = activeOnly 
    ? getActiveRequestsStmt.all(limit)
    : getRequestsStmt.all(limit)
  return rows.map(rowToRequest)
}

// FIFO adoption: return the oldest pending (received/analyzing) request.
// Messages are processed in order, so the oldest pending entry
// always corresponds to the current quick_flow call.
// DEPRECATED: Use findByTgMessageId for reliable correlation
export function findOldestReceived() {
  const row = findOldestPendingStmt.get()
  return row ? rowToRequest(row) : null
}

export function findOldestIncomplete() {
  const row = findOldestIncompleteStmt.get()
  return row ? rowToRequest(row) : null
}

// Deterministic adoption: find request by Telegram message_id
// This is the reliable way to correlate webhook entries with quick_flow calls
export function findByTgMessageId(messageId) {
  if (!messageId) return null
  const row = findByTgMessageIdStmt.get(messageId)
  return row ? rowToRequest(row) : null
}

// Find the most recently completed request in a chain
const findLastCompletedInChainStmt = db.prepare("SELECT * FROM requests WHERE chain_id = ? AND state = 'completed' ORDER BY completed_at DESC LIMIT 1")

export function findLastCompletedInChain(chainId) {
  if (!chainId) return null
  const row = findLastCompletedInChainStmt.get(chainId)
  return row ? rowToRequest(row) : null
}

// Complete all non-completed requests (used on session reset)
const completeAllActiveStmt = db.prepare(`
  UPDATE requests SET state = 'completed', completed_at = ?, result = ?
  WHERE state != 'completed'
`)

export function completeAllActive(reason = 'Session reset') {
  const active = getActiveRequestsStmt.all(100)
  const now = Date.now()
  if (active.length > 0) {
    completeAllActiveStmt.run(now, reason)
  }
  return active.length
}

function rowToRequest(row) {
  return {
    id: row.id,
    content: row.content,
    from: row.from_user,
    state: row.state,
    assignedTo: row.assigned_to,
    task: row.task_id ? {
      id: row.task_id,
      title: row.task_title,
      detail: row.task_detail,
      targetAgent: row.task_target_agent,
      reason: row.task_reason,
    } : null,
    createdAt: row.created_at,
    workStartedAt: row.work_started_at,
    completedAt: row.completed_at,
    result: row.result,
    tgMessageId: row.tg_message_id,
    chainId: row.chain_id,
  }
}

// ─────────────────────────────────────────────────────────
// Task Functions
// ─────────────────────────────────────────────────────────
const insertTaskStmt = db.prepare(`
  INSERT INTO tasks (id, request_id, title, detail, assigned_agent, status, created_at, started_at, completed_at, result)
  VALUES (@id, @request_id, @title, @detail, @assigned_agent, @status, @created_at, @started_at, @completed_at, @result)
`)

const updateTaskStmt = db.prepare(`
  UPDATE tasks SET
    title = @title,
    detail = @detail,
    assigned_agent = @assigned_agent,
    status = @status,
    started_at = @started_at,
    completed_at = @completed_at,
    result = @result
  WHERE id = @id
`)

const getTaskByIdStmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
const getTaskByRequestIdStmt = db.prepare('SELECT * FROM tasks WHERE request_id = ? ORDER BY created_at DESC LIMIT 1')
const getActiveTaskByAgentStmt = db.prepare("SELECT * FROM tasks WHERE assigned_agent = ? AND status NOT IN ('completed', 'failed') ORDER BY created_at DESC LIMIT 1")
const getActiveTasksStmt = db.prepare("SELECT * FROM tasks WHERE status NOT IN ('completed', 'failed') ORDER BY created_at DESC LIMIT ?")
const getRecentTasksStmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?')

export function createTask(data) {
  const row = {
    id: data.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    request_id: data.requestId || null,
    title: data.title || null,
    detail: data.detail || null,
    assigned_agent: data.assignedAgent || null,
    status: data.status || 'pending',
    created_at: data.createdAt || Date.now(),
    started_at: data.startedAt || null,
    completed_at: data.completedAt || null,
    result: data.result || null,
  }
  insertTaskStmt.run(row)
  return getTaskById(row.id)
}

export function updateTask(id, data) {
  const existing = getTaskByIdStmt.get(id)
  if (!existing) return null

  const row = {
    id,
    title: data.title ?? existing.title,
    detail: data.detail ?? existing.detail,
    assigned_agent: data.assignedAgent ?? existing.assigned_agent,
    status: data.status ?? existing.status,
    started_at: data.startedAt ?? existing.started_at,
    completed_at: data.completedAt ?? existing.completed_at,
    result: data.result ?? existing.result,
  }
  updateTaskStmt.run(row)
  return getTaskById(id)
}

export function getTaskById(id) {
  const row = getTaskByIdStmt.get(id)
  return row ? rowToTask(row) : null
}

export function getTaskByRequestId(requestId) {
  const row = getTaskByRequestIdStmt.get(requestId)
  return row ? rowToTask(row) : null
}

export function getActiveTaskByAgent(agent) {
  const row = getActiveTaskByAgentStmt.get(agent)
  return row ? rowToTask(row) : null
}

export function getActiveTasks(limit = 20) {
  const rows = getActiveTasksStmt.all(limit)
  return rows.map(rowToTask)
}

export function getRecentTasks(limit = 20) {
  const rows = getRecentTasksStmt.all(limit)
  return rows.map(rowToTask)
}

// Complete all active tasks (used on session reset)
const completeAllActiveTasksStmt = db.prepare(`
  UPDATE tasks SET status = 'completed', completed_at = ?, result = ?
  WHERE status NOT IN ('completed', 'failed')
`)

export function completeAllActiveTasks(reason = 'Session reset') {
  const now = Date.now()
  const info = completeAllActiveTasksStmt.run(now, reason)
  return info.changes
}

function rowToTask(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    title: row.title,
    detail: row.detail,
    assignedAgent: row.assigned_agent,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    result: row.result,
  }
}

// ─────────────────────────────────────────────────────────
// Event Functions
// ─────────────────────────────────────────────────────────
const insertEventStmt = db.prepare(`
  INSERT INTO events (id, request_id, state, agent, agent_color, agent_name, message, target_agent, time, timestamp, result)
  VALUES (@id, @request_id, @state, @agent, @agent_color, @agent_name, @message, @target_agent, @time, @timestamp, @result)
`)

const getEventsStmt = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?')
const getEventsPaginatedStmt = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ? OFFSET ?')
const countEventsStmt = db.prepare('SELECT COUNT(*) as total FROM events')
const getEventsByRequestStmt = db.prepare('SELECT * FROM events WHERE request_id = ? ORDER BY timestamp DESC')
const updateEventMessageStmt = db.prepare('UPDATE events SET message = ? WHERE id = ?')
const getEventsByRequestAndPlaceholderStmt = db.prepare("SELECT * FROM events WHERE request_id = ? AND message LIKE '%Processing...%'")

export function addEvent(data) {
  const row = {
    id: data.id,
    request_id: data.requestId,
    state: data.state,
    agent: data.agent,
    agent_color: data.agentColor,
    agent_name: data.agentName,
    message: data.message,
    target_agent: data.targetAgent || null,
    time: data.time,
    timestamp: data.timestamp,
    result: data.result || null,
  }
  insertEventStmt.run(row)
}

export function getEvents(limit = 50) {
  const rows = getEventsStmt.all(limit)
  return rows.map(rowToEvent)
}

export function getEventsPaginated(limit = 50, offset = 0) {
  const rows = getEventsPaginatedStmt.all(limit, offset)
  const { total } = countEventsStmt.get()
  return { events: rows.map(rowToEvent), total }
}

export function getEventsByRequest(requestId) {
  const rows = getEventsByRequestStmt.all(requestId)
  return rows.map(rowToEvent)
}

// Auto-repair: fix all broken placeholder events by looking up their request's real content
export function repairAllPlaceholderEvents() {
  const brokenStmt = db.prepare("SELECT DISTINCT request_id FROM events WHERE message LIKE '%Processing...%' AND request_id IS NOT NULL")
  const requestIds = brokenStmt.all()
  let fixed = 0
  for (const { request_id } of requestIds) {
    const req = getRequestById(request_id)
    if (req && req.content && req.content !== 'Processing...') {
      fixed += fixPlaceholderEvents(request_id, req.content)
    }
  }
  // Also fix "Done: task" and "Responding: response" generic fallbacks
  const genericDone = db.prepare(`SELECT e.id, e.request_id, e.message FROM events e WHERE e.message LIKE '%Done: "task"%' AND e.request_id IS NOT NULL`).all()
  for (const row of genericDone) {
    const req = getRequestById(row.request_id)
    if (req && req.content && req.content !== 'Processing...') {
      const clean = req.content.replace(/^\[Telegram[^\]]*\]\s*/s, '').replace(/\[message_id:\s*\d+\]\s*$/, '').trim()
      const short = clean.slice(0, 60) + (clean.length > 60 ? '...' : '')
      updateEventMessageStmt.run(row.message.replace('"task"', `"${short}"`), row.id)
      fixed++
    }
  }
  const genericResp = db.prepare(`SELECT e.id, e.request_id, e.message FROM events e WHERE e.message LIKE '%Responding: "response"%' AND e.request_id IS NOT NULL`).all()
  for (const row of genericResp) {
    const req = getRequestById(row.request_id)
    if (req && req.content && req.content !== 'Processing...') {
      const clean = req.content.replace(/^\[Telegram[^\]]*\]\s*/s, '').replace(/\[message_id:\s*\d+\]\s*$/, '').trim()
      const short = clean.slice(0, 60) + (clean.length > 60 ? '...' : '')
      updateEventMessageStmt.run(row.message.replace('"response"', `"${short}"`), row.id)
      fixed++
    }
  }
  return fixed
}

export function updateEventMessage(eventId, message) {
  updateEventMessageStmt.run(message, eventId)
}

// Retroactively fix all "Processing..." events for a request with real content
export function fixPlaceholderEvents(requestId, realContent) {
  const rows = getEventsByRequestAndPlaceholderStmt.all(requestId)
  const clean = realContent.replace(/^\[Telegram[^\]]*\]\s*/s, '').replace(/\[message_id:\s*\d+\]\s*$/, '').trim()
  const short = clean.slice(0, 60) + (clean.length > 60 ? '...' : '')
  for (const row of rows) {
    const newMsg = row.message
      .replace(/"Processing\.\.\."/, `"${short}"`)
      .replace(/Processing\.\.\./, short)
    updateEventMessageStmt.run(newMsg, row.id)
  }
  return rows.length
}

function rowToEvent(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    state: row.state,
    agent: row.agent,
    agentColor: row.agent_color,
    agentName: row.agent_name,
    message: row.message,
    targetAgent: row.target_agent,
    time: row.time,
    timestamp: row.timestamp,
    result: row.result,
  }
}

// ─────────────────────────────────────────────────────────
// Data Migration from JSON files
// ─────────────────────────────────────────────────────────
const REQUESTS_FILE = join(dataDir, 'requests.json')
const EVENTS_FILE = join(dataDir, 'workflow-events.json')

function migrateFromJson() {
  let migrated = false
  
  // Migrate requests
  if (existsSync(REQUESTS_FILE)) {
    try {
      const requests = JSON.parse(readFileSync(REQUESTS_FILE, 'utf8'))
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM requests').get().count
      
      if (existingCount === 0 && requests.length > 0) {
        console.log(`[DB] Migrating ${requests.length} requests from JSON...`)
        for (const req of requests) {
          try {
            createRequest(req)
          } catch (e) {
            console.error(`[DB] Failed to migrate request ${req.id}:`, e.message)
          }
        }
        migrated = true
      }
    } catch (e) {
      console.error('[DB] Failed to read requests.json:', e.message)
    }
  }
  
  // Migrate events
  if (existsSync(EVENTS_FILE)) {
    try {
      const events = JSON.parse(readFileSync(EVENTS_FILE, 'utf8'))
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count
      
      if (existingCount === 0 && events.length > 0) {
        console.log(`[DB] Migrating ${events.length} events from JSON...`)
        for (const evt of events) {
          try {
            addEvent(evt)
          } catch (e) {
            console.error(`[DB] Failed to migrate event ${evt.id}:`, e.message)
          }
        }
        migrated = true
      }
    } catch (e) {
      console.error('[DB] Failed to read workflow-events.json:', e.message)
    }
  }
  
  // Backup JSON files after successful migration
  if (migrated) {
    const timestamp = Date.now()
    if (existsSync(REQUESTS_FILE)) {
      renameSync(REQUESTS_FILE, `${REQUESTS_FILE}.bak.${timestamp}`)
      console.log('[DB] Backed up requests.json')
    }
    if (existsSync(EVENTS_FILE)) {
      renameSync(EVENTS_FILE, `${EVENTS_FILE}.bak.${timestamp}`)
      console.log('[DB] Backed up workflow-events.json')
    }
  }
}

// Run migration on module load
migrateFromJson()

// ─────────────────────────────────────────────────────────
// Stats Functions
// ─────────────────────────────────────────────────────────
const AGENT_HOURLY_RATES = {
  wickedman: 18.98,  // RM 75 = $18.98
  py: 18.98,         // RM 75 = $18.98
  vigil: 15.94,      // RM 63 = $15.94
  quill: 11.13,      // RM 44 = $11.13
  savy: 8.60,        // RM 34 = $8.60
  gantt: 22.26,      // RM 88 = $22.26
}

const CLAUDE_PRICING = {
  opus: { input: 15, output: 75 },    // per 1M tokens
  sonnet: { input: 3, output: 15 },
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function ensureTodayStats() {
  const today = getTodayDate()
  const existing = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today)
  if (!existing) {
    db.prepare(`
      INSERT INTO daily_stats (date, messages_received, messages_sent, tokens_input, tokens_output, tasks_completed, total_task_time_ms, estimated_human_time_ms, savings_myr)
      VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0)
    `).run(today)
  }
}

export function incrementMessages(type = 'received') {
  ensureTodayStats()
  const today = getTodayDate()
  const column = type === 'sent' ? 'messages_sent' : 'messages_received'
  db.prepare(`UPDATE daily_stats SET ${column} = ${column} + 1 WHERE date = ?`).run(today)
}

export function addTokens(inputTokens, outputTokens) {
  ensureTodayStats()
  const today = getTodayDate()
  db.prepare(`
    UPDATE daily_stats 
    SET tokens_input = tokens_input + ?, tokens_output = tokens_output + ?
    WHERE date = ?
  `).run(inputTokens, outputTokens, today)
}

export function recordTaskCompletion(agent, taskTimeMs) {
  ensureTodayStats()
  const today = getTodayDate()
  
  // Estimate: AI takes X ms, human would take 10X (conservative)
  const humanMultiplier = 10
  const humanTimeMs = taskTimeMs * humanMultiplier
  const hourlyRate = AGENT_HOURLY_RATES[agent] || 11
  const savingsMyr = (humanTimeMs / 3600000) * hourlyRate  // ms to hours, now in USD
  
  db.prepare(`
    UPDATE daily_stats 
    SET tasks_completed = tasks_completed + 1,
        total_task_time_ms = total_task_time_ms + ?,
        estimated_human_time_ms = estimated_human_time_ms + ?,
        savings_myr = savings_myr + ?
    WHERE date = ?
  `).run(taskTimeMs, humanTimeMs, savingsMyr, today)
  
  return savingsMyr
}

export function calculateCost(inputTokens, outputTokens, model = 'opus') {
  const pricing = CLAUDE_PRICING[model]
  return (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output)
}

export function getTodayStats() {
  ensureTodayStats()
  const today = getTodayDate()
  return db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today)
}

export function getAllTimeStats() {
  const result = db.prepare(`
    SELECT 
      SUM(messages_received) as messages_received,
      SUM(messages_sent) as messages_sent,
      SUM(tokens_input) as tokens_input,
      SUM(tokens_output) as tokens_output,
      SUM(tasks_completed) as tasks_completed,
      SUM(total_task_time_ms) as total_task_time_ms,
      SUM(estimated_human_time_ms) as estimated_human_time_ms,
      SUM(savings_myr) as savings_myr
    FROM daily_stats
  `).get()
  
  return {
    messages_received: result.messages_received || 0,
    messages_sent: result.messages_sent || 0,
    tokens_input: result.tokens_input || 0,
    tokens_output: result.tokens_output || 0,
    tasks_completed: result.tasks_completed || 0,
    total_task_time_ms: result.total_task_time_ms || 0,
    estimated_human_time_ms: result.estimated_human_time_ms || 0,
    savings_myr: result.savings_myr || 0,
  }
}

export { AGENT_HOURLY_RATES, CLAUDE_PRICING }

export default db
