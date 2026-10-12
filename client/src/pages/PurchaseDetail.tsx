import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  EDITABLE_STATUSES,
  PURCHASE_SOURCES,
  SOURCE_LABELS,
  STATUS_LABELS,
  buildSearchLinks,
  detectSourceFromUrl,
  type PurchaseSource,
} from "@shared/purchase";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import { STATUS_VARIANT, yen } from "./PurchaseList";

type QuoteForm = {
  source: PurchaseSource;
  sellerName: string;
  productName: string;
  url: string;
  unitPrice: string;
  taxIncluded: boolean;
  shippingFee: string;
  pointsYen: string;
  leadTimeDays: string;
  quoteNumber: string;
  attachmentUrl: string;
  attachmentName: string;
  note: string;
};

const emptyQuote = (source: PurchaseSource = "amazon"): QuoteForm => ({
  source,
  sellerName: "",
  productName: "",
  url: "",
  unitPrice: "",
  taxIncluded: source !== "vendor",
  shippingFee: "0",
  pointsYen: "0",
  leadTimeDays: "",
  quoteNumber: "",
  attachmentUrl: "",
  attachmentName: "",
  note: "",
});

export default function PurchaseDetail() {
  const [, params] = useRoute("/purchase/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: me } = trpc.purchase.me.useQuery();
  const { data, isLoading, error } = trpc.purchase.get.useQuery({ id }, { enabled: Number.isFinite(id) });

  const [quoteDialog, setQuoteDialog] = useState<{ open: boolean; form: QuoteForm }>({
    open: false,
    form: emptyQuote(),
  });
  const [pick, setPick] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const refresh = () => {
    utils.purchase.get.invalidate({ id });
    utils.purchase.list.invalidate();
  };
  const onError = (e: { message: string }) => toast.error(e.message);

  const deleteQuote = trpc.purchase.deleteQuote.useMutation({ onSuccess: refresh, onError });
  const submit = trpc.purchase.submit.useMutation({
    onSuccess: () => {
      toast.success("承認申請しました（櫨本に通知されます）");
      refresh();
    },
    onError,
  });
  const decide = trpc.purchase.decide.useMutation({
    onSuccess: (_, v) => {
      toast.success(v.decision === "approved" ? "承認しました" : "差戻しました");
      setComment("");
      refresh();
    },
    onError,
  });
  const markOrdered = trpc.purchase.markOrdered.useMutation({
    onSuccess: () => {
      toast.success("発注済にしました");
      refresh();
    },
    onError,
  });
  const cancel = trpc.purchase.cancel.useMutation({ onSuccess: refresh, onError });
  const del = trpc.purchase.delete.useMutation({
    onSuccess: () => {
      utils.purchase.list.invalidate();
      setLocation("/purchase");
    },
    onError,
  });

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        {error ? <p className="text-destructive">{error.message}</p> : <Loader2 className="h-5 w-5 animate-spin" />}
      </DashboardLayout>
    );
  }

  const { request: req, quotes } = data;
  const isOwner = me?.userId === req.requesterId;
  const isApprover = !!me?.isApprover;
  const canEdit = (isOwner || isApprover) && EDITABLE_STATUSES.includes(req.status);
  const keyword = [req.maker?.replace(/（.*?）|\(.*?\)/g, ""), req.modelNumber || req.itemName].filter(Boolean).join(" ");
  const links = buildSearchLinks(req.modelNumber || keyword);
  const selectedId = pick ?? req.selectedQuoteId ?? quotes[0]?.id ?? null;
  const selected = quotes.find(q => q.id === selectedId);
  const vendorBest = quotes.filter(q => q.source === "vendor").sort((a, b) => a.total - b.total)[0];
  const netBest = quotes.filter(q => q.source !== "vendor").sort((a, b) => a.total - b.total)[0];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/purchase")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          一覧へ戻る
        </Button>

        {/* 申請内容 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANT[req.status]}>{STATUS_LABELS[req.status]}</Badge>
              <CardTitle className="text-xl">{req.itemName}</CardTitle>
            </div>
            <CardDescription>
              {[
                req.modelNumber && `型番 ${req.modelNumber}`,
                req.maker && `メーカー ${req.maker}`,
                `数量 ${req.quantity}${req.unit}`,
                req.siteName && `現場 ${req.siteName}`,
                req.neededBy && `必要日 ${req.neededBy}`,
                `申請者 ${req.requesterName ?? "-"}`,
              ]
                .filter(Boolean)
                .join(" ／ ")}
            </CardDescription>
          </CardHeader>
          {(req.note || req.decisionComment) && (
            <CardContent className="text-sm space-y-2">
              {req.note && <p className="whitespace-pre-wrap">{req.note}</p>}
              {req.decisionComment && (
                <p className="rounded-md bg-muted p-3 whitespace-pre-wrap">
                  <span className="font-medium">
                    {req.approverName}（{req.status === "rejected" ? "差戻し" : "承認"}コメント）：
                  </span>
                  {req.decisionComment}
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* 価格検索 */}
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                各サイトで価格を調べる
              </CardTitle>
              <CardDescription>
                リンク先で価格を確認し、「価格を追加」で登録してください（商品URLを貼り付けるとサイトを自動判定します）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {links.map(l => (
                  <Button key={l.url} variant="outline" size="sm" asChild>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                ))}
              </div>
              <AutoLookup
                keyword={req.modelNumber || keyword}
                enabled={!!(me?.priceLookup.rakuten || me?.priceLookup.yahoo)}
                onPick={c =>
                  setQuoteDialog({
                    open: true,
                    form: {
                      ...emptyQuote(c.source),
                      sellerName: c.sellerName,
                      productName: c.productName,
                      url: c.url,
                      unitPrice: String(c.unitPrice),
                      note: c.freeShipping === false ? "送料別（金額を確認してください）" : "",
                    },
                  })
                }
              />
            </CardContent>
          </Card>
        )}

        {/* 比較表 */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">価格比較（実質支払額・税込）</CardTitle>
              <CardDescription>
                実質支払額 ＝（単価×{req.quantity}
                {req.unit}＋送料）を税込換算 − ポイント還元
              </CardDescription>
            </div>
            {canEdit && (
              <div className="flex gap-2 flex-wrap justify-end">
                <Button size="sm" variant="outline" onClick={() => setQuoteDialog({ open: true, form: emptyQuote("vendor") })}>
                  <FileText className="h-4 w-4 mr-1" />
                  業者見積を追加
                </Button>
                <Button size="sm" onClick={() => setQuoteDialog({ open: true, form: emptyQuote("amazon") })}>
                  <Plus className="h-4 w-4 mr-1" />
                  価格を追加
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">まだ比較する価格がありません。</p>
            ) : (
              <>
                {vendorBest && netBest && (
                  <p className="text-sm mb-3 rounded-md bg-muted p-3">
                    {netBest.total < vendorBest.total ? (
                      <>
                        ネット最安（{SOURCE_LABELS[netBest.source]}）は業者見積より
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {" "}
                          {yen(vendorBest.total - netBest.total)} 安い
                        </span>
                        です。納期・返品対応・現場への配送も考慮してください。
                      </>
                    ) : (
                      <>
                        業者見積（{vendorBest.sellerName || "業者"}）がネット最安より
                        <span className="font-semibold"> {yen(netBest.total - vendorBest.total)} 安い</span>
                        か同額です。
                      </>
                    )}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 w-10">選定</th>
                        <th>購入先</th>
                        <th className="text-right">単価</th>
                        <th className="text-right">送料</th>
                        <th className="text-right">ポイント</th>
                        <th className="text-right">実質支払額</th>
                        <th className="text-right">最安差</th>
                        <th className="text-right">納期</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map(q => (
                        <tr key={q.id} className={`border-b last:border-0 ${q.isCheapest ? "bg-green-50 dark:bg-green-950/30" : ""}`}>
                          <td className="py-2">
                            <input
                              type="radio"
                              name="selected"
                              aria-label="この購入先を選定"
                              checked={selectedId === q.id}
                              disabled={!(canEdit || (isApprover && req.status === "pending"))}
                              onChange={() => setPick(q.id)}
                            />
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant={q.source === "vendor" ? "default" : "outline"}>{SOURCE_LABELS[q.source]}</Badge>
                              {q.isCheapest && <Badge className="bg-green-600 hover:bg-green-600">最安</Badge>}
                              {req.selectedQuoteId === q.id && req.status !== "draft" && <Badge variant="secondary">選定</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 space-x-2">
                              {q.sellerName && <span>{q.sellerName}</span>}
                              {q.quoteNumber && <span>見積No.{q.quoteNumber}</span>}
                              {q.url && (
                                <a className="underline" href={q.url} target="_blank" rel="noopener noreferrer">
                                  商品ページ
                                </a>
                              )}
                              {q.attachmentUrl && (
                                <a className="underline" href={q.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  {q.attachmentName || "見積書"}
                                </a>
                              )}
                            </div>
                            {q.productName && <div className="text-xs text-muted-foreground line-clamp-1">{q.productName}</div>}
                            {q.note && <div className="text-xs text-muted-foreground">{q.note}</div>}
                          </td>
                          <td className="text-right whitespace-nowrap">
                            {yen(q.unitPrice)}
                            <div className="text-xs text-muted-foreground">{q.taxIncluded ? "税込" : "税抜"}</div>
                          </td>
                          <td className="text-right">{q.shippingFee ? yen(q.shippingFee) : "無料"}</td>
                          <td className="text-right">{q.pointsYen ? `-${yen(q.pointsYen)}` : "-"}</td>
                          <td className="text-right font-semibold whitespace-nowrap">{yen(q.total)}</td>
                          <td className="text-right whitespace-nowrap">{q.diffFromCheapest ? `+${yen(q.diffFromCheapest)}` : "-"}</td>
                          <td className="text-right whitespace-nowrap">{q.leadTimeDays != null ? `${q.leadTimeDays}日` : "-"}</td>
                          <td className="text-right">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="削除"
                                onClick={() => confirm("この価格を削除しますか？") && deleteQuote.mutate({ id: q.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* アクション */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {req.status === "pending" ? "承認" : req.status === "approved" ? "発注" : "申請"}
            </CardTitle>
            {selected && (
              <CardDescription>
                選定：{SOURCE_LABELS[selected.source]}
                {selected.sellerName && ` ${selected.sellerName}`} ／ 実質支払額 {yen(selected.total)}
                {!selected.isCheapest && `（最安より +${yen(selected.diffFromCheapest)}：理由を備考に記入してください）`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!selectedId || submit.isPending}
                  onClick={() => selectedId && submit.mutate({ id, selectedQuoteId: selectedId })}
                >
                  {submit.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  {req.status === "rejected" ? "再申請する" : "櫨本に承認申請する"}
                </Button>
                {req.status === "draft" && (
                  <Button variant="ghost" onClick={() => confirm("この申請を削除しますか？") && del.mutate({ id })}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                )}
              </div>
            )}

            {req.status === "pending" && isApprover && (
              <div className="space-y-2">
                <Textarea
                  placeholder="コメント（差戻し時は理由を記入）"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({ id, decision: "approved", comment, selectedQuoteId: selectedId ?? undefined })
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    選定した購入先で承認
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={decide.isPending}
                    onClick={() => {
                      if (!comment.trim()) return toast.error("差戻し理由を入力してください");
                      decide.mutate({ id, decision: "rejected", comment });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    差戻し
                  </Button>
                </div>
              </div>
            )}

            {req.status === "pending" && !isApprover && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                櫨本の承認待ちです。
                {isOwner && (
                  <Button variant="outline" size="sm" onClick={() => cancel.mutate({ id })}>
                    <Undo2 className="h-4 w-4 mr-1" />
                    申請を取り下げる
                  </Button>
                )}
              </div>
            )}

            {req.status === "approved" && (isOwner || isApprover) && (
              <div className="flex flex-wrap gap-2">
                {selected?.url && (
                  <Button variant="outline" asChild>
                    <a href={selected.url} target="_blank" rel="noopener noreferrer">
                      購入ページを開く
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                )}
                <Button onClick={() => markOrdered.mutate({ id })} disabled={markOrdered.isPending}>
                  <Package className="h-4 w-4 mr-1" />
                  発注済にする
                </Button>
                <Button variant="ghost" onClick={() => confirm("この申請を取消しますか？") && cancel.mutate({ id })}>
                  取消
                </Button>
              </div>
            )}

            {req.decidedAt && (
              <p className="text-xs text-muted-foreground">
                {req.approverName} が {new Date(req.decidedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} に
                {req.status === "rejected" ? "差戻し" : "承認"}
                {req.orderedAt &&
                  ` ／ ${new Date(req.orderedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} 発注済`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <QuoteDialog
        requestId={id}
        state={quoteDialog}
        onClose={() => setQuoteDialog(s => ({ ...s, open: false }))}
        onSaved={refresh}
      />
    </DashboardLayout>
  );
}

function AutoLookup({
  keyword,
  enabled,
  onPick,
}: {
  keyword: string;
  enabled: boolean;
  onPick: (c: {
    source: PurchaseSource;
    productName: string;
    sellerName: string;
    url: string;
    unitPrice: number;
    freeShipping: boolean | null;
  }) => void;
}) {
  const lookup = trpc.purchase.lookupPrices.useMutation({ onError: e => toast.error(e.message) });
  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        ※ 環境変数 RAKUTEN_APP_ID / YAHOO_APP_ID を設定すると、楽天・Yahoo!の最安値を自動取得できます。
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={() => lookup.mutate({ keyword })} disabled={lookup.isPending}>
        {lookup.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
        楽天・Yahoo!の最安値を自動取得
      </Button>
      {lookup.data?.errors.map(e => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
      {lookup.data && lookup.data.candidates.length === 0 && (
        <p className="text-xs text-muted-foreground">該当する商品が見つかりませんでした。</p>
      )}
      {lookup.data && lookup.data.candidates.length > 0 && (
        <ul className="text-sm divide-y border rounded-md">
          {lookup.data.candidates.map(c => (
            <li key={c.url} className="flex items-center gap-2 p-2">
              <Badge variant="outline">{SOURCE_LABELS[c.source]}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate">{c.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {c.sellerName}
                  {c.freeShipping === true && " ／ 送料無料"}
                  {c.freeShipping === false && " ／ 送料別"}
                </div>
              </div>
              <span className="font-semibold whitespace-nowrap">{yen(c.unitPrice)}</span>
              <Button size="sm" variant="outline" onClick={() => onPick(c)}>
                追加
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteDialog({
  requestId,
  state,
  onClose,
  onSaved,
}: {
  requestId: number;
  state: { open: boolean; form: QuoteForm };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<QuoteForm>(state.form);
  const [lastForm, setLastForm] = useState(state.form);
  // ダイアログを開き直したら初期値を差し替える
  if (state.form !== lastForm) {
    setLastForm(state.form);
    setForm(state.form);
  }
  const set = (k: keyof QuoteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addQuote = trpc.purchase.addQuote.useMutation({
    onSuccess: () => {
      toast.success("価格を追加しました");
      onSaved();
      onClose();
    },
    onError: e => toast.error(e.message),
  });
  const upload = trpc.purchase.uploadAttachment.useMutation({
    onSuccess: r => setForm(f => ({ ...f, attachmentUrl: r.url, attachmentName: r.name })),
    onError: e => toast.error(e.message),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("10MB以下のファイルを選択してください");
    const reader = new FileReader();
    reader.onload = () => upload.mutate({ fileName: file.name, mimeType: file.type, base64: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[,，¥円\s]/g, "")) || 0));

  const save = () => {
    const unitPrice = num(form.unitPrice);
    if (!unitPrice) return toast.error("単価を入力してください");
    addQuote.mutate({
      requestId,
      source: form.source,
      sellerName: form.sellerName.trim() || null,
      productName: form.productName.trim() || null,
      url: form.url.trim() || null,
      unitPrice,
      taxIncluded: form.taxIncluded,
      shippingFee: num(form.shippingFee),
      pointsYen: num(form.pointsYen),
      leadTimeDays: form.leadTimeDays.trim() ? num(form.leadTimeDays) : null,
      quoteNumber: form.quoteNumber.trim() || null,
      attachmentUrl: form.attachmentUrl || null,
      attachmentName: form.attachmentName || null,
      note: form.note.trim() || null,
    });
  };

  const isVendor = form.source === "vendor";

  return (
    <Dialog open={state.open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isVendor ? "業者見積を追加" : "価格を追加"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>購入先</Label>
              <Select
                value={form.source}
                onValueChange={v =>
                  setForm(f => ({ ...f, source: v as PurchaseSource, taxIncluded: v !== "vendor" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_SOURCES.map(s => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>{isVendor ? "業者名" : "ショップ名"}</Label>
              <Input value={form.sellerName} onChange={set("sellerName")} />
            </div>
          </div>
          {!isVendor && (
            <div className="grid gap-1">
              <Label>商品URL</Label>
              <Input
                value={form.url}
                placeholder="https://..."
                onChange={e => {
                  const url = e.target.value;
                  const detected = detectSourceFromUrl(url);
                  setForm(f => ({ ...f, url, source: detected && f.source !== "vendor" ? detected : f.source }));
                }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>単価（円）*</Label>
              <Input inputMode="numeric" value={form.unitPrice} onChange={set("unitPrice")} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="taxIncluded"
                checked={form.taxIncluded}
                onCheckedChange={v => setForm(f => ({ ...f, taxIncluded: v === true }))}
              />
              <Label htmlFor="taxIncluded">税込（業者見積は通常税抜）</Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1">
              <Label>送料（円）</Label>
              <Input inputMode="numeric" value={form.shippingFee} onChange={set("shippingFee")} />
            </div>
            <div className="grid gap-1">
              <Label>ポイント還元</Label>
              <Input inputMode="numeric" value={form.pointsYen} onChange={set("pointsYen")} />
            </div>
            <div className="grid gap-1">
              <Label>納期（日）</Label>
              <Input inputMode="numeric" value={form.leadTimeDays} onChange={set("leadTimeDays")} />
            </div>
          </div>
          {isVendor && (
            <>
              <div className="grid gap-1">
                <Label>見積番号</Label>
                <Input value={form.quoteNumber} onChange={set("quoteNumber")} placeholder="例）26003238-001" />
              </div>
              <div className="grid gap-1">
                <Label>見積書（PDF・画像）</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={e => onFile(e.target.files?.[0])} />
                {upload.isPending && <span className="text-xs text-muted-foreground">アップロード中…</span>}
                {form.attachmentName && !upload.isPending && (
                  <span className="text-xs text-muted-foreground">添付：{form.attachmentName}</span>
                )}
              </div>
            </>
          )}
          <div className="grid gap-1">
            <Label>商品名</Label>
            <Input value={form.productName} onChange={set("productName")} />
          </div>
          <div className="grid gap-1">
            <Label>備考</Label>
            <Textarea value={form.note} onChange={set("note")} rows={2} placeholder="例）現場直送可・返品不可 など" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save} disabled={addQuote.isPending || upload.isPending}>
            {addQuote.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
