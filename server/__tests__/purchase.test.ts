import { describe, expect, it } from "vitest";
import { buildSearchLinks, detectSourceFromUrl, quoteTotal, rankQuotes } from "../../shared/purchase";

const base = { taxIncluded: true, shippingFee: 0, pointsYen: 0 };

describe("quoteTotal", () => {
  it("税抜の業者見積は10%を加算する（JOTO SPF-R6060F12-IV 11,960円 → 13,156円）", () => {
    expect(quoteTotal({ ...base, unitPrice: 11960, taxIncluded: false }, 1)).toBe(13156);
  });

  it("数量・送料・ポイントを反映する", () => {
    expect(quoteTotal({ unitPrice: 3000, taxIncluded: true, shippingFee: 800, pointsYen: 100 }, 2)).toBe(6700);
  });
});

describe("rankQuotes", () => {
  it("実質支払額の安い順に並べ、最安差を付ける", () => {
    const ranked = rankQuotes(
      [
        { id: 1, ...base, unitPrice: 11960, taxIncluded: false },
        { id: 2, ...base, unitPrice: 12800, shippingFee: 0 },
        { id: 3, ...base, unitPrice: 14000 },
      ],
      1,
    );
    expect(ranked.map(q => q.id)).toEqual([2, 1, 3]);
    expect(ranked[0].isCheapest).toBe(true);
    expect(ranked[1].diffFromCheapest).toBe(13156 - 12800);
    expect(ranked[2].rank).toBe(3);
  });

  it("空配列でも落ちない", () => {
    expect(rankQuotes([], 1)).toEqual([]);
  });
});

describe("buildSearchLinks", () => {
  it("型番をエンコードして各サイトの検索URLを作る", () => {
    const links = buildSearchLinks("SPF-R6060F12-IV");
    expect(links.find(l => l.source === "amazon")?.url).toBe("https://www.amazon.co.jp/s?k=SPF-R6060F12-IV");
    expect(links.find(l => l.source === "monotaro")?.url).toContain("monotaro.com/s/?q=SPF-R6060F12-IV");
    expect(buildSearchLinks("床下 点検口")[0].url).toContain("%E5%BA%8A%E4%B8%8B%20");
    expect(buildSearchLinks("  ")).toEqual([]);
  });
});

describe("detectSourceFromUrl", () => {
  it("URLから通販サイトを判定する", () => {
    expect(detectSourceFromUrl("https://www.amazon.co.jp/dp/B000")).toBe("amazon");
    expect(detectSourceFromUrl("https://store.shopping.yahoo.co.jp/x/y.html")).toBe("yahoo");
    expect(detectSourceFromUrl("https://item.rakuten.co.jp/shop/item/")).toBe("rakuten");
    expect(detectSourceFromUrl("https://www.monotaro.com/g/01234567/")).toBe("monotaro");
    expect(detectSourceFromUrl("https://www.askul.co.jp/p/123/")).toBe("other");
    expect(detectSourceFromUrl("not a url")).toBeNull();
  });
});
