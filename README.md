# 才能診断レポート生成ツール

才能診断セッションの文字起こし（.txt / .docx / 直接入力）から、Gemini 2.5 Flash を使って7項目の才能診断結果を生成し、PNG画像としてダウンロードできるWebアプリ。

ログイン認証付き／全操作のログを Google Sheets に自動記録。

## 出力項目

1. **あなたを一言で表すと** — キャッチコピー
2. **やりたいこと** — 欲求を満たすための具体的な目標
3. **欲求** — 行動の源泉
4. **才能** — ついついやってしまうこと
5. **才能方程式** — `〜する × 〜する × 〜する` 形式の成功法則
6. **発動条件** — 健康／仕事／人間関係／お金
7. **才能を活かす方法** — 実践的アドバイス

## 機能

- ファイル D&D / 直接入力対応
- レスポンシブUI（スマホOK）
- 高解像度PNGエクスポート
- **再度生成** ボタン
- **変更箇所を入力** ボタン（指定箇所だけを修正、他は一字一句保持）
- ログイン認証（共有パスワード方式）
- Google Sheets 自動ログ（ログイン・診断・修正の全イベント）

## デプロイ

本番デプロイの全手順は **[DEPLOY.md](./DEPLOY.md)** を参照してください。
所要時間 30〜45分で `xxx.vercel.app` のURLが立ち上がります。

## ローカル開発

サーバーサイド関数（`/api/*`）が含まれているため、ローカル動作確認には Vercel CLI を使います。

```bash
npm install -g vercel
cd "/Users/takachin/flier book labo/flier book labo app"
vercel dev
```

`.env.local` に以下を設定してから起動：
```
GEMINI_API_KEY=AIza...
APP_PASSWORD=your-shared-password
SHEET_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

## 技術スタック

- Vite + React + TypeScript
- Tailwind CSS
- Vercel Serverless Functions（Node.js）
- @google/genai（Gemini 2.5 Flash）
- mammoth（.docx パース）
- html-to-image（PNG エクスポート）
- Google Apps Script（Sheets ロギング）

## ファイル構成

```
.
├── api/                       # Vercel Serverless Functions
│   ├── _utils.ts              # 認証チェック・ログ送信ヘルパー
│   ├── _prompt.ts             # 診断システムプロンプト
│   ├── login.ts               # ログイン認証
│   ├── diagnose.ts            # 診断実行
│   └── regenerate.ts          # 部分修正
├── src/
│   ├── App.tsx                # メインUI（認証ゲート付き）
│   ├── components/
│   │   ├── Login.tsx          # ログイン画面
│   │   └── ResultCard.tsx     # 診断結果カード（PNG化対象）
│   └── lib/
│       ├── auth.ts            # セッション管理
│       ├── diagnose.ts        # APIラッパー
│       └── extractText.ts     # docx/txt パース
├── google-apps-script.gs      # Sheets ロギング用スクリプト
├── DEPLOY.md                  # デプロイ手順
└── README.md
```
