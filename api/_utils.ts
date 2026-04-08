import type { VercelRequest } from '@vercel/node'
import { google } from 'googleapis'

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

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 3
  const baseDelay = options.baseDelayMs ?? 1500
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      const retriable =
        /503|UNAVAILABLE|overloaded|high demand|429|RESOURCE_EXHAUSTED/i.test(msg)
      if (!retriable || attempt === retries) throw err
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
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

const HEADERS = [
  'timestamp',
  'event',
  'username',
  'targetName',
  'success',
  'error',
  'ip',
  'userAgent',
]

let sheetsClient: ReturnType<typeof google.sheets> | null = null

function getSheetsClient() {
  if (sheetsClient) return sheetsClient
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const credentials = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

export async function logToSheet(payload: LogPayload): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn('Sheets logging not configured; skipping')
    return
  }
  try {
    const sheets = getSheetsClient()

    // ヘッダー行が無ければ追加
    const head = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A1:H1',
    })
    if (!head.data.values || head.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'A1:H1',
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
      })
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            payload.timestamp,
            payload.event,
            payload.username,
            payload.targetName || '',
            payload.success ? '✓' : '✗',
            payload.error || '',
            payload.ip,
            payload.userAgent,
          ],
        ],
      },
    })
  } catch (e) {
    console.error('sheet log failed', e)
  }
}
