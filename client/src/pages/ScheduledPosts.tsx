import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Edit, Trash2, Instagram, Twitter, MessageSquare, Loader2, Filter, X, CheckSquare, Square } from "lucide-react";

// 投稿本文から事業区分を推定する
function detectBusinessUnit(caption: string | undefined): { label: string; color: string } | null {
  if (!caption) return null;
  if (caption.includes('農作業') || caption.includes('清掃') || caption.includes('就労支援') || caption.includes('未来のとびら') || caption.includes('手工芸') || caption.includes('ビーズ') || caption.includes('布小物') || caption.includes('利用者')) {
    return { label: '🤝 就労支援B型', color: 'bg-purple-100 text-purple-800 border-purple-200' };
  }
  if (caption.includes('パン') || caption.includes('ラトリエ') || caption.includes('ルアッシュ') || caption.includes('焼きたて') || caption.includes('クロワッサン') || caption.includes('バゲット')) {
    return { label: '🍞 ラトリエルアッシュ', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (caption.includes('子ども食堂') || caption.includes('こども食堂') || caption.includes('子供食堂')) {
    return { label: '🍚 子ども食堂', color: 'bg-green-100 text-green-800 border-green-200' };
  }
  if (caption.includes('施工') || caption.includes('新築') || caption.includes('リフォーム') || caption.includes('建設') || caption.includes('住宅')) {
    return { label: '🏗️ 建設本業', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
  return null;
}
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
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState<boolean>(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState<boolean>(false);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [bulkEditDate, setBulkEditDate] = useState<string>("");
  const [bulkEditTime, setBulkEditTime] = useState<string>("");
  
  // フィルタリング用のstate
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("all");

  // 事業区分定義
  const BUSINESS_UNITS = [
    { key: "all",    label: "すべて",                    color: "" },
    { key: "shuro",  label: "🤝 就労支援B型",    color: "bg-purple-100 text-purple-800 border-purple-200" },
    { key: "kensetsu", label: "🏗️ 建設本業",     color: "bg-blue-100 text-blue-800 border-blue-200" },
    { key: "boulangerie", label: "🍞 ラトリエルアッシュ", color: "bg-amber-100 text-amber-800 border-amber-200" },
    { key: "kodomo", label: "🍚 子ども食堂",        color: "bg-green-100 text-green-800 border-green-200" },
  ];
  
  // 一括操作用のstate
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  const deleteMultipleSchedulesMutation = trpc.posts.deleteMultipleSchedules.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count}件の予約投稿を削除しました`);
      setSelectedIds([]);
      setShowBulkDeleteDialog(false);
      utils.posts.schedules.invalidate();
      utils.posts.upcomingSchedules.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const updateMultipleSchedulesMutation = trpc.posts.updateMultipleSchedules.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count}件の予約投稿を更新しました`);
      setSelectedIds([]);
      setShowBulkEditDialog(false);
      setBulkEditDate("");
      setBulkEditTime("");
      utils.posts.schedules.invalidate();
      utils.posts.upcomingSchedules.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 事業区分キーからキャプションをマッチする関数
  const matchesBusinessUnit = (caption: string | undefined, unitKey: string): boolean => {
    if (unitKey === "all") return true;
    if (!caption) return false;
    if (unitKey === "shuro") {
      return caption.includes('農作業') || caption.includes('清掃') || caption.includes('就労支援') || caption.includes('未来のとびら') || caption.includes('手工芸') || caption.includes('ビーズ') || caption.includes('布小物') || caption.includes('利用者');
    }
    if (unitKey === "kensetsu") {
      return caption.includes('施工') || caption.includes('新築') || caption.includes('リフォーム') || caption.includes('建設') || caption.includes('住宅');
    }
    if (unitKey === "boulangerie") {
      return caption.includes('パン') || caption.includes('ラトリエ') || caption.includes('ルアッシュ') || caption.includes('焼きたて') || caption.includes('クロワッサン') || caption.includes('バゲット');
    }
    if (unitKey === "kodomo") {
      return caption.includes('子ども食堂') || caption.includes('こども食堂') || caption.includes('子供食堂');
    }
    return false;
  };

  // フィルタリングロジック
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    
    return schedules.filter((schedule: any) => {
      // ステータスフィルタ
      if (statusFilter !== "all" && schedule.status !== statusFilter) {
        return false;
      }
      
      // 会社名フィルタ
      if (companyFilter !== "all" && schedule.companyName !== companyFilter) {
        return false;
      }

      // 事業区分フィルタ
      if (businessUnitFilter !== "all") {
        const caption = schedule.contents?.[0]?.caption;
        if (!matchesBusinessUnit(caption, businessUnitFilter)) return false;
      }
      
      // 日付範囲フィルタ
      const scheduleDate = new Date(schedule.scheduledAt);
      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        if (scheduleDate < fromDate) return false;
      }
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        if (scheduleDate > toDate) return false;
      }
      
      return true;
    });
  }, [schedules, statusFilter, companyFilter, businessUnitFilter, dateFromFilter, dateToFilter]);

  // 会社名の一覧を取得
  const companyNames = useMemo(() => {
    if (!schedules) return [];
    const names = new Set(schedules.map((s: any) => s.companyName));
    return Array.from(names);
  }, [schedules]);

  // フィルタをクリア
  const clearFilters = () => {
    setStatusFilter("all");
    setCompanyFilter("all");
    setBusinessUnitFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };

  // 一括選択/解除
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSchedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSchedules.map((s: any) => s.id));
    }
  };

  // 個別選択
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{schedule.companyName}</Badge>
                        {schedule.isBeforeAfter && (
                          <Badge variant="secondary">ビフォーアフター</Badge>
                        )}
                        {(() => {
                          const caption = schedule.contents?.[0]?.caption;
                          const unit = detectBusinessUnit(caption);
                          return unit ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${unit.color}`}>{unit.label}</span>
                          ) : null;
                        })()}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>全ての予約投稿</CardTitle>
                <CardDescription>
                  過去の予約投稿も含めて表示しています ({filteredSchedules.length}件)
                </CardDescription>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkEditDialog(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {selectedIds.length}件を編集
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {selectedIds.length}件を削除
                  </Button>
                </div>
              )}
            </div>

            {/* フィルタリングUI */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">フィルター</span>
              </div>

              {/* 事業区分ピルボタン */}
              <div className="space-y-2">
                <Label>事業区分</Label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_UNITS.map((unit) => (
                    <button
                      key={unit.key}
                      onClick={() => setBusinessUnitFilter(unit.key)}
                      className={[
                        "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                        businessUnitFilter === unit.key
                          ? unit.key === "all"
                            ? "bg-foreground text-background border-foreground"
                            : unit.color + " ring-2 ring-offset-1 ring-current"
                          : unit.key === "all"
                            ? "bg-background text-muted-foreground border-border hover:bg-muted"
                            : "bg-background border-border hover:" + unit.color,
                      ].join(" ")}
                    >
                      {unit.label}
                      {unit.key !== "all" && (() => {
                        const count = schedules?.filter((s: any) => matchesBusinessUnit(s.contents?.[0]?.caption, unit.key)).length ?? 0;
                        return count > 0 ? <span className="ml-1.5 bg-white/60 text-current rounded-full px-1.5 py-0.5 text-xs">{count}</span> : null;
                      })()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">すべて</option>
                    <option value="scheduled">予約済み</option>
                    <option value="completed">完了</option>
                    <option value="failed">失敗</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>会社名</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <option value="all">すべて</option>
                    {companyNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                  />
                </div>
              </div>
              {(statusFilter !== "all" || companyFilter !== "all" || businessUnitFilter !== "all" || dateFromFilter || dateToFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  フィルタをクリア
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* 一括選択ボタン */}
            {filteredSchedules.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.length === filteredSchedules.length ? (
                    <><CheckSquare className="h-4 w-4 mr-2" />全解除</>
                  ) : (
                    <><Square className="h-4 w-4 mr-2" />全選択</>
                  )}
                </Button>
                {selectedIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length}件選択中
                  </span>
                )}
              </div>
            )}

            {filteredSchedules.length > 0 ? (
              <div className="space-y-4">
                {filteredSchedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {/* チェックボックス */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(schedule.id)}
                        onChange={() => toggleSelect(schedule.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 space-y-2 cursor-pointer" onClick={() => handleViewDetail(schedule)}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(schedule.scheduledAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                        </span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{schedule.companyName}</Badge>
                        {schedule.isBeforeAfter && (
                          <Badge variant="secondary">ビフォーアフター</Badge>
                        )}
                        {schedule.notificationSent && (
                          <Badge variant="secondary">通知送信済み</Badge>
                        )}
                        {(() => {
                          const caption = schedule.contents?.[0]?.caption;
                          const unit = detectBusinessUnit(caption);
                          return unit ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${unit.color}`}>{unit.label}</span>
                          ) : null;
                        })()}
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

      {/* 一括削除ダイアログ */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>一括削除の確認</DialogTitle>
            <DialogDescription>
              {selectedIds.length}件の予約投稿を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMultipleSchedulesMutation.mutate({ ids: selectedIds });
              }}
              disabled={deleteMultipleSchedulesMutation.isPending}
            >
              {deleteMultipleSchedulesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                `${selectedIds.length}件を削除`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一括編集ダイアログ */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>一括日時変更</DialogTitle>
            <DialogDescription>
              {selectedIds.length}件の予約投稿の日時を変更します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-date">投稿予定日</Label>
              <Input
                id="bulk-edit-date"
                type="date"
                value={bulkEditDate}
                onChange={(e) => setBulkEditDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-edit-time">投稿予定時刻</Label>
              <Input
                id="bulk-edit-time"
                type="time"
                value={bulkEditTime}
                onChange={(e) => setBulkEditTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkEditDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!bulkEditDate || !bulkEditTime) {
                  toast.error("日付と時刻を選択してください");
                  return;
                }

                const scheduledAt = new Date(`${bulkEditDate}T${bulkEditTime}`);
                
                updateMultipleSchedulesMutation.mutate({
                  ids: selectedIds,
                  scheduledAt,
                });
              }}
              disabled={!bulkEditDate || !bulkEditTime || updateMultipleSchedulesMutation.isPending}
            >
              {updateMultipleSchedulesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                `${selectedIds.length}件を更新`
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
