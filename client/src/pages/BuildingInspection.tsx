import { useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Hammer,
  Camera,
  FileDown,
  Trash2,
  Eye,
} from "lucide-react";

const DANCHI_LIST = [
  "小倉北区 下到津団地",
  "小倉南区 沼団地",
  "日豊団地",
  "苅田 向山団地",
];

type Severity = "緊急" | "要補修" | "要観察" | "軽微" | "問題なし";

const SEVERITY_STYLES: Record<Severity, string> = {
  緊急: "bg-red-600 text-white",
  要補修: "bg-orange-500 text-white",
  要観察: "bg-yellow-500 text-white",
  軽微: "bg-blue-400 text-white",
  問題なし: "bg-green-500 text-white",
};

interface AnalyzedItem {
  photoId: string;
  imageUrl: string;
  fileName: string;
  metadata: {
    danchiName: string;
    buildingNo?: string;
    floor?: string;
    direction?: string;
    note?: string;
    surfaceTypeHint: "外壁" | "屋上" | "自動判定";
  };
  result: {
    surface_type: string;
    overall_assessment: Severity;
    findings: Array<{
      defect_type: string;
      severity: Severity;
      location_in_image: string;
      description: string;
      estimated_size: string;
      possible_cause: string;
      recommended_action: string;
      requires_hammer_test: boolean;
    }>;
    notes_for_manual_check: string;
    confidence: number;
    summary_jp: string;
  };
}

