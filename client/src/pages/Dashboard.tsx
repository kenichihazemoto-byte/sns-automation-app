import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, Image, BarChart3, MessageSquare, Instagram, Twitter, Loader2 } from "lucide-react";
import { TaskChecklist } from "@/components/TaskChecklist";
import { HelpButton } from "@/components/HelpButton";
import { PostBalanceCard } from "@/components/PostBalanceCard";
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

            {/* 投稿バランス分析カード */}
            <div className="grid gap-4 md:grid-cols-2">
              <PostBalanceCard companyName="ハゼモト建設" />
            </div>

            {/* 事業区分別投稿頻度グラフ */}
            {schedules && schedules.length > 0 && (() => {
              // 投稿本文から事業区分を判定する関数
              const getUnit = (caption: string | undefined) => {
                if (!caption) return 'その他';
                if (caption.includes('農作業') || caption.includes('清掃') || caption.includes('就労支援') || caption.includes('未来のとびら') || caption.includes('手工芸') || caption.includes('ビーズ') || caption.includes('布小物') || caption.includes('利用者')) return '🤝 就労支援B型';
                if (caption.includes('パン') || caption.includes('ラトリエ') || caption.includes('ルアッシュ') || caption.includes('焼きたて') || caption.includes('クロワッサン') || caption.includes('バゲット')) return '🍞 ラトリエルアッシュ';
                if (caption.includes('子ども食堂') || caption.includes('こども食堂') || caption.includes('子供食堂')) return '🍚 子ども食堂';
                if (caption.includes('施工') || caption.includes('新築') || caption.includes('リフォーム') || caption.includes('建設') || caption.includes('住宅')) return '🏗️ 建設本業';
                return 'その他';
              };
              // 月別・事業区分別に集計
              const now = new Date();
              const months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
                return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}月` };
              });
              const units = ['🏗️ 建設本業', '🍞 ラトリエルアッシュ', '🍚 子ども食堂', '🤝 就労支援B型', 'その他'];
              const unitColors: Record<string, string> = {
                '🏗️ 建設本業': 'bg-blue-500',
                '🍞 ラトリエルアッシュ': 'bg-amber-500',
                '🍚 子ども食堂': 'bg-green-500',
                '🤝 就労支援B型': 'bg-purple-500',
                'その他': 'bg-gray-400',
              };
              const data = months.map(({ year, month, label }) => {
                const monthSchedules = schedules.filter((s: any) => {
                  const d = new Date(s.scheduledAt);
                  return d.getFullYear() === year && d.getMonth() === month;
                });
                const counts: Record<string, number> = {};
                units.forEach(u => counts[u] = 0);
                monthSchedules.forEach((s: any) => {
                  const caption = (s as any).contents?.[0]?.caption ?? (s as any).caption ?? '';
                  const u = getUnit(caption);
                  counts[u] = (counts[u] || 0) + 1;
                });
                return { label, counts, total: monthSchedules.length };
              });
              const maxTotal = Math.max(...data.map(d => d.total), 1);
              // 事業別合計件数を集計
              const unitTotals: Record<string, number> = {};
              units.forEach(u => unitTotals[u] = 0);
              schedules.forEach((s: any) => {
                const caption = (s as any).contents?.[0]?.caption ?? (s as any).caption ?? '';
                const u = getUnit(caption);
                unitTotals[u] = (unitTotals[u] || 0) + 1;
              });
              const grandTotal = schedules.length;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      事業区分別 投稿頻度
                    </CardTitle>
                    <CardDescription>月別の予約投稿数を事業区分ごとに表示</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 月別横棒グラフ */}
                    <div className="space-y-3">
                      {data.map(({ label, counts, total }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{total}件</span>
                          </div>
                          <div className="flex h-6 rounded-md overflow-hidden bg-muted">
                            {total === 0 ? (
                              <div className="w-full bg-muted" />
                            ) : (
                              units.filter(u => counts[u] > 0).map(u => (
                                <div
                                  key={u}
                                  className={`${unitColors[u]} transition-all`}
                                  style={{ width: `${(counts[u] / maxTotal) * 100}%` }}
                                  title={`${u}: ${counts[u]}件`}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 事業別合計件数表 */}
                    <div className="mt-5 border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">事業区分</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">合計件数</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">割合</th>
                          </tr>
                        </thead>
                        <tbody>
                          {units.filter(u => unitTotals[u] > 0).map((u, i, arr) => (
                            <tr key={u} className={i < arr.length - 1 ? 'border-b' : ''}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${unitColors[u]}`} />
                                  <span>{u}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">{unitTotals[u]}件</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {grandTotal > 0 ? Math.round((unitTotals[u] / grandTotal) * 100) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30 border-t">
                            <td className="px-3 py-2 font-medium">合計</td>
                            <td className="px-3 py-2 text-right font-bold">{grandTotal}件</td>
                            <td className="px-3 py-2 text-right font-medium">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* 例 */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      {units.filter(u => u !== 'その他' && unitTotals[u] > 0).map(u => (
                        <div key={u} className="flex items-center gap-1.5 text-xs">
                          <div className={`w-3 h-3 rounded-sm ${unitColors[u]}`} />
                          <span>{u}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

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
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ja-JP") : new Date(post.createdAt).toLocaleDateString("ja-JP")}
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
