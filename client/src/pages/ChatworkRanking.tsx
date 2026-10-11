import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw, Send, Trophy } from "lucide-react";

export default function ChatworkRanking() {
  const utils = trpc.useUtils();
  const { data: status, isLoading } = trpc.chatworkRanking.status.useQuery();
  const preview = trpc.chatworkRanking.preview.useQuery(undefined, {
    enabled: !!status?.configured,
    retry: false,
  });

  const sync = trpc.chatworkRanking.sync.useMutation({
    onSuccess: r => {
      toast.success(`取得しました（メッセージ${r.messages}件・メンバー${r.members}名）`);
      utils.chatworkRanking.preview.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const postNow = trpc.chatworkRanking.postNow.useMutation({
    onSuccess: r => {
      if (r.posted) toast.success(`Chatworkに投稿しました（${r.weekKey}週）`);
      else toast.info(r.reason ?? "投稿しませんでした");
      utils.chatworkRanking.status.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const report = preview.data?.report;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            大工チーム 週間ランキング
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Chatwork「TeamDAIKU（大工チーム）」の投稿状況を集計し、{status?.schedule ?? "毎週月曜 6:50"}に先週のランキングを自動投稿します。
          </p>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : !status?.configured ? (
          <Card>
            <CardHeader>
              <CardTitle>Chatwork APIトークンが未設定です</CardTitle>
              <CardDescription>
                サーバーの環境変数 <code>CHATWORK_API_TOKEN</code> を設定してください（Chatwork → 右上メニュー →「サービス連携」→「APIトークン」）。
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant={status.enabled ? "default" : "secondary"}>
                自動投稿：{status.enabled ? "ON" : "OFF"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
                {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-1">最新データを取得</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (confirm("先週のランキングを今すぐChatworkに投稿しますか？")) postNow.mutate({ force: false });
                }}
                disabled={postNow.isPending}
              >
                {postNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ml-1">今すぐ投稿</span>
              </Button>
            </div>

            {preview.error && <p className="text-destructive text-sm">{preview.error.message}</p>}

            {report && (
              <Card>
                <CardHeader>
                  <CardTitle>先週の集計 {report.week.label}</CardTitle>
                  <CardDescription>
                    チーム投稿 {report.team.totalPosts}件／参加率 {report.team.participationRate}%（
                    {report.team.activeMembers}/{report.team.totalMembers}人）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="py-2">順位</th>
                          <th>名前</th>
                          <th className="text-right">スコア</th>
                          <th className="text-right">投稿日数</th>
                          <th className="text-right">投稿</th>
                          <th className="text-right">写真</th>
                          <th className="text-right">返信</th>
                          <th className="text-right">朝イチ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.ranking.map(r => (
                          <tr key={r.accountId} className="border-b last:border-0">
                            <td className="py-2">{r.rank}</td>
                            <td>{r.name}</td>
                            <td className="text-right font-semibold">{r.score}</td>
                            <td className="text-right">{r.activeDays}/7</td>
                            <td className="text-right">{r.posts}</td>
                            <td className="text-right">{r.photos}</td>
                            <td className="text-right">{r.replies}</td>
                            <td className="text-right">{r.morningDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {preview.data && (
              <Card>
                <CardHeader>
                  <CardTitle>投稿プレビュー</CardTitle>
                  <CardDescription>月曜 6:50 に以下の内容で投稿されます（[info]タグはChatwork上で枠表示になります）</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{preview.data.text}</pre>
                </CardContent>
              </Card>
            )}

            {status.history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>投稿履歴</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {status.history.map(h => (
                      <li key={h.id}>
                        {h.weekKey}週 — {new Date(h.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} 投稿
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
