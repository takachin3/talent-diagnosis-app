import { useState } from 'react'
import { login } from '../lib/auth'

type Props = {
  onLogin: () => void
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return setError('ユーザー名を入力してください')
    if (!password.trim()) return setError('パスワードを入力してください')

    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl font-black text-ink sm:text-3xl">才能診断レポート生成ツール</h1>
        <p className="mt-2 text-xs text-slate-600 sm:text-sm">
          ログインしてご利用ください
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="お名前 / ニックネーム"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-base focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="共有パスワード"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-base focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink px-6 py-3 text-base font-bold text-white transition hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
