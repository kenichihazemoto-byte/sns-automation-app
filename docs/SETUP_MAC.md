# iMac（macOS）開発環境セットアップ手順

## 1. リポジトリを取得（初回のみ）

ターミナル（アプリケーション → ユーティリティ → ターミナル）を開いて:

```bash
mkdir -p ~/dev && cd ~/dev
git clone https://github.com/kenichihazemoto-byte/sns-automation-app.git
cd sns-automation-app
```

> git が無い場合は、ダイアログが出るので「インストール」を押してから再実行してください。

## 2. 自動セットアップを実行

```bash
bash scripts/setup-mac.sh
```

自動で行うこと（入っているものはスキップ・何度実行してもOK）:

| # | 内容 |
|---|------|
| 1 | Xcode コマンドラインツール |
| 2 | Homebrew（Apple Silicon / Intel 両対応、`~/.zprofile` にパス追加） |
| 3 | Git / GitHub CLI / Node.js 22（GitHub Actions と同じ版） |
| 4 | pnpm（package.json 指定の版を corepack で有効化） |
| 5 | Git の名前・メール（未設定時のみ） |
| 6 | 依存パッケージのインストール |
| 7 | `.env` の作成（JWT_SECRET は自動生成、権限 600） |
| 8 | 型チェックと、`.env` の未入力項目の一覧表示 |

## 3. 手作業で行うこと

1. **新しいターミナルを開く**（パス反映のため）
2. **`.env` に値を入れる**：`open -e .env`
   - `DATABASE_URL`、Manus（`VITE_APP_ID` / `OAUTH_SERVER_URL` / `BUILT_IN_FORGE_*`）、Google、Chatwork の各キー
   - 値は Manus の管理画面・Google Cloud Console・Chatwork の API 設定から取得
3. **GitHub にログイン**：`gh auth login`（GitHub.com → HTTPS → ブラウザでログイン）
4. **起動**：`pnpm dev` → ブラウザで http://localhost:3000

## よく使うコマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm test` | テスト実行 |
| `pnpm check` | 型チェック |
| `pnpm build` | 本番ビルド |
| `git pull` | 最新版を取得 |
