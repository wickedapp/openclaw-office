/**
 * Image Generation API Endpoint
 * 
 * POST - Triggers office image generation with current config.
 * Requires GEMINI_API_KEY in environment.
 * Returns generation status and output path.
 */

import { NextResponse } from 'next/server'
import { getConfig } from '../../../lib/config.js'

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 400 }
    )
  }

  try {
    const config = getConfig()
    const agents = Object.entries(config.agents || {}).map(([id, a]) => ({
      id,
      name: a.name || id,
      role: a.role || 'Agent',
    }))

    const style = config.office?.style || 'cyberpunk'
    const agentDesc = agents.map(a => `${a.name} (${a.role})`).join(', ')

    const prompt = `Generate a ${style}-themed isometric office scene for an AI team. ` +
      `The office has ${agents.length} workstations for: ${agentDesc}. ` +
      `Include desks, monitors, ambient lighting matching ${style} aesthetic. ` +
      `Top-down isometric view, pixel art style, transparent background preferred.`

    // Call Gemini API for image generation
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT'],
          },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Gemini API error: ${res.status}`, details: errText },
        { status: 502 }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      status: 'complete',
      prompt,
      style,
      agents: agents.length,
      response: data,
      outputPath: config.image?.path || 'public/sprites/office.png',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
