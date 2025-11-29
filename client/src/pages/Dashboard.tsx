import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, Image, BarChart3, MessageSquare, Instagram, Twitter, Loader2 } from "lucide-react";
import { TaskChecklist } from "@/components/TaskChecklist";
import { HelpButton } from "@/components/HelpButton";
import { useState } from "react";

export default function Dashboard() {
  const { data: snsAccounts, isLoading: loadingSns } = trpc.snsAccounts.list.useQuery();
  const { data: images, isLoading: loadingImages } = trpc.images.list.useQuery({ limit: 10 });
  const { data: schedules, isLoading: loadingSchedules } = trpc.posts.schedules.useQuery();
  const { data: history, isLoading: loadingHistory } = trpc.posts.history.useQuery({ limit: 10 });

  const isLoading = loadingSns || loadingImages || loadingSchedules || loadingHistory;

  const stats = {
    connectedAccounts: snsAccounts?.length || 0,
    totalImages: images?.length || 0,
    scheduledPosts: schedules?.filter(s => s.status === "pending").length || 0,
    publishedPosts: history?.length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">ダッシュボード</h1>
            <p className="text-muted-foreground mt-2">SNS投稿の自動化状況を一目で確認できます</p>
          </div>
          <HelpButton
            title="ダッシュボードの使い方"
            content={
              <div className="space-y-2">
                <p>このページでは、SNS投稿の状況を確認できます。</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>今日のタスク：やるべきことを確認</li>
                  <li>統計情報：投稿数や予約状況</li>
                  <li>最近の投稿：公開済みの投稿一覧</li>
                  <li>次の予約：スケジュールされている投稿</li>
                </ul>
              </div>
            }
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">連携アカウント</CardTitle>
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.connectedAccounts}</div>
                  <p className="text-xs text-muted-foreground">Instagram, X, Threads</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">保存済み画像</CardTitle>
                  <Image className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalImages}</div>
                  <p className="text-xs text-muted-foreground">クラウドストレージから取得</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">予約投稿</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.scheduledPosts}</div>
                  <p className="text-xs text-muted-foreground">スケジュール待機中</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">公開済み投稿</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.publishedPosts}</div>
                  <p className="text-xs text-muted-foreground">累計投稿数</p>
                </CardContent>
              </Card>
            </div>

            {/* タスクチェックリスト */}
            <TaskChecklist
              tasks={[
                {
                  id: "select-photos",
                  title: "写真を選ぶ",
                  description: "リフォーム事例の写真を5枚選びましょう",
                  completed: (images?.length || 0) > 0,
                },
                {
                  id: "generate-post",
                  title: "投稿文を生成する",
                  description: "AIが写真から投稿文を作成します",
                  completed: false,
                },
                {
                  id: "review-post",
                  title: "投稿文を確認する",
                  description: "生成された投稿文を読んで確認しましょう",
                  completed: false,
                },
                {
                  id: "schedule-post",
                  title: "予約投稿を設定する",
                  description: "投稿する日時を選んで予約しましょう",
                  completed: (schedules?.filter(s => s.status === "pending").length || 0) > 0,
                },
              ]}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>最近の投稿</CardTitle>
                  <CardDescription>直近で公開された投稿の一覧</CardDescription>
                </CardHeader>
                <CardContent>
                  {history && history.length > 0 ? (
                    <div className="space-y-4">
                      {history.slice(0, 5).map((post) => (
                        <div key={post.id} className="flex items-center gap-3 border-b pb-3 last:border-0">
                          <div className="flex-shrink-0">
                            {post.platform === "instagram" && <Instagram className="h-5 w-5 text-pink-500" />}
                            {post.platform === "x" && <Twitter className="h-5 w-5 text-blue-500" />}
                            {post.platform === "threads" && <MessageSquare className="h-5 w-5 text-purple-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{post.platform}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(post.publishedAt).toLocaleDateString("ja-JP")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">まだ投稿がありません</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>次の予約投稿</CardTitle>
                  <CardDescription>スケジュールされている投稿</CardDescription>
                </CardHeader>
                <CardContent>
                  {schedules && schedules.filter(s => s.status === "pending").length > 0 ? (
                    <div className="space-y-4">
                      {schedules.filter(s => s.status === "pending").slice(0, 5).map((schedule) => (
                        <div key={schedule.id} className="flex items-center gap-3 border-b pb-3 last:border-0">
                          <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {new Date(schedule.scheduledAt).toLocaleString("ja-JP")}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{schedule.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">予約投稿がありません</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
