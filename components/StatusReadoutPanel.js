'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, RefreshCw, Square, Volume2, Waves } from 'lucide-react'

const SOURCES = [
  ['overall', '總覽'],
  ['departments', '部門'],
  ['risks', '風險'],
  ['manual', '人手處理'],
  ['discord', 'Discord'],
  ['live-gate', 'Live Gate'],
]

const VOICE_PRIORITY = ['yue-HK', 'zh-HK', 'zh-TW', 'zh-CN']

function sanitizeReadout(text) {
  return String(text || '')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/discord(?:app)?\.com\/api\/webhooks\/\d+\/[^\s)"]+/gi, 'discord webhook [REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|gh[pousr]_[0-9A-Za-z_]{16,})\b/g, '[REDACTED_SECRET]')
    .replace(/((token|secret|api[_-]?key|oauth|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/\b(customer|student|parent|guardian|child|client)\b[^,.;\n]*/gi, '[REDACTED_PERSON_DATA]')
}

function selectVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  for (const lang of VOICE_PRIORITY) {
    const exact = voices.find((voice) => voice.lang === lang)
    if (exact) return exact
  }
  return voices.find((voice) => /^zh[-_]/i.test(voice.lang || '')) || null
}

function splitReadout(text) {
  const safe = sanitizeReadout(text)
  const lines = safe
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      transcript: 'Ray，今日 Monday 指揮辦公室已經載入。目前 Gateway 正常，Discord 仍然停用，所有外部操作都由 Live Gate 鎖定。',
      bullets: [
        '審批隊列有高風險項目需要留意。',
        '建議先檢查審批摘要，再決定是否批准任何 live 操作。',
        'Status Readout 只使用瀏覽器 TTS。',
      ],
    }
  }

  return {
    transcript: lines[0],
    bullets: lines.slice(1, 3),
  }
}

function waveformBars() {
  return Array.from({ length: 38 }, (_, index) => (
    <span
      key={index}
      className="monday-wave-bar"
      style={{
        height: `${6 + ((index * 7) % 22)}px`,
        animationDelay: `${index * 0.035}s`,
      }}
    />
  ))
}

export default function StatusReadoutPanel({ snapshot }) {
  const [source, setSource] = useState('overall')
  const [fallback, setFallback] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [panelNotice, setPanelNotice] = useState('總覽匯報已就緒。')
  const [supported, setSupported] = useState(false)

  const localText = useMemo(() => sanitizeReadout(snapshot?.readoutText || ''), [snapshot])
  const readout = useMemo(() => splitReadout(fallback || localText), [fallback, localText])
  const voiceStatus = speaking ? '即時' : supported ? '就緒' : '只讀'

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  async function loadText() {
    const response = await fetch(`/api/monday/status?source=${encodeURIComponent(source)}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return sanitizeReadout(data.readoutText)
  }

  async function readLatestStatus() {
    try {
      setPanelNotice('正在載入最新已清理狀態，準備以瀏覽器 TTS 讀出。')
      const text = await loadText()
      setFallback(text)
      if (!supported) {
        setPanelNotice('瀏覽器未支援 TTS；匯報文字已更新為只讀。')
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = selectVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        utterance.lang = 'zh-HK'
      }
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      setSpeaking(true)
      setPanelNotice('瀏覽器 TTS 正在讀出最新狀態。')
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      setFallback(`Status Readout 暫時未能載入：${sanitizeReadout(error.message)}`)
      setPanelNotice('Status Readout 暫時未能載入，請稍後再刷新。')
      setSpeaking(false)
    }
  }

  async function refreshReadout() {
    try {
      setPanelNotice('正在刷新已清理匯報文字。')
      const text = await loadText()
      setFallback(text)
      setPanelNotice('匯報文字已刷新；未觸發任何外部操作。')
    } catch (error) {
      setFallback(`Status Readout 暫時未能載入：${sanitizeReadout(error.message)}`)
      setPanelNotice('刷新失敗；安全狀態保持只讀。')
    }
  }

  function stopReading() {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
    setPanelNotice('語音播放已停止。')
  }

  function selectSource(id, label) {
    setSource(id)
    setPanelNotice(`${label}匯報已選取；按刷新可重新載入該段 readout。`)
  }

  return (
    <section className="monday-panel monday-voice-panel">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-bold tracking-[0.04em] text-slate-100">
          <Waves className="h-5 w-5 text-cyan-300" />
          <span>Monday 語音匯報</span>
        </div>
        <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${speaking ? 'bg-emerald-400/15 text-emerald-200' : 'bg-cyan-400/10 text-cyan-200'}`}>
          {voiceStatus}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SOURCES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectSource(id, label)}
            aria-pressed={source === id}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              source === id
                ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100'
                : 'border-slate-500/20 bg-slate-950/40 text-slate-400 hover:text-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="monday-control-feedback" aria-live="polite">{panelNotice}</div>

      <div className="max-h-[156px] overflow-hidden rounded-md border border-cyan-300/10 bg-slate-950/55 p-3 shadow-[inset_0_0_30px_rgba(8,47,73,0.38)]">
        <p className="text-xs leading-5 text-slate-200">{readout.transcript}</p>
        <ul className="mt-2 space-y-1 text-[11px] leading-4 text-slate-400">
          {readout.bullets.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-300" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="monday-waveform flex-1" aria-hidden="true">
          {waveformBars()}
        </div>
        <div className="pb-1 text-[10px] text-slate-500">00:18 / 01:02</div>
      </div>

      <div className="mt-3 grid grid-cols-[48px_48px_1fr] gap-3">
        <button
          type="button"
          onClick={readLatestStatus}
          className="monday-round-control"
            title="用瀏覽器 TTS 讀出最新已清理狀態"
        >
          <Volume2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={stopReading}
          className={`monday-round-control ${speaking ? 'monday-round-control-active' : ''}`}
            title="停止瀏覽器語音"
        >
          <Square className="h-5 w-5" />
        </button>
        <div className="grid grid-cols-[1fr_48px] gap-3">
          <button
            type="button"
            onClick={() => {
              setPanelNotice('廣東話為目前啟用語言；正在刷新匯報。')
              refreshReadout()
            }}
            className="monday-language-select"
            title="語言選擇：廣東話"
          >
            <span>廣東話</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={refreshReadout}
            className="monday-round-control"
            title="刷新已清理匯報文字"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        只使用 Browser TTS。無麥克風、無 STT、無語音指令、無 router execution。
      </p>
    </section>
  )
}
