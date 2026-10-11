/**
 * Chatwork 大工チーム週間ランキング（GitHub Actions 版ジョブ）
 *
 * アプリサーバーを使わず、GitHub Actions の定期実行だけで動かすためのジョブ。
 *  - sync    : メッセージ・メンバーを取得して暗号化データファイルに蓄積
 *  - post    : 同期したうえで「先週のランキング」を TeamDAIKU に投稿（週1回・二重投稿防止）
 *  - preview : 同期したうえで、投稿予定の本文を自分の「マイチャット」に送る（確認用）
 *
 * リポジトリが公開のため、蓄積データは AES-256-GCM で暗号化して保存し、
 * ログには氏名や本文を出力しない（件数のみ）。
 *
 * Node 22 の --experimental-strip-types で依存パッケージなしに実行できるよう、
 * Node 標準モジュールと chatwork-ranking.ts のみに依存する。
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildWeeklyReport,
  formatReportMessage,
  previousWeekRange,
  type CwMember,
  type CwMessage,
} from "./chatwork-ranking.ts";

const API_BASE = "https://api.chatwork.com/v2";
/** 蓄積データの保持期間（ランキングは5週間分を参照） */
const RETENTION_DAYS = 56;

export type JobData = {
  version: 1;
  roomId: string | null;
  messages: CwMessage[];
  members: CwMember[];
  /** 投稿済みの週（weekKey → 投稿メッセージID） */
  posted: Record<string, string>;
};

export function emptyData(): JobData {
  return { version: 1, roomId: null, messages: [], members: [], posted: {} };
}

// ---------------------------------------------------------------------------
// 暗号化（AES-256-GCM）
// ---------------------------------------------------------------------------

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`teamdaiku-ranking:${secret}`).digest();
}

export function encrypt(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: body.toString("base64"),
  });
}

