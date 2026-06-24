import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Share2,
  Smartphone,
  QrCode as QrIcon,
  Building2,
  Download,
} from "lucide-react";

export default function ShareUrl() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [targetPath, setTargetPath] = useState<"/" | "/inspection" | "/simple-post">(
    "/inspection"
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState(
    "スマホで開いて、ホーム画面に追加して使ってください。"
  );

  const shareUrl = useMemo(() => `${baseUrl}${targetPath}`, [baseUrl, targetPath]);

  const chatworkMessage = useMemo(() => {
    const titleByPath: Record<string, string> = {
      "/": "ハゼモト業務アプリ",
      "/inspection": "建物点検AI（屋上・外壁定期点検）",
      "/simple-post": "SNSかんたん投稿",
    };
    return [
      `お疲れさまです。`,
      `${titleByPath[targetPath]}のURLを送ります。`,
      ``,
      shareUrl,
      ``,
      extraNote,
    ].join("\n");
  }, [shareUrl, targetPath, extraNote]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("コピーしました");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#share-qr canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `share-qr-${Date.now()}.png`;
    a.click();
  };

  const presets: Array<{ path: "/" | "/inspection" | "/simple-post"; label: string; icon: any }> = [
    { path: "/inspection", label: "建物点検AI", icon: Building2 },
    { path: "/simple-post", label: "かんたん投稿", icon: Share2 },
    { path: "/", label: "アプリ全体（ホーム）", icon: Smartphone },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Share2 className="h-7 w-7" />
            アプリ共有URL
          </h1>
          <p className="text-muted-foreground mt-2">
            現場担当者にアプリのURLを共有するためのページです。QRコード、コピー、Chatwork送信用文面が利用できます。
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900 space-y-1">
            <p className="font-semibold">⚠️ URLの仕組みについて</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                このURLは
                <b>このページを開いているブラウザのURL</b>
                をそのまま使っているため、社長が普段使っているURLと完全に同じものを共有できます。
              </li>
              <li>
                Manus開発URLは
                <b>セッションリセット時に変わります</b>
                。担当者から「404」「ページが見つかりません」と連絡があったら、このページを開き直して新しいURLを再送してください。
              </li>
              <li>固定URLが必要な場合は「SHARE.md」5章の本番ドメイン移行を検討してください。</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>① どの画面のURLを共有しますか？</CardTitle>
            <CardDescription>
              担当者がよく使う画面を選んでください。アプリ全体（ホーム）の場合はログイン後の画面に遷移します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map(({ path, label, icon: Icon }) => (
                <Button
                  key={path}
                  variant={targetPath === path ? "default" : "outline"}
                  onClick={() => setTargetPath(path)}
                  className="justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>② 共有用URL</CardTitle>
            <CardDescription>
              担当者に貼り付けてもらうURL。コピーボタンで一発コピーできます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
              <Button
                onClick={() => handleCopy(shareUrl, "url")}
                variant="outline"
              >
                {copied === "url" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                URLコピー
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrIcon className="h-5 w-5" />
                ③ QRコード（スマホ読み取り用）
              </CardTitle>
              <CardDescription>
                担当者のスマホでこのQRを読み取ると、ブラウザでアプリが開きます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                id="share-qr"
                className="flex justify-center bg-white p-4 rounded border"
              >
                <QRCodeCanvas value={shareUrl} size={220} level="M" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={downloadQR}
              >
                <Download className="h-4 w-4 mr-1" />
                QR画像をダウンロード
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>④ Chatwork送信用テンプレート</CardTitle>
              <CardDescription>
                そのままコピーしてChatworkやLINEに貼り付けて使えます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">追加メッセージ（編集可）</Label>
                <Input
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <Textarea
                value={chatworkMessage}
                readOnly
                rows={8}
                className="text-sm font-mono"
              />
              <Button
                className="w-full"
                onClick={() => handleCopy(chatworkMessage, "message")}
              >
                {copied === "message" ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                文面をコピー
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              ⑤ 担当者向け：スマホへのインストール手順
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-semibold">📱 iPhone（Safari）</p>
              <ol className="list-decimal list-inside ml-2 space-y-0.5 text-muted-foreground">
                <li>SafariでURLを開く（QR読み取りでもOK）</li>
                <li>画面下の <b>共有ボタン</b>（□に↑）をタップ</li>
                <li>
                  <b>ホーム画面に追加</b> をタップ
                </li>
                <li>名前を確認して <b>追加</b></li>
                <li>ホーム画面に「ハゼモト業務」アイコンが出る</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold">📱 Android（Chrome）</p>
              <ol className="list-decimal list-inside ml-2 space-y-0.5 text-muted-foreground">
                <li>ChromeでURLを開く</li>
                <li>右上の <b>︙メニュー</b> をタップ</li>
                <li>
                  <b>アプリをインストール</b> または{" "}
                  <b>ホーム画面に追加</b> をタップ
                </li>
                <li>確認して <b>インストール</b></li>
                <li>アプリ一覧／ホーム画面にアイコンが出る</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
