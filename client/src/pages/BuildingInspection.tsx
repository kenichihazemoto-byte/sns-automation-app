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
  Video,
  FileText,
  Save,
  History,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
      bbox: { x: number; y: number; width: number; height: number };
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [videoFrames, setVideoFrames] = useState<
    Array<{ id: string; dataUrl: string; timeSec: number; selected: boolean }>
  >([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState("");
  const [compareFor, setCompareFor] = useState<AnalyzedItem | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  const analyzeMutation = trpc.buildingInspection.analyzePhoto.useMutation();
  const saveSessionMutation = trpc.buildingInspection.saveSession.useMutation();
  const deleteSessionMutation =
    trpc.buildingInspection.deleteSession.useMutation();
  const compareMutation = trpc.buildingInspection.comparePhotos.useMutation();
  const utils = trpc.useUtils();

  const sessionsQuery = trpc.buildingInspection.listSessions.useQuery();
  const historicalMatchesQuery =
    trpc.buildingInspection.findHistoricalMatches.useQuery(
      compareFor
        ? {
            danchiName: compareFor.metadata.danchiName,
            buildingNo: compareFor.metadata.buildingNo,
            direction: compareFor.metadata.direction,
          }
        : { danchiName: "" },
      { enabled: !!compareFor }
    );

  const analyzeOne = async (
    fileName: string,
    base64: string
  ): Promise<AnalyzedItem | null> => {
    try {
      const result = await analyzeMutation.mutateAsync({
        imageBase64: base64,
        fileName,
        danchiName,
        buildingNo: buildingNo || undefined,
        floor: floor || undefined,
        direction: direction || undefined,
        surfaceTypeHint,
        note: note || undefined,
      });
      return result as AnalyzedItem;
    } catch (e: any) {
      console.error(e);
      toast.error(`${fileName}の分析に失敗しました: ${e?.message ?? ""}`);
      return null;
    }
  };

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

      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const result = await analyzeOne(file.name, base64);
      if (result) {
        setItems((prev) => [...prev, result]);
        done++;
      } else {
        failed++;
      }
      setProgress({ total: files.length, done, failed });
    }

    setProgress(null);
    toast.success(`${done}枚の写真を分析しました（失敗: ${failed}枚）`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 動画から代表フレームを N 枚抽出
  const extractFrames = async (file: File, frameCount = 6) => {
    setIsExtracting(true);
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("動画の読み込みに失敗"));
      });

      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        throw new Error("動画の長さを取得できません");
      }

      const canvas = document.createElement("canvas");
      const w = Math.min(video.videoWidth, 1280);
      const h = Math.round((video.videoHeight * w) / video.videoWidth);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas未対応");

      const frames: typeof videoFrames = [];
      for (let i = 0; i < frameCount; i++) {
        const t = ((i + 0.5) * duration) / frameCount;
        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = t;
          setTimeout(() => reject(new Error("seekタイムアウト")), 8000);
        });
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        frames.push({
          id: `frame-${Date.now()}-${i}`,
          dataUrl,
          timeSec: t,
          selected: true,
        });
      }

      URL.revokeObjectURL(url);
      setVideoFrames(frames);
      toast.success(`${frameCount}枚のフレームを抽出しました`);
    } catch (e: any) {
      toast.error(`動画処理に失敗: ${e?.message ?? "不明なエラー"}`);
    } finally {
      setIsExtracting(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const analyzeSelectedFrames = async () => {
    const selected = videoFrames.filter((f) => f.selected);
    if (selected.length === 0) {
      toast.error("分析するフレームを選択してください");
      return;
    }
    setProgress({ total: selected.length, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;
    for (const frame of selected) {
      const ts = `${Math.floor(frame.timeSec / 60)}m${String(
        Math.floor(frame.timeSec % 60)
      ).padStart(2, "0")}s`;
      const result = await analyzeOne(
        `動画フレーム_${ts}.jpg`,
        frame.dataUrl
      );
      if (result) {
        setItems((prev) => [...prev, result]);
        done++;
      } else {
        failed++;
      }
      setProgress({ total: selected.length, done, failed });
    }
    setProgress(null);
    setVideoFrames([]);
    toast.success(`${done}フレームを分析しました（失敗: ${failed}）`);
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

  const saveSession = async () => {
    if (items.length === 0) {
      toast.error("先に写真を分析してください");
      return;
    }
    try {
      const res = await saveSessionMutation.mutateAsync({
        danchiName,
        surveyTitle: surveyTitle || undefined,
        items: items.map((it) => ({
          photoId: it.photoId,
          imageUrl: it.imageUrl,
          fileName: it.fileName,
          metadata: {
            ...it.metadata,
            surfaceTypeHint: it.metadata.surfaceTypeHint,
          },
          result: it.result,
        })),
      });
      toast.success(`点検結果を保存しました（ID: ${res.recordId}）`);
      utils.buildingInspection.listSessions.invalidate();
    } catch (e: any) {
      toast.error(`保存に失敗: ${e?.message ?? "不明なエラー"}`);
    }
  };

  const loadSession = async (recordId: number) => {
    try {
      const session = await utils.buildingInspection.getSession.fetch({
        recordId,
      });
      if (!session) {
        toast.error("セッションが見つかりません");
        return;
      }
      const loaded: AnalyzedItem[] = session.photos.map((p: any) => {
        const result = JSON.parse(p.aiResult);
        return {
          photoId: p.photoKey ?? `db-${p.id}`,
          imageUrl: p.photoUrl,
          fileName: p.fileName ?? "",
          metadata: {
            danchiName: p.danchiName,
            buildingNo: p.buildingNo ?? undefined,
            floor: p.floor ?? undefined,
            direction: p.direction ?? undefined,
            note: p.note ?? undefined,
            surfaceTypeHint:
              (p.surfaceTypeHint as "外壁" | "屋上" | "自動判定") ?? "自動判定",
          },
          result,
        };
      });
      setItems(loaded);
      setDanchiName(session.record.danchiName);
      setSurveyTitle(session.record.surveyTitle ?? "");
      toast.success(
        `${loaded.length}件の写真を読み込みました（${new Date(session.record.surveyDate).toLocaleDateString("ja-JP")}の点検）`
      );
    } catch (e: any) {
      toast.error(`読み込みに失敗: ${e?.message ?? ""}`);
    }
  };

  const runComparison = async (previousPhotoId: number) => {
    if (!compareFor) return;
    setIsComparing(true);
    setComparisonResult(null);
    try {
      const result = await compareMutation.mutateAsync({
        previousPhotoId,
        currentImageUrl: compareFor.imageUrl,
        currentAiSummary: compareFor.result.summary_jp,
        currentSurveyDate: new Date().toISOString().slice(0, 10),
        locationContext: [
          compareFor.metadata.danchiName,
          compareFor.metadata.buildingNo &&
            `${compareFor.metadata.buildingNo}号棟`,
          compareFor.metadata.floor,
          compareFor.metadata.direction && `${compareFor.metadata.direction}面`,
        ]
          .filter(Boolean)
          .join(" "),
      });
      setComparisonResult(result);
    } catch (e: any) {
      toast.error(`比較に失敗: ${e?.message ?? ""}`);
    } finally {
      setIsComparing(false);
    }
  };

  // 写真にバウンディングボックスを焼き込んだ画像（dataURL）を生成
  const renderAnnotatedImage = async (item: AnalyzedItem): Promise<string> => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("画像の読み込みに失敗"));
      img.src = item.imageUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas未対応");
    ctx.drawImage(img, 0, 0);

    const colorOf = (sev: Severity) =>
      ({
        緊急: "#dc2626",
        要補修: "#f97316",
        要観察: "#eab308",
        軽微: "#60a5fa",
        問題なし: "#22c55e",
      })[sev];

    ctx.lineWidth = Math.max(3, img.naturalWidth / 300);
    ctx.font = `bold ${Math.max(14, img.naturalWidth / 60)}px sans-serif`;
    item.result.findings.forEach((f, i) => {
      if (f.defect_type === "異常なし") return;
      const { x, y, width, height } = f.bbox;
      if (width <= 0 || height <= 0) return;
      const px = x * img.naturalWidth;
      const py = y * img.naturalHeight;
      const pw = width * img.naturalWidth;
      const ph = height * img.naturalHeight;
      ctx.strokeStyle = colorOf(f.severity);
      ctx.strokeRect(px, py, pw, ph);
      const label = `${i + 1}. ${f.defect_type}`;
      const metrics = ctx.measureText(label);
      const labelH = Math.max(20, img.naturalWidth / 50);
      ctx.fillStyle = colorOf(f.severity);
      ctx.fillRect(px, py - labelH, metrics.width + 16, labelH);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, px + 8, py - 6);
    });

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const exportPDF = async () => {
    if (items.length === 0) {
      toast.error("先に写真を分析してください");
      return;
    }
    setIsExportingPdf(true);
    try {
      // 注釈付き画像を全件レンダリング
      const annotated: Record<string, string> = {};
      for (const it of items) {
        try {
          annotated[it.photoId] = await renderAnnotatedImage(it);
        } catch (e) {
          annotated[it.photoId] = it.imageUrl;
        }
      }
      // 隠しレポートDOMにレンダリング → html2canvas → PDF
      const reportDiv = reportRef.current;
      if (!reportDiv) throw new Error("レポート領域が見つかりません");

      // データURLに置き換え（描画用）
      reportDiv.querySelectorAll<HTMLImageElement>("img[data-photo-id]").forEach(
        (el) => {
          const id = el.getAttribute("data-photo-id");
          if (id && annotated[id]) el.src = annotated[id];
        }
      );

      reportDiv.style.display = "block";
      // 描画反映待ち
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });
      reportDiv.style.display = "none";

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWmm = pdf.internal.pageSize.getWidth();
      const pageHmm = pdf.internal.pageSize.getHeight();
      const imgWmm = pageWmm;
      const imgHmm = (canvas.height * imgWmm) / canvas.width;

      // 複数ページに分割
      let yOffset = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      let remainingH = imgHmm;
      let page = 0;
      while (remainingH > 0) {
        if (page > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          0,
          -yOffset,
          imgWmm,
          imgHmm,
          undefined,
          "FAST"
        );
        yOffset += pageHmm;
        remainingH -= pageHmm;
        page++;
      }
      const ts = new Date().toISOString().slice(0, 10);
      pdf.save(`点検調書_${danchiName}_${ts}.pdf`);
      toast.success("PDF調書をダウンロードしました");
    } catch (e: any) {
      console.error(e);
      toast.error(`PDF生成に失敗: ${e?.message ?? "不明なエラー"}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const colorOf = (sev: Severity): string =>
    ({
      緊急: "#dc2626",
      要補修: "#f97316",
      要観察: "#eab308",
      軽微: "#60a5fa",
      問題なし: "#22c55e",
    })[sev];

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
              <div className="md:col-span-2">
                <Label>点検タイトル（任意・保存時に使用）</Label>
                <Input
                  placeholder="例: 令和7年度 上期定期点検"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存済み点検履歴 */}
        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                保存済み点検履歴（前年比較で使用）
              </CardTitle>
              <CardDescription>
                過去の点検結果を読み込んで再表示・編集・PDF再出力が可能。前年比較ボタンから差分判定も実行できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {sessionsQuery.data.map((s: any) => (
                  <div
                    key={s.id}
                    className="border rounded p-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {s.danchiName}
                        {s.surveyTitle && ` / ${s.surveyTitle}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.surveyDate).toLocaleDateString("ja-JP")} ・ 写真{s.totalPhotos}枚
                        {s.urgentCount > 0 && (
                          <span className="text-red-600 ml-2">
                            緊急{s.urgentCount}件
                          </span>
                        )}
                        {s.repairCount > 0 && (
                          <span className="text-orange-600 ml-2">
                            要補修{s.repairCount}件
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadSession(s.id)}
                    >
                      読み込み
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("この点検記録を削除しますか？")) return;
                        await deleteSessionMutation.mutateAsync({
                          recordId: s.id,
                        });
                        utils.buildingInspection.listSessions.invalidate();
                        toast.success("削除しました");
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>② 写真・動画をアップロード</CardTitle>
            <CardDescription>
              写真は複数同時アップロード可（10MB/枚）。動画は代表フレームを自動抽出して分析できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="photo">
              <TabsList>
                <TabsTrigger value="photo">
                  <Camera className="h-4 w-4 mr-1" />
                  写真
                </TabsTrigger>
                <TabsTrigger value="video">
                  <Video className="h-4 w-4 mr-1" />
                  動画から抽出
                </TabsTrigger>
              </TabsList>
              <TabsContent value="photo" className="pt-4 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={progress !== null}
                    size="lg"
                    className="w-full"
                  >
                    {progress ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="mr-2 h-5 w-5" />
                        その場で撮影
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={progress !== null}
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    {progress ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        ファイルから選択
                      </>
                    )}
                  </Button>
                </div>
                {progress && (
                  <p className="text-sm text-muted-foreground text-center">
                    分析中... ({progress.done + progress.failed} / {progress.total})
                  </p>
                )}
              </TabsContent>
              <TabsContent value="video" className="pt-4 space-y-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) extractFrames(f, 6);
                  }}
                />
                <Button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isExtracting || progress !== null}
                  size="lg"
                  className="w-full"
                  variant="secondary"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      フレーム抽出中...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-5 w-5" />
                      動画を選択（6フレームを自動抽出）
                    </>
                  )}
                </Button>
                {videoFrames.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      分析するフレームを選択してください（クリックで選択/解除）
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {videoFrames.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setVideoFrames((prev) =>
                              prev.map((p) =>
                                p.id === f.id
                                  ? { ...p, selected: !p.selected }
                                  : p
                              )
                            )
                          }
                          className={`relative rounded border-2 overflow-hidden transition ${
                            f.selected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-muted opacity-60"
                          }`}
                        >
                          <img
                            src={f.dataUrl}
                            alt={`frame at ${f.timeSec}s`}
                            className="w-full h-32 object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {Math.floor(f.timeSec / 60)}:
                            {String(Math.floor(f.timeSec % 60)).padStart(2, "0")}
                          </span>
                          {f.selected && (
                            <span className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded">
                              選択中
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={analyzeSelectedFrames}
                      disabled={progress !== null}
                      className="w-full"
                    >
                      {progress ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          分析中... ({progress.done + progress.failed} /{" "}
                          {progress.total})
                        </>
                      ) : (
                        <>
                          選択した{videoFrames.filter((f) => f.selected).length}
                          フレームを分析
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveSession}
                    disabled={saveSessionMutation.isPending}
                  >
                    {saveSessionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    DB保存
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <FileDown className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={exportPDF}
                    disabled={isExportingPdf}
                  >
                    {isExportingPdf ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    PDF調書
                  </Button>
                </div>
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
                      <div className="relative rounded shadow overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.fileName}
                          className="w-full object-cover max-h-64"
                        />
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {item.result.findings.map((f, fIdx) => {
                            if (
                              f.defect_type === "異常なし" ||
                              f.bbox.width <= 0 ||
                              f.bbox.height <= 0
                            )
                              return null;
                            const c = colorOf(f.severity);
                            return (
                              <g key={fIdx}>
                                <rect
                                  x={f.bbox.x * 100}
                                  y={f.bbox.y * 100}
                                  width={f.bbox.width * 100}
                                  height={f.bbox.height * 100}
                                  fill="none"
                                  stroke={c}
                                  strokeWidth={0.6}
                                  vectorEffect="non-scaling-stroke"
                                />
                                <rect
                                  x={f.bbox.x * 100}
                                  y={Math.max(0, f.bbox.y * 100 - 4)}
                                  width={Math.min(
                                    100 - f.bbox.x * 100,
                                    Math.max(6, String(fIdx + 1).length * 2 + 4)
                                  )}
                                  height={4}
                                  fill={c}
                                />
                                <text
                                  x={f.bbox.x * 100 + 1}
                                  y={Math.max(3, f.bbox.y * 100 - 1)}
                                  fill="#fff"
                                  fontSize="3"
                                  fontWeight="bold"
                                >
                                  {fIdx + 1}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
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
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCompareFor(item);
                            setComparisonResult(null);
                          }}
                        >
                          <GitCompare className="h-3 w-3 mr-1" />
                          前年比較
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                                <span
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
                                  style={{ background: colorOf(f.severity) }}
                                >
                                  {fIdx + 1}
                                </span>
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

        {/* 前年比較ダイアログ */}
        <Dialog
          open={!!compareFor}
          onOpenChange={(open) => {
            if (!open) {
              setCompareFor(null);
              setComparisonResult(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                前年比較（経年変化のAI判定）
              </DialogTitle>
              <DialogDescription>
                同じ団地・棟・方位で保存済みの過去写真と比較します。AIが新規発生・悪化・改善を判定します。
              </DialogDescription>
            </DialogHeader>
            {compareFor && (
              <div className="space-y-4">
                <div className="border rounded p-3 bg-muted/30">
                  <p className="text-sm font-medium">今回の写真</p>
                  <div className="flex gap-3 mt-2">
                    <img
                      src={compareFor.imageUrl}
                      alt="current"
                      className="w-32 h-32 object-cover rounded"
                    />
                    <div className="text-xs space-y-0.5">
                      <p>
                        {compareFor.metadata.danchiName}
                        {compareFor.metadata.buildingNo &&
                          ` / ${compareFor.metadata.buildingNo}号棟`}
                        {compareFor.metadata.direction &&
                          ` / ${compareFor.metadata.direction}面`}
                      </p>
                      <p>判定: {compareFor.result.overall_assessment}</p>
                      <p className="text-muted-foreground">
                        {compareFor.result.summary_jp}
                      </p>
                    </div>
                  </div>
                </div>

                {!comparisonResult && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      比較対象の過去写真を選択
                    </p>
                    {historicalMatchesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        過去写真を検索中...
                      </div>
                    ) : !historicalMatchesQuery.data ||
                      historicalMatchesQuery.data.length === 0 ? (
                      <div className="border border-dashed rounded p-4 text-center text-sm text-muted-foreground">
                        同条件の過去写真が見つかりません。
                        <br />
                        過去の点検結果を「DB保存」しておくと比較できます。
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {historicalMatchesQuery.data.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isComparing}
                            onClick={() => runComparison(p.id)}
                            className="text-left border rounded overflow-hidden hover:border-primary transition disabled:opacity-50"
                          >
                            <img
                              src={p.photoUrl}
                              alt={p.fileName}
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 text-xs">
                              <p className="font-medium truncate">
                                {p.fileName}
                              </p>
                              <p className="text-muted-foreground">
                                {new Date(p.createdAt).toLocaleDateString(
                                  "ja-JP"
                                )}
                                ・{p.overallAssessment ?? "未判定"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {isComparing && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AIが2枚の写真を比較中...
                      </div>
                    )}
                  </div>
                )}

                {comparisonResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          過去 (
                          {new Date(
                            comparisonResult.previous.surveyDate
                          ).toLocaleDateString("ja-JP")}
                          )
                        </p>
                        <img
                          src={comparisonResult.previous.photoUrl}
                          alt="prev"
                          className="w-full rounded border"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          今回 ({new Date().toLocaleDateString("ja-JP")})
                        </p>
                        <img
                          src={compareFor.imageUrl}
                          alt="current"
                          className="w-full rounded border"
                        />
                      </div>
                    </div>

                    <div className="border rounded p-3 bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={
                            comparisonResult.comparison.overall_change === "悪化"
                              ? "bg-red-600 text-white"
                              : comparisonResult.comparison.overall_change ===
                                "新規発生"
                              ? "bg-orange-500 text-white"
                              : comparisonResult.comparison.overall_change ===
                                "改善・補修済み"
                              ? "bg-green-500 text-white"
                              : "bg-gray-400 text-white"
                          }
                        >
                          全体: {comparisonResult.comparison.overall_change}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          AI信頼度:{" "}
                          {(comparisonResult.comparison.confidence * 100).toFixed(
                            0
                          )}
                          %
                        </span>
                      </div>
                      <p className="text-sm">
                        {comparisonResult.comparison.summary_jp}
                      </p>
                    </div>

                    {comparisonResult.comparison.changes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">変化の詳細</p>
                        {comparisonResult.comparison.changes.map(
                          (c: any, ci: number) => (
                            <div
                              key={ci}
                              className="border rounded p-2 text-sm space-y-1"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={
                                    c.change_kind === "悪化"
                                      ? "bg-red-600 text-white"
                                      : c.change_kind === "新規発生"
                                      ? "bg-orange-500 text-white"
                                      : c.change_kind === "改善・補修済み"
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-400 text-white"
                                  }
                                >
                                  {c.change_kind}
                                </Badge>
                                <span className="font-medium">
                                  {c.defect_label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  現在: {c.severity_now}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground">
                                {c.description}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="font-medium">過去:</p>
                                  <p>{c.previous_state}</p>
                                </div>
                                <div>
                                  <p className="font-medium">現在:</p>
                                  <p>{c.current_state}</p>
                                </div>
                              </div>
                              <p className="text-xs text-blue-700">
                                <ArrowRight className="inline h-3 w-3 mr-1" />
                                {c.recommended_action}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {comparisonResult.comparison.notes && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        📝 {comparisonResult.comparison.notes}
                      </p>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setComparisonResult(null)}
                    >
                      別の過去写真と比較
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* PDF生成用の隠しレポート（html2canvasで画像化） */}
        <div
          ref={reportRef}
          style={{
            display: "none",
            width: "794px",
            padding: "24px",
            background: "#fff",
            color: "#000",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, sans-serif",
          }}
        >
          <div style={{ borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              建物点検調書（AI一次判定）
            </h1>
            <p style={{ fontSize: 12, margin: "4px 0 0 0" }}>
              発行日: {new Date().toLocaleDateString("ja-JP")} / 団地: {danchiName}
            </p>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>
            ■ 総合サマリー
          </h2>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ border: "1px solid #999", padding: 4 }}>緊急</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>要補修</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>要観察</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>軽微</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>問題なし</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>合計</th>
                <th style={{ border: "1px solid #999", padding: 4 }}>打音検査要</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.byOverall["緊急"]}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.byOverall["要補修"]}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.byOverall["要観察"]}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.byOverall["軽微"]}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.byOverall["問題なし"]}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.total}
                </td>
                <td style={{ border: "1px solid #999", padding: 4, textAlign: "center" }}>
                  {summary.hammerCount}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>
            ■ 写真ごとの指摘事項
          </h2>
          {items.map((item, idx) => (
            <div
              key={item.photoId}
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginTop: 8,
                pageBreakInside: "avoid",
              }}
            >
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 240, flexShrink: 0 }}>
                  <img
                    data-photo-id={item.photoId}
                    src={item.imageUrl}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      objectFit: "cover",
                      border: "1px solid #000",
                    }}
                  />
                </div>
                <div style={{ flex: 1, fontSize: 11 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    No.{idx + 1} {item.metadata.danchiName}
                    {item.metadata.buildingNo && ` / ${item.metadata.buildingNo}号棟`}
                    {item.metadata.floor && ` / ${item.metadata.floor}`}
                    {item.metadata.direction && ` / ${item.metadata.direction}面`}
                  </p>
                  <p style={{ margin: "2px 0", color: "#555" }}>
                    部位: {item.result.surface_type} / ファイル: {item.fileName}
                  </p>
                  <p
                    style={{
                      margin: "4px 0",
                      padding: "2px 8px",
                      background:
                        item.result.overall_assessment === "緊急"
                          ? "#fee2e2"
                          : item.result.overall_assessment === "要補修"
                          ? "#ffedd5"
                          : "#f3f4f6",
                      display: "inline-block",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    総合判定: {item.result.overall_assessment}（AI信頼度:{" "}
                    {(item.result.confidence * 100).toFixed(0)}%）
                  </p>
                  <p style={{ margin: "4px 0", fontSize: 11 }}>
                    要約: {item.result.summary_jp}
                  </p>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: 10,
                      marginTop: 4,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        <th style={{ border: "1px solid #999", padding: 2 }}>No</th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>
                          劣化種別
                        </th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>重要度</th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>位置</th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>
                          推定寸法
                        </th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>
                          推奨対応
                        </th>
                        <th style={{ border: "1px solid #999", padding: 2 }}>打音</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.result.findings.map((f, fIdx) => (
                        <tr key={fIdx}>
                          <td style={{ border: "1px solid #999", padding: 2, textAlign: "center" }}>
                            {fIdx + 1}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2 }}>
                            {f.defect_type}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2 }}>
                            {f.severity}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2 }}>
                            {f.location_in_image}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2 }}>
                            {f.estimated_size}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2 }}>
                            {f.recommended_action}
                          </td>
                          <td style={{ border: "1px solid #999", padding: 2, textAlign: "center" }}>
                            {f.requires_hammer_test ? "要" : "−"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {item.result.notes_for_manual_check && (
                    <p style={{ margin: "4px 0", fontSize: 10, color: "#555" }}>
                      現場確認メモ: {item.result.notes_for_manual_check}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 16,
              fontSize: 10,
              color: "#666",
              borderTop: "1px solid #ccc",
              paddingTop: 8,
            }}
          >
            ※ 本調書はAIによる一次判定です。「浮き」項目は打音検査または赤外線サーモグラフィでの確定をお願いします。
            最終判定は現場の点検技士が行ってください。
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
