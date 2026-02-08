/**
 * Agent Sync API Endpoint
 * 
 * GET  - Returns current sync status (last check, changes detected)
 * POST - Triggers a manual sync check
 */

import { NextResponse } from 'next/server'
import { runSync, getLastSyncResult } from '../../../../lib/agent-sync.js'

export async function GET() {
  try {
    const result = getLastSyncResult()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await runSync()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
