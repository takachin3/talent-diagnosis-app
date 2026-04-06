import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenAI } from '@google/genai'
import { checkAuth, logToSheet, getClientIp } from './_utils'
import { SYSTEM_PROMPT } from './_prompt'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAuth(req)) return res.status(401).json({ error: '認証エラー。再ログインしてください' })

  const { transcript, name, previous, changeRequest, username } = (req.body || {}) as {
    transcript?: string
    name?: string
    previous?: Record<string, string>
    changeRequest?: string
    username?: string
  }

  if (!transcript || !name || !previous || !changeRequest) {
    return res.status(400).json({ error: '必須パラメータが不足しています' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'サーバーにGEMINI_API_KEYが設定されていません' })
  }

  const baseLog = {
    timestamp: new Date().toISOString(),
    username: username?.trim() || '(none)',
    ip: getClientIp(req),
    userAgent: (req.headers['user-agent'] as string) || '',
    targetName: name,
  }

  const editPrompt = `以下は、対象者「${name}」の才能診断結果（JSON）です。

【現在の診断結果】
${JSON.stringify(previous, null, 2)}

【ユーザーからの変更指示】
${changeRequest}

【厳守すべきルール】
1. 変更指示で明示的に言及されている項目だけを修正してください。
2. 変更指示に含まれない項目は、現在の診断結果と「一字一句完全に同一」のまま返してください。改行・句読点・絵文字・記号も含めて、絶対に変更しないでください。
3. 出力形式は元のJSONと完全に同じスキーマ（7項目すべて）で返してください。
4. 修正する項目については、文字起こし全体を改めて参照したうえで、定義に従って書き直してください。
5. 変更指示が曖昧な場合でも、現在の結果を勝手に「改善」したり、追加で修正したりしないでください。指示された箇所だけを変更します。

【出力スキーマ】
{
  "oneLineSummary": "string",
  "yaritaiKoto": "string",
  "yokkyu": "string",
  "sainou": "string",
  "sainouHouteishiki": "string",
  "hatsudouJouken": "string",
  "ikasuHouhou": "string"
}

【参考: 元の文字起こし】
${transcript}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: editPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    })

    const text = response.text
    if (!text) throw new Error('Geminiから空のレスポンスが返ってきました')

    const result = JSON.parse(text)

    await logToSheet({ event: 'regenerate', ...baseLog, success: true })
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logToSheet({ event: 'regenerate', ...baseLog, success: false, error: message })
    return res.status(500).json({ error: message })
  }
}
