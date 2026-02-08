import WebSocket from 'ws';

/**
 * Attempt to connect to an OpenClaw gateway and discover agents.
 * Returns { connected, agents[] } or throws on hard failure.
 */
export async function connectGateway(url, token, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const wsUrl = url.replace(/^http/, 'ws');
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      try { ws.close(); } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => done({ connected: false, agents: [], error: 'Connection timed out' }), timeoutMs);

    let ws;
    try {
      ws = new WebSocket(wsUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      clearTimeout(timer);
      return resolve({ connected: false, agents: [], error: err.message });
    }

    ws.on('open', () => {
      // Send agent discovery request
      ws.send(JSON.stringify({ type: 'list_agents' }));
      // Give it a moment for response, then resolve with connected
      setTimeout(() => {
        clearTimeout(timer);
        done({ connected: true, agents: [] });
      }, 1500);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'agents' || msg.agents) {
          clearTimeout(timer);
          done({ connected: true, agents: msg.agents || [] });
        }
      } catch {}
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      done({ connected: false, agents: [], error: err.message });
    });
  });
}
