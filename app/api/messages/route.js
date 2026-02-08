import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const DATA_FILE = join(process.cwd(), 'public', 'data', 'messages.json')

export async function GET() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8')
    return Response.json(JSON.parse(data))
  } catch (error) {
    return Response.json({ messages: [], lastUpdated: null })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, from, type } = body
    
    let data = { messages: [], lastUpdated: null }
    try {
      const existing = await readFile(DATA_FILE, 'utf-8')
      data = JSON.parse(existing)
    } catch (e) {}
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      type: type || 'received',
      from: from || 'Boss',
      content: message,
      agentColor: from === 'Boss' ? '#00f5ff' : '#ff006e',
    }
    
    data.messages.unshift(newMessage)
    data.messages = data.messages.slice(0, 50)
    data.lastUpdated = new Date().toISOString()
    
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
    
    return Response.json({ success: true, message: newMessage })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
