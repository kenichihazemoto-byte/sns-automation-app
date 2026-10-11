/**
 * Chatwork 大工チーム 週次ランキング（純粋関数モジュール）
 *
 * - メッセージ集計（投稿日数・投稿数・写真・返信・朝イチ報告）
 * - スコア算出とランキング
 * - 表彰（各賞）と励ましメッセージの選定
 * - Chatwork 投稿用本文の生成
 *
 * API・DB に依存しないため、単体テスト可能。
 */

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type CwMessage = {
  messageId: string;
  accountId: number;
  accountName: string;
  body: string;
  /** UNIX秒 */
  sendTime: number;
};

export type CwMember = {
  accountId: number;
  name: string;
  /** このシステムが初めてメンバーとして認識した日時（UNIX秒） */
  firstSeenAt?: number;
};

export type MemberStats = {
  accountId: number;
  name: string;
  posts: number;
  activeDays: number;
  photos: number;
  replies: number;
  morningDays: number;
  /** 長文（しっかり報告）の件数 */
  reports: number;
  score: number;
};

export type WeekRange = {
  /** 週の開始（月曜 00:00 JST）のUNIX秒 */
  start: number;
  /** 週の終了（翌月曜 00:00 JST）のUNIX秒（この値は含まない） */
  end: number;
  /** "2026-10-05" 形式（週の月曜日） */
  key: string;
  /** "10/5(月)〜10/11(日)" 形式 */
  label: string;
};

export type Award = {
  emoji: string;
  title: string;
  accountId: number;
  name: string;
  detail: string;
};

export type Encouragement = {
  accountId: number;
  name: string;
  kind: "newcomer" | "comeback" | "cheer";
  message: string;
};

export type WeeklyReport = {
  week: WeekRange;
  ranking: (MemberStats & { rank: number; prevRank: number | null })[];
  awards: Award[];
  encouragements: Encouragement[];
  team: {
    totalPosts: number;
    prevTotalPosts: number | null;
    activeMembers: number;
    totalMembers: number;
    participationRate: number;
    prevParticipationRate: number | null;
  };
};

// ---------------------------------------------------------------------------
// 日付ユーティリティ（JST固定）
// ---------------------------------------------------------------------------

