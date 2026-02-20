import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Performance() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [platform, setPlatform] = useState<"all" | "instagram" | "x" | "threads">("all");
  const [companyName, setCompanyName] = useState<"all" | "ハゼモト建設" | "クリニックアーキプロ">("all");

  // 日付範囲を計算
  const dateFilter = useMemo(() => {
    if (dateRange === "all") return {};
    
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [dateRange]);

  // 統計サマリーを取得
  const { data: summary, isLoading } = trpc.templatePerformance.getSummary.useQuery(dateFilter);

  // テンプレート一覧を取得
  const { data: templates } = trpc.postTemplates.list.useQuery();
  
  // データソース一覧を取得
  const { data: dataSources } = trpc.dataSources.list.useQuery();

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    if (!summary) return [];
    
    return summary.filter((item) => {
      if (platform !== "all" && item.platform !== platform) return false;
      if (companyName !== "all" && item.companyName !== companyName) return false;
      return true;
    });
  }, [summary, platform, companyName]);

  // グラフ用データの準備
  const chartData = useMemo(() => {
    if (!filteredData || !templates || !dataSources) return [];
    
    return filteredData.map((item) => {
      const template = templates.find((t) => t.id === item.templateId);
      const dataSource = item.dataSourceId 
        ? dataSources.find((ds) => ds.id === item.dataSourceId)
        : null;
      
      const successRate = item.totalAttempts > 0 
        ? (item.successCount / item.totalAttempts) * 100 
        : 0;
      
      return {
        name: `${template?.name || "不明"} - ${dataSource?.name || "接続先なし"}`,
        successRate: Number(successRate.toFixed(1)),
        totalAttempts: item.totalAttempts,
        successCount: item.successCount,
        failureCount: item.failureCount,
      };
    }).sort((a, b) => b.totalAttempts - a.totalAttempts);
  }, [filteredData, templates, dataSources]);

  // 全体統計を計算
  const overallStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { totalAttempts: 0, successCount: 0, failureCount: 0, successRate: 0 };
    }
    
    const totalAttempts = filteredData.reduce((sum, item) => sum + item.totalAttempts, 0);
    const successCount = filteredData.reduce((sum, item) => sum + item.successCount, 0);
    const failureCount = filteredData.reduce((sum, item) => sum + item.failureCount, 0);
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;
    
    return { totalAttempts, successCount, failureCount, successRate };
  }, [filteredData]);

  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-500">優秀</Badge>;
    if (rate >= 60) return <Badge className="bg-blue-500">良好</Badge>;
    if (rate >= 40) return <Badge className="bg-yellow-500">改善の余地</Badge>;
    return <Badge variant="destructive">要改善</Badge>;
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= 70) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (rate >= 40) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">投稿パフォーマンスダッシュボード</h1>
        <p className="text-muted-foreground">
          テンプレートと接続先の組み合わせごとの投稿生成成功率を可視化します
        </p>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">期間</label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">過去7日間</SelectItem>
                  <SelectItem value="30d">過去30日間</SelectItem>
                  <SelectItem value="90d">過去90日間</SelectItem>
                  <SelectItem value="all">全期間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">プラットフォーム</label>
              <Select value={platform} onValueChange={(value: any) => setPlatform(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">会社名</label>
              <Select value={companyName} onValueChange={(value: any) => setCompanyName(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="ハゼモト建設">ハゼモト建設</SelectItem>
                  <SelectItem value="クリニックアーキプロ">クリニックアーキプロ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総試行回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成功回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.successCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失敗回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.failureCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">全体成功率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{overallStats.successRate.toFixed(1)}%</div>
              {getTrendIcon(overallStats.successRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* グラフ */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>成功率グラフ</CardTitle>
          <CardDescription>テンプレートと接続先の組み合わせごとの成功率</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={150}
                  interval={0}
                  style={{ fontSize: "12px" }}
                />
                <YAxis 
                  label={{ value: "成功率 (%)", angle: -90, position: "insideLeft" }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border rounded shadow-lg">
                          <p className="font-semibold mb-2">{data.name}</p>
                          <p className="text-sm">成功率: {data.successRate}%</p>
                          <p className="text-sm">総試行: {data.totalAttempts}回</p>
                          <p className="text-sm text-green-600">成功: {data.successCount}回</p>
                          <p className="text-sm text-red-600">失敗: {data.failureCount}回</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="successRate" fill="#3b82f6" name="成功率 (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細統計</CardTitle>
          <CardDescription>テンプレートと接続先の組み合わせごとの詳細データ</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テンプレート</TableHead>
                  <TableHead>接続先</TableHead>
                  <TableHead>プラットフォーム</TableHead>
                  <TableHead>会社名</TableHead>
                  <TableHead className="text-right">総試行</TableHead>
                  <TableHead className="text-right">成功</TableHead>
                  <TableHead className="text-right">失敗</TableHead>
                  <TableHead className="text-right">成功率</TableHead>
                  <TableHead>評価</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => {
                  const template = templates?.find((t) => t.id === item.templateId);
                  const dataSource = item.dataSourceId 
                    ? dataSources?.find((ds) => ds.id === item.dataSourceId)
                    : null;
                  const successRate = item.totalAttempts > 0 
                    ? (item.successCount / item.totalAttempts) * 100 
                    : 0;

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{template?.name || "不明"}</TableCell>
                      <TableCell>{dataSource?.name || "接続先なし"}</TableCell>
                      <TableCell>{item.platform || "-"}</TableCell>
                      <TableCell>{item.companyName || "-"}</TableCell>
                      <TableCell className="text-right">{item.totalAttempts}</TableCell>
                      <TableCell className="text-right text-green-600">{item.successCount}</TableCell>
                      <TableCell className="text-right text-red-600">{item.failureCount}</TableCell>
                      <TableCell className="text-right font-semibold">{successRate.toFixed(1)}%</TableCell>
                      <TableCell>{getSuccessRateBadge(successRate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              データがありません
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
