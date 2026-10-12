/**
 * 購買比較・承認サービス
 *
 * - 誰でも（ログインユーザー）購買申請を作成し、Amazon・Yahoo!・楽天・モノタロウ・業者見積・その他の
 *   価格を登録して比較できる
 * - 承認・差戻しは承認者（櫨本）のみ
 *
 * 承認者の判定（上から優先）:
 *   1. PURCHASE_APPROVER_EMAILS（カンマ区切り）が設定されていれば、そのメールアドレスのユーザー
 *   2. OWNER_OPEN_ID のユーザー（アプリオーナー＝櫨本）
 *   3. どちらも未設定なら role=admin のユーザー
 *
 * 任意の環境変数:
 *   RAKUTEN_APP_ID … 楽天市場の価格を自動取得（楽天ウェブサービスのアプリID）
 *   YAHOO_APP_ID   … Yahoo!ショッピングの価格を自動取得（Yahoo!デベロッパーネットワークのClient ID）
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  purchaseQuotes,
  purchaseRequests,
  type InsertPurchaseQuote,
  type InsertPurchaseRequest,
  type PurchaseRequest,
  type User,
} from "../drizzle/schema";
import { EDITABLE_STATUSES, rankQuotes, type PurchaseSource, type PurchaseStatus } from "../shared/purchase";
import { ENV } from "./_core/env";
import { getDb } from "./db";

// ---------------------------------------------------------------------------
// 権限
// ---------------------------------------------------------------------------

export function isPurchaseApprover(user: Pick<User, "openId" | "email" | "role">): boolean {
  const emails = (process.env.PURCHASE_APPROVER_EMAILS ?? "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length > 0) return !!user.email && emails.includes(user.email.toLowerCase());
  if (ENV.ownerOpenId) return user.openId === ENV.ownerOpenId;
  return user.role === "admin";
}

function assertApprover(user: User) {
  if (!isPurchaseApprover(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "承認は櫨本のみ実施できます" });
  }
}

function canEdit(user: User, req: PurchaseRequest) {
  return req.requesterId === user.id || isPurchaseApprover(user);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DBに接続できません" });
  return db;
}

async function loadRequest(id: number) {
  const db = await requireDb();
  const [req] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
  if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "購買申請が見つかりません" });
  return req;
}

async function loadEditableRequest(user: User, id: number) {
  const req = await loadRequest(id);
  if (!canEdit(user, req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "申請者本人または承認者のみ編集できます" });
  }
  if (!EDITABLE_STATUSES.includes(req.status)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "承認待ち・承認済の申請は編集できません" });
  }
  return req;
}

// ---------------------------------------------------------------------------
// 申請
// ---------------------------------------------------------------------------

export type RequestInput = Pick<
  InsertPurchaseRequest,
  "itemName" | "modelNumber" | "maker" | "quantity" | "unit" | "siteName" | "neededBy" | "note"
>;

export async function listRequests(status?: PurchaseStatus) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(purchaseRequests)
    .where(status ? eq(purchaseRequests.status, status) : undefined)
    .orderBy(desc(purchaseRequests.updatedAt))
    .limit(200);
  if (rows.length === 0) return [];

  const quotes = await db
    .select()
    .from(purchaseQuotes)
    .where(inArray(purchaseQuotes.requestId, rows.map(r => r.id)));

  return rows.map(r => {
    const ranked = rankQuotes(quotes.filter(q => q.requestId === r.id), r.quantity);
    const selected = ranked.find(q => q.id === r.selectedQuoteId) ?? null;
    return {
      ...r,
      quoteCount: ranked.length,
      cheapest: ranked[0] ? { source: ranked[0].source, total: ranked[0].total } : null,
      selected: selected ? { source: selected.source, total: selected.total } : null,
    };
  });
}

export async function getRequestDetail(id: number) {
  const db = await requireDb();
  const req = await loadRequest(id);
  const quotes = await db
    .select()
    .from(purchaseQuotes)
    .where(eq(purchaseQuotes.requestId, id))
    .orderBy(purchaseQuotes.createdAt);
  return { request: req, quotes: rankQuotes(quotes, req.quantity) };
}

export async function createRequest(user: User, input: RequestInput) {
  const db = await requireDb();
  const [res] = await db.insert(purchaseRequests).values({
    ...input,
    requesterId: user.id,
    requesterName: user.name ?? user.email ?? `ユーザー${user.id}`,
    status: "draft",
  });
  return { id: Number(res.insertId) };
}

export async function updateRequest(user: User, id: number, input: Partial<RequestInput>) {
  const db = await requireDb();
  await loadEditableRequest(user, id);
  await db.update(purchaseRequests).set(input).where(eq(purchaseRequests.id, id));
  return { success: true };
}

export async function deleteRequest(user: User, id: number) {
  const db = await requireDb();
  const req = await loadRequest(id);
  if (!canEdit(user, req)) throw new TRPCError({ code: "FORBIDDEN", message: "削除できるのは申請者本人または承認者のみです" });
  if (req.status !== "draft" && !isPurchaseApprover(user)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "申請済のものは取消してください" });
  }
  await db.delete(purchaseQuotes).where(eq(purchaseQuotes.requestId, id));
  await db.delete(purchaseRequests).where(eq(purchaseRequests.id, id));
  return { success: true };
}

/** 申請（作成中・差戻し → 承認待ち） */
export async function submitRequest(user: User, id: number, selectedQuoteId: number) {
  const db = await requireDb();
  const req = await loadEditableRequest(user, id);
  const [quote] = await db
    .select()
    .from(purchaseQuotes)
    .where(and(eq(purchaseQuotes.id, selectedQuoteId), eq(purchaseQuotes.requestId, id)))
    .limit(1);
  if (!quote) throw new TRPCError({ code: "BAD_REQUEST", message: "推奨する購入先を選択してください" });

  await db
    .update(purchaseRequests)
    .set({ status: "pending", selectedQuoteId, submittedAt: new Date(), decidedAt: null, decisionComment: null })
    .where(eq(purchaseRequests.id, id));
  return { request: req, quote };
}

