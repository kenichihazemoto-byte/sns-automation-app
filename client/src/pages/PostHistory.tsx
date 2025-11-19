import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Instagram, Twitter, MessageSquare, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

export default function PostHistory() {
  const { data: savedPosts, isLoading } = trpc.demo.getSavedPosts.useQuery();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "default",
      completed: "outline",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">投稿履歴</h1>
          <p className="text-muted-foreground mt-2">
            保存した投稿の一覧を確認できます
          </p>
        </div>

        {!savedPosts || savedPosts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <Calendar className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <p>保存された投稿がありません</p>
                <p className="text-sm mt-2">デモページで投稿を生成して保存してください</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {savedPosts.map((post: any) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {post.companyName}
                        {getStatusBadge(post.status)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(post.scheduledAt)}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 画像プレビュー */}
                    {post.image && (
                      <div className="flex gap-4">
                        <img
                          src={post.image.url}
                          alt="Post image"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">AI分析結果</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            カテゴリー: {post.image.category}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            キーワード: {post.image.keywords}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* プラットフォーム別の投稿内容 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {["instagram", "x", "threads"].map((platform) => {
                        const content = post.contents?.find((c: any) => c.platform === platform);
                        if (!content) return null;

                        return (
                          <Card key={platform} className="bg-muted/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                {getPlatformIcon(platform)}
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs line-clamp-3">{content.caption}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {content.hashtags?.split(",").slice(0, 3).map((tag: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
