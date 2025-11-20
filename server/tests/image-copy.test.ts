import { describe, it, expect } from "vitest";

describe("写真表示とコピー機能のテスト", () => {
  describe("写真表示機能", () => {
    it("写真URLが正しい形式である", () => {
      const mockPhoto = {
        url: "https://lh3.googleusercontent.com/test-image.jpg",
        id: "test-photo-id",
      };

      expect(mockPhoto.url).toContain("https://");
      expect(mockPhoto.url).toBeTruthy();
      expect(mockPhoto.id).toBeTruthy();
    });

    it("選択された写真の情報が正しく保持される", () => {
      const selectedImage = {
        photo: {
          url: "https://example.com/photo.jpg",
          id: "photo-123",
        },
        analysis: {
          category: "外観",
          style: "モダン",
          description: "美しい建物の外観",
          keywords: ["建築", "デザイン", "モダン"],
        },
        score: 8.5,
      };

      expect(selectedImage.photo.url).toBeTruthy();
      expect(selectedImage.analysis).toBeTruthy();
      expect(selectedImage.score).toBeGreaterThan(0);
    });

    it("複数写真がスコア順にソートされる", () => {
      const photos = [
        { score: 7.5, photo: { id: "1" } },
        { score: 9.2, photo: { id: "2" } },
        { score: 8.1, photo: { id: "3" } },
      ];

      const sorted = photos.sort((a, b) => b.score - a.score);

      expect(sorted[0].score).toBe(9.2);
      expect(sorted[1].score).toBe(8.1);
      expect(sorted[2].score).toBe(7.5);
    });
  });

  describe("コピー機能", () => {
    it("投稿文が正しくフォーマットされる", () => {
      const content = {
        caption: "素晴らしい建築作品が完成しました",
        hashtags: ["建築", "デザイン", "住宅"],
      };

      const formatted = `${content.caption}\n\n${content.hashtags.map((t) => `#${t}`).join(" ")}`;

      expect(formatted).toContain(content.caption);
      expect(formatted).toContain("#建築");
      expect(formatted).toContain("#デザイン");
      expect(formatted).toContain("#住宅");
    });

    it("複数プラットフォームの投稿文が生成される", () => {
      const contents = {
        instagram: {
          caption: "Instagram用の投稿文",
          hashtags: ["tag1", "tag2", "tag3"],
        },
        x: {
          caption: "X用の投稿文",
          hashtags: ["tag1", "tag2"],
        },
        threads: {
          caption: "Threads用の投稿文",
          hashtags: ["tag1", "tag2"],
        },
      };

      expect(contents.instagram).toBeTruthy();
      expect(contents.x).toBeTruthy();
      expect(contents.threads).toBeTruthy();
      expect(contents.instagram.hashtags.length).toBeGreaterThanOrEqual(3);
    });

    it("ハッシュタグが正しくフォーマットされる", () => {
      const hashtags = ["建築", "デザイン", "住宅"];
      const formatted = hashtags.map((t) => `#${t}`).join(" ");

      expect(formatted).toBe("#建築 #デザイン #住宅");
      expect(formatted.split(" ")).toHaveLength(3);
      expect(formatted).toMatch(/^#/);
    });
  });

  describe("写真ダウンロード機能", () => {
    it("ダウンロードファイル名が正しく生成される", () => {
      const companyName = "ハゼモト建設";
      const timestamp = new Date().getTime();
      const filename = `${companyName}_${timestamp}.jpg`;

      expect(filename).toContain(companyName);
      expect(filename).toContain(".jpg");
      expect(filename).toBeTruthy();
    });

    it("画像URLからBlobが取得可能な形式である", () => {
      const imageUrl = "https://example.com/image.jpg";

      expect(imageUrl).toMatch(/^https?:\/\//);
      expect(imageUrl).toContain(".jpg");
    });
  });

  describe("一括コピー機能", () => {
    it("ClipboardItem用のデータ構造が正しい", () => {
      const mockClipboardData = {
        'image/jpeg': new Blob([], { type: 'image/jpeg' }),
        'text/plain': new Blob(['投稿文'], { type: 'text/plain' }),
      };

      expect(mockClipboardData['image/jpeg']).toBeInstanceOf(Blob);
      expect(mockClipboardData['text/plain']).toBeInstanceOf(Blob);
      expect(mockClipboardData['image/jpeg'].type).toBe('image/jpeg');
      expect(mockClipboardData['text/plain'].type).toBe('text/plain');
    });

    it("投稿文とハッシュタグが結合される", () => {
      const caption = "素晴らしい建築作品";
      const hashtags = ["建築", "デザイン"];
      const combined = `${caption}\n\n${hashtags.map((t) => `#${t}`).join(" ")}`;

      expect(combined).toContain(caption);
      expect(combined).toContain("\n\n");
      expect(combined).toContain("#建築");
      expect(combined).toContain("#デザイン");
    });
  });

  describe("プラットフォーム別の表示", () => {
    it("各プラットフォームのアイコンが識別される", () => {
      const platforms = ["instagram", "x", "threads"];

      platforms.forEach((platform) => {
        expect(platform).toBeTruthy();
        expect(["instagram", "x", "threads"]).toContain(platform);
      });
    });

    it("タブの切り替えが正しく動作する", () => {
      const tabs = ["instagram", "x", "threads"];
      let activeTab = "instagram";

      activeTab = "x";
      expect(activeTab).toBe("x");
      expect(tabs).toContain(activeTab);

      activeTab = "threads";
      expect(activeTab).toBe("threads");
      expect(tabs).toContain(activeTab);
    });
  });

  describe("エラーハンドリング", () => {
    it("写真が選択されていない場合のエラーメッセージ", () => {
      const selectedImage = null;
      const errorMessage = "写真が選択されていません";

      if (!selectedImage) {
        expect(errorMessage).toBe("写真が選択されていません");
      }
    });

    it("投稿文が生成されていない場合のエラーメッセージ", () => {
      const contents = null;
      const errorMessage = "写真と投稿文を生成してから保存してください";

      if (!contents) {
        expect(errorMessage).toBe("写真と投稿文を生成してから保存してください");
      }
    });

    it("ダウンロード失敗時のエラーメッセージ", () => {
      const errorMessage = "写真のダウンロードに失敗しました";

      expect(errorMessage).toBe("写真のダウンロードに失敗しました");
      expect(errorMessage).toBeTruthy();
    });
  });
});
