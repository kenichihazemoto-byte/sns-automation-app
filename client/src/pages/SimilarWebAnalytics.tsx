import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointerClick,
  BarChart3,
  ArrowUpRight,
  Search,
  Share2,
  Mail,
  Monitor,
  ExternalLink,
} from "lucide-react";
import similarwebRaw from "@/data/similarweb_data.json";

// ─── 型定義 ────────────────────────────────────────────────
interface SiteData {
  domain: string;
  globalRank: number | null;
  visits: { date: string; visits: number }[];
  uniqueVisits: { date: string; uniqueVisits: number }[];
  bounceRate: { date: string; bounceRate: number }[];
  trafficSources: Record<string, number>;
  trafficByCountry: {
    country: string;
    share: number;
    visits: number;
    bounceRate: number;
    pagesPerVisit: number;
    avgTime: number;
    rank: number | null;
  }[];
}

const rawData = similarwebRaw as Record<string, SiteData>;

// ─── 定数 ────────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, string> = {
  "suumo.jp": "SUUMO",
  "homes.co.jp": "LIFULL HOME'S",
  "athome.co.jp": "at home",
  "sekisui-house.co.jp": "積水ハウス",
  "daiwahouse.co.jp": "大和ハウス",
};

const COLORS = [
  "#e91e8c",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];

const SOURCE_LABELS: Record<string, string> = {
  Search: "検索",
  Social: "SNS",
  Mail: "メール",
  "Display Ads": "ディスプレイ広告",
  Direct: "ダイレクト",
  Referrals: "参照元",
};

const SOURCE_COLORS: Record<string, string> = {
  Search: "#3b82f6",
  Social: "#e91e8c",
  Mail: "#f59e0b",
  "Display Ads": "#8b5cf6",
  Direct: "#10b981",
  Referrals: "#ef4444",
};

