import { describe, expect, it } from "vitest";
import {
  aggregateWeek,
  buildWeeklyReport,
  countFiles,
  extractAddedMemberIds,
  formatReportMessage,
  isReply,
  isSystemMessage,
  previousWeekRange,
  streakMeter,
  type CwMessage,
} from "../chatwork-ranking";
import { isInPostWindow } from "../chatwork-service";

/** JST の日時から UNIX秒 */
const jst = (s: string) => Math.floor(new Date(`${s}+09:00`).getTime() / 1000);

let seq = 0;
const msg = (accountId: number, name: string, at: string, body = "おはようございます"): CwMessage => ({
  messageId: String(++seq),
  accountId,
  accountName: name,
  body,
  sendTime: jst(at),
});

// 2026-10-12(月) 06:50 JST に実行 → 対象は 10/5(月)〜10/11(日)
const RUN_AT = new Date("2026-10-12T06:50:00+09:00");

describe("previousWeekRange", () => {
  it("月曜朝に実行すると直前の月〜日を返す", () => {
    const w = previousWeekRange(RUN_AT);
    expect(w.key).toBe("2026-10-05");
    expect(w.label).toBe("10/5(月)〜10/11(日)");
    expect(w.start).toBe(jst("2026-10-05T00:00:00"));
    expect(w.end).toBe(jst("2026-10-12T00:00:00"));
  });

  it("日曜深夜でも同じ週の前週を返す", () => {
    expect(previousWeekRange(new Date("2026-10-11T23:59:00+09:00")).key).toBe("2026-09-28");
  });
});

describe("メッセージ解析", () => {
  it("写真・返信・システム通知を判定する", () => {
    expect(countFiles("[info][title][dtext:file_uploaded][/title][download:123]a.jpg[/download][/info]")).toBe(1);
    expect(isReply("[rp aid=111 to=1-2]田中さん\n了解です")).toBe(true);
    expect(isReply("[To:111]田中さん 確認お願いします")).toBe(true);
    expect(isReply("了解です")).toBe(false);
    expect(isSystemMessage("[dtext:chatroom_member_is][piconname:222][dtext:chatroom_added]")).toBe(true);
    expect(extractAddedMemberIds("[dtext:chatroom_member_is][piconname:222][dtext:chatroom_added]")).toEqual([222]);
  });

  it("定着度メーターは7マス", () => {
    expect(streakMeter(5)).toBe("■■■■■□□");
  });
});

describe("aggregateWeek", () => {
  it("投稿日数・朝イチ・写真をカウントし、除外アカウントとシステム通知を無視する", () => {
    const w = previousWeekRange(RUN_AT);
    const messages = [
      msg(1, "田中", "2026-10-05T07:00:00"),
      msg(1, "田中", "2026-10-05T12:00:00", "[download:1]a.jpg[/download]"),
      msg(1, "田中", "2026-10-06T07:30:00"),
      msg(2, "中村", "2026-10-07T10:00:00"),
      msg(9, "社長", "2026-10-07T10:00:00"),
      msg(2, "中村", "2026-10-07T10:05:00", "[dtext:chatroom_member_is][piconname:3][dtext:chatroom_added]"),
      msg(2, "中村", "2026-10-12T07:00:00"), // 対象週外
    ];
    const stats = aggregateWeek(messages, w, [9]);
    expect(stats.get(1)).toMatchObject({ posts: 3, activeDays: 2, morningDays: 2, photos: 1 });
    expect(stats.get(2)).toMatchObject({ posts: 1, activeDays: 1 });
    expect(stats.has(9)).toBe(false);
    // 2日×10 + 3投稿×1 + 写真1×3 + 朝2日×3
    expect(stats.get(1)!.score).toBe(20 + 3 + 3 + 6);
  });
});

