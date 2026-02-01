# URL Memo

URLをメモとして保存・管理するPWA（Progressive Web App）です。
Androidの共有機能から直接URLを取り込み、メモとして保存できます。

## 使い方

### インストール

1. Chrome（Android）で本アプリのURLにアクセス
2. 「ホーム画面に追加」からインストール
3. ホーム画面のアイコンからアプリとして起動

### メモの作成・編集

- 右下の **＋** ボタンをタップして新規メモを作成
- テキストを入力し **保存** をタップ
- 一覧からメモをタップすると編集画面へ

### URLの共有（Android）

他のアプリ（ブラウザ、SNSなど）から **共有** メニューを開き、「URL Memo」を選択すると、共有されたURLが新規メモの編集画面に自動入力されます。

### メモの削除

- 各メモの右側にある **×** ボタンをタップ
- またはメモを **左にスワイプ**
- 確認ダイアログで「削除」を選択

### その他の機能

| 機能 | 説明 |
|------|------|
| コピー | 編集画面でメモの内容をクリップボードにコピー |
| 共有 | 編集画面からOS標準の共有メニューを呼び出し |
| オフライン | インターネット接続なしでも動作 |

### データについて

- メモはすべてブラウザの `localStorage` に保存されます
- サーバーへのデータ送信は一切ありません
- ブラウザのデータを消去するとメモも消えます

---

## 開発者向け

### 技術スタック

- **HTML / CSS / JavaScript**（Vanilla、外部ライブラリなし）
- ビルドツール・パッケージマネージャなし
- Service Worker によるオフライン対応
- Web Share Target API によるAndroid共有連携

### ファイル構成

```
URL-sharing-support-PWA/
├── index.html        # シングルページHTML（ビューはJSで切替）
├── app.js            # アプリケーションロジック全体（IIFE）
├── style.css         # スタイル（CSSカスタムプロパティ使用）
├── sw.js             # Service Worker（キャッシュ管理・共有ターゲット処理）
├── manifest.json     # PWAマニフェスト（share_target設定含む）
├── .nojekyll         # GitHub Pages用（Jekyll処理の無効化）
├── CLAUDE.md         # AIアシスタント向けコードベースガイド
└── icons/
    ├── icon-192.png  # アプリアイコン 192x192
    └── icon-512.png  # アプリアイコン 512x512
```

### ローカル開発

ビルドステップは不要です。ローカルサーバーを起動して `localhost` でアクセスしてください（Service Workerの動作にはHTTPSまたはlocalhostが必要です）。

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

ブラウザで `http://localhost:8000` を開きます。

### アーキテクチャ

**ビュー切替**: `hidden` CSSクラスのトグルによるシングルページ構成（リスト画面 / 編集画面）

**データモデル**: `localStorage` に `url_memo_data` キーでJSON配列として保存

```js
{
  id: string,        // crypto.randomUUID() またはフォールバック
  text: string,      // メモ本文
  createdAt: number,  // 作成日時（Unixタイムスタンプ ms）
  updatedAt: number   // 更新日時（Unixタイムスタンプ ms）
}
```

**Service Worker**: キャッシュファースト戦略。共有ターゲットのリクエスト（`title`/`text`/`url` パラメータ付き）はキャッシュ済みの `index.html` を返す。

**共有ターゲットの流れ**:
1. Androidが `?title=...&text=...&url=...` のGETリクエストを送信
2. Service Workerがキャッシュの `index.html` を返却
3. `app.js` の `handleShareTarget()` がクエリパラメータを解析し編集画面を表示
4. `history.replaceState()` でURLパラメータをクリーンアップ

### コーディング規約

**JavaScript**:
- IIFE + `'use strict'` でスコープを隔離
- 定数は `UPPERCASE_SNAKE`（例: `STORAGE_KEY`）
- 関数は `camelCase`（例: `loadMemos`, `renderList`）
- DOM要素はIIFEスコープ先頭でキャッシュ

**CSS**:
- `:root` にCSSカスタムプロパティでカラーパレット定義
- BEM風のクラス命名（`.memo-item`, `.memo-item-content`）
- ボタンは `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.action-btn`

**HTML**:
- セマンティック要素 + `aria-label` 属性
- UIテキストはすべて日本語

### 変更時の注意事項

- **アセット追加・削除時**: `sw.js` の `ASSETS` 配列を更新すること
- **デプロイ時**: `sw.js` の `CACHE_NAME` をバージョンアップすること（例: `url-memo-v2` → `url-memo-v3`）
- **パス指定**: GitHub Pages互換のため `./` 相対パスを使用（`/` は不可）
- **UI文言**: 新しいユーザー向けテキストは日本語で記述
- **依存関係**: 外部ライブラリ・ビルドツールは導入しない

### テスト

テストフレームワークは未導入です。以下を手動で確認してください。

- メモの作成・編集・削除
- スワイプ削除（タッチデバイス）
- コピー・共有機能
- オフラインモード（DevTools > Network > Offline）
- 共有ターゲット（Android実機 or エミュレータ、PWAインストール済み環境）

### デプロイ

GitHub Pagesブランチにプッシュすると自動デプロイされます。`.nojekyll` ファイルにより、Jekyll処理はスキップされます。