export default function BuildingInspection() {
  const [danchiName, setDanchiName] = useState<string>(DANCHI_LIST[0]);
  const [buildingNo, setBuildingNo] = useState("");
  const [floor, setFloor] = useState("");
  const [direction, setDirection] = useState<string>("");
  const [surfaceTypeHint, setSurfaceTypeHint] = useState<
    "外壁" | "屋上" | "自動判定"
  >("自動判定");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [progress, setProgress] = useState<{
    total: number;
    done: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = trpc.buildingInspection.analyzePhoto.useMutation();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!danchiName) {
      toast.error("団地を選択してください");
      return;
    }

    setProgress({ total: files.length, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}は10MBを超えています`);
        failed++;
        setProgress({ total: files.length, done, failed });
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}は画像ファイルではありません`);
        failed++;
        setProgress({ total: files.length, done, failed });
        continue;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });

        const result = await analyzeMutation.mutateAsync({
          imageBase64: base64,
          fileName: file.name,
          danchiName,
          buildingNo: buildingNo || undefined,
          floor: floor || undefined,
          direction: direction || undefined,
          surfaceTypeHint,
          note: note || undefined,
        });

        setItems((prev) => [...prev, result as AnalyzedItem]);
        done++;
      } catch (e: any) {
        console.error(e);
        toast.error(`${file.name}の分析に失敗しました: ${e?.message ?? ""}`);
        failed++;
      }
      setProgress({ total: files.length, done, failed });
    }

    setProgress(null);
    toast.success(`${done}枚の写真を分析しました（失敗: ${failed}枚）`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const summary = useMemo(() => {
    const byOverall: Record<Severity, number> = {
      緊急: 0,
      要補修: 0,
      要観察: 0,
      軽微: 0,
      問題なし: 0,
    };
    const byDefect: Record<string, number> = {};
    let hammerCount = 0;
    for (const it of items) {
      byOverall[it.result.overall_assessment] =
        (byOverall[it.result.overall_assessment] ?? 0) + 1;
      let needsHammer = false;
      for (const f of it.result.findings) {
        byDefect[f.defect_type] = (byDefect[f.defect_type] ?? 0) + 1;
        if (f.requires_hammer_test) needsHammer = true;
      }
      if (needsHammer) hammerCount++;
    }
    return { byOverall, byDefect, hammerCount, total: items.length };
  }, [items]);

  const exportCSV = () => {
    const header = [
      "団地",
      "棟",
      "階",
      "方位",
      "ファイル名",
      "部位種別",
      "総合判定",
      "AI信頼度",
      "劣化種別",
      "重要度",
      "位置",
      "推定寸法",
      "考えられる原因",
      "推奨対応",
      "打音検査要否",
      "備考",
      "AI要約",
    ];
    const rows: string[][] = [];
    for (const it of items) {
      if (it.result.findings.length === 0) {
        rows.push([
          it.metadata.danchiName,
          it.metadata.buildingNo ?? "",
          it.metadata.floor ?? "",
          it.metadata.direction ?? "",
          it.fileName,
          it.result.surface_type,
          it.result.overall_assessment,
          it.result.confidence.toFixed(2),
          "（指摘なし）",
          "",
          "",
          "",
          "",
          "",
          "",
          it.result.notes_for_manual_check,
          it.result.summary_jp,
        ]);
      } else {
        for (const f of it.result.findings) {
          rows.push([
            it.metadata.danchiName,
            it.metadata.buildingNo ?? "",
            it.metadata.floor ?? "",
            it.metadata.direction ?? "",
            it.fileName,
            it.result.surface_type,
            it.result.overall_assessment,
            it.result.confidence.toFixed(2),
            f.defect_type,
            f.severity,
            f.location_in_image,
            f.estimated_size,
            f.possible_cause,
            f.recommended_action,
            f.requires_hammer_test ? "要" : "不要",
            it.result.notes_for_manual_check,
            it.result.summary_jp,
          ]);
        }
      }
    }
    const csv =
      "﻿" +
      [header, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `点検調書_${danchiName}_${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7" />
              建物点検AI（プロトタイプ）
            </h1>
            <p className="text-muted-foreground mt-2">
              福岡県住宅供給公社の屋上・外壁定期点検向け。写真からクラック・浮き等を自動抽出します。
            </p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900 space-y-1">
            <p className="font-semibold">
              ⚠️ AI判定の精度について（必ずお読みください）
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                「浮き」は本来、<b>打音検査・赤外線サーモグラフィ</b>
                で確定するものです。写真からは二次的兆候（ふくれ・色変化等）しか判定できないため、該当箇所には「打音検査要」と表示されます。
              </li>
              <li>0.2mm以下のヘアクラックは写真では判定困難です。</li>
              <li>
                AIの判定はあくまで一次スクリーニングであり、最終判定は現場の点検技士が行ってください。
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>① 撮影情報を入力</CardTitle>
            <CardDescription>
              団地・棟・方位を先に入力すると、AI分析時のコンテキストとして使われます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>団地</Label>
                <Select value={danchiName} onValueChange={setDanchiName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DANCHI_LIST.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>点検対象部位</Label>
                <Select
                  value={surfaceTypeHint}
                  onValueChange={(v) => setSurfaceTypeHint(v as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="自動判定">自動判定</SelectItem>
                    <SelectItem value="外壁">外壁（モルタルリシン）</SelectItem>
                    <SelectItem value="屋上">屋上（シート防水）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>棟番号（任意）</Label>
                <Input
                  placeholder="例: 3"
                  value={buildingNo}
                  onChange={(e) => setBuildingNo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>階・位置（任意）</Label>
                <Input
                  placeholder="例: 3階 / R階"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>方位（任意）</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="未選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="東">東</SelectItem>
                    <SelectItem value="西">西</SelectItem>
                    <SelectItem value="南">南</SelectItem>
                    <SelectItem value="北">北</SelectItem>
                    <SelectItem value="屋上">屋上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>備考（任意）</Label>
                <Textarea
                  placeholder="例: 共用廊下手すり下部、雨樋付近など"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>② 写真をアップロード</CardTitle>
            <CardDescription>
              複数枚同時にアップロード可能。1枚あたり10MBまで。AIが順次分析します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={progress !== null}
              size="lg"
              className="w-full"
            >
              {progress ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  分析中... ({progress.done + progress.failed} / {progress.total})
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  写真を選択してAI分析を開始
                </>
              )}
            </Button>
            {progress && (
              <Progress
                value={
                  ((progress.done + progress.failed) / progress.total) * 100
                }
                className="mt-3 h-2"
              />
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>③ 分析結果サマリー</CardTitle>
                  <CardDescription>
                    全{summary.total}枚のうち、判定結果の内訳
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <FileDown className="h-4 w-4 mr-1" />
                  CSV調書をダウンロード
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overall">
                  <TabsList>
                    <TabsTrigger value="overall">総合判定</TabsTrigger>
                    <TabsTrigger value="defects">劣化種別</TabsTrigger>
                    <TabsTrigger value="action">要対応</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overall" className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {(Object.keys(summary.byOverall) as Severity[]).map(
                        (sev) => (
                          <div
                            key={sev}
                            className="border rounded-lg p-3 text-center"
                          >
                            <Badge className={SEVERITY_STYLES[sev]}>{sev}</Badge>
                            <p className="text-2xl font-bold mt-2">
                              {summary.byOverall[sev]}
                            </p>
                            <p className="text-xs text-muted-foreground">件</p>
                          </div>
                        )
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="defects" className="pt-4">
                    {Object.keys(summary.byDefect).length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        劣化は検出されませんでした。
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(summary.byDefect)
                          .sort((a, b) => b[1] - a[1])
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="flex items-center justify-between border rounded px-3 py-2"
                            >
                              <span className="text-sm">{k}</span>
                              <Badge variant="secondary">{v}件</Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="action" className="pt-4 space-y-2">
                    <div className="flex items-center gap-3 border rounded p-3 bg-red-50 border-red-200">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <p className="font-medium">緊急対応</p>
                        <p className="text-sm text-muted-foreground">
                          落下・漏水につながる恐れあり
                        </p>
                      </div>
                      <Badge className={SEVERITY_STYLES["緊急"]}>
                        {summary.byOverall["緊急"]}件
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 border rounded p-3 bg-orange-50 border-orange-200">
                      <Hammer className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="font-medium">打音検査推奨</p>
                        <p className="text-sm text-muted-foreground">
                          浮き判定のため現場での打音検査が必要
                        </p>
                      </div>
                      <Badge variant="secondary">{summary.hammerCount}件</Badge>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>④ 写真ごとの詳細</CardTitle>
                <CardDescription>
                  AIが検出した劣化を写真ごとに確認できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={item.photoId}
                    className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="md:col-span-1 space-y-2">
                      <img
                        src={item.imageUrl}
                        alt={item.fileName}
                        className="rounded shadow w-full object-cover max-h-64"
                      />
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          <Camera className="inline h-3 w-3 mr-1" />
                          {item.fileName}
                        </p>
                        <p>
                          📍 {item.metadata.danchiName}
                          {item.metadata.buildingNo &&
                            ` / ${item.metadata.buildingNo}号棟`}
                          {item.metadata.floor && ` / ${item.metadata.floor}`}
                          {item.metadata.direction &&
                            ` / ${item.metadata.direction}面`}
                        </p>
                        <p>
                          🏗️ 部位: {item.result.surface_type} / 信頼度:{" "}
                          {(item.result.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        削除
                      </Button>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={
                            SEVERITY_STYLES[item.result.overall_assessment]
                          }
                        >
                          総合: {item.result.overall_assessment}
                        </Badge>
                        {item.result.findings.some(
                          (f) => f.requires_hammer_test
                        ) && (
                          <Badge variant="outline" className="border-orange-400 text-orange-700">
                            <Hammer className="h-3 w-3 mr-1" />
                            打音検査要
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm bg-muted/50 rounded p-2">
                        💬 {item.result.summary_jp}
                      </p>
                      {item.result.findings.length === 0 ||
                      (item.result.findings.length === 1 &&
                        item.result.findings[0].defect_type === "異常なし") ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">指摘なし</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {item.result.findings.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="border rounded p-2 text-sm space-y-1"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={SEVERITY_STYLES[f.severity]}>
                                  {f.severity}
                                </Badge>
                                <span className="font-medium">
                                  {f.defect_type}
                                </span>
                                {f.requires_hammer_test && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-orange-400 text-orange-700"
                                  >
                                    打音要
                                  </Badge>
                                )}
                              </div>
                              <p>
                                <Eye className="inline h-3 w-3 mr-1" />
                                位置: {f.location_in_image} / 寸法:{" "}
                                {f.estimated_size}
                              </p>
                              <p className="text-muted-foreground">
                                {f.description}
                              </p>
                              <p className="text-xs">
                                <b>原因:</b> {f.possible_cause}
                              </p>
                              <p className="text-xs text-blue-700">
                                <b>推奨対応:</b> {f.recommended_action}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.result.notes_for_manual_check && (
                        <p className="text-xs text-muted-foreground border-t pt-2">
                          📝 現場確認メモ: {item.result.notes_for_manual_check}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
