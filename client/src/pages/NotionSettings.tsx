import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Database,
  Key,
  Loader2,
  RefreshCw,
  Unplug,
  ArrowUpRight,
  ArrowDownUp,
  Clock,
} from "lucide-react";


export default function NotionSettings() {
  const [syncResult, setSyncResult] = useState<{
    syncedCount: number;
    changes: Array<{
      pageId: string;
      title: string;
      platform: string;
      companyName: string;
      status: string;
      scheduledAt: string | null;
      postText: string;
      hashtags: string;
      lastEditedAt: string;
    }>;
  } | null>(null);
  const [sinceHours, setSinceHours] = useState(24);

  const [token, setToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    databaseTitle?: string;
    error?: string;
  } | null>(null);

  const { data: settings, isLoading, refetch } = trpc.notion.getSettings.useQuery();

  const saveSettingsMutation = trpc.notion.saveSettings.useMutation({
    onSuccess: (data) => {
      toast.success(`Notion連携が完了しました！データベース: ${data.databaseTitle}`);
      setToken("");
      setDatabaseId("");
      setTestResult(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`保存エラー: ${err.message}`);
    },
  });

  const testConnectionMutation = trpc.notion.testConnection.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success(`接続成功！データベース: ${data.databaseTitle}`);
      } else {
        toast.error(`接続失敗: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`テストエラー: ${err.message}`);
    },
  });

  const syncFromNotionMutation = trpc.notion.syncFromNotion.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      if (data.syncedCount === 0) {
        toast.info("Notionに変更はありませんでした");
      } else {
        toast.success(`${data.syncedCount}件の変更を取得しました`);
      }
    },
    onError: (err) => {
      toast.error(`同期エラー: ${err.message}`);
    },
  });

  const disconnectMutation = trpc.notion.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Notion連携を解除しました");
      refetch();
    },
    onError: (err) => {
      toast.error(`解除エラー: ${err.message}`);
    },
  });

  const handleTest = async () => {
    if (!token || !databaseId) {
      toast.error("インテグレーショントークンとデータベースIDを入力してください");
      return;
    }
    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync({ integrationToken: token, databaseId });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!token || !databaseId) {
      toast.error("インテグレーショントークンとデータベースIDを入力してください");
      return;
    }
    saveSettingsMutation.mutate({ integrationToken: token, databaseId });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notion連携設定</h1>
          <p className="text-muted-foreground mt-1">
            投稿内容・予約日時をNotionデータベースに自動同期できます。
          </p>
        </div>

        {/* 現在の接続状態 */}
        {!isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                現在の接続状態
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settings && settings.isActive ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">接続済み</span>
                    <Badge variant="outline" className="ml-auto">
                      {settings.databaseTitle ?? "Notionデータベース"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>データベースID: <code className="bg-muted px-1 rounded text-xs">{settings.databaseId}</code></div>
                    <div>トークン: <code className="bg-muted px-1 rounded text-xs">{settings.tokenMasked}</code></div>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-2" />
                    )}
                    連携を解除する
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span>未接続</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 設定フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {settings?.isActive ? "設定を更新する" : "Notionを連携する"}
            </CardTitle>
            <CardDescription>
              NotionのインテグレーショントークンとデータベースIDを入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* セットアップガイド */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">セットアップ手順</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    Notionのインテグレーション設定
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  で新しいインテグレーションを作成
                </li>
                <li>「インテグレーショントークン」をコピーして下に貼り付け</li>
                <li>Notionで投稿管理用のデータベースを作成し、インテグレーションを共有</li>
                <li>データベースのURLからIDをコピー（32文字の英数字）</li>
              </ol>
              <p className="text-blue-600 dark:text-blue-500 text-xs">
                ※ データベースには「Name（タイトル）」「プラットフォーム（セレクト）」「会社名（セレクト）」「ステータス（セレクト）」「投稿文（テキスト）」「予約日時（日付）」「ハッシュタグ（テキスト）」のプロパティを追加してください。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-1">
                <Key className="h-3 w-3" />
                インテグレーショントークン
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dbId" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                データベースID
              </Label>
              <Input
                id="dbId"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                NotionデータベースのURLの末尾32文字（ハイフンなし）
              </p>
            </div>

            {/* テスト結果 */}
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  testResult.success
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span>
                  {testResult.success
                    ? `接続成功！データベース「${testResult.databaseTitle}」に接続できました。`
                    : `接続失敗: ${testResult.error}`}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || testConnectionMutation.isPending || !token || !databaseId}
              >
                {isTesting || testConnectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                接続テスト
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending || !token || !databaseId}
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                )}
                保存して連携する
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 双方向同期 */}
        {settings?.isActive && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4" />
                Notionから変更を取得（双方向同期）
              </CardTitle>
              <CardDescription>
                Notionで予約日時・ステータスを変更した内容をアプリに取り込みます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap">取得範囲</label>
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={sinceHours}
                  onChange={(e) => setSinceHours(Number(e.target.value))}
                >
                  <option value={1}>過去1時間</option>
                  <option value={6}>過去6時間</option>
                  <option value={24}>過去24時間</option>
                  <option value={72}>過去3日間</option>
                  <option value={168}>過去7日間</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncFromNotionMutation.mutate({ sinceHours })}
                  disabled={syncFromNotionMutation.isPending}
                >
                  {syncFromNotionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Notionから取得
                </Button>
              </div>

              {syncResult && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {syncResult.syncedCount === 0
                      ? "変更はありませんでした"
                      : `${syncResult.syncedCount}件の変更を取得しました`}
                  </p>
                  {syncResult.changes.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {syncResult.changes.map((change) => (
                        <div
                          key={change.pageId}
                          className="border rounded-lg p-3 text-sm space-y-1 bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate flex-1">{change.title || change.postText.slice(0, 30)}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {change.platform}
                            </Badge>
                            <Badge
                              variant={change.status === "posted" ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {change.status === "draft" ? "下書き" :
                               change.status === "scheduled" ? "予約済み" :
                               change.status === "posted" ? "投稿済み" : "失敗"}
                            </Badge>
                          </div>
                          {change.scheduledAt && (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock className="h-3 w-3" />
                              予約: {new Date(change.scheduledAt).toLocaleString("ja-JP")}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            最終更新: {new Date(change.lastEditedAt).toLocaleString("ja-JP")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notionテンプレート */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📊 Notionデータベーステンプレート
            </CardTitle>
            <CardDescription>
              投稿管理に最適なNotionデータベーステンプレートを用意しました。ワンクリックで自分のNotionに複製できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-medium">投稿管理テンプレート</p>
                  <p className="text-muted-foreground text-xs mt-0.5">プラットフォーム・会社名・ステータス・投稿文・予約日時・ハッシュタグのカラムが設定済み</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">テンプレートの使い方</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-400 text-xs">
                <li>下のボタンからNotionテンプレートを開く</li>
                <li>右上の「複製」ボタンをクリックして自分のNotionに複製</li>
                <li>複製したデータベースのURLからIDをコピーして上のフォームに貼り付け</li>
              </ol>
            </div>

            <a
              href="https://www.notion.so/templates/sns-post-management"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Notionテンプレートを開く（ワンクリックで複製）
              </Button>
            </a>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <p className="font-medium mb-1">必要なNotionプロパティ一覧（テンプレートに含まれています）</p>
              <div className="grid grid-cols-2 gap-1">
                <span>• Name （タイトル）</span>
                <span>• プラットフォーム （セレクト）</span>
                <span>• 会社名 （セレクト）</span>
                <span>• ステータス （セレクト）</span>
                <span>• 投稿文 （テキスト）</span>
                <span>• 予約日時 （日付）</span>
                <span>• ハッシュタグ （テキスト）</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使い方 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">連携後の使い方</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>連携が完了すると、以下の場所から投稿をNotionに同期できます：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>AI投稿生成ページ → 投稿文生成後に「Notionに保存」ボタンが表示されます</li>
              <li>下書き一覧 → 各下書きの「Notionに同期」ボタンから同期できます</li>
              <li>予約投稿管理 → 予約投稿をNotionに同期して管理できます</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