describe("buildWeeklyReport / formatReportMessage", () => {
  const members = [
    { accountId: 1, name: "田中", firstSeenAt: jst("2000-01-01T00:00:00") },
    { accountId: 2, name: "中村", firstSeenAt: jst("2000-01-01T00:00:00") },
    { accountId: 3, name: "新人", firstSeenAt: jst("2026-10-08T10:00:00") },
    { accountId: 4, name: "森坪", firstSeenAt: jst("2000-01-01T00:00:00") },
    { accountId: 9, name: "社長", firstSeenAt: jst("2000-01-01T00:00:00") },
  ];
  const days = ["05", "06", "07", "08", "09", "10"];
  const messages: CwMessage[] = [
    // 先々週（前週比較用）
    msg(2, "中村", "2026-09-29T10:00:00"),
    msg(2, "中村", "2026-09-30T10:00:00"),
    msg(4, "森坪", "2026-09-30T10:00:00"),
    // 先週：田中は6日皆勤＋写真、中村は返信多め
    ...days.flatMap(d => [
      msg(1, "田中", `2026-10-${d}T07:10:00`, "[download:9]現場.jpg[/download]"),
    ]),
    ...["06", "07", "08"].flatMap(d => [
      msg(2, "中村", `2026-10-${d}T12:00:00`, "[rp aid=1 to=1-1]田中さん\nありがとうございます"),
    ]),
    msg(2, "中村", "2026-10-08T10:00:00", "[dtext:chatroom_member_is][piconname:3][dtext:chatroom_added]"),
    msg(3, "新人", "2026-10-09T18:00:00", "よろしくお願いします"),
  ];

  const report = buildWeeklyReport({ now: RUN_AT, messages, members, excludeAccountIds: [9] });

  it("スコア順にランキングし、前週順位を付ける", () => {
    expect(report.ranking.map(r => r.name)).toEqual(["田中", "中村", "新人"]);
    expect(report.ranking[0]).toMatchObject({ rank: 1, activeDays: 6, prevRank: null });
    expect(report.ranking[1].prevRank).toBe(1);
  });

  it("各賞を選定する", () => {
    const titles = report.awards.map(a => `${a.title}:${a.name}`);
    expect(titles).toContain("皆勤大工賞:田中");
    expect(titles).toContain("写真職人賞:田中");
    expect(titles).toContain("朝イチ棟梁賞:田中");
    expect(titles).toContain("ナイスパス賞:中村");
    expect(titles).toContain("急上昇賞:中村"); // 1位は対象外
  });

  it("新メンバーを歓迎し、投稿の少ないメンバーを応援する（社長は除外）", () => {
    const kinds = report.encouragements.map(e => `${e.kind}:${e.name}`);
    expect(kinds).toContain("newcomer:新人");
    expect(kinds).toContain("cheer:森坪");
    expect(kinds.some(k => k.includes("社長"))).toBe(false);
  });

  it("チーム参加率を算出する", () => {
    expect(report.team).toMatchObject({ totalMembers: 4, activeMembers: 3, participationRate: 75, prevParticipationRate: 50 });
  });

  it("Chatwork用の本文を生成する", () => {
    const text = formatReportMessage(report);
    expect(text).toContain("[info][title]🏆 先週のTeamDAIKUランキング 10/5(月)〜10/11(日)[/title]");
    expect(text).toContain("🥇 田中さん【今週の棟梁👑】");
    expect(text).toContain("🎉 ようこそ［新人さん］");
    expect(text).toContain("📣 応援［森坪さん］");
    expect(text).not.toContain("〇〇");
    // 同じ週なら同じ文面（プレビューと本番が一致）
    expect(formatReportMessage(report)).toBe(text);
  });

  it("投稿ゼロの週でも本文を生成できる", () => {
    const empty = buildWeeklyReport({ now: RUN_AT, messages: [], members, excludeAccountIds: [9] });
    expect(empty.ranking).toHaveLength(0);
    expect(formatReportMessage(empty)).toContain("先週は投稿がありませんでした");
  });
});

describe("isInPostWindow", () => {
  it("月曜 6:50 JST から投稿ウィンドウに入る", () => {
    expect(isInPostWindow(new Date("2026-10-12T06:49:00+09:00"))).toBe(false);
    expect(isInPostWindow(new Date("2026-10-12T06:50:00+09:00"))).toBe(true);
    expect(isInPostWindow(new Date("2026-10-12T09:49:00+09:00"))).toBe(true);
    expect(isInPostWindow(new Date("2026-10-12T09:50:00+09:00"))).toBe(false);
    expect(isInPostWindow(new Date("2026-10-13T06:50:00+09:00"))).toBe(false);
  });
});
