# デプロイ手順（Vercel）

URLを共有して使ってもらうための、本番デプロイの全手順です。所要時間：30〜45分。

---

## 全体像

```
[ユーザー] → [Vercel (xxx.vercel.app)]
                ↓
         ログイン (api/login)
                ↓
        診断実行 (api/diagnose) ──→ Gemini API
                ↓
         ログ送信 (api/log)
                ↓
       [Google Sheets]
```

- **Geminiキー** はサーバー側（Vercel環境変数）に保存 → ブラウザに漏れません
- **共有パスワード** はサーバー側に1つだけ。ユーザー名は自由入力
- **すべての操作（ログイン・診断・部分修正）** が Google Sheets に記録されます

---

## Step 1. Google Sheets ＋ Apps Script を準備

### 1-1. スプレッドシートを作成

1. https://sheets.google.com で新しいスプレッドシートを作成
2. 名前を `才能診断ログ` などに変更

### 1-2. Apps Script を貼り付け

1. メニュー → **拡張機能** → **Apps Script** をクリック
2. エディタが開いたら、初期コードを全部削除
3. プロジェクトルートの `google-apps-script.gs` の **全文をコピー** して貼り付け
4. 💾 **保存**（Ctrl+S / Cmd+S）

### 1-3. ウェブアプリとしてデプロイ

1. 右上の **「デプロイ」** → **「新しいデプロイ」**
2. 歯車アイコン → **「ウェブアプリ」** を選択
3. 設定：
   - **説明**: `talent-diagnosis-log`
   - **次のユーザーとして実行**: `自分（あなたのGoogleアカウント）`
   - **アクセスできるユーザー**: `全員`
4. **「デプロイ」** をクリック
5. 初回はGoogleアカウントの認可が求められます → 許可
6. 表示された **「ウェブアプリのURL」** をコピー
   - 例: `https://script.google.com/macros/s/AKfycby.../exec`
7. このURLをメモ帳などに保存（あとでVercelに設定します）

> 💡 デプロイ後にスクリプトを修正した場合は、**「デプロイを管理」** から既存デプロイを編集 → バージョンを **「新バージョン」** にして更新する必要があります。

---

## Step 2. GitHub にコードをプッシュ

Vercel は GitHub リポジトリと連携してデプロイします。

### 2-1. リポジトリを作成

```bash
cd "/Users/takachin/flier book labo/flier book labo app"
git init
git add .
git commit -m "initial commit"
```

その後 https://github.com/new でプライベートリポジトリを作成し、表示される手順に従ってプッシュ：

```bash
git remote add origin https://github.com/あなたのID/talent-diagnosis-app.git
git branch -M main
git push -u origin main
```

> ⚠️ `.env.local` は `.gitignore` に入っているのでGitHubには上がりません。

---

## Step 3. Vercel にデプロイ

### 3-1. Vercel アカウント作成 & プロジェクト作成

1. https://vercel.com にアクセスして **GitHub でログイン**
2. **「Add New」** → **「Project」**
3. 作成したリポジトリを選択 → **「Import」**
4. **「Framework Preset」が `Vite` になっていることを確認**
5. **「Environment Variables」** セクションを開いて、以下の3つを追加：

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | `AIza...`（あなたのGeminiキー） |
| `APP_PASSWORD` | 共有パスワード（任意の文字列。例: `flier-book-2026`） |
| `SHEET_WEBHOOK_URL` | Step 1-3 でコピーしたApps Script URL |

6. **「Deploy」** をクリック
7. ビルド完了まで1〜2分待つ
8. 完了したら **`xxx.vercel.app`** のURLが表示されます🎉

---

## Step 4. 動作確認

1. デプロイされたURLをブラウザで開く
2. ログイン画面が表示されることを確認
3. ユーザー名（任意）＋ 設定したパスワードを入力
4. ログイン成功 → 診断ツール画面が表示される
5. サンプル文字起こしで診断を実行
6. **Google Sheets を開いて、ログが記録されているか確認**

ログには以下が記録されます：

| 列 | 内容 |
|---|---|
| timestamp | 操作日時（ISO 8601） |
| event | `login` / `diagnose` / `regenerate` |
| username | ログイン時のユーザー名 |
| targetName | 診断対象者の名前（診断時のみ） |
| success | 成功 ✓ / 失敗 ✗ |
| error | エラーメッセージ（失敗時） |
| ip | クライアントIPアドレス |
| userAgent | ブラウザ情報 |

> 💡 「診断実行回数」は、Sheets上で `event = 'diagnose'` かつ `success = ✓` の行数を `=COUNTIFS(B:B,"diagnose",E:E,"✓")` などで集計してください。

---

## Step 5. URLを共有

`xxx.vercel.app` のURLと、設定した共有パスワードを利用者に伝えれば完了です。

---

## トラブルシューティング

### ログイン時に「サーバーにパスワードが設定されていません」

→ Vercelの環境変数 `APP_PASSWORD` が未設定。Vercel管理画面 → Settings → Environment Variables から追加し、**Redeploy** を実行。

### 診断時にタイムアウト

→ Vercel Hobby プランの関数実行時間は最大60秒。`api/diagnose.ts` で `maxDuration: 60` を指定済み。文字起こしが極端に長い場合のみ問題になります。

### Google Sheetsにログが記録されない

→ Apps ScriptのURLが正しく `SHEET_WEBHOOK_URL` に設定されているか確認。Apps Script側で `doGet` をブラウザで開いて `talent-diagnosis-log endpoint is alive` が表示されればOK。

### コードを修正した後の再デプロイ

```bash
git add .
git commit -m "update"
git push
```

→ Vercelが自動で再デプロイします。
