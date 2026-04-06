import type { VercelRequest } from '@vercel/node'

export function checkAuth(req: VercelRequest): boolean {
  const password = req.headers['x-app-password']
  if (!process.env.APP_PASSWORD) return false
  return password === process.env.APP_PASSWORD
}

export function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return req.socket?.remoteAddress || 'unknown'
}

export type LogPayload = {
  event: 'login' | 'diagnose' | 'regenerate'
  timestamp: string
  username: string
  ip: string
  userAgent: string
  targetName?: string
  success: boolean
  error?: string
}

export async function logToSheet(payload: LogPayload): Promise<void> {
  const url = process.env.SHEET_WEBHOOK_URL
  if (!url) {
    console.warn('SHEET_WEBHOOK_URL not set; skipping log')
    return
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('sheet log failed', e)
  }
}
