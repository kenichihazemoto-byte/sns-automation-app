import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type DocKind = "budget" | "drawings" | "contract" | "finishes" | "quotes";

const SLOTS: {
  kind: DocKind;
  label: string;
  hint: string;
  required: boolean;
}[] = [
  {
    kind: "budget",
    label: "① 実行予算書",
    hint: "工務（安元さん）作成の予算書。Excel推奨",
    required: true,
  },
  {
    kind: "drawings",
    label: "② 設計図書",
    hint: "平面・立面・矩計・配置・設備図など（PDF）",
    required: true,
  },
  {
    kind: "contract",
    label: "③ 工事請負契約書",
    hint: "見積内訳・特約・別途工事の記載を含むもの",
    required: true,
  },
  {
    kind: "finishes",
    label: "④ 仕上げ表",
    hint: "内外部仕上げ表・設備仕様書",
    required: true,
  },
  {
    kind: "quotes",
    label: "⑤ 協力業者見積書（任意）",
    hint: "あると単価・数量の差まで照合できます。業者名・工種を入力",
    required: false,
  },
];

type Pending = {
  id: string;
  kind: DocKind;
  fileName: string;
  mimeType: string;
  file?: File;
  text?: string;
  note?: string;
};

const MAX_FILE_MB = 25;

type CheckResult =
  inferRouterOutputs<AppRouter>["budgetCheck"]["get"]["result"];
type Current = {
  id: number | null;
  result: CheckResult;
  resolved: number[];
  createdAt?: Date | string;
};

const KIND_LABEL: Record<DocKind, string> = {
  budget: "予算書",
  drawings: "設計図書",
  contract: "契約書",
  finishes: "仕上げ表",
  quotes: "業者見積",
};

function getIdFromUrl(): number | null {
  const v = new URLSearchParams(window.location.search).get("id");
  return v && /^\d+$/.test(v) ? Number(v) : null;
}

function setIdInUrl(id: number | null) {
  const url = new URL(window.location.href);
  if (id == null) url.searchParams.delete("id");
  else url.searchParams.set("id", String(id));
  window.history.replaceState(null, "", url.toString());
}

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function isSpreadsheet(f: File) {
  return /\.(xlsx|xlsm|xls|csv)$/i.test(f.name);
}

async function spreadsheetToText(f: File): Promise<string> {
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map(name => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false });
    return `=== シート: ${name} ===\n${csv}`;
  }).join("\n\n");
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

