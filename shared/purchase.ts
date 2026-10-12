/**
 * 購買比較（ネット購入検討 → 櫨本承認）の共通定義・計算ロジック
 * サーバー・クライアント双方から使う
 */

export const PURCHASE_SOURCES = ["amazon", "yahoo", "rakuten", "monotaro", "vendor", "other"] as const;
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

export const SOURCE_LABELS: Record<PurchaseSource, string> = {
  amazon: "Amazon",
  yahoo: "Yahoo!ショッピング",
  rakuten: "楽天市場",
  monotaro: "モノタロウ",
  vendor: "業者見積",
  other: "その他",
};

export const PURCHASE_STATUSES = ["draft", "pending", "approved", "rejected", "ordered", "cancelled"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: "作成中",
  pending: "承認待ち",
  approved: "承認済",
  rejected: "差戻し",
  ordered: "発注済",
  cancelled: "取消",
};

/** 見積・候補を追加・編集できる状態 */
export const EDITABLE_STATUSES: readonly PurchaseStatus[] = ["draft", "rejected"];

export const TAX_RATE = 0.1;

export type QuotePriceFields = {
  unitPrice: number;
  taxIncluded: boolean;
  shippingFee: number;
  pointsYen: number;
};

/**
 * 実質支払額（税込）＝（単価×数量＋送料）を税込換算 − ポイント還元
 * 税抜の見積は送料も税抜とみなして10%を加算する
 */
export function quoteTotal(q: QuotePriceFields, quantity: number): number {
  const subtotal = q.unitPrice * quantity + q.shippingFee;
  const taxed = q.taxIncluded ? subtotal : Math.round(subtotal * (1 + TAX_RATE));
  return taxed - q.pointsYen;
}

export type RankedQuote<T> = T & {
  total: number;
  rank: number;
  isCheapest: boolean;
  /** 最安との差額（円） */
  diffFromCheapest: number;
};

/** 実質支払額の安い順に並べ、最安との差額を付ける */
export function rankQuotes<T extends QuotePriceFields>(quotes: T[], quantity: number): RankedQuote<T>[] {
  const withTotal = quotes.map(q => ({ ...q, total: quoteTotal(q, quantity) }));
  withTotal.sort((a, b) => a.total - b.total);
  const cheapest = withTotal[0]?.total ?? 0;
  return withTotal.map((q, i) => ({
    ...q,
    rank: i + 1,
    isCheapest: q.total === cheapest,
    diffFromCheapest: q.total - cheapest,
  }));
}

export type SearchLink = { source: PurchaseSource; label: string; url: string };

/** 型番・品名から各通販サイトの検索URLを作る */
export function buildSearchLinks(keyword: string): SearchLink[] {
  const k = encodeURIComponent(keyword.trim());
  if (!k) return [];
  return [
    { source: "amazon", label: "Amazon", url: `https://www.amazon.co.jp/s?k=${k}` },
    { source: "yahoo", label: "Yahoo!ショッピング", url: `https://shopping.yahoo.co.jp/search?p=${k}` },
    { source: "rakuten", label: "楽天市場", url: `https://search.rakuten.co.jp/search/mall/${k}/` },
    { source: "monotaro", label: "モノタロウ", url: `https://www.monotaro.com/s/?q=${k}` },
    { source: "other", label: "アスクル", url: `https://www.askul.co.jp/s/?searchWord=${k}` },
    { source: "other", label: "価格.com", url: `https://search.kakaku.com/${k}/` },
    { source: "other", label: "Googleショッピング", url: `https://www.google.com/search?tbm=shop&q=${k}` },
  ];
}

/** URLから通販サイトを推定する（URL貼り付け時の自動選択用） */
export function detectSourceFromUrl(url: string): PurchaseSource | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (/(^|\.)amazon\.co\.jp$|(^|\.)amzn\.(asia|to)$/.test(host)) return "amazon";
  if (/(^|\.)shopping\.yahoo\.co\.jp$|(^|\.)paypaymall\.yahoo\.co\.jp$/.test(host)) return "yahoo";
  if (/(^|\.)rakuten\.co\.jp$/.test(host)) return "rakuten";
  if (/(^|\.)monotaro\.com$/.test(host)) return "monotaro";
  return "other";
}
