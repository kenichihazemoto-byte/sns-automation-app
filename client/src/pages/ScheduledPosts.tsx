import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Edit, Trash2, Instagram, Twitter, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ScheduledPosts() {
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showDetailDialog, setShowDetailDialog] = useState<boolean>(false);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.posts.schedules.useQuery();
  const { data: upcomingSchedules } = trpc.posts.upcomingSchedules.useQuery({ limit: 10 });

  const updateScheduleMutation = trpc.posts.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("予約投稿を更新しました");
      setShowEditDialog(false);
      utils.posts.schedules.invalidate();
      utils.posts.upcomingSchedules.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const deleteScheduleMutation = trpc.posts.deleteSchedule.useMutation({
    onSuccess: () => {
      toast.success("予約投稿を削除しました");
      setShowDeleteDialog(false);
      setSelectedSchedule(null);
      utils.posts.schedules.invalidate();
      utils.posts.upcomingSchedules.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    const scheduledDate = new Date(schedule.scheduledAt);
    setEditDate(format(scheduledDate, "yyyy-MM-dd"));
    setEditTime(format(scheduledDate, "HH:mm"));
    setShowEditDialog(true);
  };

  const handleDelete = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowDeleteDialog(true);
  };

  const handleViewDetail = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowDetailDialog(true);
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary">予約済み</Badge>;
      case "completed":
        return <Badge variant="default">完了</Badge>;
      case "failed":
        return <Badge variant="destructive">失敗</Badge>;
      case "cancelled":
        return <Badge variant="outline">キャンセル</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">予約投稿管理</h1>
          <p className="text-muted-foreground mt-2">
            予約投稿の一覧を確認し、編集・削除ができます
          </p>
        </div>

        {/* 今後の予約投稿 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              今後の予約投稿
            </CardTitle>
            <CardDescription>
              今後投稿予定の投稿を表示しています
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSchedules && upcomingSchedules.length > 0 ? (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(schedule)}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(schedule.scheduledAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                        </span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{schedule.companyName}</Badge>
                        {schedule.isBeforeAfter && (
                          <Badge variant="secondary">ビフォーアフター</Badge>
                        )}
                      </div>
                      {schedule.contents && schedule.contents.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="line-clamp-2">{schedule.contents[0].caption}</p>
                          {schedule.contents[0].hashtags && (
                            <p className="text-xs text-blue-600 mt-1">{schedule.contents[0].hashtags}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(schedule);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(schedule);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                今後の予約投稿はありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* 全ての予約投稿 */}
        <Card>
          <CardHeader>
            <CardTitle>全ての予約投稿</CardTitle>
            <CardDescription>
              過去の予約投稿も含めて表示しています
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schedules && schedules.length > 0 ? (
              <div className="space-y-4">
                {schedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(schedule)}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(schedule.scheduledAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                        </span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{schedule.companyName}</Badge>
                        {schedule.isBeforeAfter && (
                          <Badge variant="secondary">ビフォーアフター</Badge>
                        )}
                        {schedule.notificationSent && (
                          <Badge variant="secondary">通知送信済み</Badge>
                        )}
                      </div>
                      {schedule.contents && schedule.contents.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="line-clamp-2">{schedule.contents[0].caption}</p>
                          {schedule.contents[0].hashtags && (
                            <p className="text-xs text-blue-600 mt-1">{schedule.contents[0].hashtags}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                        disabled={schedule.status === "completed"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(schedule)}
                        disabled={schedule.status === "completed"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                予約投稿がありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>予約投稿を編集</DialogTitle>
            <DialogDescription>
              投稿予定日時を変更できます
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">投稿予定日</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time">投稿予定時刻</Label>
              <Input
                id="edit-time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!editDate || !editTime) {
                  toast.error("日付と時刻を選択してください");
                  return;
                }

                const scheduledAt = new Date(`${editDate}T${editTime}`);
                
                updateScheduleMutation.mutate({
                  id: selectedSchedule.id,
                  scheduledAt,
                });
              }}
              disabled={updateScheduleMutation.isPending || !editDate || !editTime}
            >
              {updateScheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                "更新"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>予約投稿を削除</DialogTitle>
            <DialogDescription>
              この予約投稿を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteScheduleMutation.mutate({ id: selectedSchedule.id });
              }}
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 詳細表示モーダル */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>予約投稿の詳細</DialogTitle>
            <DialogDescription>
              投稿内容と画像を確認できます
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-6 py-4">
              {/* 基本情報 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">会社名</Label>
                    <p className="font-medium">{selectedSchedule.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">投稿予定日時</Label>
                    <p className="font-medium">
                      {format(new Date(selectedSchedule.scheduledAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ステータス</Label>
                    <div className="mt-1">{getStatusBadge(selectedSchedule.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">投稿タイプ</Label>
                    <div className="mt-1">
                      {selectedSchedule.isBeforeAfter ? (
                        <Badge variant="secondary">ビフォーアフター</Badge>
                      ) : (
                        <Badge variant="outline">通常投稿</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 画像プレビュー */}
              {(selectedSchedule.imageId || selectedSchedule.beforeImageUrl || selectedSchedule.afterImageUrl) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">画像プレビュー</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedSchedule.beforeImageUrl && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">ビフォー</Label>
                        <img
                          src={selectedSchedule.beforeImageUrl}
                          alt="ビフォー"
                          className="w-full h-auto rounded-lg border"
                        />
                      </div>
                    )}
                    {selectedSchedule.afterImageUrl && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">アフター</Label>
                        <img
                          src={selectedSchedule.afterImageUrl}
                          alt="アフター"
                          className="w-full h-auto rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* プラットフォーム別投稿内容 */}
              {selectedSchedule.contents && selectedSchedule.contents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">プラットフォーム別投稿内容</h3>
                  {selectedSchedule.contents.map((content: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          {getPlatformIcon(content.platform)}
                          {content.platform === "instagram" && "Instagram"}
                          {content.platform === "x" && "X (Twitter)"}
                          {content.platform === "threads" && "Threads"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-muted-foreground text-xs">投稿文</Label>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{content.caption}</p>
                        </div>
                        {content.hashtags && (
                          <div>
                            <Label className="text-muted-foreground text-xs">ハッシュタグ</Label>
                            <p className="mt-1 text-sm text-blue-600">{content.hashtags}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              閉じる
            </Button>
            {selectedSchedule && selectedSchedule.status !== "completed" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleEdit(selectedSchedule);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailDialog(false);
                    handleDelete(selectedSchedule);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
