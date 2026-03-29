import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, QrCode, Star } from "lucide-react";
import { toast } from "sonner";

interface ReviewQRCardProps {
  googleReviewUrl: string;
  companyName: string;
}

const CARD_DESIGNS = [
  { value: "standard", label: "スタンダード（白背景）" },
  { value: "warm", label: "ウォーム（温かみのある橙）" },
  { value: "elegant", label: "エレガント（紺×金）" },
];

const REVIEW_MESSAGES = [
  "ご感想をお聞かせください。お客様の声が私たちの励みになります。",
  "ご満足いただけましたか？ぜひ口コミをお願いします！",
  "お時間のある際に、Google口コミへのご投稿をお願いいたします。",
  "皆様の声が、次のお客様の家づくりの参考になります。",
];

export default function ReviewQRCard({ googleReviewUrl, companyName }: ReviewQRCardProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [cardDesign, setCardDesign] = useState("standard");
  const [cardTitle, setCardTitle] = useState("口コミをお願いします！");
  const [cardMessage, setCardMessage] = useState(REVIEW_MESSAGES[0]);
  const [staffName, setStaffName] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const hasUrl = !!googleReviewUrl;

  const designStyles: Record<string, { card: string; title: string; text: string; qrBg: string; footer: string }> = {
    standard: {
      card: "bg-white border-2 border-gray-200",
      title: "text-gray-800",
      text: "text-gray-600",
      qrBg: "bg-gray-50 border border-gray-200",
      footer: "bg-gray-50 border-t border-gray-200 text-gray-500",
    },
    warm: {
      card: "bg-orange-50 border-2 border-orange-300",
      title: "text-orange-800",
      text: "text-orange-700",
      qrBg: "bg-white border border-orange-200",
      footer: "bg-orange-100 border-t border-orange-200 text-orange-600",
    },
    elegant: {
      card: "bg-slate-800 border-2 border-yellow-400",
      title: "text-yellow-300",
      text: "text-slate-200",
      qrBg: "bg-white border border-yellow-400",
      footer: "bg-slate-900 border-t border-yellow-400/30 text-slate-400",
    },
  };

  const ds = designStyles[cardDesign] || designStyles.standard;

  const handleDownloadQR = () => {
    if (!hasUrl) { toast.error("Google口コミURLを設定してください"); return; }
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "review-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QRコード画像をダウンロードしました");
  };

  const handlePrint = () => {
    if (!hasUrl) { toast.error("Google口コミURLを設定してください"); return; }
    const printContent = printRef.current;
    if (!printContent) return;

    // QRコードのcanvasをimgに変換してから印刷
    const canvas = qrRef.current?.querySelector("canvas");
    const qrDataUrl = canvas ? canvas.toDataURL("image/png") : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("ポップアップがブロックされました。許可してください。"); return; }

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>口コミ依頼カード - ${companyName || "ハゼモト建設"}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; background: #f5f5f5; }
    .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8mm; width: 100%; height: 100vh; }
    .card {
      border-radius: 8px; padding: 6mm;
      display: flex; flex-direction: column; align-items: center; justify-content: space-between;
      ${cardDesign === "standard" ? "background:#fff; border: 2px solid #e5e7eb;" : ""}
      ${cardDesign === "warm" ? "background:#fff7ed; border: 2px solid #fb923c;" : ""}
      ${cardDesign === "elegant" ? "background:#1e293b; border: 2px solid #fbbf24;" : ""}
    }
    .card-title {
      font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 2mm;
      ${cardDesign === "elegant" ? "color:#fde68a;" : cardDesign === "warm" ? "color:#9a3412;" : "color:#1f2937;"}
    }
    .stars { color: #f59e0b; font-size: 16pt; letter-spacing: 2px; margin-bottom: 2mm; }
    .qr-wrap { background: white; padding: 4mm; border-radius: 6px; margin: 2mm 0; }
    .qr-wrap img { display: block; width: 28mm; height: 28mm; }
    .message {
      font-size: 8pt; text-align: center; line-height: 1.5; margin: 2mm 0;
      ${cardDesign === "elegant" ? "color:#cbd5e1;" : cardDesign === "warm" ? "color:#c2410c;" : "color:#4b5563;"}
    }
    .footer {
      font-size: 7pt; text-align: center; padding-top: 2mm; border-top: 1px solid;
      ${cardDesign === "elegant" ? "border-color:#fbbf2440; color:#94a3b8;" : cardDesign === "warm" ? "border-color:#fed7aa; color:#9a3412;" : "border-color:#e5e7eb; color:#9ca3af;"}
    }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <div class="page">
    ${[0, 1, 2, 3].map(() => `
    <div class="card">
      <div class="card-title">${cardTitle}</div>
      <div class="stars">★★★★★</div>
      <div class="qr-wrap">
        <img src="${qrDataUrl}" alt="QRコード" />
      </div>
      <div class="message">${cardMessage}</div>
      <div class="footer">${companyName || "ハゼモト建設"}${staffName ? `　担当：${staffName}` : ""}</div>
    </div>
    `).join("")}
  </div>
  <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    toast.success("印刷ダイアログを開きました（A4に4枚配置）");
  };

  return (
    <div className="space-y-4">
      {!hasUrl && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          <strong>⚠ Google口コミURLが未設定です。</strong><br />
          上の「HP誘導リンク設定」で「Google口コミ投稿URL」を入力・保存してからご利用ください。
        </div>
      )}

      {/* カスタマイズ設定 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">カードデザイン</Label>
          <Select value={cardDesign} onValueChange={setCardDesign}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_DESIGNS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">カードタイトル</Label>
          <Input
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            className="h-9 text-sm"
            placeholder="口コミをお願いします！"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold">依頼メッセージ</Label>
          <Select value={cardMessage} onValueChange={setCardMessage}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_MESSAGES.map((m, i) => (
                <SelectItem key={i} value={m}>{m.slice(0, 30)}…</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={cardMessage}
            onChange={(e) => setCardMessage(e.target.value)}
            className="text-sm resize-none"
            rows={2}
            placeholder="カスタムメッセージを入力..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">担当者名（任意）</Label>
          <Input
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="h-9 text-sm"
            placeholder="例：担当 田中"
          />
        </div>
      </div>

      {/* プレビュー */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowPreview(!showPreview)}
          disabled={!hasUrl}
        >
          <QrCode className="h-4 w-4 mr-2" />
          {showPreview ? "プレビューを閉じる" : "カードプレビューを表示"}
        </Button>

        {showPreview && hasUrl && (
          <div className="flex justify-center">
            <div
              ref={printRef}
              className={`rounded-xl shadow-lg p-5 w-56 flex flex-col items-center gap-3 ${ds.card}`}
            >
              <p className={`text-sm font-bold text-center ${ds.title}`}>{cardTitle}</p>
              <div className="flex gap-0.5 text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400" />)}
              </div>
              <div ref={qrRef} className={`p-2 rounded-lg ${ds.qrBg}`}>
                <QRCodeCanvas
                  value={googleReviewUrl}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className={`text-xs text-center leading-relaxed ${ds.text}`}>{cardMessage}</p>
              <div className={`w-full text-center text-xs pt-2 ${ds.footer}`}>
                {companyName || "ハゼモト建設"}
                {staffName && <span className="ml-1">　担当：{staffName}</span>}
              </div>
            </div>
          </div>
        )}

        {/* QR非表示でも内部でQRCanvasを保持（ダウンロード用） */}
        {hasUrl && !showPreview && (
          <div ref={qrRef} className="hidden">
            <QRCodeCanvas value={googleReviewUrl} size={200} level="M" />
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
          onClick={handleDownloadQR}
          disabled={!hasUrl}
        >
          <Download className="h-4 w-4 mr-1.5" />
          QR画像をDL
        </Button>
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700 text-white"
          onClick={handlePrint}
          disabled={!hasUrl}
        >
          <Printer className="h-4 w-4 mr-1.5" />
          カードを印刷（A4×4枚）
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        印刷するとA4用紙に4枚のカードが配置されます。切り取ってお客様にお渡しください。
      </p>
    </div>
  );
}
