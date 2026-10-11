import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, runJob } from "../chatwork-job";

const jst = (s: string) => Math.floor(new Date(`${s}+09:00`).getTime() / 1000);

/** Chatwork API のモック（投稿内容を記録） */
function mockApi() {
  const posts: { roomId: string; body: string }[] = [];
  const messages = [
    { message_id: "1", account: { account_id: 1, name: "田中" }, body: "[download:1]現場.jpg[/download]", send_time: jst("2026-10-06T07:00:00") },
    { message_id: "2", account: { account_id: 2, name: "中村" }, body: "了解です", send_time: jst("2026-10-07T12:00:00") },
    { message_id: "3", account: { account_id: 9, name: "社長" }, body: "お疲れさまです", send_time: jst("2026-10-07T12:00:00") },
  ];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.chatwork.com/v2", "");
    const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    if (path === "/me") return json({ account_id: 9 });
    if (path === "/rooms")
      return json([
        { room_id: 100, name: "TeamDAIKU（大工チーム）", type: "group" },
        { room_id: 999, name: "マイチャット", type: "my" },
      ]);
    if (path.startsWith("/rooms/100/messages") && init?.method !== "POST") return json(messages);
    if (path === "/rooms/100/members")
      return json([
        { account_id: 1, name: "田中", chatwork_id: "tanaka-daiku" },
        { account_id: 2, name: "中村", chatwork_id: "nakamura1016" },
        { account_id: 9, name: "社長", chatwork_id: "" },
      ]);
    if (init?.method === "POST") {
      const roomId = path.split("/")[2];
      posts.push({ roomId, body: new URLSearchParams(String(init.body)).get("body") ?? "" });
      return json({ message_id: String(1000 + posts.length) });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetchImpl, posts };
}

const NOW = new Date("2026-10-12T06:50:00+09:00");

describe("chatwork-job", () => {
  it("暗号化データは復号でき、平文を含まない", () => {
    const blob = encrypt('{"name":"田中"}', "secret");
    expect(blob).not.toContain("田中");
    expect(decrypt(blob, "secret")).toBe('{"name":"田中"}');
    expect(() => decrypt(blob, "other")).toThrow();
  });

  it("sync で蓄積し、post は週1回だけ投稿する", async () => {
    const dataPath = join(mkdtempSync(join(tmpdir(), "cw-")), "data.enc");
    const api = mockApi();
    const base = { token: "tok", dataPath, env: {}, now: NOW, fetchImpl: api.fetchImpl };

    const s = await runJob({ ...base, mode: "sync" });
    expect(s.changed).toBe(true);
    expect(s.summary).toContain("新規メッセージ3件");
    expect(readFileSync(dataPath, "utf8")).not.toContain("田中");

    // 変化がなければ保存しない（不要なコミットを防ぐ）
    expect((await runJob({ ...base, mode: "sync" })).changed).toBe(false);

    const p1 = await runJob({ ...base, mode: "post" });
    expect(p1.summary).toContain("投稿しました");
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].roomId).toBe("100");
    expect(api.posts[0].body).toContain("🥇 田中さん");
    expect(api.posts[0].body).not.toContain("社長さん"); // トークン所有者は除外

    const p2 = await runJob({ ...base, mode: "post" });
    expect(p2.summary).toContain("投稿済み");
    expect(api.posts).toHaveLength(1);
  });

  it("preview はマイチャットにだけ送る", async () => {
    const dataPath = join(mkdtempSync(join(tmpdir(), "cw-")), "data.enc");
    const api = mockApi();
    await runJob({ mode: "preview", token: "tok", dataPath, env: {}, now: NOW, fetchImpl: api.fetchImpl });
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].roomId).toBe("999");
    expect(api.posts[0].body).toContain("【プレビュー】");
  });

  it("Chatwork ID（文字列）でもランキング対象外にできる", async () => {
    const dataPath = join(mkdtempSync(join(tmpdir(), "cw-")), "data.enc");
    const api = mockApi();
    const env = { CHATWORK_RANKING_EXCLUDE_IDS: "Nakamura1016, unknown-id" };
    const r = await runJob({ mode: "post", token: "tok", dataPath, env, now: NOW, fetchImpl: api.fetchImpl });
    expect(r.summary).toContain("指定2件中 1件がメンバーと一致");
    expect(r.summary).not.toContain("中村");
    expect(api.posts[0].body).toContain("田中さん");
    expect(api.posts[0].body).not.toContain("中村さん");
  });
});
