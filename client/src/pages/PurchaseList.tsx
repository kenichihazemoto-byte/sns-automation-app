import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { SOURCE_LABELS, STATUS_LABELS, type PurchaseStatus } from "@shared/purchase";
import { Loader2, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export const STATUS_VARIANT: Record<PurchaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  ordered: "secondary",
  cancelled: "outline",
};

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

type Filter = "all" | PurchaseStatus;

export default function PurchaseList() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const { data: me } = trpc.purchase.me.useQuery();
  const { data: rows, isLoading } = trpc.purchase.list.useQuery(filter === "all" ? undefined : { status: filter });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              購買比較・承認
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Amazon・Yahoo!・楽天・モノタロウ・業者見積などの価格を比較して申請 → 櫨本が承認します。
              {me?.isApprover && <span className="ml-1 font-medium text-foreground">（あなたは承認者です）</span>}
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規購買申請
          </Button>
        </div>

        <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="pending">承認待ち</TabsTrigger>
            <TabsTrigger value="draft">作成中</TabsTrigger>
            <TabsTrigger value="rejected">差戻し</TabsTrigger>
            <TabsTrigger value="approved">承認済</TabsTrigger>
            <TabsTrigger value="ordered">発注済</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : !rows?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>申請はまだありません</CardTitle>
              <CardDescription>「新規購買申請」から品名・型番を登録し、各サイトや業者の価格を追加してください。</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map(r => (
              <Card
                key={r.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setLocation(`/purchase/${r.id}`)}
              >
                <CardContent className="py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                      <span className="font-semibold truncate">{r.itemName}</span>
                      {r.modelNumber && <span className="text-sm text-muted-foreground">{r.modelNumber}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.quantity}
                      {r.unit}
                      {r.siteName && ` ／ ${r.siteName}`}
                      {r.neededBy && ` ／ 必要日 ${r.neededBy}`}
                      {` ／ 申請者 ${r.requesterName ?? "-"}`}
                    </div>
                  </div>
                  <div className="text-sm text-right">
                    <div className="text-muted-foreground text-xs">比較 {r.quoteCount}件</div>
                    {r.cheapest && (
                      <div>
                        最安 {SOURCE_LABELS[r.cheapest.source]} <span className="font-semibold">{yen(r.cheapest.total)}</span>
                      </div>
                    )}
                    {r.selected && r.status !== "draft" && (
                      <div className="text-xs">
                        選定 {SOURCE_LABELS[r.selected.source]} {yen(r.selected.total)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <NewRequestDialog open={open} onOpenChange={setOpen} onCreated={id => setLocation(`/purchase/${id}`)} />
    </DashboardLayout>
  );
}

function NewRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const [form, setForm] = useState({
    itemName: "",
    modelNumber: "",
    maker: "",
    quantity: "1",
    unit: "個",
    siteName: "",
    neededBy: "",
    note: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const create = trpc.purchase.create.useMutation({
    onSuccess: r => {
      toast.success("購買申請を作成しました。比較する価格を追加してください");
      onOpenChange(false);
      onCreated(r.id);
    },
    onError: e => toast.error(e.message),
  });

  const submit = () => {
    if (!form.itemName.trim()) return toast.error("品名を入力してください");
    create.mutate({
      itemName: form.itemName.trim(),
      modelNumber: form.modelNumber.trim() || null,
      maker: form.maker.trim() || null,
      quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
      unit: form.unit.trim() || "個",
      siteName: form.siteName.trim() || null,
      neededBy: form.neededBy || null,
      note: form.note.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新規購買申請</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>品名 *</Label>
            <Input value={form.itemName} onChange={set("itemName")} placeholder="例）床下点検口（高気密型）" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>型番</Label>
              <Input value={form.modelNumber} onChange={set("modelNumber")} placeholder="例）SPF-R6060F12-IV" />
            </div>
            <div className="grid gap-1">
              <Label>メーカー</Label>
              <Input value={form.maker} onChange={set("maker")} placeholder="例）JOTO（城東テクノ）" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>数量</Label>
              <Input type="number" min={1} value={form.quantity} onChange={set("quantity")} />
            </div>
            <div className="grid gap-1">
              <Label>単位</Label>
              <Input value={form.unit} onChange={set("unit")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>工事名・現場</Label>
              <Input value={form.siteName} onChange={set("siteName")} placeholder="例）○○様邸" />
            </div>
            <div className="grid gap-1">
              <Label>必要日</Label>
              <Input type="date" value={form.neededBy} onChange={set("neededBy")} />
            </div>
          </div>
          <div className="grid gap-1">
            <Label>備考</Label>
            <Textarea value={form.note} onChange={set("note")} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            作成して価格を比較
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
