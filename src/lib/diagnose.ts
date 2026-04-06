import { getSession } from './auth'

export type DiagnosisResult = {
  oneLineSummary: string
  yaritaiKoto: string
  yokkyu: string
  sainou: string
  sainouHouteishiki: string
  hatsudouJouken: string
  ikasuHouhou: string
}

function authHeaders(): Record<string, string> {
  const session = getSession()
  if (!session) throw new Error('未ログインです')
  return {
    'Content-Type': 'application/json',
    'x-app-password': session.password,
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `APIエラー (${res.status})`)
  }
  return (await res.json()) as T
}

export async function diagnose(transcript: string, name: string): Promise<DiagnosisResult> {
  const session = getSession()
  return postJson<DiagnosisResult>('/api/diagnose', {
    transcript,
    name,
    username: session?.username,
  })
}

export async function regenerateWithChange(
  transcript: string,
  name: string,
  previous: DiagnosisResult,
  changeRequest: string,
): Promise<DiagnosisResult> {
  const session = getSession()
  return postJson<DiagnosisResult>('/api/regenerate', {
    transcript,
    name,
    previous,
    changeRequest,
    username: session?.username,
  })
}
