import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Instagram, Twitter } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 承認待ち投稿一覧ページ（管理者専用）
 * 利用者さんが作成した投稿を確認・承認・却下する
 */
export default function ApprovalQueue() {
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const { data: pendingDrafts, isLoading, refetch } = trpc.approval.getPendingDrafts.useQuery();
  const approveMutation = trpc.approval.approveDraft.useMutation();
  const rejectMutation = trpc.approval.rejectDraft.useMutation();
  
  // 作業履歴記録
  const logActivityMutation = trpc.activityLog.create.useMutation();

  const handleApprove = async (draftId: number) => {
    const draft = pendingDrafts?.find((d: any) => d.id === draftId);
    try {
      await approveMutation.mutateAsync({ draftId });
      toast.success("投稿を承認しました", {
        description: "予約投稿として登録されました",
      });
      
      // 作業履歴を記録（支援員の承認行為）
      if (draft) {
        logActivityMutation.mutate({
          activityType: "post_approval",
          description: `支援員が投稿を承認しました（利用者ID: ${draft.userId}）`,
          status: "success",
          metadata: JSON.stringify({ 
            draftId,
            userId: draft.userId,
            platform: draft.platform,
            action: "approved"
          }),
        });
      }
      
      refetch();
    } catch (error) {
      toast.error("承認に失敗しました", {
        description: error instanceof Error ? error.message : "エラーが発生しました",
      });
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "post_approval",
        description: "投稿の承認に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ 
          draftId,
          error: error instanceof Error ? error.message : "Unknown error"
        }),
      });
    }
  };

  const handleReject = async () => {
    if (!selectedDraft) return;
    if (!feedback.trim()) {
      toast.error("フィードバックを入力してください");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        draftId: selectedDraft.id,
        feedback: feedback.trim(),
      });
      toast.success("投稿を却下しました", {
        description: "利用者さんにフィードバックが送信されました",
      });
      
      // 作業履歴を記録（支援員の却下行為）
      logActivityMutation.mutate({
        activityType: "post_approval",
        description: `支援員が投稿を却下しました（${selectedDraft.user?.name || '利用者'}さんの投稿）`,
        status: "success",
        metadata: JSON.stringify({ 
          draftId: selectedDraft.id,
          userId: selectedDraft.userId,
          platform: selectedDraft.platform,
          action: "rejected",
          feedback: feedback.trim()
        }),
      });
      
      setRejectDialogOpen(false);
      setSelectedDraft(null);
      setFeedback("");
      refetch();
    } catch (error) {
      toast.error("却下に失敗しました", {
        description: error instanceof Error ? error.message : "エラーが発生しました",
      });
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "post_approval",
        description: "投稿の却下に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ 
          draftId: selectedDraft.id,
          error: error instanceof Error ? error.message : "Unknown error"
        }),
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "x":
        return <Twitter className="h-4 w-4" />;
      case "threads":
        return <span className="text-xs font-bold">@</span>;
      default:
        return null;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "Instagram";
      case "x":
        return "X (Twitter)";
      case "threads":
        return "Threads";
      default:
        return platform;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">承認待ち投稿</h1>
        <p className="text-muted-foreground">
          利用者さんが作成した投稿を確認して、承認または却下してください
        </p>
      </div>

      {!pendingDrafts || pendingDrafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">承認待ちの投稿はありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingDrafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getPlatformIcon(draft.platform)}
                      {getPlatformName(draft.platform)}投稿
                    </CardTitle>
                    <CardDescription>
                      作成者: ユーザーID {draft.userId} • 予定日時:{" "}
                      {format(new Date(draft.scheduledAt), "yyyy年M月d日 HH:mm", { locale: ja })}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    承認待ち
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.isBeforeAfter && (
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      ビフォーアフター投稿
                    </Badge>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {draft.beforeImageUrl && (
                        <div>
                          <p className="text-sm font-medium mb-1">施工前</p>
                          <img
                            src={draft.beforeImageUrl}
                            alt="施工前"
                            className="w-full h-48 object-cover rounded-md"
                          />
                        </div>
                      )}
                      {draft.afterImageUrl && (
                        <div>
                          <p className="text-sm font-medium mb-1">施工後</p>
                          <img
                            src={draft.afterImageUrl}
                            alt="施工後"
                            className="w-full h-48 object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">投稿文</h4>
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                    {draft.postContent}
                  </div>
                </div>

                {draft.hashtags && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">ハッシュタグ</h4>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(draft.hashtags).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDraft(draft);
                    setRejectDialogOpen(true);
                  }}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  却下
                </Button>
                <Button
                  onClick={() => handleApprove(draft.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  承認して予約投稿に登録
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 却下ダイアログ */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投稿を却下</DialogTitle>
            <DialogDescription>
              利用者さんに改善点を伝えるフィードバックを入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="例: 投稿文の最初の一文が長すぎるので、もう少し短くしてください。"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedDraft(null);
                setFeedback("");
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !feedback.trim()}
            >
              却下してフィードバックを送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
