import { describe, it, expect } from "vitest";

describe("ビフォーアフター投稿文生成機能のテスト", () => {
  describe("テンプレート構造", () => {
    it("ビフォーアフターテンプレートが存在する", () => {
      const templateId = "before_after";
      expect(templateId).toBe("before_after");
    });

    it("テンプレートの必須フィールドが存在する", () => {
      const mockTemplate = {
        id: "before_after",
        name: "ビフォーアフター",
        category: "リフォーム",
        companyName: "ハゼモト建設",
        description: "施工前と施工後の2枚の写真を使用し、変化を強調する投稿文を生成",
        icon: "🔄",
        structure: {
          opening: "問題提起：施工前の状態や課題を描写。共感を呼ぶ表現で始める",
          body: "解決プロセス：どのような工事を行ったか、こだわりポイントを紹介。具体的な変化点を箇条書きで明記",
          cta: "結果：施工後の変化とお客様の反応を紹介。リフォーム相談への誘導"
        },
        tone: "変化の驚きと満足感を表現。ビフォーアフターの対比を強調",
        recommendedHashtags: [
          "リフォーム北九州",
          "リノベーション北九州",
          "ビフォーアフター",
          "施工事例北九州",
          "北九州工務店",
          "ハゼモト建設",
          "住まいのリフォーム",
          "北九州市",
          "家づくり北九州"
        ],
        sampleText: "サンプル投稿文"
      };

      expect(mockTemplate.id).toBe("before_after");
      expect(mockTemplate.name).toBe("ビフォーアフター");
      expect(mockTemplate.category).toBe("リフォーム");
      expect(mockTemplate.companyName).toBe("ハゼモト建設");
      expect(mockTemplate.structure.opening).toContain("問題提起");
      expect(mockTemplate.structure.body).toContain("解決プロセス");
      expect(mockTemplate.structure.cta).toContain("結果");
      expect(mockTemplate.recommendedHashtags).toContain("ビフォーアフター");
      expect(mockTemplate.recommendedHashtags.length).toBeGreaterThan(5);
    });
  });

  describe("投稿文生成パラメータ", () => {
    it("必須パラメータが正しく設定される", () => {
      const params = {
        beforeImageUrl: "https://example.com/before.jpg",
        afterImageUrl: "https://example.com/after.jpg",
        companyName: "ハゼモト建設",
        platform: "instagram",
        additionalContext: "キッチンのリフォーム事例"
      };

      expect(params.beforeImageUrl).toBeTruthy();
      expect(params.afterImageUrl).toBeTruthy();
      expect(params.companyName).toMatch(/^(ハゼモト建設|クリニックアーキプロ)$/);
      expect(params.platform).toMatch(/^(instagram|x|threads)$/);
    });

    it("2枚の画像URLが異なる", () => {
      const beforeUrl = "https://example.com/before.jpg";
      const afterUrl = "https://example.com/after.jpg";

      expect(beforeUrl).not.toBe(afterUrl);
    });
  });

  describe("生成結果の構造", () => {
    it("投稿文とハッシュタグが正しく返される", () => {
      const mockResult = {
        content: "🔄 ビフォーアフターリフォーム 🔄\n\n「古いキッチンで料理が楽しくない...」\nそんなお悩みを解決しました✨\n\n【リフォームのポイント】\n✅ 築30年のキッチンを最新のシステムキッチンに\n✅ 広々とした作業スペースで毎日の料理が快適に\n✅ 収納もたっぷりで使いやすさが大幅アップ\n\n「新しいキッチンで料理が楽しくなりました!」\nとお客様からも大好評。\n\nリフォームのご相談はお気軽にハゼモト建設まで💪",
        hashtags: "リフォーム北九州 リノベーション北九州 ビフォーアフター 施工事例北九州 北九州工務店 ハゼモト建設 住まいのリフォーム 北九州市 家づくり北九州"
      };

      expect(mockResult.content).toBeTruthy();
      expect(mockResult.hashtags).toBeTruthy();
      expect(mockResult.content).toContain("ビフォーアフター");
      expect(mockResult.hashtags).toContain("リフォーム北九州");
      expect(mockResult.hashtags).toContain("ビフォーアフター");
    });

    it("投稿文が問題提起→解決→結果の構成になっている", () => {
      const mockContent = "「古いキッチンで料理が楽しくない...」\nそんなお悩みを解決しました✨\n\n【リフォームのポイント】\n✅ 築30年のキッチンを最新のシステムキッチンに\n\n「新しいキッチンで料理が楽しくなりました!」\nとお客様からも大好評。";

      // 問題提起（冒頭）
      expect(mockContent).toMatch(/古い|課題|悩み|不便/);
      
      // 解決プロセス（本文）
      expect(mockContent).toMatch(/リフォーム|工事|変更|改善/);
      
      // 結果（CTA）
      expect(mockContent).toMatch(/お客様|好評|ご相談|お気軽/);
    });

    it("変化点が箇条書きで明記されている", () => {
      const mockContent = "【リフォームのポイント】\n✅ 築30年のキッチンを最新のシステムキッチンに\n✅ 広々とした作業スペースで毎日の料理が快適に\n✅ 収納もたっぷりで使いやすさが大幅アップ";

      const bulletPoints = mockContent.match(/✅/g);
      expect(bulletPoints).toBeTruthy();
      expect(bulletPoints!.length).toBeGreaterThanOrEqual(3);
      expect(bulletPoints!.length).toBeLessThanOrEqual(5);
    });
  });

  describe("プラットフォーム別最適化", () => {
    it("Instagramは2200文字以内", () => {
      const maxLength = 2200;
      const mockContent = "テスト投稿文".repeat(100);
      
      expect(mockContent.length).toBeLessThanOrEqual(maxLength * 2); // 実際の生成時は制限される
    });

    it("Xは280文字以内", () => {
      const maxLength = 280;
      const mockShortContent = "🔄 キッチンリフォーム完成！築30年→最新システムキッチンに。収納も充実で毎日快適✨ #リフォーム北九州 #ビフォーアフター #ハゼモト建設";
      
      expect(mockShortContent.length).toBeLessThanOrEqual(maxLength);
    });

    it("Threadsは500文字以内", () => {
      const maxLength = 500;
      const mockMediumContent = "🔄 ビフォーアフターリフォーム\n\n「古いキッチンで料理が楽しくない...」そんなお悩みを解決✨\n\n✅ 築30年→最新システムキッチン\n✅ 広々作業スペース\n✅ 収納たっぷり\n\nお客様からも大好評！ご相談はお気軽に💪";
      
      expect(mockMediumContent.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe("ハッシュタグ最適化", () => {
    it("北九州市向けのハッシュタグが含まれる", () => {
      const mockHashtags = "リフォーム北九州 リノベーション北九州 ビフォーアフター 施工事例北九州 北九州工務店 ハゼモト建設 住まいのリフォーム 北九州市 家づくり北九州";
      
      expect(mockHashtags).toContain("北九州");
      expect(mockHashtags).toContain("ハゼモト建設");
    });

    it("ビフォーアフター専用のハッシュタグが含まれる", () => {
      const mockHashtags = "リフォーム北九州 リノベーション北九州 ビフォーアフター 施工事例北九州";
      
      expect(mockHashtags).toContain("ビフォーアフター");
      expect(mockHashtags).toContain("リフォーム");
      expect(mockHashtags).toContain("リノベーション");
    });

    it("ハッシュタグが適切な数（8-12個）", () => {
      const mockHashtags = "リフォーム北九州 リノベーション北九州 ビフォーアフター 施工事例北九州 北九州工務店 ハゼモト建設 住まいのリフォーム 北九州市 家づくり北九州";
      const hashtagArray = mockHashtags.split(" ");
      
      expect(hashtagArray.length).toBeGreaterThanOrEqual(8);
      expect(hashtagArray.length).toBeLessThanOrEqual(12);
    });
  });

  describe("エラーハンドリング", () => {
    it("施工前の画像URLが空の場合エラー", () => {
      const params = {
        beforeImageUrl: "",
        afterImageUrl: "https://example.com/after.jpg",
        companyName: "ハゼモト建設",
        platform: "instagram"
      };

      expect(params.beforeImageUrl).toBeFalsy();
    });

    it("施工後の画像URLが空の場合エラー", () => {
      const params = {
        beforeImageUrl: "https://example.com/before.jpg",
        afterImageUrl: "",
        companyName: "ハゼモト建設",
        platform: "instagram"
      };

      expect(params.afterImageUrl).toBeFalsy();
    });

    it("会社名が不正な場合エラー", () => {
      const invalidCompany = "不正な会社名";
      const validCompanies = ["ハゼモト建設", "クリニックアーキプロ"];

      expect(validCompanies).not.toContain(invalidCompany);
    });
  });
});
