#!/usr/bin/env bash
# =====================================================================
#  iMac（macOS）開発環境 自動セットアップ  —  sns-automation-app
#
#  使い方（ターミナルで、このリポジトリのフォルダから）:
#    bash scripts/setup-mac.sh
#
#  何度実行しても安全です（入っているものはスキップします）。
#  入れるもの: Xcode コマンドラインツール / Homebrew / Git / GitHub CLI /
#              Node.js 22 / pnpm（corepack）/ 依存パッケージ / .env
# =====================================================================
set -euo pipefail

ok()   { printf "\033[32m✔ %s\033[0m\n" "$*"; }
info() { printf "\033[36m▶ %s\033[0m\n" "$*"; }
warn() { printf "\033[33m⚠ %s\033[0m\n" "$*"; }
die()  { printf "\033[31m✖ %s\033[0m\n" "$*"; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || die "このスクリプトは macOS 専用です。"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

info "環境チェック: macOS $(sw_vers -productVersion) / $(uname -m)"
FREE_GB=$(df -g / | awk 'NR==2{print $4}')
if (( FREE_GB < 10 )); then warn "ディスク空き容量が ${FREE_GB}GB です（10GB以上推奨）"; else ok "ディスク空き ${FREE_GB}GB"; fi

# 1. Xcode Command Line Tools
if xcode-select -p >/dev/null 2>&1; then
  ok "Xcode コマンドラインツール"
else
  info "Xcode コマンドラインツールをインストールします（ダイアログで『インストール』を押してください）"
  xcode-select --install || true
  until xcode-select -p >/dev/null 2>&1; do sleep 10; done
  ok "Xcode コマンドラインツール"
fi

# 2. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do [[ -x $p ]] && eval "$($p shellenv)"; done
fi
if ! command -v brew >/dev/null 2>&1; then
  info "Homebrew をインストールします（Mac のログインパスワードを聞かれます）"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do [[ -x $p ]] && eval "$($p shellenv)"; done
fi
BREW_BIN="$(command -v brew)"
if ! grep -qs "brew shellenv" "$HOME/.zprofile"; then
  echo "eval \"\$($BREW_BIN shellenv)\"" >> "$HOME/.zprofile"
fi
ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"

# 3. 基本ツール
for f in git gh node@22; do
  if brew list --formula "$f" >/dev/null 2>&1; then ok "$f"; else info "$f をインストール"; brew install "$f"; fi
done
NODE_PREFIX="$(brew --prefix node@22)"
export PATH="$NODE_PREFIX/bin:$PATH"
if ! grep -qs "node@22/bin" "$HOME/.zprofile"; then
  echo "export PATH=\"$NODE_PREFIX/bin:\$PATH\"" >> "$HOME/.zprofile"
fi
ok "Node.js $(node -v)"

# 4. pnpm（package.json の packageManager に合わせる）
corepack enable >/dev/null 2>&1 || npm install -g corepack
corepack enable
corepack prepare --activate >/dev/null 2>&1 || true
ok "pnpm $(pnpm -v)"

# 5. Git 初期設定（未設定のときだけ）
if [[ -z "$(git config --global user.name || true)" ]]; then
  git config --global user.name "Kenichi Hazemoto"
  ok "git user.name を設定"
fi
if [[ -z "$(git config --global user.email || true)" ]]; then
  git config --global user.email "ken@hazemoto-k.co.jp"
  ok "git user.email を設定"
fi
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input

# 6. GitHub ログイン
if gh auth status >/dev/null 2>&1; then
  ok "GitHub CLI ログイン済み"
else
  warn "GitHub 未ログインです。後で次を実行してください:  gh auth login"
fi

# 7. 依存パッケージ
info "依存パッケージをインストールします（数分かかります）"
pnpm install --frozen-lockfile
ok "pnpm install 完了"

# 8. .env
if [[ -f .env ]]; then
  ok ".env は既にあります（上書きしません）"
else
  cp .env.example .env
  SECRET="$(openssl rand -hex 32)"
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" .env
  chmod 600 .env
  warn ".env を作成しました。DATABASE_URL などの値を入れてください:  open -e .env"
fi

# 9. 型チェック（失敗しても続行）
info "TypeScript 型チェック"
if pnpm check >/dev/null 2>&1; then ok "型チェック OK"; else warn "型チェックでエラーあり（pnpm check で詳細確認）"; fi

# 10. 未入力の必須値チェック
MISSING=()
for k in DATABASE_URL VITE_APP_ID OAUTH_SERVER_URL BUILT_IN_FORGE_API_URL BUILT_IN_FORGE_API_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  v="$(grep -E "^$k=" .env | cut -d= -f2- || true)"
  if [[ -z "$v" || "$v" == *USER:PASSWORD* || "$v" == xxxxxxxx* || "$v" == GOCSPX-xxxx* ]]; then MISSING+=("$k"); fi
done

echo
ok "セットアップ完了！"
if (( ${#MISSING[@]} )); then
  warn ".env に未入力の項目があります: ${MISSING[*]}"
fi
cat <<MSG

次のステップ:
  1) 新しいターミナルを開く（PATH 反映のため）
  2) .env を編集:          open -e .env
  3) GitHub ログイン:      gh auth login
  4) 開発サーバー起動:     pnpm dev   →  http://localhost:3000
MSG
