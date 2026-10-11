/**
 * Chatwork 連携サービス（大工チーム 週次ランキング）
 *
 * - 30分ごとに TeamDAIKU ルームのメッセージ・メンバーを取得してDBに蓄積
 *   （Chatwork API は直近100件しか返さないため）
 * - 毎週月曜 6:50（JST）に「先週のランキング」を自動投稿
 *
 * 環境変数:
 *   CHATWORK_API_TOKEN            （必須）投稿するアカウントのAPIトークン
 *   CHATWORK_DAIKU_ROOM_ID        （任意）ルームID。未設定ならルーム名で自動検索
 *   CHATWORK_DAIKU_ROOM_NAME      （任意）検索するルーム名（既定: TeamDAIKU）
 *   CHATWORK_RANKING_EXCLUDE_IDS  （任意）ランキング対象外のアカウントID（カンマ区切り）
 *   CHATWORK_RANKING_INCLUDE_SELF （任意）"true" でトークン所有者もランキング対象にする
 *   CHATWORK_RANKING_ENABLED      （任意）"false" で自動投稿を停止（データ蓄積は継続）
 */
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "./db";
import {
  chatworkMembers,
  chatworkMessages,
  chatworkRankingPosts,
} from "../drizzle/schema";
import {
  JST_OFFSET_MS,
  buildWeeklyReport,
  formatReportMessage,
  previousWeekRange,
  type CwMember,
  type CwMessage,
  type WeeklyReport,
} from "./chatwork-ranking";

const API_BASE = "https://api.chatwork.com/v2";

/** 投稿時刻（JST） */
export const POST_SCHEDULE = { dayOfWeek: 1, hour: 6, minute: 50 } as const;
/** 起動遅延などで 6:50 を逃した場合に追いかけ投稿する猶予（分） */
const CATCH_UP_MINUTES = 180;

function token(): string {
  return process.env.CHATWORK_API_TOKEN ?? "";
}

export function isChatworkConfigured(): boolean {
  return token().length > 0;
}

