import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "待機中",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  published: {
    label: "投稿済み",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "失敗",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "キャンセル済み",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const TOPIC_TYPE_LABELS: Record<string, string> = {
  STANDARD: "通常投稿",
  EVENT: "イベント",
  OFFER: "特典・キャンペーン",
};

export default function GBPSchedule() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const { data: schedules = [], isLoading, refetch } = trpc.gbp.listSchedules.useQuery(
    { status: statusFilter !== "all" ? (statusFilter as any) : undefined }
  );

  const cancelMutation = trpc.gbp.cancelSchedule.useMutation({
    onSuccess: () => {
      toast.success("予約をキャンセルしました");
      utils.gbp.listSchedules.invalidate();
      setCancellingId(null);
    },
    onError: (err) => {
      toast.error(`キャンセル失敗: ${err.message}`);
      setCancellingId(null);
    },
  });

  const handleCancel = (id: number) => {
    setCancellingId(id);
    cancelMutation.mutate({ id });
  };

  const pendingCount = schedules.filter((s) => s.status === "pending").length;
  const publishedCount = schedules.filter((s) => s.status === "published").length;
  const failedCount = schedules.filter((s) => s.status === "failed").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              GBP予約投稿一覧
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Googleビジネスプロフィールへの予約投稿を管理します
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            更新
          </Button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-3">
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">待機中</div>
            </CardContent>
          </Card>
          <Card className="text-center py-3">
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">投稿済み</div>
            </CardContent>
          </Card>
          <Card className="text-center py-3">
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-red-500">{failedCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">失敗</div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="pending">待機中</SelectItem>
              <SelectItem value="published">投稿済み</SelectItem>
              <SelectItem value="failed">失敗</SelectItem>
              <SelectItem value="cancelled">キャンセル済み</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{schedules.length}件</span>
        </div>

        {/* 予約一覧 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {statusFilter === "all" ? "予約投稿がありません" : `${STATUS_LABELS[statusFilter]?.label ?? statusFilter}の予約投稿がありません`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                「GBP投稿」ページから「予約投稿」モードで投稿を作成してください
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const statusInfo = STATUS_LABELS[schedule.status] ?? STATUS_LABELS.pending;
              const isPending = schedule.status === "pending";
              const scheduledDate = new Date(schedule.scheduledAt);
              const isOverdue = isPending && scheduledDate < new Date();

              return (
                <Card key={schedule.id} className={isOverdue ? "border-orange-200" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* ステータスアイコン */}
                      <div className={`mt-0.5 p-1.5 rounded-full ${
                        schedule.status === "pending" ? "bg-blue-100" :
                        schedule.status === "published" ? "bg-green-100" :
                        schedule.status === "failed" ? "bg-red-100" : "bg-gray-100"
                      }`}>
                        <MapPin className={`h-4 w-4 ${
                          schedule.status === "pending" ? "text-blue-600" :
                          schedule.status === "published" ? "text-green-600" :
                          schedule.status === "failed" ? "text-red-500" : "text-gray-400"
                        }`} />
                      </div>

                      {/* 本文 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {TOPIC_TYPE_LABELS[schedule.topicType] ?? schedule.topicType}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {schedule.locationName}
                          </span>
                        </div>

                        <p className="text-sm line-clamp-2 mb-2">{schedule.summary}</p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-orange-600 font-medium" : ""}`}>
                            <Clock className="h-3 w-3" />
                            {isOverdue ? "⚠ 実行待ち: " : "予約: "}
                            {scheduledDate.toLocaleString("ja-JP", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>登録: {new Date(schedule.createdAt).toLocaleDateString("ja-JP")}</span>
                        </div>

                        {schedule.status === "failed" && schedule.errorMessage && (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded p-2">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{schedule.errorMessage}</span>
                          </div>
                        )}
                      </div>

                      {/* キャンセルボタン（待機中のみ） */}
                      {isPending && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              disabled={cancellingId === schedule.id}
                            >
                              {cancellingId === schedule.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {scheduledDate.toLocaleString("ja-JP")} に予約された投稿をキャンセルします。
                                この操作は元に戻せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>戻る</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(schedule.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                キャンセルする
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 注意書き */}
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">
              <strong>注意:</strong> 予約投稿は指定日時にサーバーが自動実行します。
              Google認証が完了していない拠点の予約は失敗します。
              投稿前に「GBP投稿」ページで各拠点のGoogle認証を完了させてください。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
