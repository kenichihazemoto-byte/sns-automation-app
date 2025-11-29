import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, CheckCircle2, XCircle, Instagram, Twitter, MessageSquare, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics() {
  const { data: stats, isLoading } = trpc.posts.stats.useQuery();

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

  if (isLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">投稿効果測定</h1>
          <p className="text-muted-foreground mt-2">
            投稿の統計情報とパフォーマンスを確認できます
          </p>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                全プラットフォーム合計
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成功投稿</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.successfulPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                正常に投稿完了
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">失敗投稿</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.failedPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                投稿に失敗
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                投稿成功率
              </p>
            </CardContent>
          </Card>
        </div>

        {/* プラットフォーム別投稿数 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>プラットフォーム別投稿数</CardTitle>
              <CardDescription>
                各プラットフォームの投稿数を比較
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.postsByPlatform && stats.postsByPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.postsByPlatform}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="platform" 
                      tickFormatter={(value) => getPlatformName(value)}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => getPlatformName(value as string)}
                      formatter={(value) => [`${value}件`, "投稿数"]}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  データがありません
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>プラットフォーム別投稿割合</CardTitle>
              <CardDescription>
                各プラットフォームの投稿比率
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.postsByPlatform && stats.postsByPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.postsByPlatform}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ platform, percent }) => 
                        `${getPlatformName(platform)} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.postsByPlatform.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}件`, "投稿数"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  データがありません
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* プラットフォーム別詳細 */}
        <Card>
          <CardHeader>
            <CardTitle>プラットフォーム別詳細</CardTitle>
            <CardDescription>
              各プラットフォームの投稿数と割合
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.postsByPlatform && stats.postsByPlatform.length > 0 ? (
              <div className="space-y-4">
                {stats.postsByPlatform.map((item: any) => {
                  const percentage = stats.totalPosts 
                    ? ((item.count / stats.totalPosts) * 100).toFixed(1)
                    : "0.0";

                  return (
                    <div key={item.platform} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(item.platform)}
                        <div>
                          <p className="font-medium">{getPlatformName(item.platform)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.count}件の投稿
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{percentage}%</p>
                        <p className="text-sm text-muted-foreground">全体の割合</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
