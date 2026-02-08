// Global Event Bus for real-time SSE streaming
// Uses globalThis to survive Next.js dev server HMR reloads

import { EventEmitter } from 'events'

if (!globalThis.__openclawEventBus) {
  globalThis.__openclawEventBus = new EventEmitter()
  globalThis.__openclawEventBus.setMaxListeners(50) // Allow multiple SSE clients
}

export const eventBus = globalThis.__openclawEventBus

// Event types
export const EVENTS = {
  WORKFLOW_EVENT: 'workflow:event',
  REQUEST_UPDATE: 'workflow:request',
  TASK_UPDATE: 'workflow:task',
  MESSAGE: 'workflow:message',
}