/** JSTの日付キー "YYYY-MM-DD" */
export function jstDateKey(unixSec: number): string {
  const d = new Date(unixSec * 1000 + JST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** JSTの時（0-23） */
export function jstHour(unixSec: number): number {
  return new Date(unixSec * 1000 + JST_OFFSET_MS).getUTCHours();
}

/**
 * 指定日時の「先週」（月曜0:00〜日曜24:00 JST）を返す
 * 月曜 6:50 に実行すると、直前の月〜日が対象になる。
 */
export function previousWeekRange(now: Date): WeekRange {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const dow = jst.getUTCDay(); // 0=日 ... 1=月
  const daysSinceMonday = (dow + 6) % 7;
  const thisMondayJst = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate() - daysSinceMonday,
  );
  const startMs = thisMondayJst - 7 * 24 * 3600 * 1000 - JST_OFFSET_MS;
  return weekRangeFromStart(Math.floor(startMs / 1000));
}

export function weekRangeFromStart(startUnixSec: number): WeekRange {
  const end = startUnixSec + 7 * 24 * 3600;
  const s = new Date(startUnixSec * 1000 + JST_OFFSET_MS);
  const e = new Date((end - 1) * 1000 + JST_OFFSET_MS);
  const md = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return {
    start: startUnixSec,
    end,
    key: s.toISOString().slice(0, 10),
    label: `${md(s)}(月)〜${md(e)}(日)`,
  };
}

// ---------------------------------------------------------------------------
// メッセージ解析
// ---------------------------------------------------------------------------

/** Chatwork のシステム通知（メンバー追加・グループ情報変更など） */
export function isSystemMessage(body: string): boolean {
  return /\[dtext:chatroom_/.test(body) || /\[dtext:task_/.test(body);
}

/** 写真・ファイル共有 */
export function countFiles(body: string): number {
  const downloads = body.match(/\[download:\d+\]/g)?.length ?? 0;
  const previews = body.match(/\[preview id=\d+/g)?.length ?? 0;
  return Math.max(downloads, previews);
}

/** 返信・宛先指定（チーム内のコミュニケーション） */
export function isReply(body: string): boolean {
  return /\[rp aid=\d+/.test(body) || /\[To:\d+\]/.test(body);
}

/** タグ類を除いた本文の文字数 */
export function plainLength(body: string): number {
  return body
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, "")
    .length;
}

/** メンバー追加のシステム通知から、追加されたアカウントIDを抽出 */
export function extractAddedMemberIds(body: string): number[] {
  if (!/\[dtext:chatroom_added\]/.test(body) && !/\[dtext:chatroom_member_is\]/.test(body)) {
    return [];
  }
  const ids = [...body.matchAll(/\[piconname:(\d+)\]/g)].map(m => Number(m[1]));
  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// スコア
// ---------------------------------------------------------------------------

/**
 * スコア配点（定着＝毎日の積み重ねを最重視）
 *  - 投稿した日数   ×10点（最大70）
 *  - 投稿数         ×1点 （最大30）
 *  - 写真・ファイル ×3点 （最大60）
 *  - 返信・宛先     ×2点 （最大30）
 *  - 朝イチ報告日数 ×3点 （8時前の投稿がある日）
 *  - しっかり報告   ×2点 （50文字以上の投稿、最大20）
 */
export const SCORE_RULES = {
  activeDay: 10,
  post: 1,
  postCap: 30,
  photo: 3,
  photoCap: 20,
  reply: 2,
  replyCap: 15,
  morningDay: 3,
  report: 2,
  reportCap: 10,
  reportMinChars: 50,
  morningHour: 8,
} as const;

export function computeScore(s: Omit<MemberStats, "score">): number {
  const r = SCORE_RULES;
  return (
    s.activeDays * r.activeDay +
    Math.min(s.posts, r.postCap) * r.post +
    Math.min(s.photos, r.photoCap) * r.photo +
    Math.min(s.replies, r.replyCap) * r.reply +
    s.morningDays * r.morningDay +
    Math.min(s.reports, r.reportCap) * r.report
  );
}

/** 指定期間のメンバー別集計 */
export function aggregateWeek(
  messages: CwMessage[],
  range: { start: number; end: number },
  excludeAccountIds: number[] = [],
): Map<number, MemberStats> {
  const exclude = new Set(excludeAccountIds);
  const days = new Map<number, Set<string>>();
  const mornings = new Map<number, Set<string>>();
  const stats = new Map<number, MemberStats>();

  for (const m of messages) {
    if (m.sendTime < range.start || m.sendTime >= range.end) continue;
    if (exclude.has(m.accountId)) continue;
    if (isSystemMessage(m.body)) continue;

    let s = stats.get(m.accountId);
    if (!s) {
      s = {
        accountId: m.accountId,
        name: m.accountName,
        posts: 0,
        activeDays: 0,
        photos: 0,
        replies: 0,
        morningDays: 0,
        reports: 0,
        score: 0,
      };
      stats.set(m.accountId, s);
      days.set(m.accountId, new Set());
      mornings.set(m.accountId, new Set());
    }
    s.name = m.accountName || s.name;
    s.posts += 1;
    s.photos += countFiles(m.body);
    if (isReply(m.body)) s.replies += 1;
    if (plainLength(m.body) >= SCORE_RULES.reportMinChars) s.reports += 1;

    const day = jstDateKey(m.sendTime);
    days.get(m.accountId)!.add(day);
    const h = jstHour(m.sendTime);
    if (h >= 4 && h < SCORE_RULES.morningHour) mornings.get(m.accountId)!.add(day);
  }

  stats.forEach((s, id) => {
    s.activeDays = days.get(id)!.size;
    s.morningDays = mornings.get(id)!.size;
    s.score = computeScore(s);
  });
  return stats;
}

function sortRanking(list: MemberStats[]): MemberStats[] {
  return [...list].sort(
    (a, b) =>
      b.score - a.score ||
      b.activeDays - a.activeDays ||
      b.posts - a.posts ||
      a.accountId - b.accountId,
  );
}

/** 同点同順位のランク付け */
function assignRanks(sorted: MemberStats[]): Map<number, number> {
  const ranks = new Map<number, number>();
  let prevScore: number | null = null;
  let prevRank = 0;
  sorted.forEach((s, i) => {
    const rank = prevScore === s.score ? prevRank : i + 1;
    ranks.set(s.accountId, rank);
    prevScore = s.score;
    prevRank = rank;
  });
  return ranks;
}

// ---------------------------------------------------------------------------
// レポート生成
// ---------------------------------------------------------------------------

/** 週キーから決まる疑似乱数（同じ週なら同じ文面＝プレビューと本番が一致） */
function seededPicker(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return <T>(arr: readonly T[], salt = 0): T => {
    let x = (h ^ Math.imul(salt + 1, 2654435761)) >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return arr[(x >>> 0) % arr.length];
  };
}

const NEWCOMER_MESSAGES = [
  "ようこそTeamDAIKUへ！まずは現場の写真1枚からでOKです📷 みんなで盛り上げましょう！",
  "初登録ありがとうございます！「おはようございます」の一言だけでも立派な第一歩です🔨",
  "ようこそ！わからないことは気軽にここで聞いてください。来週のランキング入り、待ってます🏁",
] as const;

const COMEBACK_MESSAGES = [
  "久しぶりの投稿ありがとうございます！この勢いで来週はランキング入りを狙いましょう🔥",
  "おかえりなさい！1日1投稿でスコアがぐんと伸びますよ💪",
] as const;

const CHEER_MESSAGES = [
  "今週は「朝の一言＋現場写真1枚」から始めてみませんか？それだけで一気にランクアップです📈",
  "忙しい現場お疲れさまです！写真1枚＝3点。スキマ時間の1枚が効きます📷",
  "1日1回の投稿で投稿日数ボーナス10点！コツコツが一番強いです🔨",
  "みんな〇〇さんの現場の様子、楽しみにしてます！気軽に1枚どうぞ📷",
  "「今日の作業：〇〇」の一言だけでOK！来週の急上昇賞、狙えます🚀",
] as const;

const OPENING_LINES = [
  "おはようございます！月曜の朝、先週のTeamDAIKUランキングを発表します🎤",
  "おはようございます！今週もご安全に。まずは先週のランキング発表です🏗️",
  "おはようございます！お待ちかね（？）週間ランキングの時間です🥁",
] as const;

const CLOSING_LINES = [
  "今週も1日1投稿でコツコツいきましょう！ご安全に！🦺",
  "来週の1位は誰だ！？今週もよろしくお願いします🔨",
  "写真1枚・一言1つがチームの財産です。今週もご安全に！👷",
] as const;

export type BuildReportInput = {
  now: Date;
  messages: CwMessage[];
  members: CwMember[];
  excludeAccountIds?: number[];
  /** ランキングに表示する上位人数 */
  topN?: number;
};

export function buildWeeklyReport(input: BuildReportInput): WeeklyReport {
  const { now, messages, members } = input;
  const exclude = input.excludeAccountIds ?? [];
  const topN = input.topN ?? 5;
  const week = previousWeekRange(now);
  const prevWeek = weekRangeFromStart(week.start - 7 * 24 * 3600);
  const pick = seededPicker(week.key);

  const cur = aggregateWeek(messages, week, exclude);
  const prev = aggregateWeek(messages, prevWeek, exclude);
  const hasPrevData = messages.some(m => m.sendTime < week.start);

  const sorted = sortRanking([...cur.values()].filter(s => s.score > 0));
  const ranks = assignRanks(sorted);
  const prevSorted = sortRanking([...prev.values()].filter(s => s.score > 0));
  const prevRanks = assignRanks(prevSorted);

  const ranking = sorted.slice(0, topN).map(s => ({
    ...s,
    rank: ranks.get(s.accountId)!,
    prevRank: prevRanks.get(s.accountId) ?? null,
  }));

  // ---- 表彰 ----
  const awards: Award[] = [];
  // 部門賞はなるべく多くの人に行き渡るよう、まだ受賞していない人を優先する
  const awarded = new Set<number>();
  const best = (key: keyof MemberStats, min: number) => {
    const qualified = sortRanking(sorted)
      .sort((a, b) => (b[key] as number) - (a[key] as number))
      .filter(s => (s[key] as number) >= min);
    const top = qualified.find(s => !awarded.has(s.accountId)) ?? qualified[0];
    if (top) awarded.add(top.accountId);
    return top;
  };
  const allDays = sorted.filter(s => s.activeDays >= 6);
  for (const s of allDays) {
    awards.push({
      emoji: "🔥",
      title: "皆勤大工賞",
      accountId: s.accountId,
      name: s.name,
      detail: `${s.activeDays}日間投稿`,
    });
  }
  const photo = best("photos", 3);
  if (photo) {
    awards.push({ emoji: "📸", title: "写真職人賞", accountId: photo.accountId, name: photo.name, detail: `写真${photo.photos}枚` });
  }
  const morning = best("morningDays", 2);
  if (morning) {
    awards.push({ emoji: "🌅", title: "朝イチ棟梁賞", accountId: morning.accountId, name: morning.name, detail: `8時前の投稿${morning.morningDays}日` });
  }
  const reply = best("replies", 3);
  if (reply) {
    awards.push({ emoji: "🤝", title: "ナイスパス賞", accountId: reply.accountId, name: reply.name, detail: `返信・声かけ${reply.replies}回` });
  }
  if (hasPrevData) {
    // 1位以外で、先週から最もスコアを伸ばした人
    const jumps = sorted
      .filter(s => ranks.get(s.accountId) !== 1)
      .map(s => ({ s, diff: s.score - (prev.get(s.accountId)?.score ?? 0) }))
      .filter(x => x.diff >= 15)
      .sort((a, b) => b.diff - a.diff);
    if (jumps[0]) {
      awards.push({
        emoji: "🚀",
        title: "急上昇賞",
        accountId: jumps[0].s.accountId,
        name: jumps[0].s.name,
        detail: `先週比 +${jumps[0].diff}点`,
      });
    }
  }

  // ---- 励まし ----
  const encouragements: Encouragement[] = [];
  const excludeSet = new Set(exclude);
  const addedIds = new Set<number>();
  for (const m of messages) {
    if (m.sendTime >= week.start && m.sendTime < week.end) {
      extractAddedMemberIds(m.body).forEach(id => addedIds.add(id));
    }
  }
  const firstPostAt = new Map<number, number>();
  for (const m of messages) {
    if (isSystemMessage(m.body)) continue;
    const t = firstPostAt.get(m.accountId);
    if (t === undefined || m.sendTime < t) firstPostAt.set(m.accountId, m.sendTime);
  }
  const inWeek = (t?: number) => t !== undefined && t >= week.start && t < week.end;
  const nameOf = (id: number) =>
    members.find(m => m.accountId === id)?.name ??
    cur.get(id)?.name ??
    messages.find(m => m.accountId === id)?.accountName ??
    `ID:${id}`;

  const handled = new Set<number>();
  // 新メンバー：今週ルームに追加された / 今週はじめて投稿した（過去データがある場合のみ判定）
  const memberIds = new Set(members.map(m => m.accountId));
  const newcomerIds = new Set<number>();
  addedIds.forEach(id => newcomerIds.add(id));
  for (const m of members) {
    if (hasPrevData && inWeek(m.firstSeenAt)) newcomerIds.add(m.accountId);
  }
  // 「初投稿」判定は、2週間以上前からの蓄積がある場合のみ（直近100件しか無いと誤判定するため）
  const earliest = messages.reduce((min, m) => Math.min(min, m.sendTime), Infinity);
  if (earliest < week.start - 14 * 24 * 3600) {
    firstPostAt.forEach((t, id) => {
      if (inWeek(t)) newcomerIds.add(id);
    });
  }
  let i = 0;
  newcomerIds.forEach(id => {
    if (excludeSet.has(id) || (memberIds.size > 0 && !memberIds.has(id))) return;
    handled.add(id);
    encouragements.push({
      accountId: id,
      name: nameOf(id),
      kind: "newcomer",
      message: pick(NEWCOMER_MESSAGES, i++),
    });
  });

  // 復活：先週0投稿 → 今週投稿あり（ランキング圏外の人）
  const rankedIds = new Set(ranking.map(r => r.accountId));
  if (hasPrevData) {
    for (const s of sorted) {
      if (handled.has(s.accountId) || rankedIds.has(s.accountId)) continue;
      if (!prev.has(s.accountId)) {
        handled.add(s.accountId);
        encouragements.push({
          accountId: s.accountId,
          name: s.name,
          kind: "comeback",
          message: pick(COMEBACK_MESSAGES, i++),
        });
      }
    }
  }

  // 応援：今週の投稿日数が 0〜1 日のメンバー（最大4名、ランキング圏外）
  const cheerTargets = members
    .filter(m => !excludeSet.has(m.accountId) && !handled.has(m.accountId) && !rankedIds.has(m.accountId))
    .map(m => ({ m, days: cur.get(m.accountId)?.activeDays ?? 0 }))
    .filter(x => x.days <= 1)
    .sort((a, b) => a.days - b.days || a.m.accountId - b.m.accountId)
    .slice(0, 4);
  for (const { m } of cheerTargets) {
    handled.add(m.accountId);
    encouragements.push({
      accountId: m.accountId,
      name: m.name,
      kind: "cheer",
      message: pick(CHEER_MESSAGES, i++).replace("〇〇さん", `${m.name}さん`),
    });
  }

  // ---- チーム全体 ----
  const rosterIds = members.length > 0
    ? members.map(m => m.accountId).filter(id => !excludeSet.has(id))
    : [...new Set([...cur.keys(), ...prev.keys()])];
  const totalMembers = rosterIds.length;
  const activeMembers = rosterIds.filter(id => cur.has(id)).length;
  const prevActive = rosterIds.filter(id => prev.has(id)).length;
  const sum = (m: Map<number, MemberStats>) => [...m.values()].reduce((a, s) => a + s.posts, 0);

  return {
    week,
    ranking,
    awards,
    encouragements,
    team: {
      totalPosts: sum(cur),
      prevTotalPosts: hasPrevData ? sum(prev) : null,
      activeMembers,
      totalMembers,
      participationRate: totalMembers ? Math.round((activeMembers / totalMembers) * 100) : 0,
      prevParticipationRate: hasPrevData && totalMembers ? Math.round((prevActive / totalMembers) * 100) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// 投稿本文
// ---------------------------------------------------------------------------

const MEDALS = ["🥇", "🥈", "🥉"];

/** 定着度メーター（7日中の投稿日数） */
export function streakMeter(activeDays: number): string {
  const d = Math.max(0, Math.min(7, activeDays));
  return "■".repeat(d) + "□".repeat(7 - d);
}

function rankMove(rank: number, prevRank: number | null): string {
  if (prevRank === null) return "🆕";
  if (rank < prevRank) return `⤴️${prevRank - rank}UP`;
  if (rank > prevRank) return `⤵️${rank - prevRank}DOWN`;
  return "➡️キープ";
}

function rankTitle(rank: number, s: MemberStats): string {
  if (rank === 1) return "今週の棟梁👑";
  if (s.activeDays >= 6) return "皆勤の鉄人";
  if (s.photos >= 10) return "現場カメラマン";
  if (s.morningDays >= 3) return "朝イチの職人";
  if (s.replies >= 5) return "声かけ名人";
  return "伸び盛り職人";
}

export function formatReportMessage(report: WeeklyReport): string {
  const pick = seededPicker(report.week.key);
  const lines: string[] = [];
  const t = report.team;

  lines.push(pick(OPENING_LINES));
  lines.push("");

  // ランキング
  const rk: string[] = [];
  if (report.ranking.length === 0) {
    rk.push("先週は投稿がありませんでした…😢");
    rk.push("今週は誰が最初の1位になるか！？早い者勝ちです🏁");
  } else {
    for (const r of report.ranking) {
      const medal = MEDALS[r.rank - 1] ?? `${r.rank}位`;
      rk.push(`${medal} ${r.name}さん【${rankTitle(r.rank, r)}】 ${r.score}点 ${rankMove(r.rank, r.prevRank)}`);
      rk.push(
        `　定着度 ${streakMeter(r.activeDays)} ${r.activeDays}/7日｜投稿${r.posts}・写真${r.photos}・返信${r.replies}`,
      );
    }
  }
  lines.push(`[info][title]🏆 先週のTeamDAIKUランキング ${report.week.label}[/title]${rk.join("\n")}[/info]`);

  // 各賞
  if (report.awards.length > 0) {
    const aw = report.awards.map(a => `${a.emoji} ${a.title}：${a.name}さん（${a.detail}）`);
    lines.push(`[info][title]🎖️ 特別表彰[/title]${aw.join("\n")}[/info]`);
  }

  // チーム全体
  const teamLines: string[] = [];
  const diff = (cur: number, prev: number | null, unit: string) =>
    prev === null ? "" : cur >= prev ? `（先週比 +${cur - prev}${unit}📈）` : `（先週比 ${cur - prev}${unit}）`;
  teamLines.push(`チーム投稿数：${t.totalPosts}件${diff(t.totalPosts, t.prevTotalPosts, "件")}`);
  if (t.totalMembers > 0) {
    teamLines.push(
      `参加率：${t.activeMembers}/${t.totalMembers}人＝${t.participationRate}%${diff(t.participationRate, t.prevParticipationRate, "pt")}`,
    );
    teamLines.push(
      t.participationRate >= 80
        ? "🎯 チーム目標「参加率80%」達成！最高のチームです👏"
        : `🎯 チーム目標は参加率80%！あと${Math.max(1, Math.ceil(t.totalMembers * 0.8) - t.activeMembers)}人の投稿で達成です`,
    );
  }
  lines.push(`[info][title]👷 チーム全体[/title]${teamLines.join("\n")}[/info]`);

  // 励まし
  if (report.encouragements.length > 0) {
    const en: string[] = [];
    for (const e of report.encouragements) {
      const tag = e.kind === "newcomer" ? "🎉 ようこそ" : e.kind === "comeback" ? "🙌 おかえり" : "📣 応援";
      en.push(`${tag}［${e.name}さん］`);
      en.push(`　${e.message}`);
    }
    lines.push(`[info][title]💌 今週のエール[/title]${en.join("\n")}[/info]`);
  }

  lines.push(
    "📝 配点：投稿した日×10／写真×3／返信×2／朝8時前の投稿日×3／50字以上の報告×2／投稿×1",
  );
  lines.push(pick(CLOSING_LINES));
  return lines.join("\n");
}
