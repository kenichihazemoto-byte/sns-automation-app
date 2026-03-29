import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
} from "recharts";
import {
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Instagram,
  MessageSquare,
  Twitter,
  ArrowRight,
  Copy,
  Check,
  FileText,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

// 投稿タイプごとの色設定
const TYPE_COLORS: Record<string, { bg: string; text: string; bar: string; badge: string; hex: string }> = {
  "施工事例":      { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-500",   badge: "bg-blue-100 text-blue-700",   hex: "#3b82f6" },
  "地域活動":      { bg: "bg-green-50",  text: "text-green-700",  bar: "bg-green-500",  badge: "bg-green-100 text-green-700", hex: "#22c55e" },
  "スタッフ紹介":  { bg: "bg-purple-50", text: "text-purple-700", bar: "bg-purple-500", badge: "bg-purple-100 text-purple-700", hex: "#a855f7" },
  "社長コラム":    { bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-500",  badge: "bg-amber-100 text-amber-700", hex: "#f59e0b" },
  "季節・イベント":{ bg: "bg-rose-50",   text: "text-rose-700",   bar: "bg-rose-500",   badge: "bg-rose-100 text-rose-700",   hex: "#f43f5e" },
  "その他":        { bg: "bg-gray-50",   text: "text-gray-600",   bar: "bg-gray-400",   badge: "bg-gray-100 text-gray-600",   hex: "#9ca3af" },
};

const TYPE_ORDER = ["施工事例", "地域活動", "スタッフ紹介", "社長コラム", "季節・イベント", "その他"];

function TrendIcon({ actual, recommended }: { actual: number; recommended: number }) {
  const diff = actual - recommended;
  if (diff > 5) return <TrendingUp className="h-3.5 w-3.5 text-blue-500" />;
  if (diff < -5) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

interface TemplateResult {
  category: string;
  title: string;
  instagram: string;
  threads: string;
  x: string;
  hashtags: string[];
}

function TemplateCard({ template }: { template: TemplateResult }) {
  const [, navigate] = useLocation();
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const colors = TYPE_COLORS[template.category] ?? TYPE_COLORS["その他"];

  const handleCopy = async (text: string, platform: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    toast.success(`${platform}用テキストをコピーしました`);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const handleUseTemplate = (platform: "instagram" | "threads" | "x") => {
    const templateData = {
      category: template.category,
      title: template.title,
      instagram: template.instagram,
      threads: template.threads,
      x: template.x,
      hashtags: template.hashtags,
      platform,
    };
    sessionStorage.setItem("pendingTemplate", JSON.stringify(templateData));
    toast.success("投稿作成画面に移動します");
    navigate("/demo");
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${colors.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{template.title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
          {template.category}
        </span>
      </div>

      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full h-8 bg-white/60">
          <TabsTrigger value="instagram" className="flex-1 text-xs gap-1 h-7">
            <Instagram className="h-3 w-3" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex-1 text-xs gap-1 h-7">
            <MessageSquare className="h-3 w-3" />
            Threads
          </TabsTrigger>
          <TabsTrigger value="x" className="flex-1 text-xs gap-1 h-7">
            <Twitter className="h-3 w-3" />
            X
          </TabsTrigger>
        </TabsList>

        {(["instagram", "threads", "x"] as const).map((platform) => {
          const text = template[platform];
          const charCount = text.length;
          const limit = platform === "instagram" ? 2200 : platform === "threads" ? 500 : 280;
          const isOver = charCount > limit;
          const platformLabel = platform === "instagram" ? "Instagram" : platform === "threads" ? "Threads" : "X";

          return (
            <TabsContent key={platform} value={platform} className="mt-2 space-y-2">
              <div className="bg-white/70 rounded-md p-3 text-xs text-gray-700 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                {text}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isOver ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {charCount} / {limit}文字
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2"
                    onClick={() => handleCopy(text, platformLabel)}
                  >
                    {copiedPlatform === platformLabel ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    コピー
                  </Button>
                  <Button
                    size="sm"
                    className={`h-7 text-xs gap-1 px-2 ${colors.text} bg-white hover:bg-white/80 border border-current/20`}
                    variant="outline"
                    onClick={() => handleUseTemplate(platform)}
                  >
                    <ArrowRight className="h-3 w-3" />
                    投稿作成へ
                  </Button>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {template.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-white/40">
          {template.hashtags.slice(0, 8).map((tag, i) => (
            <span key={i} className="text-xs text-muted-foreground">#{tag}</span>
          ))}
          {template.hashtags.length > 8 && (
            <span className="text-xs text-muted-foreground">+{template.hashtags.length - 8}個</span>
          )}
        </div>
      )}
    </div>
  );
}

// カスタムツールチップ
function CustomBarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}：</span>
            <span className="font-medium">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function PostBalanceCard({ companyName = "ハゼモト建設" }: { companyName?: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceLabel, setAdviceLabel] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateResult[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [chartView, setChartView] = useState<"bar" | "radar">("bar");

  const { data, isLoading } = trpc.postBalance.getMonthlyBalance.useQuery({
    companyName,
    year,
    month,
  });

  // 過去6ヶ月分のデータを並列取得
  const past6Months = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
  }, [year, month]);

  const trendQueries = [
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[0].year, month: past6Months[0].month }),
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[1].year, month: past6Months[1].month }),
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[2].year, month: past6Months[2].month }),
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[3].year, month: past6Months[3].month }),
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[4].year, month: past6Months[4].month }),
    trpc.postBalance.getMonthlyBalance.useQuery({ companyName, year: past6Months[5].year, month: past6Months[5].month }),
  ];

  // 過去6ヶ月のトレンドデータを整形
  const trendData = useMemo(() => {
    return past6Months.map((m, i) => {
      const d = trendQueries[i].data;
      return {
        name: `${m.month}月`,
        total: d?.total ?? 0,
        施工事例: d?.typeCounts?.["施工事例"] ?? 0,
        地域活動: d?.typeCounts?.["地域活動"] ?? 0,
        スタッフ紹介: d?.typeCounts?.["スタッフ紹介"] ?? 0,
        社長コラム: d?.typeCounts?.["社長コラム"] ?? 0,
        "季節・イベント": d?.typeCounts?.["季節・イベント"] ?? 0,
      };
    });
  }, [trendQueries, past6Months]);

  // 現在月のバーチャートデータ（実績 vs 推奨）
  const barChartData = useMemo(() => {
    if (!data) return [];
    return TYPE_ORDER.filter(t => t !== "その他").map(type => ({
      name: type.length > 6 ? type.slice(0, 6) + "…" : type,
      fullName: type,
      実績: data.actualBalance[type] ?? 0,
      推奨: data.recommendedBalance[type] ?? 0,
    }));
  }, [data]);

  // レーダーチャートデータ
  const radarData = useMemo(() => {
    if (!data) return [];
    return TYPE_ORDER.filter(t => t !== "その他").map(type => ({
      type: type.length > 5 ? type.slice(0, 5) : type,
      実績: data.actualBalance[type] ?? 0,
      推奨: data.recommendedBalance[type] ?? 0,
    }));
  }, [data]);

  const generateAdviceMutation = trpc.postBalance.generateAdvice.useMutation({
    onSuccess: (result) => {
      setAdvice(result.advice);
      setAdviceLabel(result.monthLabel);
    },
  });

  const generateTemplatesMutation = trpc.postBalance.generateTemplates.useMutation({
    onSuccess: (result) => {
      setTemplates(result.templates);
      setShowTemplates(true);
      if (result.templates.length === 0) {
        toast.info("不足しているカテゴリがありません。バランスが良好です！");
      }
    },
    onError: () => {
      toast.error("テンプレートの生成に失敗しました。再度お試しください。");
    },
  });

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
    setAdvice(null); setTemplates([]); setShowTemplates(false);
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
    setAdvice(null); setTemplates([]); setShowTemplates(false);
  };

  const handleGenerateAdvice = () => {
    if (!data) return;
    generateAdviceMutation.mutate({
      companyName, year, month,
      typeCounts: data.typeCounts,
      total: data.total,
      recommendedBalance: data.recommendedBalance,
    });
  };

  const handleGenerateTemplates = () => {
    if (!data || shortCategories.length === 0) return;
    generateTemplatesMutation.mutate({ companyName, shortCategories, year, month });
  };

  const shortCategories = data
    ? Object.entries(data.recommendedBalance).filter(([type, recommended]) => {
        const actual = data.actualBalance[type] ?? 0;
        return (recommended - actual) > 5;
      }).map(([type]) => type)
    : [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              月間投稿バランス分析
            </CardTitle>
            <CardDescription>永友メソッド推奨比率との比較・過去6ヶ月のトレンドを確認できます</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-20 text-center">{year}年{month}月</span>
            <Button
              variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8"
              disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data || data.total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">この月の投稿データがありません</p>
            <p className="text-xs mt-1">投稿を作成すると、ここにバランス分析が表示されます</p>
          </div>
        ) : (
          <>
            {/* 合計投稿数 + 不足バッジ */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">{data.total}</span>
              <span className="text-sm text-muted-foreground">件の投稿を分析</span>
              {shortCategories.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-muted-foreground">不足：</span>
                  {shortCategories.map(type => (
                    <span key={type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[type]?.badge ?? "bg-gray-100 text-gray-600"}`}>
                      {type}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* グラフ切り替えタブ */}
            <Tabs value={chartView} onValueChange={(v) => setChartView(v as "bar" | "radar")}>
              <TabsList className="h-8">
                <TabsTrigger value="bar" className="text-xs gap-1 h-7">
                  <BarChart3 className="h-3 w-3" />
                  比較グラフ
                </TabsTrigger>
                <TabsTrigger value="radar" className="text-xs gap-1 h-7">
                  <PieChart className="h-3 w-3" />
                  レーダー
                </TabsTrigger>
              </TabsList>

              {/* 実績 vs 推奨 バーチャート */}
              <TabsContent value="bar" className="mt-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 60]} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="実績" radius={[3, 3, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={index} fill={TYPE_COLORS[entry.fullName]?.hex ?? "#9ca3af"} />
                        ))}
                      </Bar>
                      <Bar dataKey="推奨" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  カラーバー = 実績 ／ グレーバー = 永友メソッド推奨値
                </p>
              </TabsContent>

              {/* レーダーチャート */}
              <TabsContent value="radar" className="mt-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <Radar name="実績" dataKey="実績" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
                      <Radar name="推奨" dataKey="推奨" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} strokeDasharray="4 2" />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip content={<CustomBarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  青 = 実績 ／ グレー点線 = 永友メソッド推奨値
                </p>
              </TabsContent>
            </Tabs>

            {/* 投稿タイプ別横バー（詳細） */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">詳細内訳</p>
              {TYPE_ORDER.map(type => {
                const count = data.typeCounts[type] ?? 0;
                const actual = data.actualBalance[type] ?? 0;
                const recommended = data.recommendedBalance[type] ?? 0;
                const diff = actual - recommended;
                const colors = TYPE_COLORS[type] ?? TYPE_COLORS["その他"];

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${colors.text}`}>{type}</span>
                        <span className="text-muted-foreground text-xs">{count}件</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendIcon actual={actual} recommended={recommended} />
                        <span className={`text-xs font-medium ${diff > 5 ? "text-blue-600" : diff < -5 ? "text-red-500" : "text-gray-500"}`}>
                          {actual}%
                        </span>
                        <span className="text-xs text-muted-foreground">/ 推奨{recommended}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${Math.min(actual, 100)}%` }} />
                      {recommended > 0 && (
                        <div className="absolute top-0 h-full w-0.5 bg-foreground/20" style={{ left: `${recommended}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 過去6ヶ月トレンド */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">過去6ヶ月の投稿件数トレンド</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    {["施工事例", "地域活動", "スタッフ紹介", "社長コラム", "季節・イベント"].map(type => (
                      <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type]?.hex ?? "#9ca3af"} radius={type === "季節・イベント" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {["施工事例", "地域活動", "スタッフ紹介", "社長コラム", "季節・イベント"].map(type => (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[type]?.hex }} />
                    <span className="text-xs text-muted-foreground">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン群 */}
            <div className="pt-2 border-t space-y-2">
              {shortCategories.length > 0 && (
                <Button
                  variant="default" size="sm"
                  onClick={handleGenerateTemplates}
                  disabled={generateTemplatesMutation.isPending}
                  className="w-full gap-2 bg-primary"
                >
                  {generateTemplatesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generateTemplatesMutation.isPending
                    ? `AIが${shortCategories.join("・")}の投稿文を生成中...`
                    : `不足している「${shortCategories.slice(0, 2).join("・")}」の投稿文をAIに提案させる`}
                </Button>
              )}
              <Button
                variant="outline" size="sm"
                onClick={handleGenerateAdvice}
                disabled={generateAdviceMutation.isPending}
                className="w-full gap-2"
              >
                {generateAdviceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                {generateAdviceMutation.isPending ? "AIが分析中..." : "AIに来月の投稿アドバイスをもらう"}
              </Button>
            </div>

            {/* AIアドバイス表示 */}
            {advice && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-800">{adviceLabel}のバランスアドバイス</span>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{advice}</p>
              </div>
            )}

            {/* テンプレート提案表示 */}
            {showTemplates && templates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    AIが提案する投稿テンプレート（{templates.length}件）
                  </span>
                  <Badge variant="secondary" className="text-xs">不足カテゴリ補強</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  各テンプレートはInstagram・Threads・X用に最適化されています。「投稿作成へ」ボタンで投稿作成画面に内容を引き継げます。
                </p>
                {templates.map((template, i) => (
                  <TemplateCard key={i} template={template} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
