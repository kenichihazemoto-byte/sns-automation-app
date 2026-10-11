#!/usr/bin/env node
/**
 * WordPress にブログ記事を「下書き」として投稿するスクリプト
 *
 * 使い方:
 *   node scripts/wp-post-draft.mjs <本文HTML> --title "記事タイトル" [--excerpt "抜粋"] [--category ブログ]
 *
 * 必要な環境変数（値はチャットに貼らず、環境設定に登録すること）:
 *   WP_URL           例: https://hazemoto-k.co.jp
 *   WP_USER          WordPress のユーザー名
 *   WP_APP_PASSWORD  ユーザープロフィールで発行した「アプリケーションパスワード」
 *
 * 常に status=draft で作成するため、公開はWordPress管理画面で人が行う。
 */
import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const { WP_URL, WP_USER, WP_APP_PASSWORD } = process.env;
if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
  console.error("WP_URL / WP_USER / WP_APP_PASSWORD が設定されていません。");
  process.exit(1);
}
if (!file || !opt("title")) {
  console.error('使い方: node scripts/wp-post-draft.mjs <本文HTML> --title "タイトル" [--excerpt "抜粋"] [--category ブログ]');
  process.exit(1);
}

const api = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2`;
const auth = "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");

async function wp(path, init = {}) {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: { Authorization: auth, "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body.code ?? ""} ${body.message ?? ""}`);
  return body;
}

const content = await readFile(file, "utf8");
const post = { title: opt("title"), content, status: "draft" };
if (opt("excerpt")) post.excerpt = opt("excerpt");

const categoryName = opt("category");
if (categoryName) {
  const cats = await wp(`/categories?search=${encodeURIComponent(categoryName)}&per_page=20`);
  const hit = cats.find((c) => c.name === categoryName);
  if (hit) post.categories = [hit.id];
  else console.warn(`カテゴリ「${categoryName}」が見つからないため未設定で作成します。`);
}

const created = await wp("/posts", { method: "POST", body: JSON.stringify(post) });
console.log(`下書きを作成しました: ID=${created.id}`);
console.log(`編集画面: ${WP_URL.replace(/\/$/, "")}/wp-admin/post.php?post=${created.id}&action=edit`);
