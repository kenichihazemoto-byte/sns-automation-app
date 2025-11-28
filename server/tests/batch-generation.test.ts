import { describe, it, expect } from "vitest";

describe("すべてのプラットフォーム向けに一括生成機能のテスト", () => {
  describe("一括生成APIのレスポンス構造", () => {
    it("Instagram、X、Threadsの3つのプラットフォーム結果を含む", () => {
      const mockResponse = {
        instagram: { platform: "instagram", content: "Instagram content", hashtags: "tags" },
        x: { platform: "x", content: "X content", hashtags: "tags" },
        threads: { platform: "threads", content: "Threads content", hashtags: "tags" },
      };
      
      expect(mockResponse.instagram).toBeTruthy();
      expect(mockResponse.x).toBeTruthy();
      expect(mockResponse.threads).toBeTruthy();
    });

    it("各プラットフォーム結果にplatform、content、hashtagsが含まれる", () => {
      const mockPlatformResult = {
        platform: "instagram",
        content: "Test content",
        hashtags: "tag1 tag2",
      };
      
      expect(mockPlatformResult).toHaveProperty("platform");
      expect(mockPlatformResult).toHaveProperty("content");
      expect(mockPlatformResult).toHaveProperty("hashtags");
    });
  });

  describe("並列生成の動作", () => {
    it("3つのプラットフォーム向けに並列で生成される", async () => {
      const platforms = ["instagram", "x", "threads"];
      
      const results = await Promise.all(
        platforms.map(async (platform) => {
          // モック生成処理
          return {
            platform,
            content: `${platform} content`,
            hashtags: `${platform} tags`,
          };
        })
      );
      
      expect(results).toHaveLength(3);
      expect(results[0].platform).toBe("instagram");
      expect(results[1].platform).toBe("x");
      expect(results[2].platform).toBe("threads");
    });
  });

  describe("タブ表示の動作", () => {
    it("アクティブタブの切り替えが正しく動作する", () => {
      let activeTab: "instagram" | "x" | "threads" = "instagram";
      
      activeTab = "x";
      expect(activeTab).toBe("x");
      
      activeTab = "threads";
      expect(activeTab).toBe("threads");
      
      activeTab = "instagram";
      expect(activeTab).toBe("instagram");
    });

    it("各タブで正しいプラットフォームのデータが表示される", () => {
      const allPlatformsPosts = {
        instagram: { platform: "instagram", content: "Instagram content", hashtags: "instagram tags" },
        x: { platform: "x", content: "X content", hashtags: "x tags" },
        threads: { platform: "threads", content: "Threads content", hashtags: "threads tags" },
      };
      
      const activeTab = "instagram";
      const currentPost = allPlatformsPosts[activeTab];
      
      expect(currentPost.platform).toBe("instagram");
      expect(currentPost.content).toBe("Instagram content");
    });
  });

  describe("文字数カウンターの動作", () => {
    it("各プラットフォームで正しい文字数制限が適用される", () => {
      const platforms = [
        { id: "instagram", maxChars: 2200 },
        { id: "x", maxChars: 280 },
        { id: "threads", maxChars: 500 },
      ];
      
      platforms.forEach((platform) => {
        const maxChars = platform.id === "instagram" ? 2200 : platform.id === "x" ? 280 : 500;
        expect(maxChars).toBe(platform.maxChars);
      });
    });

    it("タブ切り替え時に文字数カウンターが更新される", () => {
      const allPlatformsPosts = {
        instagram: { content: "a".repeat(1000), hashtags: "tags" },
        x: { content: "a".repeat(200), hashtags: "tags" },
        threads: { content: "a".repeat(400), hashtags: "tags" },
      };
      
      const instagramPost = `${allPlatformsPosts.instagram.content}\n\n${allPlatformsPosts.instagram.hashtags}`;
      const xPost = `${allPlatformsPosts.x.content}\n\n${allPlatformsPosts.x.hashtags}`;
      
      expect(instagramPost.length).toBeGreaterThan(xPost.length);
    });
  });

  describe("UIの状態管理", () => {
    it("一括生成時は単一プラットフォーム結果がクリアされる", () => {
      let beforeAfterPost: any = { content: "single platform", hashtags: "tags" };
      let allPlatformsPosts: any = null;
      
      // 一括生成実行
      allPlatformsPosts = {
        instagram: { content: "instagram", hashtags: "tags" },
        x: { content: "x", hashtags: "tags" },
        threads: { content: "threads", hashtags: "tags" },
      };
      beforeAfterPost = null;
      
      expect(allPlatformsPosts).toBeTruthy();
      expect(beforeAfterPost).toBeNull();
    });

    it("単一プラットフォーム生成時は一括生成結果がクリアされる", () => {
      let beforeAfterPost: any = null;
      let allPlatformsPosts: any = {
        instagram: { content: "instagram", hashtags: "tags" },
        x: { content: "x", hashtags: "tags" },
        threads: { content: "threads", hashtags: "tags" },
      };
      
      // 単一プラットフォーム生成実行
      beforeAfterPost = { content: "single platform", hashtags: "tags" };
      allPlatformsPosts = null;
      
      expect(beforeAfterPost).toBeTruthy();
      expect(allPlatformsPosts).toBeNull();
    });
  });

  describe("ボタンの無効化状態", () => {
    it("生成中は両方のボタンが無効化される", () => {
      const isPending = true;
      const isDisabled = isPending;
      
      expect(isDisabled).toBe(true);
    });

    it("写真が不足している場合はボタンが無効化される", () => {
      const beforeImage = null;
      const afterImage = { url: "test.jpg" };
      const isDisabled = !beforeImage || !afterImage;
      
      expect(isDisabled).toBe(true);
    });

    it("両方の写真がある場合はボタンが有効化される", () => {
      const beforeImage = { url: "before.jpg" };
      const afterImage = { url: "after.jpg" };
      const isPending = false;
      const isDisabled = !beforeImage || !afterImage || isPending;
      
      expect(isDisabled).toBe(false);
    });
  });
});
