// =====================================================
// 才能診断レポート生成ツール  ログ収集用 Apps Script
// =====================================================
//
// 使い方:
//  1. https://sheets.google.com で新規スプレッドシートを作成
//  2. メニュー → 拡張機能 → Apps Script
//  3. 開いたエディタにこのファイルの全文を貼り付けて保存
//  4. 「デプロイ」→「新しいデプロイ」→「種類: ウェブアプリ」
//     - 説明: talent-diagnosis-log
//     - 次のユーザーとして実行: 自分
//     - アクセスできるユーザー: 全員
//  5. 「デプロイ」→ 表示された Web アプリ URL をコピー
//  6. その URL を Vercel の環境変数 SHEET_WEBHOOK_URL に設定
//
// シートには以下の列が自動で追加されます:
//  timestamp | event | username | targetName | success | error | ip | userAgent
// =====================================================

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

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()

    // ヘッダー行がなければ追加
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS)
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
      sheet.setFrozenRows(1)
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.event || '',
      data.username || '',
      data.targetName || '',
      data.success === true ? '✓' : data.success === false ? '✗' : '',
      data.error || '',
      data.ip || '',
      data.userAgent || '',
    ])

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON,
    )
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

function doGet() {
  return ContentService.createTextOutput('talent-diagnosis-log endpoint is alive')
}
