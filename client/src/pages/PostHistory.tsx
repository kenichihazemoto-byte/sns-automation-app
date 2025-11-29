import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Instagram, Twitter, MessageSquare, Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function PostHistory() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const { data: history, isLoading } = trpc.posts.history.useQuery({ limit: 100 });

  const filteredHistory = history?.filter((item: any) => {
    if (platformFilter === "all") return true;
    return item.platform === platformFilter;
  });

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

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "Instagram";
      case "x":
        return "X";
      case "threads":
        return "Threads";
      default:
        return platform;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            投稿済み
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            失敗
          </Badge>
        );
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">投稿履歴</h1>
            <p className="text-muted-foreground mt-2">
              過去の投稿履歴を確認できます
            </p>
          </div>

          {/* プラットフォームフィルター */}
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="プラットフォーム" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="x">X</SelectItem>
              <SelectItem value="threads">Threads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 投稿履歴一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>投稿履歴</CardTitle>
            <CardDescription>
              {filteredHistory?.length || 0}件の投稿履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHistory && filteredHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(item.platform)}
                        <span className="font-medium">{getPlatformName(item.platform)}</span>
                        {getStatusBadge(item.status)}
                      </div>

                      {item.publishedAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.publishedAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                        </div>
                      )}

                      {item.postId && (
                        <div className="text-sm text-muted-foreground">
                          投稿ID: {item.postId}
                        </div>
                      )}

                      {item.errorMessage && (
                        <div className="text-sm text-destructive">
                          エラー: {item.errorMessage}
                        </div>
                      )}
                    </div>

                    {item.postUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={item.postUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          投稿を見る
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {platformFilter === "all" 
                  ? "投稿履歴がありません"
                  : `${getPlatformName(platformFilter)}の投稿履歴がありません`
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
