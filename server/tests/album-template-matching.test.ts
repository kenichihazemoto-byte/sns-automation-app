import { describe, it, expect } from "vitest";

/**
 * アルバム・テンプレート整合性機能のテスト
 * - テンプレートからpostCategoryへのマッピング
 * - アルバムのpostCategoryフィルタリング
 * - 不一致警告ロジック
 */

describe("アルバム・テンプレート整合性機能", () => {
  // テンプレート名からpostCategoryへのマッピング（Demo.tsxと同じロジック）
  const TEMPLATE_TO_CATEGORY: Record<string, string> = {
    new_construction: "construction",
    renovation: "renovation",
    open_house: "event",
    staff: "staff",
    local_activity: "local",
    blog: "blog",
  };

  // テンプレートのpostCategoryからアルバムのpostCategoryへのマッピング（AlbumMatchHintと同じロジック）
  const TEMPLATE_TO_ALBUM_CATEGORY: Record<string, string> = {
    construction: "construction_case",
    renovation: "construction_case",
    event: "open_house",
    staff: "staff_intro",
    local: "local_activity",
    blog: "blog_update",
  };

  describe("テンプレート → postCategory マッピング", () => {
    it("施工事例テンプレートはconstructionカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["new_construction"]).toBe("construction");
    });

    it("リフォームテンプレートはrenovationカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["renovation"]).toBe("renovation");
    });

    it("見学会テンプレートはeventカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["open_house"]).toBe("event");
    });

    it("スタッフ紹介テンプレートはstaffカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["staff"]).toBe("staff");
    });

    it("地域活動テンプレートはlocalカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["local_activity"]).toBe("local");
    });

    it("ブログテンプレートはblogカテゴリにマップされる", () => {
      expect(TEMPLATE_TO_CATEGORY["blog"]).toBe("blog");
    });

    it("未知のテンプレートはundefinedを返す", () => {
      expect(TEMPLATE_TO_CATEGORY["unknown_template"]).toBeUndefined();
    });
  });

  describe("postCategory → アルバムカテゴリ マッピング", () => {
    it("constructionはconstruction_caseアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["construction"]).toBe("construction_case");
    });

    it("renovationもconstruction_caseアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["renovation"]).toBe("construction_case");
    });

    it("eventはopen_houseアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["event"]).toBe("open_house");
    });

    it("staffはstaff_introアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["staff"]).toBe("staff_intro");
    });

    it("localはlocal_activityアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["local"]).toBe("local_activity");
    });

    it("blogはblog_updateアルバムにマップされる", () => {
      expect(TEMPLATE_TO_ALBUM_CATEGORY["blog"]).toBe("blog_update");
    });
  });

  describe("アルバムフィルタリングロジック", () => {
    const mockAlbums = [
      { id: 1, title: "施工事例2026", postCategory: "construction_case", isActive: 1 },
      { id: 2, title: "見学会写真", postCategory: "open_house", isActive: 1 },
      { id: 3, title: "スタッフ写真", postCategory: "staff_intro", isActive: 1 },
      { id: 4, title: "全般アルバム", postCategory: null, isActive: 1 },
      { id: 5, title: "無効アルバム", postCategory: "construction_case", isActive: 0 },
    ];

    it("postCategoryが一致するアルバムのみフィルタリングされる", () => {
      const albumCategory = "construction_case";
      const matching = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      expect(matching).toHaveLength(1);
      expect(matching[0].title).toBe("施工事例2026");
    });

    it("無効なアルバムはフィルタリングされない", () => {
      const albumCategory = "construction_case";
      const matching = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      // 無効なアルバム(id:5)は含まれない
      expect(matching.every((a) => a.isActive === 1)).toBe(true);
    });

    it("postCategoryがnullのアルバムはカテゴリフィルタに一致しない", () => {
      const albumCategory = "construction_case";
      const matching = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      // nullカテゴリのアルバム(id:4)は含まれない
      expect(matching.some((a) => a.postCategory === null)).toBe(false);
    });

    it("一致するアルバムがない場合は空配列を返す", () => {
      const albumCategory = "campaign";
      const matching = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      expect(matching).toHaveLength(0);
    });
  });

  describe("不一致警告ロジック", () => {
    it("テンプレートが選択されていない場合は警告なし", () => {
      const selectedTemplate = null;
      const currentPostCategory = selectedTemplate
        ? (TEMPLATE_TO_CATEGORY[selectedTemplate] ?? null)
        : null;
      expect(currentPostCategory).toBeNull();
    });

    it("テンプレートが選択されている場合はpostCategoryが設定される", () => {
      const selectedTemplate = "new_construction";
      const currentPostCategory = selectedTemplate
        ? (TEMPLATE_TO_CATEGORY[selectedTemplate] ?? null)
        : null;
      expect(currentPostCategory).toBe("construction");
    });

    it("施工事例テンプレートで施工事例アルバムが設定されている場合は一致", () => {
      const postCategory = "construction";
      const albumCategory = TEMPLATE_TO_ALBUM_CATEGORY[postCategory] ?? postCategory;
      const mockAlbums = [
        { id: 1, title: "施工事例2026", postCategory: "construction_case", isActive: 1 },
      ];
      const matchingAlbums = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      expect(matchingAlbums.length).toBeGreaterThan(0);
    });

    it("施工事例テンプレートでアルバム未設定の場合は不一致", () => {
      const postCategory = "construction";
      const albumCategory = TEMPLATE_TO_ALBUM_CATEGORY[postCategory] ?? postCategory;
      const mockAlbums = [
        { id: 1, title: "全般アルバム", postCategory: null, isActive: 1 },
      ];
      const matchingAlbums = mockAlbums.filter(
        (a) => a.isActive === 1 && a.postCategory === albumCategory
      );
      expect(matchingAlbums.length).toBe(0);
    });
  });

  describe("DB postCategoryカラムの値の検証", () => {
    const VALID_POST_CATEGORIES = [
      "construction_case",
      "open_house",
      "blog_update",
      "local_activity",
      "staff_intro",
      "campaign",
      "general",
    ];

    it("有効なpostCategory値が定義されている", () => {
      expect(VALID_POST_CATEGORIES).toHaveLength(7);
    });

    it("各postCategory値は文字列である", () => {
      VALID_POST_CATEGORIES.forEach((cat) => {
        expect(typeof cat).toBe("string");
        expect(cat.length).toBeGreaterThan(0);
      });
    });

    it("テンプレートマッピングの全値がVALID_POST_CATEGORIESに含まれる", () => {
      const albumCategories = Object.values(TEMPLATE_TO_ALBUM_CATEGORY);
      albumCategories.forEach((cat) => {
        expect(VALID_POST_CATEGORIES).toContain(cat);
      });
    });
  });
});
