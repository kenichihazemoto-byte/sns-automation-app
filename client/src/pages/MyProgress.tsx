import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, TrendingUp, Activity, MessageSquare, Award } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { LineChart as RechartsLine, Line, BarChart as RechartsBar, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/**
 * 利用者さん向けダッシュボードページ
 * 自分の作業履歴、統計情報、フィードバックを確認できる
 */
export default function MyProgress() {
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days">("30days");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: userStats } = trpc.activityLog.getStats.useQuery(
    {},
    { enabled: !!currentUser }
  );
  const { data: recentLogs } = trpc.activityLog.getUserLogs.useQuery(
    { limit: 10 },
    { enabled: !!currentUser }
  );
  const { data: feedbacks } = trpc.feedback.getUserFeedback.useQuery(
    { limit: 5 },
    { enabled: !!currentUser }
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
      userId: null,
      ...getDateRange(),
      groupBy,
    },
    { enabled: !!currentUser }
  );

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

  // フィードバックタイプの日本語表示
  const getFeedbackTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      praise: "称賛",
      suggestion: "提案",
      correction: "修正",
      reminder: "リマインダー",
    };
    return labels[type] || type;
  };

  // フィードバックタイプのバッジ色
  const getFeedbackBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      praise: "default",
      suggestion: "secondary",
      correction: "destructive",
      reminder: "outline",
    };
    return variants[type] || "outline";
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold mb-2">マイページ</h1>
        <p className="text-muted-foreground">
          あなたの作業履歴と成長を確認できます
        </p>
      </div>

      {/* 統計情報 */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総作業数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.totalActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">これまでの作業</p>
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
              <p className="text-xs text-muted-foreground mt-1">成功した作業</p>
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
              <p className="text-xs text-muted-foreground mt-1">失敗した作業</p>
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
              <p className="text-xs text-muted-foreground mt-1">
                {userStats.totalActivities > 0 && userStats.successCount / userStats.totalActivities >= 0.8
                  ? "素晴らしい！"
                  : "頑張りましょう"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 作業推移グラフ */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                作業の推移
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
            <CardDescription>
              あなたの作業量と成功率の変化を確認できます
            </CardDescription>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近のフィードバック */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              最近のフィードバック
            </CardTitle>
            <CardDescription>
              支援員からのメッセージ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!feedbacks || feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                まだフィードバックがありません
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getFeedbackBadgeVariant(feedback.feedbackType)}>
                        {getFeedbackTypeLabel(feedback.feedbackType)}
                      </Badge>
                      {!feedback.isRead && (
                        <Badge variant="outline" className="text-xs">未読</Badge>
                      )}
                    </div>
                    <p className="text-sm mb-2">{feedback.message}</p>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(feedback.createdAt), "yyyy年MM月dd日 HH:mm", {
                        locale: ja,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近の作業履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              最近の作業
            </CardTitle>
            <CardDescription>
              直近10件の作業履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recentLogs || recentLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                まだ作業履歴がありません
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-1">
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getActivityTypeLabel(log.activityType)}
                        </span>
                        <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                          {log.status === "success" ? "成功" : "失敗"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), "MM月dd日 HH:mm", {
                          locale: ja,
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 作業種別の内訳 */}
      {userStats && Object.keys(userStats.activityBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              作業種別の内訳
            </CardTitle>
            <CardDescription>
              どの作業をどれくらい行ったか確認できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(userStats.activityBreakdown).map(([type, count]) => (
                <div key={type} className="flex flex-col p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground mb-1">
                    {getActivityTypeLabel(type)}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
