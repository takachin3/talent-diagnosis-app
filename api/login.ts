import type { VercelRequest, VercelResponse } from '@vercel/node'
import { logToSheet, getClientIp } from './_utils.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password } = (req.body || {}) as {
    username?: string
    password?: string
  }

  const expected = process.env.APP_PASSWORD
  if (!expected) {
    return res.status(500).json({ error: 'サーバーにパスワードが設定されていません' })
  }

  const ok = !!password && password === expected

  await logToSheet({
    event: 'login',
    timestamp: new Date().toISOString(),
    username: username?.trim() || '(none)',
    ip: getClientIp(req),
    userAgent: (req.headers['user-agent'] as string) || '',
    success: ok,
  })

  if (!ok) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが違います' })
  }
  return res.status(200).json({ ok: true })
}
