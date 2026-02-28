import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, CheckCircle2, Clock, Heart, MessageSquare, RefreshCw, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<{ userId: number; name: string | null } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"praise" | "suggestion" | "correction">("praise");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const { data: usersProgress, isLoading, refetch } = trpc.supervisor.getUsersProgressToday.useQuery(undefined, {
    refetchInterval: 60000, // 1分ごとに自動更新
  });

  const sendFeedbackMutation = trpc.supervisor.sendFeedback.useMutation({
    onSuccess: () => {
      toast.success(`${selectedUser?.name ?? "利用者"}さんにフィードバックを送りました！`);
      setFeedbackDialogOpen(false);
      setFeedbackMessage("");
    },
    onError: (err) => {
      toast.error(`送信エラー: ${err.message}`);
    },
  });

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">支援員（管理者）のみアクセスできます。</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalToday = usersProgress?.reduce((sum, u) => sum + u.todayPostCount, 0) ?? 0;
  const totalApprovals = usersProgress?.reduce((sum, u) => sum + u.todayApprovalCount, 0) ?? 0;
  const activeUsers = usersProgress?.filter(u => u.todayPostCount > 0).length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">支援員ダッシュボード</h1>
            <p className="text-muted-foreground text-sm mt-1">
              利用者さんの今日の作業進捗をリアルタイムで確認できます
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalToday}</p>
                  <p className="text-xs text-muted-foreground">今日の投稿生成数（合計）</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalApprovals}</p>
                  <p className="text-xs text-muted-foreground">今日の承認申請数（合計）</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeUsers} / {usersProgress?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">今日作業した利用者数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 利用者一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              利用者ごとの今日の進捗
            </CardTitle>
            <CardDescription>
              各利用者の今日の投稿生成数・承認申請数・よく使うテンプレートを確認できます。
              フィードバックボタンからメッセージを送ることができます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>読み込み中...</span>
              </div>
            ) : !usersProgress || usersProgress.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Users className="h-8 w-8" />
                <p className="text-sm">利用者が登録されていません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usersProgress.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* アバター */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {(u.name ?? "?")[0].toUpperCase()}
                      </span>
                    </div>

                    {/* 名前・メール */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name ?? "名前未設定"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? ""}</p>
                      {u.topTemplate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          よく使うテンプレート: <span className="font-medium text-foreground">{u.topTemplate}</span>
                        </p>
                      )}
                    </div>

                    {/* 統計バッジ */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{u.todayPostCount}</p>
                        <p className="text-xs text-muted-foreground">投稿生成</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{u.todayApprovalCount}</p>
                        <p className="text-xs text-muted-foreground">承認申請</p>
                      </div>
                    </div>

                    {/* 状態バッジ */}
                    <div className="shrink-0">
                      {u.todayPostCount >= 5 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200">
                          <Star className="h-3 w-3 mr-1" />
                          頑張ってる！
                        </Badge>
                      ) : u.todayPostCount >= 1 ? (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          作業中
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          未着手
                        </Badge>
                      )}
                    </div>

                    {/* 最終活動時刻 */}
                    {u.lastActivityAt && (
                      <div className="text-center shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(u.lastActivityAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs text-muted-foreground">最終活動</p>
                      </div>
                    )}

                    {/* フィードバックボタン */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setSelectedUser({ userId: u.userId, name: u.name });
                        setFeedbackDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      フィードバック
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最終更新時刻 */}
        <p className="text-xs text-muted-foreground text-center">
          1分ごとに自動更新されます。最終更新: {new Date().toLocaleTimeString("ja-JP")}
        </p>
      </div>

      {/* フィードバックダイアログ */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              {selectedUser?.name ?? "利用者"}さんへフィードバック
            </DialogTitle>
            <DialogDescription>
              メッセージを送ると、利用者さんの「マイ進捗」ページに表示されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { value: "praise" as const, label: "🌟 ほめる", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
                { value: "suggestion" as const, label: "💡 アドバイス", color: "bg-blue-100 text-blue-800 border-blue-300" },
                { value: "correction" as const, label: "📝 修正依頼", color: "bg-orange-100 text-orange-800 border-orange-300" },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFeedbackType(type.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    feedbackType === type.value
                      ? type.color + " ring-2 ring-offset-1 ring-current"
                      : "bg-muted/30 text-muted-foreground border-border"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <Textarea
              placeholder={
                feedbackType === "praise"
                  ? "例：今日は5件も投稿を作れましたね！素晴らしいです！"
                  : feedbackType === "suggestion"
                  ? "例：ハッシュタグをもう少し増やすと、より多くの人に届きやすくなりますよ。"
                  : "例：投稿文の最初に会社名を入れるようにしてみましょう。"
              }
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{feedbackMessage.length}/500文字</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!selectedUser) return;
                sendFeedbackMutation.mutate({
                  targetUserId: selectedUser.userId,
                  message: feedbackMessage,
                  feedbackType,
                });
              }}
              disabled={!feedbackMessage.trim() || sendFeedbackMutation.isPending}
            >
              {sendFeedbackMutation.isPending ? "送信中..." : "フィードバックを送る"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