/** 承認・差戻し（承認者のみ） */
export async function decideRequest(
  user: User,
  id: number,
  decision: "approved" | "rejected",
  comment: string | undefined,
  selectedQuoteId?: number,
) {
  assertApprover(user);
  const db = await requireDb();
  const req = await loadRequest(id);
  if (req.status !== "pending") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "承認待ちの申請ではありません" });
  }
  let quoteId = req.selectedQuoteId;
  if (decision === "approved" && selectedQuoteId && selectedQuoteId !== quoteId) {
    const [q] = await db
      .select()
      .from(purchaseQuotes)
      .where(and(eq(purchaseQuotes.id, selectedQuoteId), eq(purchaseQuotes.requestId, id)))
      .limit(1);
    if (!q) throw new TRPCError({ code: "BAD_REQUEST", message: "選択した購入先が見つかりません" });
    quoteId = selectedQuoteId;
  }
  await db
    .update(purchaseRequests)
    .set({
      status: decision,
      selectedQuoteId: quoteId,
      approverId: user.id,
      approverName: user.name ?? user.email ?? "承認者",
      decidedAt: new Date(),
      decisionComment: comment || null,
    })
    .where(eq(purchaseRequests.id, id));
  return { success: true };
}

/** 発注済にする（承認済のみ） */
export async function markOrdered(user: User, id: number) {
  const db = await requireDb();
  const req = await loadRequest(id);
  if (!canEdit(user, req)) throw new TRPCError({ code: "FORBIDDEN", message: "申請者本人または承認者のみ操作できます" });
  if (req.status !== "approved") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "承認済の申請のみ発注済にできます" });
  await db.update(purchaseRequests).set({ status: "ordered", orderedAt: new Date() }).where(eq(purchaseRequests.id, id));
  return { success: true };
}

/** 取消（承認待ちを取り下げ／承認済を発注しない） */
export async function cancelRequest(user: User, id: number) {
  const db = await requireDb();
  const req = await loadRequest(id);
  if (!canEdit(user, req)) throw new TRPCError({ code: "FORBIDDEN", message: "申請者本人または承認者のみ操作できます" });
  if (req.status === "ordered") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "発注済の申請は取消できません" });
  // 承認待ちの取り下げは作成中に戻して再編集できるようにする
  const status = req.status === "pending" ? "draft" : "cancelled";
  await db.update(purchaseRequests).set({ status }).where(eq(purchaseRequests.id, id));
  return { status };
}

// ---------------------------------------------------------------------------
// 見積（比較候補）
// ---------------------------------------------------------------------------

export type QuoteInput = Omit<InsertPurchaseQuote, "id" | "requestId" | "createdBy" | "createdAt">;