// ─── ユーティリティ ────────────────────────────────────────
function formatVisits(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

// ─── メインコンポーネント ──────────────────────────────────
export default function SimilarWebAnalytics() {
  const [selectedDomain, setSelectedDomain] = useState<string>("suumo.jp");
  const [compareMode, setCompareMode] = useState(false);

  const domains = Object.keys(rawData).filter(
    (d) => rawData[d].visits.length > 0
  );
  const selectedData = rawData[selectedDomain];

  // 最新月の訪問数
  const latestVisits = useMemo(() => {
    if (!selectedData?.visits?.length) return 0;
    return selectedData.visits[selectedData.visits.length - 1].visits;
  }, [selectedData]);

  // 最新月のバウンス率
  const latestBounceRate = useMemo(() => {
    if (!selectedData?.bounceRate?.length) return 0;
    return selectedData.bounceRate[selectedData.bounceRate.length - 1]
      .bounceRate;
  }, [selectedData]);

  // 前月比
  const visitsTrend = useMemo(() => {
    if (!selectedData?.visits || selectedData.visits.length < 2) return null;
    const arr = selectedData.visits;
    const prev = arr[arr.length - 2].visits;
    const curr = arr[arr.length - 1].visits;
    return ((curr - prev) / prev) * 100;
  }, [selectedData]);

  // 全サイト比較データ（最新月）
  const comparisonData = useMemo(() => {
    return domains.map((d) => {
      const site = rawData[d];
      const latestV =
        site.visits.length > 0
          ? site.visits[site.visits.length - 1].visits
          : 0;
      const latestB =
        site.bounceRate.length > 0
          ? site.bounceRate[site.bounceRate.length - 1].bounceRate
          : 0;
      return {
        name: DOMAIN_LABELS[d] || d,
        domain: d,
        visits: latestV,
        bounceRate: latestB,
        globalRank: site.globalRank,
      };
    });
  }, [domains]);

  // トラフィックソース円グラフ用
  const sourcePieData = useMemo(() => {
    if (!selectedData?.trafficSources) return [];
    return Object.entries(selectedData.trafficSources).map(([key, val]) => ({
      name: SOURCE_LABELS[key] || key,
      value: val,
      color: SOURCE_COLORS[key] || "#999",
    }));
  }, [selectedData]);

  // 訪問数推移（複数サイト比較）
  const multiVisitsData = useMemo(() => {
    const allDates = new Set<string>();
    domains.forEach((d) => rawData[d].visits.forEach((v) => allDates.add(v.date)));
    const sorted = Array.from(allDates).sort();
    return sorted.map((date) => {
      const row: Record<string, string | number> = { date };
      domains.forEach((d) => {
        const v = rawData[d].visits.find((x) => x.date === date);
        if (v) row[DOMAIN_LABELS[d] || d] = Math.round(v.visits / 1_000_000 * 10) / 10;
      });
      return row;
    });
  }, [domains]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* ヘッダー */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              SimilarWeb 競合分析
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              日本の住宅・不動産ポータルサイト比較分析（2025年3月〜2026年2月）
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              データ提供: SimilarWeb
            </Badge>
            <Badge variant="secondary" className="text-xs">
              最終更新: 2026年2月
            </Badge>
          </div>
        </div>

        {/* サイト選択 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">分析対象サイト:</span>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>
                  {DOMAIN_LABELS[d] || d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href={`https://${selectedDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            {selectedDomain} <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> グローバルランク
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedData?.globalRank
                  ? `#${selectedData.globalRank.toLocaleString()}`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">世界順位</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> 月間訪問数
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatVisits(latestVisits)}
              </div>
              {visitsTrend !== null && (
                <p
                  className={`text-xs flex items-center gap-1 ${visitsTrend >= 0 ? "text-green-600" : "text-red-500"}`}
                >
                  {visitsTrend >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  前月比 {visitsTrend >= 0 ? "+" : ""}
                  {visitsTrend.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MousePointerClick className="h-3.5 w-3.5" /> 直帰率
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestBounceRate}%</div>
              <p className="text-xs text-muted-foreground">最新月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> 主要流入元
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sourcePieData.length > 0
                  ? SOURCE_LABELS[
                      Object.entries(selectedData?.trafficSources || {}).sort(
                        (a, b) => b[1] - a[1]
                      )[0]?.[0]
                    ] || "—"
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">最大トラフィック源</p>
            </CardContent>
          </Card>
        </div>

        {/* タブコンテンツ */}
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="visits">訪問数推移</TabsTrigger>
            <TabsTrigger value="sources">流入元分析</TabsTrigger>
            <TabsTrigger value="countries">地域分布</TabsTrigger>
            <TabsTrigger value="comparison">サイト比較</TabsTrigger>
          </TabsList>

          {/* 概要タブ */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 訪問数推移 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">月間訪問数推移</CardTitle>
                  <CardDescription>過去12ヶ月</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={selectedData?.visits || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => v.slice(5)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={(v) => formatVisits(v)}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          formatVisits(v),
                          "訪問数",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="#e91e8c"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 直帰率推移 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">直帰率推移</CardTitle>
                  <CardDescription>過去12ヶ月（%）</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={selectedData?.bounceRate || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => v.slice(5)}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "直帰率"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="bounceRate"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* 国別トラフィック */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">国別トラフィック（上位5カ国）</CardTitle>
                <CardDescription>2025年12月〜2026年2月</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>国</TableHead>
                      <TableHead className="text-right">シェア</TableHead>
                      <TableHead className="text-right">訪問数</TableHead>
                      <TableHead className="text-right">直帰率</TableHead>
                      <TableHead className="text-right">PV/訪問</TableHead>
                      <TableHead className="text-right">平均滞在時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedData?.trafficByCountry || []).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.country}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${Math.min(c.share, 100)}%` }}
                              />
                            </div>
                            {c.share}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVisits(c.visits)}
                        </TableCell>
                        <TableCell className="text-right">{c.bounceRate}%</TableCell>
                        <TableCell className="text-right">{c.pagesPerVisit}</TableCell>
                        <TableCell className="text-right">
                          {formatTime(c.avgTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 訪問数推移タブ */}
          <TabsContent value="visits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>月間訪問数推移（全サイト比較）</CardTitle>
                <CardDescription>単位: 百万訪問（M）</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={multiVisitsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}M`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => [`${v}M`, ""]} />
                    <Legend />
                    {domains.map((d, i) => (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={DOMAIN_LABELS[d] || d}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>月間訪問数 棒グラフ比較（最新月）</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => formatVisits(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => [formatVisits(v), "訪問数"]} />
                    <Bar dataKey="visits" name="訪問数">
                      {comparisonData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 流入元分析タブ */}
          <TabsContent value="sources" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {DOMAIN_LABELS[selectedDomain] || selectedDomain} 流入元内訳
                  </CardTitle>
                  <CardDescription>デスクトップ（2025年12月〜2026年2月）</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={sourcePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sourcePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [formatVisits(v), "訪問数"]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">流入元詳細</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sourcePieData
                      .sort((a, b) => b.value - a.value)
                      .map((s, i) => {
                        const total = sourcePieData.reduce(
                          (sum, x) => sum + x.value,
                          0
                        );
                        const pct = total > 0 ? (s.value / total) * 100 : 0;
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block w-3 h-3 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </span>
                              <span className="font-medium">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: s.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 全サイト流入元比較 */}
            <Card>
              <CardHeader>
                <CardTitle>全サイト 流入元比較（検索 vs ダイレクト）</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={domains.map((d) => ({
                      name: DOMAIN_LABELS[d] || d,
                      検索: rawData[d].trafficSources?.Search || 0,
                      ダイレクト: rawData[d].trafficSources?.Direct || 0,
                      SNS: rawData[d].trafficSources?.Social || 0,
                      参照元: rawData[d].trafficSources?.Referrals || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => formatVisits(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => [formatVisits(v), ""]} />
                    <Legend />
                    <Bar dataKey="検索" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="ダイレクト" fill="#10b981" stackId="a" />
                    <Bar dataKey="SNS" fill="#e91e8c" stackId="a" />
                    <Bar dataKey="参照元" fill="#f59e0b" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 地域分布タブ */}
          <TabsContent value="countries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>国別トラフィック詳細</CardTitle>
                <CardDescription>
                  {DOMAIN_LABELS[selectedDomain] || selectedDomain} — 2025年12月〜2026年2月
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={selectedData?.trafficByCountry || []}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="country" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "シェア"]} />
                    <Bar dataKey="share" name="トラフィックシェア" fill="#e91e8c">
                      {(selectedData?.trafficByCountry || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>国別エンゲージメント比較</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>国</TableHead>
                      <TableHead className="text-right">シェア</TableHead>
                      <TableHead className="text-right">直帰率</TableHead>
                      <TableHead className="text-right">PV/訪問</TableHead>
                      <TableHead className="text-right">平均滞在</TableHead>
                      <TableHead className="text-right">国内ランク</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedData?.trafficByCountry || []).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.country}</TableCell>
                        <TableCell className="text-right">{c.share}%</TableCell>
                        <TableCell className="text-right">{c.bounceRate}%</TableCell>
                        <TableCell className="text-right">{c.pagesPerVisit}</TableCell>
                        <TableCell className="text-right">{formatTime(c.avgTime)}</TableCell>
                        <TableCell className="text-right">
                          {c.rank ? `#${c.rank.toLocaleString()}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* サイト比較タブ */}
          <TabsContent value="comparison" className="space-y-4">
            {/* ランキング一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>サイト総合比較</CardTitle>
                <CardDescription>
                  日本の住宅・不動産ポータルサイト比較（最新データ）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>サイト</TableHead>
                      <TableHead>ドメイン</TableHead>
                      <TableHead className="text-right">グローバルランク</TableHead>
                      <TableHead className="text-right">月間訪問数</TableHead>
                      <TableHead className="text-right">直帰率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData
                      .sort((a, b) => (a.globalRank || 999999) - (b.globalRank || 999999))
                      .map((site, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {site.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {site.domain}
                          </TableCell>
                          <TableCell className="text-right">
                            {site.globalRank ? (
                              <Badge variant="outline">
                                #{site.globalRank.toLocaleString()}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatVisits(site.visits)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                site.bounceRate < 40
                                  ? "text-green-600"
                                  : site.bounceRate < 55
                                    ? "text-yellow-600"
                                    : "text-red-500"
                              }
                            >
                              {site.bounceRate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 直帰率比較 */}
            <Card>
              <CardHeader>
                <CardTitle>直帰率比較（最新月）</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 80]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => [`${v}%`, "直帰率"]} />
                    <Bar dataKey="bounceRate" name="直帰率">
                      {comparisonData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* インサイトカード */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  SimilarWebスキル デモ — インサイト
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="font-semibold text-primary mb-1">🏆 トラフィック1位</div>
                    <div>SUUMO（suumo.jp）が月間約5,700万訪問でトップ。グローバルランク#545は日本の不動産サイトとして圧倒的な存在感。</div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="font-semibold text-primary mb-1">🔍 流入元の傾向</div>
                    <div>ポータルサイトは検索流入が最大。一方、ダイレクト流入が多いサイトはブランド認知度が高い証拠。</div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="font-semibold text-primary mb-1">🌏 地域集中度</div>
                    <div>全サイトとも日本からのトラフィックが99%以上。国内特化型サービスの典型的なパターン。</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
