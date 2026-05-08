'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Square, Volume2 } from 'lucide-react'

const SOURCES = [
  ['overall', 'Overall'],
  ['monday', 'Monday'],
  ['departments', 'Departments'],
  ['workflows', 'Workflows'],
  ['manual', 'Manual Input'],
  ['discord', 'Discord'],
  ['live-gate', 'Live Gate'],
]

function sanitizeReadout(text) {
  return String(text || '')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/discord(?:app)?\.com\/api\/webhooks\/\d+\/[^\s)"]+/gi, 'discord webhook [REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|gh[pousr]_[0-9A-Za-z_]{16,})\b/g, '[REDACTED_SECRET]')
    .replace(/((token|secret|api[_-]?key|oauth|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
}

export default function StatusReadoutPanel({ snapshot }) {
  const [source, setSource] = useState('overall')
  const [fallback, setFallback] = useState('')
  const [speaking, setSpeaking] = useState(false)

  const localText = useMemo(() => sanitizeReadout(snapshot?.readoutText || ''), [snapshot])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  async function loadText() {
    const response = await fetch(`/api/monday/status?source=${encodeURIComponent(source)}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return sanitizeReadout(data.readoutText)
  }

  async function readLatestStatus() {
    try {
      const text = await loadText()
      setFallback(text)
      if (!supported) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      setFallback(`Status readout unavailable: ${error.message}`)
      setSpeaking(false)
    }
  }

  function stopReading() {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return (
    <section className="glass-card rounded-lg p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-cyan-200">Status Readout v0</h3>
          <p className="text-xs text-gray-500">read-only browser TTS · no microphone · no router execution</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={readLatestStatus}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/50"
            title="Read latest sanitized status"
          >
            <Volume2 className="h-4 w-4" />
            Read
          </button>
          <button
            type="button"
            onClick={stopReading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600/50 bg-gray-950/50 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-900"
            title="Stop browser speech synthesis"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
          <button
            type="button"
            onClick={readLatestStatus}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600/50 bg-gray-950/50 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-900"
            title="Refresh sanitized readout text"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSource(id)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              source === id
                ? 'border-purple-400/50 bg-purple-950/50 text-purple-100'
                : 'border-gray-700/60 bg-gray-950/30 text-gray-400 hover:text-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-gray-800 bg-black/20 p-3 text-xs leading-relaxed text-gray-300">
        {!supported && <p className="mb-2 text-amber-300">Browser speech synthesis is unavailable; showing fallback text.</p>}
        {speaking && <p className="mb-2 text-green-300">Reading sanitized status summary.</p>}
        <p>{fallback || localText || 'Status readout will appear here after the registry loads.'}</p>
      </div>
    </section>
  )
}
