import type { VercelRequest } from '@vercel/node'
import { google } from 'googleapis'
import { GoogleGenAI } from '@google/genai'

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

export const GEMINI_MODEL = 'gemini-2.5-flash'

let geminiClient: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (geminiClient) return geminiClient
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const credentials = JSON.parse(raw)
  geminiClient = new GoogleGenAI({
    vertexai: true,
    project: credentials.project_id,
    location: process.env.VERTEX_LOCATION || 'us-central1',
    googleAuthOptions: { credentials },
  })
  return geminiClient
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
