import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  checkAuth,
  logToSheet,
  getClientIp,
  getGeminiClient,
  GEMINI_MODEL,
} from './_utils.js'
import { SYSTEM_PROMPT } from './_prompt.js'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAuth(req)) return res.status(401).json({ error: '認証エラー。再ログインしてください' })

  const { transcript, name, username } = (req.body || {}) as {
    transcript?: string
    name?: string
    username?: string
  }

  if (!transcript || !name) {
    return res.status(400).json({ error: 'transcript と name は必須です' })
  }

  const baseLog = {
    timestamp: new Date().toISOString(),
    username: username?.trim() || '(none)',
    ip: getClientIp(req),
    userAgent: (req.headers['user-agent'] as string) || '',
    targetName: name,
  }

  try {
    const ai = getGeminiClient()
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `対象者の名前: ${name}

以下が才能診断セッションの文字起こしです。これを元に、定義に従って7項目をJSONで返してください。

---
${transcript}
---`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    })

    const text = response.text
    if (!text) throw new Error('Geminiから空のレスポンスが返ってきました')

    const result = JSON.parse(text)

    await logToSheet({ event: 'diagnose', ...baseLog, success: true })
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logToSheet({ event: 'diagnose', ...baseLog, success: false, error: message })
    return res.status(500).json({ error: message })
  }
}