export function decrypt(blob: string, secret: string): string {
  const { iv, tag, data } = JSON.parse(blob) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

export function loadData(path: string, secret: string): JobData {
  if (!existsSync(path)) return emptyData();
  try {
    const data = JSON.parse(decrypt(readFileSync(path, "utf8"), secret)) as JobData;
    return { ...emptyData(), ...data };
  } catch {
    // 鍵（トークン）が変わった等で復号できない場合は、新規に蓄積し直す
    console.warn("[chatwork-job] データを復号できないため、新規に蓄積を開始します");
    return emptyData();
  }
}

/** 内容が変わったときだけ書き込む（変更なしならコミット不要） */
export function saveData(path: string, secret: string, before: string, data: JobData): boolean {
  const after = JSON.stringify(data);
  if (after === before && existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encrypt(after, secret));
  return true;
}

// ---------------------------------------------------------------------------
// Chatwork API
// ---------------------------------------------------------------------------

type Fetch = typeof fetch;

export function createClient(token: string, fetchImpl: Fetch = fetch) {
  async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
    const res = await fetchImpl(`${API_BASE}${path}`, {
      ...init,
      headers: { "X-ChatWorkToken": token, ...(init?.headers ?? {}) },
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      // 本文には個人情報が含まれ得るため、ステータスとパスのみ出す
      throw new Error(`Chatwork API ${res.status} ${path.replace(/\d+/g, "*")}`);
    }
    return (await res.json()) as T;
  }
  return {
    me: () => call<{ account_id: number }>("/me"),
    rooms: () => call<{ room_id: number; name: string; type: string }[]>("/rooms"),
    messages: (roomId: string) =>
      call<{ message_id: string; account: { account_id: number; name: string }; body: string; send_time: number }[]>(
        `/rooms/${roomId}/messages?force=1`,
      ),
    members: (roomId: string) => call<{ account_id: number; name: string }[]>(`/rooms/${roomId}/members`),
    post: (roomId: string, body: string) =>
      call<{ message_id: string }>(`/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ body, self_unread: "0" }).toString(),
      }),
  };
}

type Client = ReturnType<typeof createClient>;

export async function resolveRoom(client: Client, data: JobData, env: NodeJS.ProcessEnv): Promise<string> {
  if (env.CHATWORK_DAIKU_ROOM_ID) return env.CHATWORK_DAIKU_ROOM_ID;
  if (data.roomId) return data.roomId;
  const name = env.CHATWORK_DAIKU_ROOM_NAME || "TeamDAIKU";
  const rooms = (await client.rooms()) ?? [];
  const room = rooms.find(r => r.name.includes(name)) ?? rooms.find(r => r.name.includes("大工チーム"));
  if (!room) throw new Error(`ルーム「${name}」が見つかりません`);
  return String(room.room_id);
}

/** メッセージ・メンバーを取得してデータに統合する */
export async function syncInto(client: Client, data: JobData, roomId: string, now: Date): Promise<{ added: number; members: number }> {
  data.roomId = roomId;
  const nowSec = Math.floor(now.getTime() / 1000);

  const known = new Map(data.messages.map(m => [m.messageId, m]));
  let added = 0;
  for (const m of (await client.messages(roomId)) ?? []) {
    const rec: CwMessage = {
      messageId: m.message_id,
      accountId: m.account.account_id,
      accountName: m.account.name,
      body: m.body,
      sendTime: m.send_time,
    };
    if (!known.has(rec.messageId)) added++;
    known.set(rec.messageId, rec);
  }
  const cutoff = nowSec - RETENTION_DAYS * 24 * 3600;
  data.messages = [...known.values()].filter(m => m.sendTime >= cutoff).sort((a, b) => a.sendTime - b.sendTime);

  const apiMembers = (await client.members(roomId)) ?? [];
  // 初回は全員「以前からのメンバー」扱い（全員が新人判定されるのを防ぐ）
  const bootstrap = data.members.length === 0;
  const prev = new Map(data.members.map(m => [m.accountId, m]));
  data.members = apiMembers.map(m => ({
    accountId: m.account_id,
    name: m.name,
    firstSeenAt: prev.get(m.account_id)?.firstSeenAt ?? (bootstrap ? 0 : nowSec),
  }));

  return { added, members: data.members.length };
}

export async function excludeIds(client: Client, env: NodeJS.ProcessEnv): Promise<number[]> {
  const ids = (env.CHATWORK_RANKING_EXCLUDE_IDS ?? "")
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0);
  if (env.CHATWORK_RANKING_INCLUDE_SELF !== "true") {
    const me = await client.me();
    if (me) ids.push(me.account_id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// ジョブ本体
// ---------------------------------------------------------------------------

export type Mode = "sync" | "post" | "preview";

export async function runJob(opts: {
  mode: Mode;
  token: string;
  dataPath: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  force?: boolean;
  fetchImpl?: Fetch;
}): Promise<{ changed: boolean; summary: string }> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const client = createClient(opts.token, opts.fetchImpl);

  const data = loadData(opts.dataPath, opts.token);
  const before = JSON.stringify(data);

  const roomId = await resolveRoom(client, data, env);
  const s = await syncInto(client, data, roomId, now);
  const lines = [`同期: 新規メッセージ${s.added}件 / 蓄積${data.messages.length}件 / メンバー${s.members}名`];

  if (opts.mode !== "sync") {
    const report = buildWeeklyReport({
      now,
      messages: data.messages,
      members: data.members,
      excludeAccountIds: await excludeIds(client, env),
    });
    const text = formatReportMessage(report);
    const weekKey = previousWeekRange(now).key;

    if (opts.mode === "preview") {
      const rooms = (await client.rooms()) ?? [];
      const my = rooms.find(r => r.type === "my");
      if (!my) throw new Error("マイチャットが見つかりません");
      await client.post(String(my.room_id), `[info][title]【プレビュー】月曜6:50に大工チームへ投稿される内容[/title]${text}[/info]`);
      lines.push(`プレビューをマイチャットに送信しました（対象週 ${weekKey}、ランキング${report.ranking.length}名）`);
    } else if (data.posted[weekKey] && !opts.force) {
      lines.push(`対象週 ${weekKey} は投稿済みのためスキップしました`);
    } else {
      const res = await client.post(roomId, text);
      data.posted[weekKey] = res?.message_id ?? "unknown";
      lines.push(`対象週 ${weekKey} のランキングを投稿しました（ランキング${report.ranking.length}名）`);
    }
  }

  const changed = saveData(opts.dataPath, opts.token, before, data);
  return { changed, summary: lines.join("\n") };
}
