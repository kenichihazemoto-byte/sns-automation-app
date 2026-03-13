import { describe, it, expect } from "vitest";

// 投稿タイプ分類ロジックのテスト（routers.tsのロジックを再現）
const TYPE_KEYWORDS: Record<string, string[]> = {
  "施工事例": ["施工", "完成", "リフォーム", "新築", "工事", "ビフォーアフター", "before", "after", "外壁", "内装", "キッチン", "浴室", "トイレ", "リビング", "和室", "洋室", "玄関", "屋根", "基礎", "断熱", "窓", "床", "壁"],
  "地域活動": ["子ども食堂", "地域", "北九州", "ボランティア", "イベント", "地元", "コミュニティ", "竹", "就労支援", "ラトリエ", "パン", "社会貢献", "活動", "支援"],
  "スタッフ紹介": ["スタッフ", "社員", "職人", "担当", "チーム", "メンバー", "紹介", "入社", "研修", "現場監督", "大工"],
  "社長コラム": ["社長", "代表", "想い", "ご縁", "精進", "考え", "思い", "コラム", "メッセージ", "理念", "ビジョン"],
  "季節・イベント": ["春", "夏", "秋", "冬", "正月", "お盆", "クリスマス", "ゴールデンウィーク", "GW", "梅雨", "台風", "桜", "紅葉", "雪", "暑", "寒", "季節"],
};

function classifyPostType(text: string): string {
  let detectedType = "その他";
  let maxScore = 0;
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  }
  return detectedType;
}

describe("投稿タイプ分類ロジック", () => {
  it("施工事例を正しく分類できる", () => {
    const text = "キッチンのリフォームが完成しました！外壁も新しくなり、とても綺麗になりました。";
    expect(classifyPostType(text)).toBe("施工事例");
  });

  it("地域活動を正しく分類できる", () => {
    const text = "北九州の子ども食堂に参加しました。地域の皆さんと一緒に活動できて嬉しいです。";
    expect(classifyPostType(text)).toBe("地域活動");
  });

  it("スタッフ紹介を正しく分類できる", () => {
    const text = "新しいスタッフが入社しました。職人として現場で活躍する大工さんです。";
    expect(classifyPostType(text)).toBe("スタッフ紹介");
  });

  it("社長コラムを正しく分類できる", () => {
    const text = "社長からのメッセージです。ご縁に感謝し、精進を重ねていきます。想いを大切に。";
    expect(classifyPostType(text)).toBe("社長コラム");
  });

  it("季節・イベントを正しく分類できる", () => {
    const text = "桜が咲いて春らしい季節になりました。クリスマスも近づいてきましたね。";
    expect(classifyPostType(text)).toBe("季節・イベント");
  });

  it("分類できない場合はその他になる", () => {
    const text = "本日もよろしくお願いします。";
    expect(classifyPostType(text)).toBe("その他");
  });
});

describe("推奨バランス計算", () => {
  const recommendedBalance: Record<string, number> = {
    "施工事例": 40,
    "地域活動": 20,
    "スタッフ紹介": 20,
    "社長コラム": 10,
    "季節・イベント": 10,
  };

  it("推奨バランスの合計は100%になる", () => {
    const total = Object.values(recommendedBalance).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("不足カテゴリを正しく特定できる（地域活動・スタッフ紹介が不足）", () => {
    const typeCounts = {
      "施工事例": 8,
      "地域活動": 0,
      "スタッフ紹介": 1,
      "社長コラム": 1,
      "季節・イベント": 0,
      "その他": 0,
    };
    const total = Object.values(typeCounts).reduce((a, b) => a + b, 0); // 10
    const actualBalance: Record<string, number> = {};
    for (const [type, count] of Object.entries(typeCounts)) {
      actualBalance[type] = total > 0 ? Math.round((count / total) * 100) : 0;
    }

    const shortCategories = Object.entries(recommendedBalance)
      .filter(([type, recommended]) => {
        const actual = actualBalance[type] ?? 0;
        return (recommended - actual) > 5;
      })
      .map(([type]) => type);

    expect(shortCategories).toContain("地域活動");
    expect(shortCategories).toContain("スタッフ紹介");
    expect(shortCategories).not.toContain("施工事例"); // 80% > 40% なので不足ではない
  });

  it("投稿が0件の場合は全て0%になる", () => {
    const total = 0;
    const typeCounts = { "施工事例": 0, "地域活動": 0 };
    const actualBalance: Record<string, number> = {};
    for (const [type, count] of Object.entries(typeCounts)) {
      actualBalance[type] = total > 0 ? Math.round((count / total) * 100) : 0;
    }
    expect(actualBalance["施工事例"]).toBe(0);
    expect(actualBalance["地域活動"]).toBe(0);
  });

  it("月の開始・終了日が正しく計算される", () => {
    const year = 2026;
    const month = 3;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    expect(startDate.getDate()).toBe(1);
    expect(startDate.getMonth()).toBe(2); // 0-indexed: March = 2
    expect(endDate.getDate()).toBe(31); // March has 31 days
    expect(endDate.getMonth()).toBe(2);
  });
});
