/**
 * Client-side config access
 * Fetches config from /api/config endpoint (server strips secrets)
 */

let _clientConfig = null

export async function getClientConfig() {
  if (_clientConfig) return _clientConfig
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      _clientConfig = await res.json()
      return _clientConfig
    }
  } catch (e) {
    console.error('[config-client] Failed to fetch config:', e.message)
  }
  return null
}

export function getCachedConfig() {
  return _clientConfig
}
