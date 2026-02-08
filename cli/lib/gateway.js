import WebSocket from 'ws';

/**
 * Attempt to connect to an OpenClaw gateway and discover agents.
 * Performs the full OpenClaw handshake protocol.
 */
export async function connectGateway(url, token, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    const wsUrl = url.replace(/^http/, 'ws');
    let resolved = false;
    let authenticated = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      try { ws.close(); } catch {}
      resolve(result);
    };

    const timer = setTimeout(() => done({ connected: false, agents: [], error: 'Connection timed out' }), timeoutMs);

    let ws;
    try {
      ws = new WebSocket(wsUrl, { headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:4200' } });
    } catch (err) {
      clearTimeout(timer);
      return resolve({ connected: false, agents: [], error: err.message });
    }

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());

        // Step 1: Respond to connect challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-1',
            method: 'connect',
            params: {
              minProtocol: 3, maxProtocol: 3,
              client: { id: 'openclaw-control-ui', version: '1.0.0', platform: 'nodejs', mode: 'ui' },
              role: 'operator',
              scopes: ['operator.read'],
              caps: [], commands: [], permissions: {},
              auth: { token },
              locale: 'en-US',
              userAgent: 'openclaw-office-cli/0.1.0',
            },
          }));
          return;
        }

        // Step 2: Connect response — now request agents
        if (msg.id === 'connect-1' || (msg.type === 'res' && msg.method === 'connect')) {
          const success = msg.ok || msg.result || (!msg.error);
          if (success) {
            authenticated = true;
            // Request agent list
            ws.send(JSON.stringify({
              type: 'req',
              id: 'agents-1',
              method: 'agents.list',
              params: {},
            }));
            // Fallback: if no agent response in 3s, return connected with empty agents
            setTimeout(() => {
              if (!resolved) {
                clearTimeout(timer);
                done({ connected: true, agents: [] });
              }
            }, 3000);
          } else {
            clearTimeout(timer);
            done({ connected: false, agents: [], error: msg.error?.message || 'Auth failed' });
          }
          return;
        }

        // Step 3: Agent list response
        if (msg.id === 'agents-1' || (msg.type === 'res' && msg.method === 'agents.list')) {
          clearTimeout(timer);
          const rawAgents = msg.payload?.agents || msg.result || msg.agents || [];
          const agents = (Array.isArray(rawAgents) ? rawAgents : []).map(a => {
            if (typeof a === 'string') return { id: a, name: a, role: 'Agent', emoji: '🤖' };
            const identity = a.identity || {};
            return {
              id: a.id,
              name: identity.name || a.name?.split(' - ')[0] || a.id,
              role: a.name?.split(' - ')[1] || identity.role || 'Agent',
              emoji: identity.emoji || a.emoji || '🤖',
              color: identity.color || a.color,
            };
          });
          done({ connected: true, agents });
          return;
        }

        // Also catch agent events that might contain agent info
        if (msg.type === 'event' && msg.event === 'agent') {
          // Ignore streaming events during discovery
          return;
        }

      } catch {}
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      done({ connected: false, agents: [], error: err.message });
    });

    ws.on('close', () => {
      if (!resolved) {
        clearTimeout(timer);
        done({ connected: authenticated, agents: [], error: authenticated ? undefined : 'Connection closed' });
      }
    });
  });
}
