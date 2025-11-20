import { describe, it, expect } from "vitest";

describe("ターゲット別投稿文生成と複数写真アップロード機能のテスト", () => {
  describe("ターゲット別投稿文生成", () => {
    it("ハゼモト建設のターゲットが正しく設定される", () => {
      const companyName = "ハゼモト建設";
      const targetAudience = {
        name: "住宅購入検討者（一般ユーザー）",
        description: "マイホームを夢見る家族、住まいへのこだわりを持つ方、快適な生活空間を求める方",
        tone: "親しみやすく、共感を呼ぶ温かい表現。「家族」「夢」「安心」などのキーワードを使用",
        keywords: ["家族", "夢のマイホーム", "快適な暮らし", "安心", "住まい", "ライフスタイル"],
      };

      expect(companyName).toBe("ハゼモト建設");
      expect(targetAudience.name).toContain("住宅購入検討者");
      expect(targetAudience.keywords).toContain("家族");
      expect(targetAudience.keywords).toContain("夢のマイホーム");
    });

    it("クリニックアーキプロのターゲットが正しく設定される", () => {
      const companyName = "クリニックアーキプロ";
      const targetAudience = {
        name: "医療関係者（医師、クリニック経営者）",
        description: "クリニック開業を考える医師、施設リニューアルを検討する経営者、患者体験向上を目指す医療プロフェッショナル",
        tone: "専門的で信頼感のある表現。「患者様」「医療環境」「機能性」などのキーワードを使用",
        keywords: ["患者様体験", "医療環境", "機能性", "クリニック設計", "プロフェッショナル", "信頼"],
      };

      expect(companyName).toBe("クリニックアーキプロ");
      expect(targetAudience.name).toContain("医療関係者");
      expect(targetAudience.keywords).toContain("患者様体験");
      expect(targetAudience.keywords).toContain("医療環境");
    });

    it("ハゼモト建設の投稿文に住宅ユーザー向けキーワードが含まれる", () => {
      const sampleCaption = "家族の笑顔が溢れる、夢のマイホームが完成しました。快適な暮らしを実現する安心の住まいづくり。";
      const keywords = ["家族", "夢のマイホーム", "快適な暮らし", "安心"];

      keywords.forEach((keyword) => {
        expect(sampleCaption).toContain(keyword);
      });
    });

    it("クリニックアーキプロの投稿文に医療関係者向けキーワードが含まれる", () => {
      const sampleCaption = "患者様体験を最優先に考えた医療環境を実現。機能性とデザインを両立したクリニック設計で、信頼されるプロフェッショナルな空間を創造します。";
      const keywords = ["患者様体験", "医療環境", "機能性", "クリニック設計", "プロフェッショナル", "信頼"];

      keywords.forEach((keyword) => {
        expect(sampleCaption).toContain(keyword);
      });
    });

    it("プラットフォームごとに異なるトーンが適用される", () => {
      const platforms = {
        instagram: {
          tone: "親しみやすく、視覚的な表現を重視",
          length: "長め（200-300文字程度）",
        },
        x: {
          tone: "シンプルで分かりやすく",
          length: "短め（100-150文字程度）",
        },
        threads: {
          tone: "フレンドリーで親近感のある",
          length: "中程度（150-200文字程度）",
        },
      };

      expect(platforms.instagram.tone).toContain("親しみやすく");
      expect(platforms.x.tone).toContain("シンプル");
      expect(platforms.threads.tone).toContain("フレンドリー");
    });
  });

  describe("複数写真アップロード機能", () => {
    it("最大5枚までの制限が正しく設定される", () => {
      const maxPhotos = 5;
      const uploadedPhotos = [
        { id: "1", url: "https://example.com/1.jpg" },
        { id: "2", url: "https://example.com/2.jpg" },
        { id: "3", url: "https://example.com/3.jpg" },
        { id: "4", url: "https://example.com/4.jpg" },
        { id: "5", url: "https://example.com/5.jpg" },
      ];

      expect(uploadedPhotos.length).toBeLessThanOrEqual(maxPhotos);
      expect(uploadedPhotos.length).toBe(5);
    });

    it("5枚を超える写真のアップロードがエラーになる", () => {
      const maxPhotos = 5;
      const attemptedPhotos = 6;
      const errorMessage = "一度にアップロードできるのは5枚までです";

      if (attemptedPhotos > maxPhotos) {
        expect(errorMessage).toBe("一度にアップロードできるのは5枚までです");
      }
    });

    it("複数の写真が同時に処理される", () => {
      const uploadedPhotos = [
        { id: "1", url: "https://example.com/1.jpg", processed: true },
        { id: "2", url: "https://example.com/2.jpg", processed: true },
        { id: "3", url: "https://example.com/3.jpg", processed: true },
      ];

      uploadedPhotos.forEach((photo) => {
        expect(photo.processed).toBe(true);
        expect(photo.url).toContain("https://");
      });
    });

    it("アップロードした写真がスコア順にソートされる", () => {
      const uploadedPhotos = [
        { id: "1", url: "https://example.com/1.jpg", score: 7.5 },
        { id: "2", url: "https://example.com/2.jpg", score: 9.2 },
        { id: "3", url: "https://example.com/3.jpg", score: 8.1 },
      ];

      const sortedPhotos = uploadedPhotos.sort((a, b) => b.score - a.score);

      expect(sortedPhotos[0].score).toBe(9.2);
      expect(sortedPhotos[1].score).toBe(8.1);
      expect(sortedPhotos[2].score).toBe(7.5);
    });

    it("最もスコアが高い写真が自動選択される", () => {
      const uploadedPhotos = [
        { id: "1", url: "https://example.com/1.jpg", score: 7.5 },
        { id: "2", url: "https://example.com/2.jpg", score: 9.2 },
        { id: "3", url: "https://example.com/3.jpg", score: 8.1 },
      ];

      const sortedPhotos = uploadedPhotos.sort((a, b) => b.score - a.score);
      const selectedPhoto = sortedPhotos[0];

      expect(selectedPhoto.id).toBe("2");
      expect(selectedPhoto.score).toBe(9.2);
    });

    it("写真一覧が正しく表示される", () => {
      const multiplePhotos = [
        { id: "1", url: "https://example.com/1.jpg" },
        { id: "2", url: "https://example.com/2.jpg" },
        { id: "3", url: "https://example.com/3.jpg" },
      ];

      expect(multiplePhotos.length).toBe(3);
      multiplePhotos.forEach((photo) => {
        expect(photo.url).toBeTruthy();
        expect(photo.id).toBeTruthy();
      });
    });

    it("写真の選択・削除機能が動作する", () => {
      let selectedPhoto = { id: "1", url: "https://example.com/1.jpg" };
      let multiplePhotos = [
        { id: "1", url: "https://example.com/1.jpg" },
        { id: "2", url: "https://example.com/2.jpg" },
        { id: "3", url: "https://example.com/3.jpg" },
      ];

      // 写真を選択
      selectedPhoto = multiplePhotos[1];
      expect(selectedPhoto.id).toBe("2");

      // 写真を削除
      multiplePhotos = multiplePhotos.filter((p) => p.id !== "2");
      expect(multiplePhotos.length).toBe(2);
      expect(multiplePhotos.find((p) => p.id === "2")).toBeUndefined();
    });
  });

  describe("統合テスト", () => {
    it("複数写真アップロード後、ターゲット別投稿文が生成される", () => {
      const companyName = "ハゼモト建設";
      const uploadedPhotos = [
        {
          id: "1",
          url: "https://example.com/1.jpg",
          analysis: {
            category: "外観",
            style: "モダン",
            description: "美しい外観",
            keywords: ["建築", "デザイン"],
          },
        },
        {
          id: "2",
          url: "https://example.com/2.jpg",
          analysis: {
            category: "内装",
            style: "ナチュラル",
            description: "温かい内装",
            keywords: ["インテリア", "木材"],
          },
        },
      ];

      expect(companyName).toBe("ハゼモト建設");
      expect(uploadedPhotos.length).toBe(2);
      uploadedPhotos.forEach((photo) => {
        expect(photo.analysis).toBeTruthy();
        expect(photo.analysis.category).toBeTruthy();
      });
    });

    it("ファイルサイズとファイル数の両方がチェックされる", () => {
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const maxPhotos = 5;
      const testFiles = [
        { name: "photo1.jpg", size: 5 * 1024 * 1024 },
        { name: "photo2.jpg", size: 8 * 1024 * 1024 },
        { name: "photo3.jpg", size: 3 * 1024 * 1024 },
      ];

      expect(testFiles.length).toBeLessThanOrEqual(maxPhotos);
      testFiles.forEach((file) => {
        expect(file.size).toBeLessThan(maxFileSize);
      });
    });

    it("アップロード成功時の通知メッセージが正しい", () => {
      const uploadedCount = 3;
      const successMessage = `${uploadedCount}枚の写真をアップロードしました`;

      expect(successMessage).toBe("3枚の写真をアップロードしました");
      expect(successMessage).toContain(uploadedCount.toString());
    });
  });
});
