/**
 * GitHub Actions から呼ばれるエントリーポイント
 *   node --experimental-strip-types scripts/chatwork-ranking-job.ts <sync|post|preview> [--force]
 *
 * 必要な環境変数: CHATWORK_API_TOKEN
 * 任意: CHATWORK_DATA_FILE, CHATWORK_DAIKU_ROOM_ID, CHATWORK_RANKING_EXCLUDE_IDS, CHATWORK_RANKING_INCLUDE_SELF
 */
import { appendFileSync } from "node:fs";
import { runJob, type Mode } from "../server/chatwork-job.ts";

const mode = (process.argv[2] ?? "sync") as Mode;
if (!["sync", "post", "preview"].includes(mode)) {
  console.error(`不明なモード: ${mode}`);
  process.exit(1);
}

const token = process.env.CHATWORK_API_TOKEN ?? "";
if (!token) {
  console.error("CHATWORK_API_TOKEN が設定されていません（GitHub → Settings → Secrets and variables → Actions）");
  process.exit(1);
}

/** 月曜 6:50 JST（= 日曜 21:50 UTC）より前に起動した場合は、その時刻まで待つ */
async function waitUntilPostTime(): Promise<void> {
  const now = new Date();
  if (now.getUTCDay() !== 0) return;
  const target = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 50);
  const wait = target - now.getTime();
  if (wait > 0 && wait <= 30 * 60 * 1000) {
    console.log(`投稿時刻まで ${Math.ceil(wait / 1000)} 秒待機します`);
    await new Promise(r => setTimeout(r, wait));
  }
}

if (mode === "post") await waitUntilPostTime();

const result = await runJob({
  mode,
  token,
  dataPath: process.env.CHATWORK_DATA_FILE || ".chatwork-data/teamdaiku.enc",
  force: process.argv.includes("--force"),
});

console.log(result.summary);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed}\n`);
}
