import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export default function ErrorStats() {
  const { data: stats, isLoading: statsLoading } = trpc.errorStats.getStats.useQuery({ days: 30 });
  const { data: errorLogs, isLoading: logsLoading } = trpc.errorStats.getErrorLogs.useQuery({ limit: 100 });

  const errorTypeLabels: Record<string, string> = {
    network: "ネットワークエラー",
    album_access: "アルバムアクセスエラー",
    no_photos: "写真が見つからない",
    ai_analysis: "AI分析エラー",
    unknown: "不明なエラー",
  };

  const errorTypeColors: Record<string, string> = {
    network: "bg-red-500",
    album_access: "bg-orange-500",
    no_photos: "bg-yellow-500",
    ai_analysis: "bg-blue-500",
    unknown: "bg-gray-500",
  };

  // エラー統計の計算
  const errorStats = useMemo(() => {
    if (!stats) return null;

    const total = stats.totalErrors;
    const byType = Object.entries(stats.errorsByType).map(([type, count]) => ({
      type,
      label: errorTypeLabels[type] || type,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
      color: errorTypeColors[type] || "bg-gray-500",
    }));

    return { total, byType };
  }, [stats]);

  // 最近のエラーログ
  const recentErrors = useMemo(() => {
    if (!errorLogs) return [];
    return errorLogs.slice(0, 10).map((log) => ({
      ...log,
      typeLabel: errorTypeLabels[log.errorType] || log.errorType,
      color: errorTypeColors[log.errorType] || "bg-gray-500",
    }));
  }, [errorLogs]);

  if (statsLoading || logsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">エラー統計</h1>
          <p className="text-muted-foreground mt-2">
            写真取得とAI分析のエラー統計を確認できます（過去30日間）
          </p>
        </div>

        {/* サマリーカード */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総エラー数</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errorStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">過去30日間</p>
            </CardContent>
          </Card>

          {errorStats?.byType.slice(0, 3).map((stat) => (
            <Card key={stat.type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <div className={`h-3 w-3 rounded-full ${stat.color}`}></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.count}</div>
                <p className="text-xs text-muted-foreground">{stat.percentage}%</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* エラー種類別の詳細 */}
        <Card>
          <CardHeader>
            <CardTitle>エラー種類別統計</CardTitle>
            <CardDescription>各エラーの発生回数と割合</CardDescription>
          </CardHeader>
          <CardContent>
            {errorStats && errorStats.byType.length > 0 ? (
              <div className="space-y-4">
                {errorStats.byType.map((stat) => (
                  <div key={stat.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${stat.color}`}></div>
                        <span className="font-medium">{stat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{stat.count}回</span>
                        <span className="text-sm font-medium">{stat.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`${stat.color} h-2 rounded-full`}
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4" />
                <p>エラーは発生していません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近のエラーログ */}
        <Card>
          <CardHeader>
            <CardTitle>最近のエラーログ</CardTitle>
            <CardDescription>直近10件のエラー詳細</CardDescription>
          </CardHeader>
          <CardContent>
            {recentErrors.length > 0 ? (
              <div className="space-y-4">
                {recentErrors.map((error) => (
                  <div
                    key={error.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className={`h-3 w-3 rounded-full ${error.color} mt-1`}></div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{error.typeLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.createdAt).toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{error.errorReason}</p>
                      {error.errorDetails && (
                        <p className="text-xs text-muted-foreground">{error.errorDetails}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4" />
                <p>エラーログはありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
