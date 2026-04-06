import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { extractText } from './lib/extractText'
import { diagnose, regenerateWithChange, type DiagnosisResult } from './lib/diagnose'
import { ResultCard, CARD_WIDTH } from './components/ResultCard'
import { Login } from './components/Login'
import { clearSession, getSession } from './lib/auth'

export default function App() {
  const [authed, setAuthed] = useState(() => !!getSession())
  const [name, setName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showChangeInput, setShowChangeInput] = useState(false)
  const [changeRequest, setChangeRequest] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [cardHeight, setCardHeight] = useState(0)

  // プレビューを横幅に合わせて縮小表示
  useEffect(() => {
    if (!result) return
    function update() {
      const wrap = previewWrapRef.current
      const card = cardRef.current
      if (!wrap || !card) return
      const w = wrap.clientWidth
      const s = Math.min(1, w / CARD_WIDTH)
      setScale(s)
      setCardHeight(card.scrollHeight * s)
    }
    update()
    const ro = new ResizeObserver(update)
    if (previewWrapRef.current) ro.observe(previewWrapRef.current)
    if (cardRef.current) ro.observe(cardRef.current)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [result])

  async function processFile(file: File) {
    try {
      const text = await extractText(file)
      setTranscript(text)
      setFileName(file.name)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleDiagnose() {
    if (!name.trim()) return setError('対象者の名前を入力してください')
    if (!transcript.trim()) return setError('文字起こしを入力またはアップロードしてください')

    setError('')
    setLoading(true)
    setResult(null)
    try {
      const r = await diagnose(transcript, name)
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyChange() {
    if (!result) return
    if (!changeRequest.trim()) return setError('変更内容を入力してください')

    setError('')
    setLoading(true)
    try {
      const r = await regenerateWithChange(transcript, name, result, changeRequest)
      setResult(r)
      setChangeRequest('')
      setShowChangeInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f4f6fb',
      })
      const link = document.createElement('a')
      link.download = `${name}様_才能診断結果.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      setError('画像生成に失敗: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  const session = getSession()

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-black text-ink sm:text-3xl">才能診断レポート生成ツール</h1>
            <p className="mt-2 text-xs text-slate-600 sm:text-sm">
              才能診断セッション文字起こしから、診断結果レポートを生成します。
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-500">{session?.username} さん</span>
            <button
              onClick={() => {
                clearSession()
                setAuthed(false)
              }}
              className="text-xs font-bold text-accent hover:underline"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="space-y-5 rounded-2xl bg-white p-4 shadow sm:p-6">
          {/* 名前 */}
          <div>
            <label className="mb-1 block text-sm font-bold">対象者のお名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 田中太郎"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-base focus:border-accent focus:outline-none"
            />
          </div>

          {/* ファイル（D&D対応） */}
          <div>
            <label className="mb-1 block text-sm font-bold">文字起こしファイル（.txt / .docx）</label>
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                isDragging
                  ? 'border-accent bg-accent/10'
                  : 'border-slate-300 bg-slate-50 hover:border-accent hover:bg-accent/5'
              }`}
            >
              <input
                type="file"
                accept=".txt,.docx"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="text-3xl">📄</div>
              <div className="mt-2 text-sm font-bold text-ink">
                {isDragging ? 'ここにドロップ' : 'クリックして選択 / ドラッグ＆ドロップ'}
              </div>
              <div className="mt-1 text-xs text-slate-500">.txt または .docx</div>
              {fileName && (
                <div className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                  ✓ {fileName}（{transcript.length.toLocaleString()}文字）
                </div>
              )}
            </label>
          </div>

          {/* 直接入力 */}
          <div>
            <label className="mb-1 block text-sm font-bold">または直接入力</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="文字起こしテキストを貼り付け..."
              rows={6}
              className="w-full resize-y rounded-lg border border-slate-300 px-4 py-2 font-mono text-xs focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleDiagnose}
            disabled={loading}
            className="w-full rounded-lg bg-ink px-6 py-3 text-base font-bold text-white transition hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'レポートを生成中（30秒〜1分）' : '才能診断レポートを生成する'}
          </button>
        </div>

        {/* 結果表示 */}
        {result && (
          <div className="mt-8 sm:mt-10">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">診断結果</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDiagnose}
                  disabled={loading}
                  className="rounded-lg border-2 border-ink px-4 py-2 text-sm font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-50"
                >
                  🔄 再度生成
                </button>
                <button
                  onClick={() => setShowChangeInput((v) => !v)}
                  disabled={loading}
                  className="rounded-lg border-2 border-accent px-4 py-2 text-sm font-bold text-accent transition hover:bg-accent hover:text-white disabled:opacity-50"
                >
                  ✏️ 変更箇所を入力
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  📥 PNGで保存
                </button>
              </div>
            </div>

            {/* 部分修正入力 */}
            {showChangeInput && (
              <div className="mb-4 rounded-2xl border-2 border-accent bg-accent/5 p-4">
                <label className="mb-2 block text-sm font-bold text-ink">
                  変更したい箇所と内容を具体的に入力してください
                </label>
                <textarea
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="例: 才能方程式をもう少し簡潔に3ステップにしてください / あなたを一言で表すと、をもっと詩的な表現にしてください"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  ※ ここで指定した箇所**以外**は一字一句変更されません。
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleApplyChange}
                    disabled={loading}
                    className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '適用中...' : 'この変更を適用'}
                  </button>
                  <button
                    onClick={() => {
                      setShowChangeInput(false)
                      setChangeRequest('')
                    }}
                    disabled={loading}
                    className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* 縮小プレビュー */}
            <div
              ref={previewWrapRef}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:p-4"
            >
              <div
                style={{
                  width: '100%',
                  height: cardHeight ? `${cardHeight}px` : 'auto',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: `${CARD_WIDTH}px`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  <ResultCard ref={cardRef} name={name} result={result} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              ※ 上はプレビューです。「PNG画像でダウンロード」で実寸の高解像度画像が保存されます。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
