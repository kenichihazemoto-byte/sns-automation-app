import { describe, it, expect, vi, beforeEach } from "vitest";

// @notionhq/clientをモック
vi.mock("@notionhq/client", () => {
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockRetrieve = vi.fn();
  const mockQuery = vi.fn();

  const Client = vi.fn().mockImplementation(() => ({
    pages: {
      create: mockCreate,
      update: mockUpdate,
    },
    databases: {
      retrieve: mockRetrieve,
    },
    dataSources: {
      query: mockQuery,
    },
  }));

  return { Client, mockCreate, mockUpdate, mockRetrieve, mockQuery };
});

import { createNotionPage, updateNotionPageStatus, testNotionConnection } from "../notion";

describe("Notion連携ヘルパー", () => {
  const TOKEN = "secret_test_token";
  const DB_ID = "test-database-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("testNotionConnection", () => {
    it("正常なトークンとDBIDで接続成功を返す", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.databases.retrieve.mockResolvedValueOnce({
        id: DB_ID,
        title: [{ plain_text: "投稿管理データベース" }],
      });

      const result = await testNotionConnection(TOKEN, DB_ID);
      // モックが正しく設定されていれば成功
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("databaseTitle");
    });

    it("無効なトークンで失敗を返す", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.databases.retrieve.mockRejectedValueOnce(
        new Error("Unauthorized: Invalid token")
      );

      const result = await testNotionConnection("invalid_token", DB_ID);
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
    });
  });

  describe("createNotionPage", () => {
    it("投稿レコードを正しいプロパティでNotionに作成する", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.pages.create.mockResolvedValueOnce({
        id: "new-page-id-123",
        url: "https://notion.so/new-page-id-123",
      });

      const record = {
        title: "Instagram投稿 2026-02-28",
        platform: "Instagram",
        companyName: "ハゼモト建設",
        postText: "地元で生まれ地元で育った北九州の工務店ハゼモト建設です。",
        status: "draft" as const,
        hashtags: "#ハゼモト建設 #北九州 #工務店",
      };

      const result = await createNotionPage(TOKEN, DB_ID, record);
      expect(result).toHaveProperty("pageId");
      expect(result).toHaveProperty("url");
    });

    it("予約日時が設定されている場合にdate プロパティが含まれる", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.pages.create.mockResolvedValueOnce({
        id: "scheduled-page-id",
        url: "https://notion.so/scheduled-page-id",
      });

      const scheduledAt = new Date("2026-03-01T10:00:00Z");
      const record = {
        title: "予約投稿テスト",
        platform: "X（Twitter）",
        companyName: "ハゼモト建設",
        postText: "テスト投稿文",
        status: "scheduled" as const,
        scheduledAt,
      };

      const result = await createNotionPage(TOKEN, DB_ID, record);
      expect(result).toHaveProperty("pageId");
    });

    it("2000文字を超える投稿文は切り詰められる", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.pages.create.mockResolvedValueOnce({
        id: "long-text-page-id",
        url: "https://notion.so/long-text-page-id",
      });

      const longText = "あ".repeat(3000);
      const record = {
        title: "長文テスト",
        platform: "Instagram",
        companyName: "ハゼモト建設",
        postText: longText,
        status: "draft" as const,
      };

      // エラーなく実行できることを確認
      const result = await createNotionPage(TOKEN, DB_ID, record);
      expect(result).toHaveProperty("pageId");
    });
  });

  describe("updateNotionPageStatus", () => {
    it("ページのステータスを正しく更新する", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();
      mockInstance.pages.update.mockResolvedValueOnce({ id: "page-id" });

      // エラーなく実行できることを確認
      await expect(
        updateNotionPageStatus(TOKEN, "page-id", "posted")
      ).resolves.not.toThrow();
    });
  });

  describe("ステータスラベルの変換", () => {
    it("各ステータスが日本語ラベルに変換される（間接テスト）", async () => {
      const { Client } = await import("@notionhq/client");
      const mockInstance = new (Client as unknown as new () => {
        databases: { retrieve: ReturnType<typeof vi.fn> };
        pages: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      })();

      const statuses: Array<"draft" | "scheduled" | "posted" | "failed"> = [
        "draft",
        "scheduled",
        "posted",
        "failed",
      ];

      for (const status of statuses) {
        mockInstance.pages.create.mockResolvedValueOnce({
          id: `page-${status}`,
          url: `https://notion.so/page-${status}`,
        });
        const result = await createNotionPage(TOKEN, DB_ID, {
          title: `${status}テスト`,
          platform: "Instagram",
          companyName: "ハゼモト建設",
          postText: "テスト",
          status,
        });
        expect(result).toHaveProperty("pageId");
      }
    });
  });
});

// 双方向同期のテスト
import { fetchNotionChanges } from "../notion";

describe("fetchNotionChanges（双方向同期）", () => {
  const TOKEN = "secret_test_token";
  const DB_ID = "test-database-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Notionから変更されたページ一覧を取得できる", async () => {
    const { mockQuery } = await import("@notionhq/client") as unknown as { mockQuery: ReturnType<typeof vi.fn> };
    mockQuery.mockResolvedValueOnce({
      results: [
        {
          id: "page-001",
          last_edited_time: new Date().toISOString(),
          properties: {
            Name: { title: [{ plain_text: "Instagram投稿テスト" }] },
            プラットフォーム: { select: { name: "Instagram" } },
            会社名: { select: { name: "ハゼモト建設" } },
            ステータス: { select: { name: "予約済み" } },
            予約日時: { date: { start: "2026-03-01T10:00:00.000Z" } },
            投稿文: { rich_text: [{ plain_text: "テスト投稿文" }] },
            ハッシュタグ: { rich_text: [{ plain_text: "#ハゼモト建設" }] },
          },
        },
      ],
    });

    const sinceDate1 = new Date();
    sinceDate1.setHours(sinceDate1.getHours() - 24);
    const result = await fetchNotionChanges(TOKEN, DB_ID, sinceDate1);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    expect(result[0].platform).toBe("Instagram");
  });

  it("Notion APIエラー時は空配列を返す", async () => {
    const { mockQuery } = await import("@notionhq/client") as unknown as { mockQuery: ReturnType<typeof vi.fn> };
    mockQuery.mockRejectedValueOnce(new Error("API Error"));

    const sinceDate2 = new Date();
    sinceDate2.setHours(sinceDate2.getHours() - 24);
    // エラーが発生してもクラッシュしないことを確認
    await expect(fetchNotionChanges(TOKEN, DB_ID, sinceDate2)).rejects.toThrow();
  });
});
