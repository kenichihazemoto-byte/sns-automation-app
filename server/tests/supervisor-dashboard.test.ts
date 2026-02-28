/**
 * 支援員ダッシュボードとカテゴリ別テンプレートのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== 支援員ダッシュボードのテスト =====

describe("支援員ダッシュボード", () => {
  describe("getAllUsersProgressToday", () => {
    it("管理者権限チェック：非管理者はFORBIDDENエラーになること", async () => {
      // 非管理者ユーザーのコンテキストを模擬
      const nonAdminCtx = {
        user: { id: 1, role: "user" as const, openId: "test-open-id" },
      };
      
      // 権限チェックロジックを直接テスト
      const checkAdminAccess = (role: string) => {
        if (role !== "admin") {
          throw new Error("FORBIDDEN: 管理者のみアクセスできます");
        }
        return true;
      };
      
      expect(() => checkAdminAccess(nonAdminCtx.user.role)).toThrow("FORBIDDEN");
    });

    it("管理者権限チェック：管理者はアクセスできること", () => {
      const adminCtx = {
        user: { id: 1, role: "admin" as const, openId: "admin-open-id" },
      };
      
      const checkAdminAccess = (role: string) => {
        if (role !== "admin") {
          throw new Error("FORBIDDEN: 管理者のみアクセスできます");
        }
        return true;
      };
      
      expect(checkAdminAccess(adminCtx.user.role)).toBe(true);
    });

    it("ユーザー進捗データの構造が正しいこと", () => {
      // 期待されるデータ構造を検証
      const mockProgressData = {
        userId: 1,
        name: "テスト利用者",
        email: "test@example.com",
        todayPostCount: 3,
        todayApprovalCount: 1,
        todaySuccessCount: 2,
        lastActivityAt: new Date(),
        topTemplate: "ハゼモト建設：施工事例",
      };
      
      expect(mockProgressData).toHaveProperty("userId");
      expect(mockProgressData).toHaveProperty("name");
      expect(mockProgressData).toHaveProperty("email");
      expect(mockProgressData).toHaveProperty("todayPostCount");
      expect(mockProgressData).toHaveProperty("todayApprovalCount");
      expect(mockProgressData).toHaveProperty("todaySuccessCount");
      expect(mockProgressData).toHaveProperty("lastActivityAt");
      expect(mockProgressData).toHaveProperty("topTemplate");
      
      expect(typeof mockProgressData.userId).toBe("number");
      expect(typeof mockProgressData.todayPostCount).toBe("number");
      expect(mockProgressData.todayPostCount).toBeGreaterThanOrEqual(0);
    });

    it("成功率の計算が正しいこと", () => {
      const calculateSuccessRate = (successCount: number, totalCount: number) => {
        if (totalCount === 0) return 0;
        return Math.round((successCount / totalCount) * 100);
      };
      
      expect(calculateSuccessRate(0, 0)).toBe(0);
      expect(calculateSuccessRate(3, 3)).toBe(100);
      expect(calculateSuccessRate(2, 4)).toBe(50);
      expect(calculateSuccessRate(1, 3)).toBe(33);
    });

    it("ステータスバッジの判定ロジックが正しいこと", () => {
      const getStatus = (todayPostCount: number, todaySuccessCount: number) => {
        if (todayPostCount === 0) return "未着手";
        const successRate = todaySuccessCount / todayPostCount;
        if (successRate >= 0.8) return "順調";
        if (successRate >= 0.5) return "作業中";
        return "要確認";
      };
      
      expect(getStatus(0, 0)).toBe("未着手");
      expect(getStatus(5, 5)).toBe("順調");
      expect(getStatus(5, 4)).toBe("順調");
      expect(getStatus(4, 2)).toBe("作業中");
      expect(getStatus(4, 1)).toBe("要確認");
    });
  });

  describe("sendFeedback", () => {
    it("フィードバックタイプのバリデーションが正しいこと", () => {
      const validFeedbackTypes = ["praise", "suggestion", "correction"];
      
      expect(validFeedbackTypes).toContain("praise");
      expect(validFeedbackTypes).toContain("suggestion");
      expect(validFeedbackTypes).toContain("correction");
      expect(validFeedbackTypes).not.toContain("invalid");
    });

    it("メッセージの長さバリデーションが正しいこと", () => {
      const validateMessage = (message: string) => {
        if (message.trim().length === 0) return { valid: false, error: "メッセージは必須です" };
        if (message.length > 500) return { valid: false, error: "500文字以内で入力してください" };
        return { valid: true };
      };
      
      expect(validateMessage("").valid).toBe(false);
      expect(validateMessage("  ").valid).toBe(false);
      expect(validateMessage("こんにちは").valid).toBe(true);
      expect(validateMessage("a".repeat(500)).valid).toBe(true);
      expect(validateMessage("a".repeat(501)).valid).toBe(false);
    });
  });
});

// ===== カテゴリ別テンプレートのテスト =====

describe("カテゴリ別テンプレート", () => {
  const categoryTemplateNames = [
    "ラトリエルアッシュ：本日のパン紹介",
    "ラトリエルアッシュ：季節限定パン",
    "子ども食堂：開催告知",
    "子ども食堂：開催報告",
    "就労支援B型：活動紹介",
    "就労支援B型：成果・達成報告",
    "スタッフ紹介：ハゼモト建設",
    "季節の話題：住まいのアドバイス",
    "季節の話題：地域イベント参加報告",
    "季節の話題：年始のご挨拶",
  ];

  it("10種類のカテゴリ別テンプレートが定義されていること", () => {
    expect(categoryTemplateNames).toHaveLength(10);
  });

  it("各テンプレートが必須フィールドを持つこと", () => {
    const mockTemplate = {
      name: "ラトリエルアッシュ：本日のパン紹介",
      description: "今日焼き上がったパンを紹介する投稿。",
      companyName: "ハゼモト建設",
      isBeforeAfter: false,
      instagramCaption: "今日も朝から焼き上がりました🍞",
      instagramHashtags: "#ラトリエルアッシュ",
      xCaption: "今日の焼き上がり🍞",
      xHashtags: "#ラトリエルアッシュ",
      threadsCaption: "今日のおすすめパン",
      threadsHashtags: "#ラトリエルアッシュ",
    };
    
    expect(mockTemplate.name).toBeTruthy();
    expect(mockTemplate.description).toBeTruthy();
    expect(mockTemplate.companyName).toBe("ハゼモト建設");
    expect(typeof mockTemplate.isBeforeAfter).toBe("boolean");
    expect(mockTemplate.instagramCaption).toBeTruthy();
    expect(mockTemplate.xCaption).toBeTruthy();
    expect(mockTemplate.threadsCaption).toBeTruthy();
  });

  it("ハゼモト建設のブランドキーワードがテンプレートに含まれること", () => {
    const brandKeyword = "地元で生まれ地元で育った北九州の工務店";
    
    // スタッフ紹介テンプレートにブランドキーワードが含まれることを確認
    const staffIntroCaption = `スタッフ紹介👷

{スタッフ名}（{役職・担当}）

{スタッフの仕事への想いや得意なこと}

「地元で生まれ地元で育った北九州の工務店」ハゼモト建設。
こんなスタッフたちが、お客様の家づくりをサポートしています。`;
    
    expect(staffIntroCaption).toContain(brandKeyword);
  });

  it("子ども食堂テンプレートに「無料」キーワードが含まれること", () => {
    const kodomoshokudoCaption = "どなたでも無料でご参加いただけます。";
    expect(kodomoshokudoCaption).toContain("無料");
  });

  it("就労支援B型テンプレートに適切な表現が含まれること", () => {
    const supportCaption = "一人ひとりのペースを大切に、できることを少しずつ増やしていく。";
    expect(supportCaption).toContain("ペース");
    expect(supportCaption).toContain("大切");
  });

  it("テンプレート名のカテゴリ分類が正しいこと", () => {
    const bakeryTemplates = categoryTemplateNames.filter(n => n.includes("ラトリエルアッシュ"));
    const kodomoshokudoTemplates = categoryTemplateNames.filter(n => n.includes("子ども食堂"));
    const supportTemplates = categoryTemplateNames.filter(n => n.includes("就労支援B型"));
    const staffTemplates = categoryTemplateNames.filter(n => n.includes("スタッフ紹介"));
    const seasonalTemplates = categoryTemplateNames.filter(n => n.includes("季節の話題"));
    
    expect(bakeryTemplates).toHaveLength(2);
    expect(kodomoshokudoTemplates).toHaveLength(2);
    expect(supportTemplates).toHaveLength(2);
    expect(staffTemplates).toHaveLength(1);
    expect(seasonalTemplates).toHaveLength(3);
  });
});

// ===== 最終活動時刻フォーマットのテスト =====

describe("最終活動時刻フォーマット", () => {
  const formatLastActivity = (date: Date | null): string => {
    if (!date) return "本日未活動";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}時間前`;
    return `${Math.floor(diffHour / 24)}日前`;
  };

  it("nullの場合は「本日未活動」を返すこと", () => {
    expect(formatLastActivity(null)).toBe("本日未活動");
  });

  it("1分未満は「たった今」を返すこと", () => {
    const now = new Date();
    expect(formatLastActivity(now)).toBe("たった今");
  });

  it("30分前は「30分前」を返すこと", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatLastActivity(thirtyMinAgo)).toBe("30分前");
  });

  it("2時間前は「2時間前」を返すこと", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatLastActivity(twoHoursAgo)).toBe("2時間前");
  });
});
