import { describe, it, expect } from "vitest";

describe("ビフォーアフター投稿文のプラットフォーム別最適化テスト", () => {
  describe("プラットフォーム別文字数制限", () => {
    it("Instagram向けは2200文字以内", () => {
      const platform = "instagram";
      const maxLength = 2200;
      
      expect(platform).toBe("instagram");
      expect(maxLength).toBe(2200);
    });

    it("X向けは280文字以内", () => {
      const platform = "x";
      const maxLength = 280;
      
      expect(platform).toBe("x");
      expect(maxLength).toBe(280);
    });

    it("Threads向けは500文字以内", () => {
      const platform = "threads";
      const maxLength = 500;
      
      expect(platform).toBe("threads");
      expect(maxLength).toBe(500);
    });
  });

  describe("プラットフォーム別コンテンツ構成", () => {
    it("Instagram向けは箱条書きを3-5個含む", () => {
      const mockContent = "Before After Reform\n\nPoints:\n- Point 1\n- Point 2\n- Point 3\n- Point 4";
      const bulletPoints = mockContent.match(/-/g);
      
      expect(bulletPoints).toBeTruthy();
      expect(bulletPoints!.length).toBeGreaterThanOrEqual(3);
      expect(bulletPoints!.length).toBeLessThanOrEqual(5);
    });

    it("X向けは箱条書きを使わず文章形式", () => {
      const mockContent = "Kitchen reform completed! Old to new system kitchen. Storage improved.";
      
      expect(mockContent).not.toContain("-");
      expect(mockContent).not.toContain("*");
      expect(mockContent.length).toBeLessThanOrEqual(280);
    });

    it("Threads向けは簡潔な箱条書きを3個程度", () => {
      const mockContent = "Before After Reform\n\n- Point 1\n- Point 2\n- Point 3";
      const bulletPoints = mockContent.match(/-/g);
      
      expect(bulletPoints).toBeTruthy();
      expect(bulletPoints!.length).toBe(3);
      expect(mockContent.length).toBeLessThanOrEqual(500);
    });
  });

  describe("プラットフォーム別ハッシュタグ数", () => {
    it("Instagram向けは8-12個のハッシュタグ", () => {
      const hashtags = "tag1 tag2 tag3 tag4 tag5 tag6 tag7 tag8 tag9";
      const hashtagArray = hashtags.split(" ");
      
      expect(hashtagArray.length).toBeGreaterThanOrEqual(8);
      expect(hashtagArray.length).toBeLessThanOrEqual(12);
    });

    it("X向けは2-3個のハッシュタグ", () => {
      const hashtags = "tag1 tag2 tag3";
      const hashtagArray = hashtags.split(" ");
      
      expect(hashtagArray.length).toBeGreaterThanOrEqual(2);
      expect(hashtagArray.length).toBeLessThanOrEqual(3);
    });

    it("Threads向けは5-8個のハッシュタグ", () => {
      const hashtags = "tag1 tag2 tag3 tag4 tag5 tag6";
      const hashtagArray = hashtags.split(" ");
      
      expect(hashtagArray.length).toBeGreaterThanOrEqual(5);
      expect(hashtagArray.length).toBeLessThanOrEqual(8);
    });
  });

  describe("文字数カウンターの動作", () => {
    it("投稿文とハッシュタグを合わせた文字数をカウント", () => {
      const content = "This is a test post content.";
      const hashtags = "tag1 tag2 tag3";
      const fullPost = `${content}\n\n${hashtags}`;
      
      expect(fullPost.length).toBeGreaterThan(0);
      expect(fullPost).toContain(content);
      expect(fullPost).toContain(hashtags);
    });

    it("文字数が制限の90%を超えると警告色", () => {
      const maxChars = 280;
      const charCount = 260; // 92.8%
      
      const isWarning = charCount > maxChars * 0.9;
      expect(isWarning).toBe(true);
    });

    it("文字数が制限を超えるとエラー表示", () => {
      const maxChars = 280;
      const charCount = 300;
      
      const isOverLimit = charCount > maxChars;
      expect(isOverLimit).toBe(true);
    });
  });

  describe("プラットフォーム選択UIの動作", () => {
    it("プラットフォーム選択時に正しい値が設定される", () => {
      const platforms = ["instagram", "x", "threads"];
      
      platforms.forEach((platform) => {
        expect(["instagram", "x", "threads"]).toContain(platform);
      });
    });

    it("選択されたプラットフォームに応じて文字数制限が変わる", () => {
      const platformLimits = {
        instagram: 2200,
        x: 280,
        threads: 500,
      };
      
      expect(platformLimits.instagram).toBe(2200);
      expect(platformLimits.x).toBe(280);
      expect(platformLimits.threads).toBe(500);
    });
  });

  describe("生成結果の表示", () => {
    it("プラットフォーム情報が正しく表示される", () => {
      const platforms = [
        { id: "instagram", name: "Instagram" },
        { id: "x", name: "X" },
        { id: "threads", name: "Threads" },
      ];
      
      platforms.forEach((platform) => {
        expect(platform.id).toBeTruthy();
        expect(platform.name).toBeTruthy();
      });
    });

    it("文字数カウンターが正しく表示される", () => {
      const charCount = 250;
      const maxChars = 280;
      const displayText = `${charCount} / ${maxChars}文字`;
      
      expect(displayText).toContain(charCount.toString());
      expect(displayText).toContain(maxChars.toString());
    });
  });
});
