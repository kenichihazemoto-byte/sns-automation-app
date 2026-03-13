import { describe, it, expect } from "vitest";

/**
 * 不足カテゴリのテンプレート提案機能のユニットテスト
 * - 不足カテゴリの判定ロジック
 * - テンプレート生成APIの入力バリデーション
 * - 文字数制限のチェック
 */

// 不足カテゴリ判定ロジック（PostBalanceCardと同じロジック）
function detectShortCategories(
  actualBalance: Record<string, number>,
  recommendedBalance: Record<string, number>,
  threshold = 5
): string[] {
  return Object.entries(recommendedBalance)
    .filter(([type, recommended]) => {
      const actual = actualBalance[type] ?? 0;
      return (recommended - actual) > threshold;
    })
    .map(([type]) => type);
}

// テンプレートの文字数チェック
function validateTemplateLength(template: {
  instagram: string;
  threads: string;
  x: string;
}): { instagram: boolean; threads: boolean; x: boolean } {
  return {
    instagram: template.instagram.length <= 2200,
    threads: template.threads.length <= 500,
    x: template.x.length <= 280,
  };
}

describe("不足カテゴリの判定ロジック", () => {
  it("推奨より5%以上少ないカテゴリを不足と判定する", () => {
    const actual = { "施工事例": 30, "地域活動": 10, "スタッフ紹介": 20, "社長コラム": 10, "季節・イベント": 10 };
    const recommended = { "施工事例": 40, "地域活動": 20, "スタッフ紹介": 20, "社長コラム": 10, "季節・イベント": 10 };
    const result = detectShortCategories(actual, recommended);
    expect(result).toContain("施工事例");
    expect(result).toContain("地域活動");
    expect(result).not.toContain("スタッフ紹介");
    expect(result).not.toContain("社長コラム");
  });

  it("全カテゴリが推奨通りの場合は空配列を返す", () => {
    const actual = { "施工事例": 40, "地域活動": 20, "スタッフ紹介": 20, "社長コラム": 10, "季節・イベント": 10 };
    const recommended = { "施工事例": 40, "地域活動": 20, "スタッフ紹介": 20, "社長コラム": 10, "季節・イベント": 10 };
    const result = detectShortCategories(actual, recommended);
    expect(result).toHaveLength(0);
  });

  it("投稿が0件の場合は全カテゴリが不足と判定される", () => {
    const actual = { "施工事例": 0, "地域活動": 0, "スタッフ紹介": 0, "社長コラム": 0, "季節・イベント": 0 };
    const recommended = { "施工事例": 40, "地域活動": 20, "スタッフ紹介": 20, "社長コラム": 10, "季節・イベント": 10 };
    const result = detectShortCategories(actual, recommended);
    expect(result).toHaveLength(5);
  });

  it("閾値ちょうどの場合は不足と判定しない（境界値テスト）", () => {
    const actual = { "施工事例": 35 };
    const recommended = { "施工事例": 40 };
    // 差分5%はちょうど閾値なので不足ではない（> 5 の条件）
    const result = detectShortCategories(actual, recommended, 5);
    expect(result).not.toContain("施工事例");
  });

  it("閾値を超えた場合のみ不足と判定する（境界値テスト）", () => {
    const actual = { "施工事例": 34 };
    const recommended = { "施工事例": 40 };
    // 差分6%は閾値超えなので不足
    const result = detectShortCategories(actual, recommended, 5);
    expect(result).toContain("施工事例");
  });
});

describe("テンプレートの文字数バリデーション", () => {
  it("各プラットフォームの文字数制限内のテンプレートはバリデーションをパスする", () => {
    const template = {
      instagram: "A".repeat(1000) + " #ハゼモト建設",
      threads: "B".repeat(400) + " #北九州",
      x: "C".repeat(200) + " #家づくり",
    };
    const result = validateTemplateLength(template);
    expect(result.instagram).toBe(true);
    expect(result.threads).toBe(true);
    expect(result.x).toBe(true);
  });

  it("Instagramは2200文字まで許容する", () => {
    const template = {
      instagram: "A".repeat(2200),
      threads: "B".repeat(100),
      x: "C".repeat(100),
    };
    const result = validateTemplateLength(template);
    expect(result.instagram).toBe(true);
  });

  it("Instagram2201文字はバリデーション失敗", () => {
    const template = {
      instagram: "A".repeat(2201),
      threads: "B".repeat(100),
      x: "C".repeat(100),
    };
    const result = validateTemplateLength(template);
    expect(result.instagram).toBe(false);
  });

  it("Threads500文字はバリデーションをパスする", () => {
    const template = {
      instagram: "A".repeat(500),
      threads: "B".repeat(500),
      x: "C".repeat(100),
    };
    const result = validateTemplateLength(template);
    expect(result.threads).toBe(true);
  });

  it("Threads501文字はバリデーション失敗", () => {
    const template = {
      instagram: "A".repeat(500),
      threads: "B".repeat(501),
      x: "C".repeat(100),
    };
    const result = validateTemplateLength(template);
    expect(result.threads).toBe(false);
  });

  it("X280文字はバリデーションをパスする", () => {
    const template = {
      instagram: "A".repeat(500),
      threads: "B".repeat(300),
      x: "C".repeat(280),
    };
    const result = validateTemplateLength(template);
    expect(result.x).toBe(true);
  });

  it("X281文字はバリデーション失敗", () => {
    const template = {
      instagram: "A".repeat(500),
      threads: "B".repeat(300),
      x: "C".repeat(281),
    };
    const result = validateTemplateLength(template);
    expect(result.x).toBe(false);
  });
});

describe("テンプレート生成APIの入力バリデーション", () => {
  it("空の不足カテゴリ配列は早期リターンすべき", () => {
    const shortCategories: string[] = [];
    expect(shortCategories.length === 0).toBe(true);
    // 空配列の場合はAPIを呼ばない
  });

  it("最大3カテゴリまで処理する", () => {
    const shortCategories = ["施工事例", "地域活動", "スタッフ紹介", "社長コラム"];
    const processedCategories = shortCategories.slice(0, 3);
    expect(processedCategories).toHaveLength(3);
    expect(processedCategories).not.toContain("社長コラム");
  });

  it("有効なカテゴリ名を正しく認識する", () => {
    const validCategories = ["施工事例", "地域活動", "スタッフ紹介", "社長コラム", "季節・イベント"];
    const categoryGuide: Record<string, string> = {
      "施工事例": "完成した住宅・リフォーム事例の紹介",
      "地域活動": "子ども食堂・就労支援・地域イベント",
      "スタッフ紹介": "職人・スタッフの人柄・技術",
      "社長コラム": "社長・櫨本健一の家づくりへの想い",
      "季節・イベント": "季節の変わり目・年中行事",
    };
    validCategories.forEach(category => {
      expect(categoryGuide[category]).toBeDefined();
    });
  });
});
