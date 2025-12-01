import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, User, Activity, TrendingUp, BarChart3, LineChart } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { LineChart as RechartsLine, Line, BarChart as RechartsBar, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/**
 * 作業履歴一覧ページ（支援員向け）
 * 利用者さんの作業履歴を確認し、フィードバックを送信できる
 */
export default function ActivityLog() {
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days">("30days");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: allLogs, isLoading: logsLoading } = trpc.activityLog.getAllLogs.useQuery(
    { limit: 100 },
    { enabled: currentUser?.role === "admin" }
  );
  const { data: userLogs } = trpc.activityLog.getUserLogs.useQuery(
    { userId: selectedUserId, limit: 50 },
    { enabled: !!selectedUserId }
  );
  const { data: userStats } = trpc.activityLog.getStats.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId }
  );

  // 期間計算
  const getDateRange = () => {
    const days = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
    return {
      startDate: startOfDay(subDays(new Date(), days)),
      endDate: endOfDay(new Date()),
    };
  };

  // 作業推移データ取得
  const { data: trends } = trpc.activityLog.getTrends.useQuery(
    {
      userId: selectedUserId || null,
      ...getDateRange(),
      groupBy,
    },
    { enabled: !!selectedUserId }
  );

  // ユーザー一覧を取得（作業履歴から抽出）
  const users = allLogs
    ? Array.from(new Set(allLogs.map(log => log.userId))).map(userId => {
        const log = allLogs.find(l => l.userId === userId);
        return { id: userId, name: `利用者 ${userId}` };
      })
    : [];

  const displayLogs = selectedUserId ? userLogs : allLogs;

  // アクティビティタイプの日本語表示
  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      photo_upload: "写真アップロード",
      post_generation: "投稿文生成",
      post_schedule: "投稿予約",
      post_approval: "投稿承認",
      post_publish: "投稿公開",
      template_create: "テンプレート作成",
      template_edit: "テンプレート編集",
    };
    return labels[type] || type;
  };

  // ステータスアイコン
  const getStatusIcon = (status: string) => {
    if (status === "success") {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  // ステータスバッジ
  const getStatusBadge = (status: string) => {
    if (status === "success") {
      return <Badge variant="default" className="bg-green-600">成功</Badge>;
    }
    return <Badge variant="destructive">失敗</Badge>;
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>アクセス権限がありません</CardTitle>
            <CardDescription>
              この機能は支援員（管理者）のみが利用できます。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold mb-2">作業履歴</h1>
        <p className="text-muted-foreground">
          利用者さんの作業履歴を確認し、進捗状況を把握できます
        </p>
      </div>

      {/* ユーザー選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            利用者選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedUserId?.toString()}
            onValueChange={(value) => setSelectedUserId(value === "all" ? undefined : Number(value))}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="利用者を選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全員の履歴</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 統計情報（ユーザー選択時のみ） */}
      {selectedUserId && userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総作業数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.totalActivities}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                成功
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{userStats.successCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                失敗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{userStats.failedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                成功率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {userStats.totalActivities > 0
                  ? Math.round((userStats.successCount / userStats.totalActivities) * 100)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 作業推移グラフ（ユーザー選択時のみ） */}
      {selectedUserId && trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                作業推移グラフ
              </CardTitle>
              <div className="flex gap-2">
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">過去7日間</SelectItem>
                    <SelectItem value="30days">過去30日間</SelectItem>
                    <SelectItem value="90days">過去90日間</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">日別</SelectItem>
                    <SelectItem value="week">週別</SelectItem>
                    <SelectItem value="month">月別</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="line" className="w-full">
              <TabsList className="grid w-full max-w-[600px] grid-cols-3">
                <TabsTrigger value="line">折れ線グラフ</TabsTrigger>
                <TabsTrigger value="bar">棒グラフ</TabsTrigger>
                <TabsTrigger value="area">作業種別</TabsTrigger>
              </TabsList>
              <TabsContent value="line" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLine data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalActivities" 
                      stroke="#3b82f6" 
                      name="総作業数"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="successCount" 
                      stroke="#10b981" 
                      name="成功"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="failedCount" 
                      stroke="#ef4444" 
                      name="失敗"
                      strokeWidth={2}
                    />
                  </RechartsLine>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="bar" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBar data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="successCount" fill="#10b981" name="成功" />
                    <Bar dataKey="failedCount" fill="#ef4444" name="失敗" />
                  </RechartsBar>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="area" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {trends && trends.length > 0 && Object.keys(trends[0].activityBreakdown || {}).map((type, index) => {
                      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
                      return (
                        <Area
                          key={type}
                          type="monotone"
                          dataKey={`activityBreakdown.${type}`}
                          stackId="1"
                          stroke={colors[index % colors.length]}
                          fill={colors[index % colors.length]}
                          name={getActivityTypeLabel(type)}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 作業種別の内訳（ユーザー選択時のみ） */}
      {selectedUserId && userStats && Object.keys(userStats.activityBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              作業種別の内訳
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(userStats.activityBreakdown).map(([type, count]) => (
                <div key={type} className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {getActivityTypeLabel(type)}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 作業履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            作業履歴
          </CardTitle>
          <CardDescription>
            {selectedUserId
              ? "選択した利用者さんの作業履歴"
              : "全利用者さんの作業履歴"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              読み込み中...
            </div>
          ) : !displayLogs || displayLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              作業履歴がありません
            </div>
          ) : (
            <div className="space-y-4">
              {displayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {getActivityTypeLabel(log.activityType)}
                      </span>
                      {getStatusBadge(log.status)}
                      {!selectedUserId && (
                        <Badge variant="outline">利用者 {log.userId}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(log.createdAt), "yyyy年MM月dd日 HH:mm", {
                          locale: ja,
                        })}
                      </span>
                    </div>
                    {log.details && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          詳細を表示
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {log.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
