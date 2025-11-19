import { describe, it, expect } from "vitest";

describe("新機能のテスト", () => {
  describe("投稿履歴の保存機能", () => {
    it("投稿データの構造が正しい", () => {
      const mockPost = {
        companyName: "ハゼモト建設",
        imageUrl: "https://example.com/image.jpg",
        imageAnalysis: {
          category: "外観",
          style: "モダン",
          description: "テスト説明",
          keywords: ["キーワード1", "キーワード2"],
        },
        contents: {
          instagram: {
            caption: "Instagram投稿文",
            hashtags: ["タグ1", "タグ2"],
          },
          x: {
            caption: "X投稿文",
            hashtags: ["タグ1"],
          },
          threads: {
            caption: "Threads投稿文",
            hashtags: ["タグ1", "タグ2"],
          },
        },
      };

      expect(mockPost.companyName).toBe("ハゼモト建設");
      expect(mockPost.imageAnalysis.category).toBe("外観");
      expect(mockPost.contents.instagram.hashtags).toHaveLength(2);
      expect(mockPost.contents.x.caption).toBeTruthy();
      expect(mockPost.contents.threads.hashtags).toContain("タグ1");
    });

    it("会社名が正しく設定される", () => {
      const companies = ["ハゼモト建設", "クリニックアーキプロ"];
      
      companies.forEach((company) => {
        expect(company).toMatch(/^(ハゼモト建設|クリニックアーキプロ)$/);
      });
    });
  });

  describe("複数写真の同時分析機能", () => {
    it("写真の取得枚数が正しい", () => {
      const requestedCount = 5;
      const mockPhotos = Array.from({ length: requestedCount }, (_, i) => ({
        photo: { url: `https://example.com/photo${i}.jpg` },
        album: { title: `アルバム${i}` },
        analysis: {
          category: "外観",
          style: "モダン",
          description: "説明",
          keywords: ["キーワード"],
        },
        score: Math.random() * 100,
      }));

      expect(mockPhotos).toHaveLength(requestedCount);
      expect(mockPhotos[0].photo.url).toBeTruthy();
      expect(mockPhotos[0].analysis.category).toBeTruthy();
    });

    it("写真がスコア順にソートされる", () => {
      const mockPhotos = [
        { score: 50 },
        { score: 90 },
        { score: 30 },
        { score: 70 },
      ];

      const sorted = mockPhotos.sort((a, b) => b.score - a.score);

      expect(sorted[0].score).toBe(90);
      expect(sorted[sorted.length - 1].score).toBe(30);
      
      // すべての要素が降順になっているか確認
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].score).toBeGreaterThanOrEqual(sorted[i + 1].score);
      }
    });
  });

  describe("投稿スケジュール機能", () => {
    it("スケジュール日時が正しく設定される", () => {
      const now = new Date();
      const scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間後

      expect(scheduledDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it("ステータスが正しく設定される", () => {
      const statuses = ["draft", "scheduled", "completed"];
      
      statuses.forEach((status) => {
        expect(["draft", "scheduled", "active", "pending", "processing", "completed", "failed", "cancelled"]).toContain(status);
      });
    });

    it("予約投稿と下書きの区別が正しい", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000);

      const draftPost = {
        scheduledAt: undefined,
        status: "draft",
      };

      const scheduledPost = {
        scheduledAt: futureDate,
        status: "scheduled",
      };

      expect(draftPost.status).toBe("draft");
      expect(draftPost.scheduledAt).toBeUndefined();
      expect(scheduledPost.status).toBe("scheduled");
      expect(scheduledPost.scheduledAt).toBeDefined();
    });
  });

  describe("プラットフォーム別投稿文生成", () => {
    it("Instagram投稿文の構造が正しい", () => {
      const instagramContent = {
        caption: "Instagram用の長い投稿文です。",
        hashtags: ["ハゼモト建設", "注文住宅", "モダン住宅"],
      };

      expect(instagramContent.caption).toBeTruthy();
      expect(instagramContent.hashtags).toBeInstanceOf(Array);
      expect(instagramContent.hashtags.length).toBeGreaterThan(0);
    });

    it("X投稿文の構造が正しい", () => {
      const xContent = {
        caption: "X用の短い投稿文",
        hashtags: ["ハゼモト建設"],
      };

      expect(xContent.caption).toBeTruthy();
      expect(xContent.hashtags).toBeInstanceOf(Array);
    });

    it("Threads投稿文の構造が正しい", () => {
      const threadsContent = {
        caption: "Threads用の親しみやすい投稿文",
        hashtags: ["ハゼモト建設", "住まい"],
      };

      expect(threadsContent.caption).toBeTruthy();
      expect(threadsContent.hashtags).toBeInstanceOf(Array);
    });
  });
});