async function cw<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "X-ChatWorkToken": token(),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chatwork API ${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

type ApiMessage = {
  message_id: string;
  account: { account_id: number; name: string };
  body: string;
  send_time: number;
};
type ApiMember = { account_id: number; name: string; role: string };
type ApiRoom = { room_id: number; name: string };

let cachedRoomId: string | null = null;
let cachedSelfId: number | null = null;

export async function resolveRoomId(): Promise<string> {
  const fromEnv = process.env.CHATWORK_DAIKU_ROOM_ID;
  if (fromEnv) return fromEnv;
  if (cachedRoomId) return cachedRoomId;
  const name = process.env.CHATWORK_DAIKU_ROOM_NAME || "TeamDAIKU";
  const rooms = (await cw<ApiRoom[]>("/rooms")) ?? [];
  const room =
    rooms.find(r => r.name.includes(name)) ?? rooms.find(r => r.name.includes("大工チーム"));
  if (!room) throw new Error(`Chatworkルーム「${name}」が見つかりません`);
  cachedRoomId = String(room.room_id);
  return cachedRoomId;
}

async function selfAccountId(): Promise<number | null> {
  if (cachedSelfId !== null) return cachedSelfId;
  const me = await cw<{ account_id: number }>("/me");
  cachedSelfId = me?.account_id ?? null;
  return cachedSelfId;
}

export async function getExcludeAccountIds(): Promise<number[]> {
  const ids = (process.env.CHATWORK_RANKING_EXCLUDE_IDS ?? "")
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0);
  if (process.env.CHATWORK_RANKING_INCLUDE_SELF !== "true") {
    const self = await selfAccountId().catch(() => null);
    if (self) ids.push(self);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// 同期（取得 → DB蓄積）
// ---------------------------------------------------------------------------

export async function syncChatworkRoom(): Promise<{ messages: number; members: number }> {
  const db = await getDb();
  if (!db) throw new Error("DBに接続できません");
  const roomId = await resolveRoomId();

  // force=1：既読状態に関わらず直近100件を取得（Chatwork上の既読には影響しない）
  const msgs = (await cw<ApiMessage[]>(`/rooms/${roomId}/messages?force=1`)) ?? [];
  for (const m of msgs) {
    await db
      .insert(chatworkMessages)
      .values({
        roomId,
        messageId: m.message_id,
        accountId: m.account.account_id,
        accountName: m.account.name,
        body: m.body,
        sendTime: m.send_time,
      })
      .onDuplicateKeyUpdate({ set: { body: m.body, accountName: m.account.name } });
  }

  const members = (await cw<ApiMember[]>(`/rooms/${roomId}/members`)) ?? [];
  const existing = await db
    .select()
    .from(chatworkMembers)
    .where(eq(chatworkMembers.roomId, roomId));
  // 初回同期時は全員「以前からのメンバー」扱いにする（全員が新人判定されるのを防ぐ）
  const bootstrap = existing.length === 0;
  const currentIds = new Set(members.map(m => m.account_id));
  for (const m of members) {
    await db
      .insert(chatworkMembers)
      .values({
        roomId,
        accountId: m.account_id,
        name: m.name,
        active: true,
        ...(bootstrap ? { firstSeenAt: new Date("2000-01-01T00:00:00Z") } : {}),
      })
      .onDuplicateKeyUpdate({ set: { name: m.name, active: true } });
  }
  for (const e of existing) {
    if (e.active && !currentIds.has(e.accountId)) {
      await db
        .update(chatworkMembers)
        .set({ active: false })
        .where(eq(chatworkMembers.id, e.id));
    }
  }

  return { messages: msgs.length, members: members.length };
}

// ---------------------------------------------------------------------------
// レポート
// ---------------------------------------------------------------------------

export async function buildReportFromDb(now = new Date()): Promise<{
  roomId: string;
  report: WeeklyReport;
  text: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("DBに接続できません");
  const roomId = await resolveRoomId();
  const week = previousWeekRange(now);
  // 先週・先々週比較＋初投稿判定のため、5週間分を読み込む
  const since = week.start - 28 * 24 * 3600;

  const rows = await db
    .select()
    .from(chatworkMessages)
    .where(and(eq(chatworkMessages.roomId, roomId), gte(chatworkMessages.sendTime, since)));
  const messages: CwMessage[] = rows.map(r => ({
    messageId: r.messageId,
    accountId: r.accountId,
    accountName: r.accountName,
    body: r.body,
    sendTime: r.sendTime,
  }));

  const memberRows = await db
    .select()
    .from(chatworkMembers)
    .where(and(eq(chatworkMembers.roomId, roomId), eq(chatworkMembers.active, true)));
  const members: CwMember[] = memberRows.map(m => ({
    accountId: m.accountId,
    name: m.name,
    firstSeenAt: Math.floor(m.firstSeenAt.getTime() / 1000),
  }));

  const report = buildWeeklyReport({
    now,
    messages,
    members,
    excludeAccountIds: await getExcludeAccountIds(),
  });
  return { roomId, report, text: formatReportMessage(report) };
}

export async function postWeeklyRanking(opts: { now?: Date; force?: boolean } = {}): Promise<{
  posted: boolean;
  reason?: string;
  weekKey: string;
  messageId?: string;
}> {
  const now = opts.now ?? new Date();
  const db = await getDb();
  if (!db) throw new Error("DBに接続できません");

  await syncChatworkRoom();
  const { roomId, report, text } = await buildReportFromDb(now);
  const weekKey = report.week.key;

  const already = await db
    .select()
    .from(chatworkRankingPosts)
    .where(and(eq(chatworkRankingPosts.roomId, roomId), eq(chatworkRankingPosts.weekKey, weekKey)))
    .limit(1);
  if (already.length > 0 && !opts.force) {
    return { posted: false, reason: "この週のランキングは投稿済みです", weekKey };
  }

  const res = await cw<{ message_id: string }>(`/rooms/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ body: text, self_unread: "0" }).toString(),
  });
  const messageId = res?.message_id;

  await db
    .insert(chatworkRankingPosts)
    .values({ roomId, weekKey, postedMessageId: messageId ?? null, body: text })
    .onDuplicateKeyUpdate({ set: { postedMessageId: messageId ?? null, body: text } });

  console.log(`[ChatworkRanking] Posted weekly ranking for ${weekKey} (message ${messageId})`);
  return { posted: true, weekKey, messageId };
}

export async function getRankingHistory(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatworkRankingPosts)
    .orderBy(desc(chatworkRankingPosts.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// スケジューラー
// ---------------------------------------------------------------------------

/** 現在が「月曜 6:50〜(6:50+猶予)」の投稿ウィンドウ内か（JST） */
export function isInPostWindow(now: Date): boolean {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  if (jst.getUTCDay() !== POST_SCHEDULE.dayOfWeek) return false;
  const minutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  const target = POST_SCHEDULE.hour * 60 + POST_SCHEDULE.minute;
  return minutes >= target && minutes < target + CATCH_UP_MINUTES;
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastSyncAt = 0;
let postingWeek: string | null = null;
let failedAttempts = 0;
let ticking = false;
const SYNC_INTERVAL_MS = 30 * 60 * 1000;
const MAX_POST_ATTEMPTS = 5;

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    await runTick(new Date());
  } finally {
    ticking = false;
  }
}

async function runTick(now: Date): Promise<void> {
  if (Date.now() - lastSyncAt >= SYNC_INTERVAL_MS) {
    lastSyncAt = Date.now();
    try {
      const r = await syncChatworkRoom();
      console.log(`[ChatworkRanking] Synced ${r.messages} messages / ${r.members} members`);
    } catch (e) {
      console.warn("[ChatworkRanking] Sync failed:", e);
    }
  }

  if (process.env.CHATWORK_RANKING_ENABLED === "false") return;
  if (!isInPostWindow(now)) {
    failedAttempts = 0;
    return;
  }

  const weekKey = previousWeekRange(now).key;
  if (postingWeek === weekKey || failedAttempts >= MAX_POST_ATTEMPTS) return;
  postingWeek = weekKey;
  try {
    const r = await postWeeklyRanking({ now });
    if (!r.posted) console.log(`[ChatworkRanking] Skip: ${r.reason}`);
    // 投稿済み → postingWeek を保持して以降はスキップ
  } catch (e) {
    failedAttempts += 1;
    postingWeek = null; // 次の tick で再試行
    console.error(`[ChatworkRanking] Post failed (${failedAttempts}/${MAX_POST_ATTEMPTS}):`, e);
  }
}

export function startChatworkRankingScheduler(): void {
  if (!isChatworkConfigured()) {
    console.log("[ChatworkRanking] CHATWORK_API_TOKEN not set; scheduler disabled");
    return;
  }
  if (schedulerTimer) return;
  console.log("[ChatworkRanking] Scheduler started (every Monday 06:50 JST)");
  tick().catch(e => console.warn("[ChatworkRanking] tick error:", e));
  schedulerTimer = setInterval(() => {
    tick().catch(e => console.warn("[ChatworkRanking] tick error:", e));
  }, 60 * 1000);
}
