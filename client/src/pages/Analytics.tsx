import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, CheckCircle2, XCircle, Instagram, Twitter, MessageSquare, Loader2, Heart, MessageCircle, Share2, Eye } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const PLATFORM_COLORS = {
  instagram: "#E4405F",
  x: "#1DA1F2",
  threads: "#000000",
};

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = trpc.posts.stats.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery();
  const { data: platformData, isLoading: platformLoading } = trpc.analytics.getByPlatform.useQuery();
  const { data: hourData, isLoading: hourLoading } = trpc.analytics.getByHourOfDay.useQuery();
  const { data: dayData, isLoading: dayLoading } = trpc.analytics.getByDayOfWeek.useQuery();

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "x":
        return <Twitter className="h-4 w-4" />;
      case "threads":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "Instagram";
      case "x":
        return "X";
      case "threads":
        return "Threads";
      default:
        return platform;
    }
  };

  const getDayName = (day: number) => {
    const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    return days[day] || "";
  };

  const formatEngagementRate = (rate: number) => {
    return (rate / 100).toFixed(2) + "%";
  };

  if (statsLoading || summaryLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const successRate = stats?.totalPosts 
    ? ((stats.successfulPosts / stats.totalPosts) * 100).toFixed(1)
    : "0.0";

  const platformChartData = stats?.postsByPlatform?.map((item: any) => ({
    name: getPlatformName(item.platform),
    投稿数: item.count,
  })) || [];

  const platformPieData = stats?.postsByPlatform?.map((item: any) => ({
    name: getPlatformName(item.platform),
    value: item.count,
  })) || [];

  // Prepare engagement data for charts
  const engagementByPlatform = platformData?.map((item) => ({
    name: getPlatformName(item.platform),
    いいね: item.totalLikes,
    コメント: item.totalComments,
    シェア: item.totalShares,
    閲覧数: item.totalViews,
    エンゲージメント率: item.avgEngagementRate / 100,
  })) || [];

  const engagementByHour = hourData?.map((item) => ({
    時間: `${item.hourOfDay}時`,
    投稿数: item.totalPosts,
    エンゲージメント率: item.avgEngagementRate / 100,
  })) || [];

  const engagementByDay = dayData?.map((item) => ({
    曜日: getDayName(item.dayOfWeek),
    投稿数: item.totalPosts,
    エンゲージメント率: item.avgEngagementRate / 100,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">投稿効果測定</h1>
          <p className="text-muted-foreground mt-2">
            投稿のパフォーマンスとエンゲージメントを分析します
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="engagement">エンゲージメント</TabsTrigger>
            <TabsTrigger value="timing">最適な投稿時間</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* 統計カード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    成功率: {successRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">成功</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.successfulPosts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    正常に投稿されました
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">失敗</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats?.failedPosts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    投稿に失敗しました
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平均エンゲージメント率</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary ? formatEngagementRate(summary.avgEngagementRate) : "0.00%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    全投稿の平均
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* プラットフォーム別グラフ */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>プラットフォーム別投稿数</CardTitle>
                  <CardDescription>各プラットフォームの投稿数を比較</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="投稿数" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>プラットフォーム別投稿割合</CardTitle>
                  <CardDescription>各プラットフォームの投稿割合</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={platformPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {platformPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            {/* エンゲージメント統計カード */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総いいね数</CardTitle>
                  <Heart className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalLikes || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総コメント数</CardTitle>
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalComments || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総シェア数</CardTitle>
                  <Share2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalShares || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総閲覧数</CardTitle>
                  <Eye className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalViews || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* プラットフォーム別エンゲージメント */}
            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム別エンゲージメント</CardTitle>
                <CardDescription>各プラットフォームのいいね、コメント、シェア、閲覧数</CardDescription>
              </CardHeader>
              <CardContent>
                {platformLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={engagementByPlatform}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="いいね" fill="#ef4444" />
                      <Bar dataKey="コメント" fill="#3b82f6" />
                      <Bar dataKey="シェア" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* エンゲージメント率比較 */}
            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム別エンゲージメント率</CardTitle>
                <CardDescription>各プラットフォームの平均エンゲージメント率を比較</CardDescription>
              </CardHeader>
              <CardContent>
                {platformLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementByPlatform}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Legend />
                      <Bar dataKey="エンゲージメント率" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4">
            {/* 時間帯別エンゲージメント */}
            <Card>
              <CardHeader>
                <CardTitle>時間帯別エンゲージメント率</CardTitle>
                <CardDescription>投稿時間帯ごとの平均エンゲージメント率</CardDescription>
              </CardHeader>
              <CardContent>
                {hourLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={engagementByHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="時間" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="エンゲージメント率" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="投稿数" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 曜日別エンゲージメント */}
            <Card>
              <CardHeader>
                <CardTitle>曜日別エンゲージメント率</CardTitle>
                <CardDescription>曜日ごとの平均エンゲージメント率</CardDescription>
              </CardHeader>
              <CardContent>
                {dayLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={engagementByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="曜日" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Legend />
                      <Bar dataKey="エンゲージメント率" fill="#f59e0b" />
                      <Bar dataKey="投稿数" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 最適な投稿時間の提案 */}
            <Card>
              <CardHeader>
                <CardTitle>最適な投稿時間の提案</CardTitle>
                <CardDescription>過去のデータから最もエンゲージメント率が高い時間帯を表示</CardDescription>
              </CardHeader>
              <CardContent>
                {hourLoading || dayLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">推奨時間帯（上位3つ）</h3>
                      <div className="space-y-2">
                        {engagementByHour
                          .sort((a, b) => b.エンゲージメント率 - a.エンゲージメント率)
                          .slice(0, 3)
                          .map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <span className="font-medium">{item.時間}</span>
                              <span className="text-sm text-muted-foreground">
                                エンゲージメント率: {item.エンゲージメント率.toFixed(2)}% (投稿数: {item.投稿数})
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">推奨曜日（上位3つ）</h3>
                      <div className="space-y-2">
                        {engagementByDay
                          .sort((a, b) => b.エンゲージメント率 - a.エンゲージメント率)
                          .slice(0, 3)
                          .map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <span className="font-medium">{item.曜日}</span>
                              <span className="text-sm text-muted-foreground">
                                エンゲージメント率: {item.エンゲージメント率.toFixed(2)}% (投稿数: {item.投稿数})
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
