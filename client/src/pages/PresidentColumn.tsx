import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, PenLine, Copy, CheckCircle, RefreshCw, MessageSquare } from "lucide-react";

const COLUMN_TYPES = [
  { value: "philosophy", label: "🏠 家づくりの哲学・こだわり", description: "なぜこの家の作り方にこだわるのか、設計への想い" },
  { value: "local", label: "🌆 北九州への感謝・地域感", description: "地元への愛着、地域で働く誇り、北九州の魅力" },
  { value: "daily", label: "💡 日常の気づき・小さな発見", description: "現場や日常で気づいたこと、ふと思ったこと" },
  { value: "craftsman", label: "🔨 職人への敬意・現場の話", description: "一緒に働く職人さんへの想い、現場のリアル" },
  { value: "customer", label: "🤝 お客様とのエピソード", description: "印象に残ったお客様との会話や出来事" },
  { value: "challenge", label: "🚀 やってきたこと・挑戦の記録", description: "挑戦してきたこと、失敗から学んだこと" },
] as const;

const PLATFORMS = [
  { value: "instagram", label: "Instagram", description: "200〜300文字・ハッシュタグ20〜30個" },
  { value: "x", label: "X (Twitter)", description: "100〜140文字・ハッシュタグ3〜5個" },
  { value: "threads", label: "Threads", description: "150〜250文字・ハッシュタグ5〜10個" },
] as const;

const TOPIC_EXAMPLES: Record<string, string[]> = {
  philosophy: [
    "お客様が「安い家でいい」と言ったとき、私が必ず聞き返すこと",
    "設計図を見るより、現場に立つことの大切さ",
    "「安心して住める家」の定義は、お客様によって全然違う",
  ],
  local: [
    "北九州で生まれ育ったから分かる、この街の家づくりの特徴",
    "地元の工務店として、大手ハウスメーカーに勝てるもの",
    "北九州の夏の暑さと、断熱の話",
  ],
  daily: [
    "今日の現場で、職人さんの仕事を見ていて気づいたこと",
    "朝の現場巡回で感じる、建築の醍醐味",
    "お客様の引き渡しの日に、いつも思うこと",
  ],
  craftsman: [
    "うちの大工さんが30年かけて磨いてきた技術の話",
    "職人さんが「手を抜けない」と言う理由",
    "現場で怒られた話と、そこから学んだこと",
  ],
  customer: [
    "「こんな家になると思わなかった」と言われた瞬間",
    "要望が全然まとまらないお客様と、3ヶ月かけて作った家",
    "完成後に「ありがとう」と言われるより嬉しいこと",
  ],
  challenge: [
    "2代目社長として最初にやったこと、失敗したこと",
    "戸建て住宅事業に進出した2000年の話",
    "YouTubeを始めたきっかけと、やってみて分かったこと",
  ],
};

export default function PresidentColumn() {
  const [columnType, setColumnType] = useState<typeof COLUMN_TYPES[number]["value"]>("philosophy");
  const [platform, setPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ postText: string; hashtags: string[]; charCount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.presidentColumn.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("社長コラムを生成しました！");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("テーマを入力してください");
      return;
    }
    generateMutation.mutate({
      topic: topic.trim(),
      columnType,
      platform,
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    const textToCopy = result.postText + "\n\n" + result.hashtags.join(" ");
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("コピーしました！");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExampleClick = (example: string) => {
    setTopic(example);
  };

  const selectedColumnType = COLUMN_TYPES.find(t => t.value === columnType);
  const examples = TOPIC_EXAMPLES[columnType] || [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PenLine className="h-8 w-8 text-primary" />
            社長コラム
          </h1>
          <p className="text-muted-foreground mt-2">
            写真なし・テキストのみの投稿。社長・櫨本健一の言葉で、想いや考えを発信します。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：入力フォーム */}
          <div className="space-y-5">
            {/* コラムの種類 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">コラムの種類</CardTitle>
                <CardDescription>どんな想いを発信しますか？</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {COLUMN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setColumnType(type.value)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        columnType === type.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* プラットフォーム */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">投稿先</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`text-center p-3 rounded-lg border transition-all ${
                        platform === p.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium text-sm">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：テーマ入力と結果 */}
          <div className="space-y-5">
            {/* テーマ入力 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">今日のテーマ</CardTitle>
                <CardDescription>何について話したいですか？自由に書いてください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`例）${examples[0] || "今日感じたこと、伝えたいことを自由に書いてください"}`}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  className="resize-none"
                />

                {/* 例文ボタン */}
                {examples.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">💡 テーマの例（クリックで入力）</Label>
                    <div className="space-y-1.5">
                      {examples.map((example, i) => (
                        <button
                          key={i}
                          onClick={() => handleExampleClick(example)}
                          className="w-full text-left text-xs p-2 rounded border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !topic.trim()}
                  size="lg"
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      社長コラムを生成中...
                    </>
                  ) : (
                    <>
                      <PenLine className="mr-2 h-5 w-5" />
                      社長コラムを生成
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 生成結果 */}
            {result && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      生成された投稿文
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.charCount}文字
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        ハッシュタグ {result.hashtags.length}個
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border text-sm whitespace-pre-wrap leading-relaxed">
                    {result.postText}
                  </div>

                  <div className="bg-white rounded-lg p-3 border">
                    <Label className="text-xs text-muted-foreground mb-2 block">ハッシュタグ</Label>
                    <div className="flex flex-wrap gap-1">
                      {result.hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopy}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          全文コピー
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      size="sm"
                      disabled={generateMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      再生成
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    コピーしてSNSに直接貼り付けてください
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