export async function addQuote(user: User, requestId: number, input: QuoteInput) {
  const db = await requireDb();
  await loadEditableRequest(user, requestId);
  const [res] = await db.insert(purchaseQuotes).values({ ...input, requestId, createdBy: user.id });
  await db.update(purchaseRequests).set({ updatedAt: new Date() }).where(eq(purchaseRequests.id, requestId));
  return { id: Number(res.insertId) };
}

export async function updateQuote(user: User, quoteId: number, input: Partial<QuoteInput>) {
  const db = await requireDb();
  const [q] = await db.select().from(purchaseQuotes).where(eq(purchaseQuotes.id, quoteId)).limit(1);
  if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "見積が見つかりません" });
  await loadEditableRequest(user, q.requestId);
  await db.update(purchaseQuotes).set(input).where(eq(purchaseQuotes.id, quoteId));
  return { success: true };
}

export async function deleteQuote(user: User, quoteId: number) {
  const db = await requireDb();
  const [q] = await db.select().from(purchaseQuotes).where(eq(purchaseQuotes.id, quoteId)).limit(1);
  if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "見積が見つかりません" });
  const req = await loadEditableRequest(user, q.requestId);
  await db.delete(purchaseQuotes).where(eq(purchaseQuotes.id, quoteId));
  if (req.selectedQuoteId === quoteId) {
    await db.update(purchaseRequests).set({ selectedQuoteId: null }).where(eq(purchaseRequests.id, req.id));
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// 通販サイトの価格自動取得（APIキーがある場合のみ）
// ---------------------------------------------------------------------------

export type PriceCandidate = {
  source: PurchaseSource;
  productName: string;
  sellerName: string;
  url: string;
  unitPrice: number;
  /** 送料無料（送料込み）か。不明なら null */
  freeShipping: boolean | null;
};

export function priceLookupStatus() {
  return {
    rakuten: !!process.env.RAKUTEN_APP_ID,
    yahoo: !!process.env.YAHOO_APP_ID,
  };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function searchRakuten(keyword: string): Promise<PriceCandidate[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) return [];
  const params = new URLSearchParams({
    format: "json",
    formatVersion: "2",
    applicationId: appId,
    keyword,
    sort: "+itemPrice",
    hits: "5",
  });
  const data = await fetchJson(`https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`);
  return (data.Items ?? []).map((it: any) => ({
    source: "rakuten" as const,
    productName: String(it.itemName ?? ""),
    sellerName: String(it.shopName ?? ""),
    url: String(it.itemUrl ?? ""),
    unitPrice: Number(it.itemPrice ?? 0),
    // postageFlag: 0=送料込み, 1=送料別
    freeShipping: it.postageFlag === 0 ? true : it.postageFlag === 1 ? false : null,
  }));
}

async function searchYahoo(keyword: string): Promise<PriceCandidate[]> {
  const appId = process.env.YAHOO_APP_ID;
  if (!appId) return [];
  const params = new URLSearchParams({ appid: appId, query: keyword, sort: "+price", results: "5" });
  const data = await fetchJson(`https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${params}`);
  return (data.hits ?? []).map((it: any) => ({
    source: "yahoo" as const,
    productName: String(it.name ?? ""),
    sellerName: String(it.seller?.name ?? ""),
    url: String(it.url ?? ""),
    unitPrice: Number(it.price ?? 0),
    // shipping.code: 1=送料別, 2=送料無料, 3=条件付き送料無料
    freeShipping: it.shipping?.code === 2 ? true : it.shipping?.code === 1 ? false : null,
  }));
}

export async function lookupPrices(keyword: string) {
  const sources = [
    { key: "rakuten", fn: searchRakuten },
    { key: "yahoo", fn: searchYahoo },
  ] as const;
  const status = priceLookupStatus();
  const results = await Promise.allSettled(sources.map(s => s.fn(keyword)));
  const candidates: PriceCandidate[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    const key = sources[i].key;
    if (r.status === "fulfilled") candidates.push(...r.value.filter(c => c.unitPrice > 0));
    else if (status[key]) errors.push(`${key === "rakuten" ? "楽天" : "Yahoo!"}: ${String(r.reason?.message ?? r.reason)}`);
  });
  candidates.sort((a, b) => a.unitPrice - b.unitPrice);
  return { candidates, errors, status };
}
