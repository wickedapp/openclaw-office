// Direct OpenClaw Session Polling API
// Connects to local OpenClaw gateway to fetch session history

const OPENCLAW_GATEWAY = 'http://localhost:18789'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionKey = searchParams.get('sessionKey') || 'main'
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Fetch session history from OpenClaw gateway
    const response = await fetch(`${OPENCLAW_GATEWAY}/api/sessions/${sessionKey}/history?limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`OpenClaw API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform messages for dashboard display
    const messages = (data.messages || []).map(msg => ({
      id: msg.id || `msg_${Date.now()}_${Math.random()}`,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp || new Date().toISOString(),
    }))
    
    return Response.json({ 
      success: true, 
      messages,
      sessionKey 
    })
    
  } catch (error) {
    // If OpenClaw isn't available, return empty
    return Response.json({ 
      success: false, 
      error: error.message,
      messages: [] 
    })
  }
}
