// Telegram notification helper for OpenClaw Office
// Sends delegation notifications (optional feature)

import { getConfig } from './config.js'

function getTelegramConfig() {
  const config = getConfig()
  return {
    botToken: config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: config.telegram?.chatId || process.env.TELEGRAM_CHAT_ID || '',
  }
}

export async function sendTelegramNotification(message) {
  const { botToken, chatId } = getTelegramConfig()
  if (!botToken || !chatId) {
    console.log('[telegram-notify] Telegram not configured, skipping notification')
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    
    if (!response.ok) {
      console.error('[telegram-notify] Failed to send:', await response.text())
      return false
    }
    
    console.log('[telegram-notify] Sent delegation notification')
    return true
  } catch (err) {
    console.error('[telegram-notify] Error:', err.message)
    return false
  }
}

export function formatDelegationNotification(agent, agentEmoji, taskSummary, details = []) {
  let msg = `<b>${agent}'s on it ${agentEmoji}:</b>\n`
  if (details.length > 0) {
    details.forEach(d => { msg += `• ${d}\n` })
  } else {
    msg += `• ${taskSummary}\n`
  }
  return msg
}