const yen = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(v).toLocaleString()}円`;

const sevClass: Record<string, string> = {
  高: "bg-red-100 text-red-800 border-red-300",
  中: "bg-amber-100 text-amber-800 border-amber-300",
  低: "bg-slate-100 text-slate-700 border-slate-300",
};

const coverageClass: Record<string, string> = {
  計上あり: "text-emerald-700",
  計上なし: "text-red-700 font-semibold",
  要確認: "text-amber-700 font-semibold",
  対象外: "text-muted-foreground",
};

export default function BudgetCheck() {
  const [docs, setDocs] = useState<Pending[]>([]);
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "checking">("idle");
  const [tab, setTab] = useState<"new" | "history">(
    getIdFromUrl() ? "history" : "new"
  );
  const [current, setCurrent] = useState<Current | null>(null);
  const [openId, setOpenId] = useState<number | null>(getIdFromUrl());
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const utils = trpc.useUtils();
  const upload = trpc.budgetCheck.upload.useMutation();
  const run = trpc.budgetCheck.run.useMutation();
  const history = trpc.budgetCheck.history.useQuery(undefined, {
    enabled: tab === "history",
  });
  const opened = trpc.budgetCheck.get.useQuery(
    { id: openId ?? 0 },
    { enabled: openId != null, retry: false }
  );
  const del = trpc.budgetCheck.delete.useMutation({
    onSuccess: () => {
      toast.success("削除しました");
      utils.budgetCheck.history.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    if (opened.data) {
      setCurrent({
        id: opened.data.id,
        result: opened.data.result,
        resolved: opened.data.resolved,
        createdAt: opened.data.createdAt,
      });
    }
  }, [opened.data]);

  useEffect(() => {
    if (opened.error) {
      toast.error(opened.error.message);
      setOpenId(null);
      setIdInUrl(null);
    }
  }, [opened.error]);

  const openHistory = (id: number) => {
    setOpenId(id);
    setIdInUrl(id);
    setTab("history");
  };

  const closeCurrent = () => {
    setCurrent(null);
    setOpenId(null);
    setIdInUrl(null);
  };

  const addFiles = async (kind: DocKind, files: FileList | null) => {
    if (!files) return;
    const added: Pending[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(
          `${f.name} は${MAX_FILE_MB}MBを超えています。分割してください`
        );
        continue;
      }
      const base = {
        id: crypto.randomUUID(),
        kind,
        fileName: f.name,
        mimeType: f.type,
      };
      if (isSpreadsheet(f)) {
        try {
          added.push({
            ...base,
            text: await spreadsheetToText(f),
            mimeType: "text/csv",
          });
        } catch {
          toast.error(`${f.name} を読み込めませんでした`);
        }
      } else if (f.type === "application/pdf" || f.type.startsWith("image/")) {
        added.push({ ...base, file: f });
      } else {
        toast.error(`${f.name}：PDF・画像・Excel・CSV のみ対応しています`);
      }
    }
    setDocs(d => [...d, ...added]);
  };

  const missing = SLOTS.filter(
    s => s.required && !docs.some(d => d.kind === s.kind)
  );

  const start = async () => {
    if (missing.length) {
      toast.error(`未添付：${missing.map(m => m.label).join("、")}`);
      return;
    }
    try {
      setPhase("uploading");
      const payload = [];
      for (const d of docs) {
        if (d.file) {
          const { url } = await upload.mutateAsync({
            fileName: d.fileName,
            mimeType: d.mimeType,
            base64: await fileToBase64(d.file),
          });
          payload.push({
            kind: d.kind,
            fileName: d.fileName,
            mimeType: d.mimeType,
            url,
            note: d.note || undefined,
          });
        } else {
          payload.push({
            kind: d.kind,
            fileName: d.fileName,
            mimeType: d.mimeType,
            text: d.text,
            note: d.note || undefined,
          });
        }
      }
      setPhase("checking");
      const r = await run.mutateAsync({
        docs: payload,
        memo: memo || undefined,
      });
      const { historyId, ...result } = r;
      setCurrent({
        id: historyId,
        result,
        resolved: [],
        createdAt: new Date(),
      });
      if (historyId != null) {
        setOpenId(historyId);
        setIdInUrl(historyId);
        utils.budgetCheck.history.invalidate();
        toast.success("チェックが完了し、履歴に保存しました");
      } else {
        toast.warning(
          "チェックは完了しましたが、履歴の保存に失敗しました。CSVで保存してください"
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? "チェックに失敗しました");
    } finally {
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            予算書チェック
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            実行予算書を、設計図書・契約書・仕上げ表（＋協力業者見積）と突き合わせ、計上漏れ・数量差異・仕様違い・粗利をAIがチェックします。
          </p>
        </div>

        {current ? (
          <ResultView
            key={current.id ?? "unsaved"}
            current={current}
            onBack={closeCurrent}
            onChanged={() => {
              utils.budgetCheck.history.invalidate();
              utils.budgetCheck.get.invalidate();
            }}
          />
        ) : openId != null && opened.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="new">
                <Calculator className="h-4 w-4 mr-1" />
                新規チェック
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                履歴
              </TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">資料のアップロード</CardTitle>
                  <CardDescription>
                    PDF・画像・Excel（.xlsx/.xls）・CSV に対応。1ファイル
                    {MAX_FILE_MB}MBまで、各欄に複数添付できます。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SLOTS.map(slot => {
                    const files = docs.filter(d => d.kind === slot.kind);
                    return (
                      <div key={slot.kind} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {files.length > 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              {slot.label}
                              {slot.required && files.length === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-red-600 border-red-300"
                                >
                                  必須
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {slot.hint}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => inputs.current[slot.kind]?.click()}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            ファイルを選択
                          </Button>
                          <input
                            ref={el => {
                              inputs.current[slot.kind] = el;
                            }}
                            type="file"
                            multiple
                            accept=".pdf,.xlsx,.xlsm,.xls,.csv,image/*"
                            className="hidden"
                            onChange={e => {
                              addFiles(slot.kind, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </div>
                        {files.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {files.map(f => (
                              <li
                                key={f.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="truncate flex-1">
                                  {f.fileName}
                                  {f.text ? "（表データ）" : ""}
                                </span>
                                {slot.kind === "quotes" && (
                                  <Input
                                    className="h-7 w-48 text-xs"
                                    placeholder="業者名・工種（例：九州シンセイ 外構）"
                                    value={f.note ?? ""}
                                    onChange={e =>
                                      setDocs(ds =>
                                        ds.map(x =>
                                          x.id === f.id
                                            ? { ...x, note: e.target.value }
                                            : x
                                        )
                                      )
                                    }
                                  />
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={busy}
                                  onClick={() =>
                                    setDocs(ds => ds.filter(x => x.id !== f.id))
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}

                  <div>
                    <div className="text-sm font-medium mb-1">
                      補足メモ（任意）
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="例：外構は別途工事。太陽光は施主支給。地盤改良は調査結果待ち など"
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={start}
                      disabled={busy || docs.length === 0}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calculator className="h-4 w-4 mr-2" />
                      )}
                      {phase === "uploading"
                        ? "アップロード中…"
                        : phase === "checking"
                          ? "AIがチェック中…（1〜3分）"
                          : "チェック開始"}
                    </Button>
                    {docs.length > 0 && !busy && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocs([])}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        すべて外す
                      </Button>
                    )}
                    {missing.length > 0 && (
                      <span className="text-xs text-red-600">
                        未添付：{missing.map(m => m.label).join("、")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">チェック履歴</CardTitle>
                  <CardDescription>
                    過去のチェック結果を開いて、指摘の対応状況を管理できます。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history.isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : history.error ? (
                    <p className="text-sm text-red-600">
                      {history.error.message}
                    </p>
                  ) : !history.data?.length ? (
                    <p className="text-sm text-muted-foreground">
                      まだ履歴はありません。
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {history.data.map(h => {
                        const done =
                          h.findingCount > 0 &&
                          h.resolvedCount >= h.findingCount;
                        return (
                          <li
                            key={h.id}
                            className="py-3 flex flex-wrap items-center gap-3"
                          >
                            <button
                              className="flex-1 min-w-[220px] text-left"
                              onClick={() => openHistory(h.id)}
                            >
                              <div className="font-medium hover:underline">
                                {h.projectName || "（工事名なし）"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(h.createdAt)}
                                {h.userName && ` ・ ${h.userName}`} ・ 資料
                                {h.fileCount}点
                              </div>
                            </button>
                            <div className="flex items-center gap-2 text-xs">
                              {h.highCount > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded border ${sevClass["高"]}`}
                                >
                                  高 {h.highCount}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                指摘 {h.findingCount}件
                              </span>
                              <Badge variant={done ? "default" : "outline"}>
                                対応済 {h.resolvedCount}/{h.findingCount}
                              </Badge>
                              {h.grossProfitRate != null && (
                                <span
                                  className={
                                    h.grossProfitRate < 20
                                      ? "text-red-700 font-semibold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  粗利 {h.grossProfitRate}%
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={del.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    `「${h.projectName || "工事名なし"}」の履歴を削除しますか？`
                                  )
                                )
                                  del.mutate({ id: h.id });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

function ResultView({
  current,
  onBack,
  onChanged,
}: {
  current: Current;
  onBack: () => void;
  onChanged: () => void;
}) {
  const result = current.result;
  const [filter, setFilter] = useState<"all" | "未対応" | "高" | "中" | "低">(
    "all"
  );
  const [resolved, setResolved] = useState<Set<number>>(
    new Set(current.resolved)
  );
  const [name, setName] = useState(result.projectName);
  const [editing, setEditing] = useState(false);
  const update = trpc.budgetCheck.update.useMutation({
    onSuccess: onChanged,
    onError: e => toast.error(`保存に失敗しました：${e.message}`),
  });
  const canSave = current.id != null;

  const toggle = (i: number) => {
    const next = new Set(resolved);
    next.has(i) ? next.delete(i) : next.add(i);
    setResolved(next);
    if (canSave) update.mutate({ id: current.id!, resolved: [...next] });
  };

  const saveName = () => {
    setEditing(false);
    if (canSave && name !== result.projectName)
      update.mutate({ id: current.id!, projectName: name });
  };

  const indexed = result.findings.map((f, i) => ({ f, i }));
  const shown = indexed.filter(({ f, i }) =>
    filter === "all"
      ? true
      : filter === "未対応"
        ? !resolved.has(i)
        : f.severity === filter
  );
  const count = (s: string) =>
    result.findings.filter(f => f.severity === s).length;

  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "対応",
      "重要度",
      "種別",
      "工種",
      "項目",
      "予算書",
      "図面・仕上表等",
      "根拠",
      "内容",
      "対応方針",
      "影響額(円)",
    ];
    const rows = indexed.map(({ f, i }) =>
      [
        resolved.has(i) ? "済" : "",
        f.severity,
        f.type,
        f.category,
        f.item,
        f.budgetValue,
        f.referenceValue,
        f.source,
        f.detail,
        f.action,
        f.estimatedImpactYen ?? "",
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob(
      ["\uFEFF" + [header.map(esc).join(","), ...rows].join("\r\n")],
      { type: "text/csv" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `予算書チェック_${name || "結果"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        {current.createdAt && (
          <span className="text-sm text-muted-foreground">
            {fmtDate(current.createdAt)} のチェック
          </span>
        )}
        {!canSave && (
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            履歴未保存
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()}
                autoFocus
                className="max-w-md"
              />
              <Button size="sm" onClick={saveName}>
                保存
              </Button>
            </div>
          ) : (
            <CardTitle className="text-lg flex items-center gap-2">
              {name || "チェック結果"}
              {canSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditing(true)}
                  title="工事名を編集"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          )}
          <CardDescription className="whitespace-pre-wrap text-foreground/80">
            {result.overview}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="契約金額（税抜）"
              value={yen(result.contractAmountYen)}
            />
            <Stat
              label="実行予算合計（税抜）"
              value={yen(result.budgetTotalYen)}
            />
            <Stat label="粗利額" value={yen(result.grossProfitYen)} />
            <Stat
              label="粗利率"
              value={
                result.grossProfitRate == null
                  ? "—"
                  : `${result.grossProfitRate}%`
              }
              warn={
                result.grossProfitRate != null && result.grossProfitRate < 20
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ※金額はAIの読み取り値です。必ず原本で確認してください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg">
            指摘事項（{result.findings.length}件・対応済 {resolved.size}件）
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {(["all", "未対応", "高", "中", "低"] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                onClick={() => setFilter(s)}
              >
                {s === "all"
                  ? "すべて"
                  : s === "未対応"
                    ? `未対応（${result.findings.length - resolved.size}）`
                    : `${s}（${count(s)}）`}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {shown.length === 0 && (
            <p className="text-sm text-muted-foreground">
              該当する指摘はありません。
            </p>
          )}
          {shown.map(({ f, i }) => (
            <div
              key={i}
              className={`rounded-lg border p-3 space-y-1.5 ${resolved.has(i) ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <Checkbox
                    checked={resolved.has(i)}
                    onCheckedChange={() => toggle(i)}
                  />
                  対応済
                </label>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${sevClass[f.severity]}`}
                >
                  重要度 {f.severity}
                </span>
                <Badge variant="secondary">{f.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {f.category}
                </span>
                <span className="font-medium">{f.item}</span>
                {f.estimatedImpactYen != null && (
                  <span className="ml-auto text-sm font-semibold">
                    影響 約{yen(f.estimatedImpactYen)}
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-xs text-muted-foreground">
                    予算書：
                  </span>
                  {f.budgetValue}
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-xs text-muted-foreground">
                    図面・仕上表等：
                  </span>
                  {f.referenceValue}
                </div>
              </div>
              <p className="text-sm">{f.detail}</p>
              <p className="text-sm text-primary">→ {f.action}</p>
              {f.source && (
                <p className="text-xs text-muted-foreground">
                  根拠：{f.source}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">工種別 計上チェック</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">工種</th>
                <th className="py-2 pr-2 whitespace-nowrap">判定</th>
                <th className="py-2 pr-2 text-right whitespace-nowrap">
                  予算額
                </th>
                <th className="py-2">コメント</th>
              </tr>
            </thead>
            <tbody>
              {result.coverage.map((c, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-2">{c.category}</td>
                  <td
                    className={`py-2 pr-2 whitespace-nowrap ${coverageClass[c.status] ?? ""}`}
                  >
                    {c.status}
                  </td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">
                    {yen(c.budgetAmountYen)}
                  </td>
                  <td className="py-2">{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <ListCard
          title="工務（安元さん）への確認事項"
          items={result.questionsForKoumu}
        />
        <ListCard
          title="資料から読み取れなかった情報"
          items={result.missingInfo}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${warn ? "border-red-300 bg-red-50" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${warn ? "text-red-700" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">なし</p>
        ) : (
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {items.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
