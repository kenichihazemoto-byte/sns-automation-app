import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MapPin,
  Plus,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Send,
  Building2,
  Calendar,
  Tag,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// 拠点の初期データ（未接続状態で表示）
const DEFAULT_LOCATIONS = [
  { name: "ハゼモト建設", description: "建設本業・新築・リフォーム" },
  { name: "クリニックアーキプロ", description: "医療クリニック建設" },
  { name: "L’Atelier de Ash（ラトリエルアッシュ）", description: "パン屋" },
  { name: "未来のとびら", description: "就労支援B型" },
];

const TOPIC_TYPE_LABELS: Record<string, string> = {
  STANDARD: "通常投稿",
  EVENT: "イベント",
  OFFER: "特典・キャンペーン",
};

const CTA_TYPE_LABELS: Record<string, string> = {
  LEARN_MORE: "詳しく見る",
  BOOK: "予約する",
  ORDER: "注文する",
  SHOP: "ショップ",
  SIGN_UP: "申し込む",
  CALL: "電話する",
};

export default function GBPPost() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [location] = useLocation();

  // URLパラメータからの自動入力（SNSスケジュールからの流用）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const summaryParam = params.get("summary");
    const companyParam = params.get("company");
    if (summaryParam) {
      setSummary(summaryParam);
      toast.info("投稿内容をSNSスケジュールから流用しました");
    }
    if (companyParam) {
      setSelectedCompanyForImport(companyParam);
    }
  }, []);

  // GBPアカウント一覧
  const { data: gbpAccounts = [], refetch: refetchAccounts } = trpc.gbp.listAccounts.useQuery();

  // 直近のSNS投稿一覧（流用用）
  const [selectedCompanyForImport, setSelectedCompanyForImport] = useState<string>("");
  const { data: recentSchedules = [] } = trpc.gbp.listRecentSchedules.useQuery(
    { companyName: selectedCompanyForImport || undefined },
    { enabled: true }
  );

  // 投稿フォームの状態
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [topicType, setTopicType] = useState<"STANDARD" | "EVENT" | "OFFER">("STANDARD");
  const [summary, setSummary] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [ctaType, setCtaType] = useState<string>("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  // 投稿モード: 'immediate' = 即時投稿, 'scheduled' = 予約投稿
  const [postMode, setPostMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledAt, setScheduledAt] = useState("");

  // 新規拠点登録ダイアログ
  const [newLocationName, setNewLocationName] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // 投稿履歴
  const [selectedHistoryAccountId, setSelectedHistoryAccountId] = useState<number | undefined>(undefined);
  const { data: postHistory = [], refetch: refetchHistory } = trpc.gbp.listPosts.useQuery(
    { gbpAccountId: selectedHistoryAccountId }
  );

  // 拠点登録ミューテーション
  const upsertAccountMutation = trpc.gbp.upsertAccount.useMutation({
    onSuccess: () => {
      refetchAccounts();
      setShowAddDialog(false);
      setNewLocationName("");
      toast.success("拠点を登録しました");
    },
    onError: (err) => toast.error(`登録失敗: ${err.message}`),
  });

  // GBP投稿ミューテーション
  const createPostMutation = trpc.gbp.createPost.useMutation({
    onSuccess: () => {
      toast.success("グーグルビジネスプロフィールに投稿しました！");
      setSummary("");
      setMediaUrl("");
      setCtaType("");
      setCtaUrl("");
      setEventTitle("");
      setEventStartAt("");
      setEventEndAt("");
      refetchHistory();
    },
    onError: (err) => toast.error(`投稿失敗: ${err.message}`),
  });

  // GBP予約投稿ミューテーション
  const createScheduleMutation = trpc.gbp.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("予約投稿を登録しました！");
      setSummary("");
      setMediaUrl("");
      setCtaType("");
      setCtaUrl("");
      setEventTitle("");
      setEventStartAt("");
      setEventEndAt("");
      setScheduledAt("");
      utils.gbp.listSchedules.invalidate();
    },
    onError: (err) => toast.error(`予約失敗: ${err.message}`),
  });

  // 他SNS投稿から内容を流用する
  const handleImportFromSchedule = (schedule: any) => {
    const content = schedule.contents?.[0];
    if (content?.caption) {
      setSummary(content.caption.slice(0, 1500));
      toast.success("投稿内容を流用しました");
    }
  };

  // GBP OAuth2認証URLを取得して開く
  const redirectUri = `${window.location.origin}/api/gbp/oauth/callback`;
  const [isConnecting, setIsConnecting] = useState(false);

  // OAuth2認証コードをトークンに交換するミューテーション
  const connectOAuthMutation = trpc.gbp.connectOAuth.useMutation({
    onSuccess: () => {
      toast.success("Google認証が完了しました！");
      refetchAccounts();
    },
    onError: (err) => toast.error(`認証失敗: ${err.message}`),
  });

  // ポップアップからのOAuthコールバックを受け取る
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GBP_OAUTH_SUCCESS") {
        const { code, state } = event.data;
        // stateから gbpAccountId を取得（形式: "userId:gbpAccountId"）
        const parts = String(state ?? "").split(":");
        const gbpAccountId = parts.length >= 2 ? parseInt(parts[1]) : (selectedAccountId ?? 0);
        connectOAuthMutation.mutate({
          code,
          gbpAccountId,
          redirectUri,
        });
      } else if (event.data?.type === "GBP_OAUTH_ERROR") {
        toast.error(`Google認証エラー: ${event.data.error}`);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedAccountId, redirectUri]);

  const handleConnectGbp = async (accountId: number) => {
    setSelectedAccountId(accountId);
    setIsConnecting(true);
    try {
      // 直接fetchでURLを取得（キャッシュの問題を回避）
      const result = await utils.gbp.getAuthUrl.fetch({
        gbpAccountId: accountId,
        redirectUri,
      });
      if (result?.url) {
        window.open(result.url, "_blank", "width=600,height=700");
      } else {
        toast.error("認証URLの取得に失敗しました");
      }
    } catch (err: any) {
      toast.error(`認証URL取得エラー: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePost = async () => {
    if (!selectedAccountId) {
      toast.error("投稿する拠点を選択してください");
      return;
    }
    if (!summary.trim()) {
      toast.error("投稿本文を入力してください");
      return;
    }
    if (postMode === 'scheduled') {
      if (!scheduledAt) {
        toast.error("予約日時を指定してください");
        return;
      }
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        toast.error("予約日時は現在時刻より後に設定してください");
        return;
      }
      setIsPosting(true);
      try {
        await createScheduleMutation.mutateAsync({
          gbpAccountId: selectedAccountId,
          summary: summary.trim(),
          topicType,
          mediaUrl: mediaUrl || undefined,
          callToActionType: ctaType as any || undefined,
          callToActionUrl: ctaUrl || undefined,
          eventTitle: eventTitle || undefined,
          eventStartAt: eventStartAt ? new Date(eventStartAt) : undefined,
          eventEndAt: eventEndAt ? new Date(eventEndAt) : undefined,
          scheduledAt: scheduledDate,
        });
      } finally {
        setIsPosting(false);
      }
      return;
    }
    setIsPosting(true);
    try {
      await createPostMutation.mutateAsync({
        gbpAccountId: selectedAccountId,
        summary: summary.trim(),
        topicType,
        mediaUrl: mediaUrl || undefined,
        callToActionType: ctaType as any || undefined,
        callToActionUrl: ctaUrl || undefined,
        eventTitle: eventTitle || undefined,
        eventStartAt: eventStartAt ? new Date(eventStartAt) : undefined,
        eventEndAt: eventEndAt ? new Date(eventEndAt) : undefined,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    upsertAccountMutation.mutate({ locationName: newLocationName.trim() });
  };

  const selectedAccount = gbpAccounts.find((a) => a.id === selectedAccountId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              Googleビジネスプロフィール投稿
            </h1>
            <p className="text-muted-foreground mt-1">
              各拠点のGoogleビジネスプロフィールに直接投稿できます。他SNSで作成したコンテンツの流用も可能です。
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                拠点を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>GBP拠点を追加</DialogTitle>
                <DialogDescription>
                  Googleビジネスプロフィールに登録されている拠点名を入力してください。
                  追加後、Google認証を行うと投稿が可能になります。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>拠点名</Label>
                  <Input
                    placeholder="例：ハゼモト建設"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  <p className="font-medium mb-1">登録済み拠点（クリックで自動入力）</p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_LOCATIONS.map((loc) => (
                      <button
                        key={loc.name}
                        className="text-xs px-2 py-1 rounded bg-background border hover:bg-accent transition-colors"
                        onClick={() => setNewLocationName(loc.name)}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddLocation}
                  disabled={!newLocationName.trim() || upsertAccountMutation.isPending}
                >
                  {upsertAccountMutation.isPending ? "追加中..." : "追加する"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 拠点一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {gbpAccounts.length === 0 ? (
            DEFAULT_LOCATIONS.map((loc) => (
              <Card key={loc.name} className="border-dashed opacity-60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">未登録</Badge>
                  </div>
                  <CardTitle className="text-sm">{loc.name}</CardTitle>
                  <CardDescription className="text-xs">{loc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setNewLocationName(loc.name);
                      setShowAddDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    登録する
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            gbpAccounts.map((account) => (
              <Card
                key={account.id}
                className={`cursor-pointer transition-all ${
                  selectedAccountId === account.id
                    ? "ring-2 ring-blue-500 bg-blue-50/30"
                    : "hover:border-blue-300"
                }`}
                onClick={() => setSelectedAccountId(account.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {account.isConnected ? (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        接続済み
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        未接続
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm">{account.locationName}</CardTitle>
                  {account.locationId && (
                    <CardDescription className="text-xs truncate">{account.locationId}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {!account.isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      disabled={isConnecting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectGbp(account.id);
                      }}
                    >
                      {isConnecting ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3 w-3 mr-1" />
                      )}
                      {isConnecting ? "認証中..." : "Google認証"}
                    </Button>
                  )}
                  {account.isConnected && (
                    <p className="text-xs text-muted-foreground text-center">クリックして選択</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 投稿フォーム */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：投稿作成 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">投稿を作成</CardTitle>
                <CardDescription>
                  {selectedAccount
                    ? `投稿先：${selectedAccount.locationName}`
                    : "上の拠点カードをクリックして投稿先を選択してください"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 投稿タイプ */}
                <div className="space-y-2">
                  <Label>投稿タイプ</Label>
                  <div className="flex gap-2">
                    {(["STANDARD", "EVENT", "OFFER"] as const).map((type) => (
                      <Button
                        key={type}
                        variant={topicType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTopicType(type)}
                      >
                        {type === "EVENT" && <Calendar className="h-3 w-3 mr-1" />}
                        {type === "OFFER" && <Tag className="h-3 w-3 mr-1" />}
                        {TOPIC_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* イベント情報（EVENTタイプのみ） */}
                {topicType === "EVENT" && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-md">
                    <div className="space-y-1">
                      <Label className="text-xs">イベントタイトル</Label>
                      <Input
                        placeholder="例：完成見学会"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">開始日時</Label>
                        <Input
                          type="datetime-local"
                          value={eventStartAt}
                          onChange={(e) => setEventStartAt(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">終了日時</Label>
                        <Input
                          type="datetime-local"
                          value={eventEndAt}
                          onChange={(e) => setEventEndAt(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 投稿本文 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>投稿本文</Label>
                    <span className={`text-xs ${summary.length > 1400 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {summary.length} / 1500文字
                    </span>
                  </div>
                  <Textarea
                    placeholder="Googleビジネスプロフィールに表示される投稿内容を入力してください..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value.slice(0, 1500))}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* 画像URL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    画像URL（任意）
                  </Label>
                  <Input
                    placeholder="https://... （S3またはGoogleフォトの公開URL）"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    他SNSで使用した画像のURLをそのまま流用できます
                  </p>
                </div>

                {/* CTAボタン */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    CTAボタン（任意）
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={ctaType || 'none'} onValueChange={(v) => setCtaType(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="ボタンタイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">なし</SelectItem>
                        {Object.entries(CTA_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="リンク先URL"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      disabled={!ctaType}
                    />
                  </div>
                </div>

                {/* 投稿モード切り替え */}
                <div className="space-y-3">
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        postMode === 'immediate'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => setPostMode('immediate')}
                    >
                      <Send className="h-3.5 w-3.5 inline mr-1.5" />
                      即時投稿
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        postMode === 'scheduled'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => setPostMode('scheduled')}
                    >
                      <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
                      予約投稿
                    </button>
                  </div>

                  {postMode === 'scheduled' && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        予約日時
                      </Label>
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-muted-foreground">
                        指定日時に自動でGBPに投稿されます。予約一覧から確認・キャンセルできます。
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handlePost}
                    disabled={!selectedAccountId || !summary.trim() || isPosting || (postMode === 'scheduled' && !scheduledAt)}
                    variant={postMode === 'scheduled' ? 'outline' : 'default'}
                  >
                    {isPosting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : postMode === 'scheduled' ? (
                      <Calendar className="h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isPosting
                      ? (postMode === 'scheduled' ? '予約登録中...' : '投稿中...')
                      : postMode === 'scheduled'
                        ? `${scheduledAt ? new Date(scheduledAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' に予約登録' : '予約日時を選択してください'}`
                        : 'Googleビジネスプロフィールに投稿'
                    }
                  </Button>
                </div>

                {!selectedAccount?.isConnected && selectedAccountId && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Google認証が必要です</p>
                      <p className="text-xs mt-0.5">
                        投稿するには先にGoogle認証を完了してください。
                        拠点カードの「Google認証」ボタンをクリックしてください。
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右：他SNS流用 + 投稿履歴 */}
          <div className="space-y-4">
            {/* 他SNS投稿から流用 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Copy className="h-4 w-4 text-blue-500" />
                  他SNS投稿から流用
                </CardTitle>
                <CardDescription className="text-xs">
                  Instagram/X/Threadsで作成した投稿内容をGBPに流用できます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedCompanyForImport || 'all'} onValueChange={(v) => setSelectedCompanyForImport(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="会社でフィルター" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="ハゼモト建設">ハゼモト建設</SelectItem>
                    <SelectItem value="クリニックアーキプロ">クリニックアーキプロ</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentSchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      流用できる投稿がありません
                    </p>
                  ) : (
                    recentSchedules.slice(0, 10).map((schedule) => {
                      const content = schedule.contents?.[0];
                      if (!content) return null;
                      return (
                        <div
                          key={schedule.id}
                          className="p-2 border rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => handleImportFromSchedule(schedule)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {schedule.companyName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(schedule.scheduledAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-2">{content.caption}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs py-0 h-4">{content.platform}</Badge>
                            <span className="text-xs text-blue-500 ml-auto">クリックで流用</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 投稿履歴 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  投稿履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {postHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      投稿履歴がありません
                    </p>
                  ) : (
                    postHistory.slice().reverse().slice(0, 10).map((post) => (
                      <div key={post.id} className="p-2 border rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 h-4 ${
                              post.status === "published"
                                ? "text-green-600 border-green-300"
                                : post.status === "failed"
                                ? "text-red-600 border-red-300"
                                : "text-gray-600"
                            }`}
                          >
                            {post.status === "published" ? (
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            ) : post.status === "failed" ? (
                              <XCircle className="h-3 w-3 mr-0.5" />
                            ) : null}
                            {post.status === "published" ? "投稿済" : post.status === "failed" ? "失敗" : "下書き"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2">{post.summary}</p>
                        {post.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{post.errorMessage}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* GBP接続ガイド */}
        <Card className="bg-blue-50/30 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <AlertCircle className="h-4 w-4" />
              Googleビジネスプロフィール接続の手順
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Google Cloud Consoleで設定</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Google Cloud ConsoleでOAuth2クライアントIDを作成し、
                    <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code>と
                    <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code>を設定してください。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">拠点を追加して認証</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    「拠点を追加」から各拠点を登録し、
                    「Google認証」ボタンからGoogleアカウントと連携します。
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">投稿・流用で発信</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    直接投稿するか、他SNSで作成した投稿内容を
                    「他SNS投稿から流用」で取り込んでGBPに投稿できます。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
