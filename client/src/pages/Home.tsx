import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Calendar, Image, BarChart3, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="container py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10" />}
            <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>ログイン</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI駆動型SNS自動投稿プラットフォーム
          </div>
          <h2 className="text-5xl font-bold tracking-tight">
            SNS投稿を<span className="text-primary">完全自動化</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            クラウドドライブの写真をAIが自動で選定し、Instagram、X、Threadsに最適化された投稿を作成。
            スケジュール管理から分析まで、すべてを一つのプラットフォームで。
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>
                今すぐ始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">主な機能</h3>
          <p className="text-muted-foreground">AIとクラウド技術で実現する、次世代のSNS管理</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <Image className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI画像選定</CardTitle>
              <CardDescription>
                クラウドドライブから最適な写真を自動で選定。建物の種類やデザインスタイルを自動認識します。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AIコンテンツ生成</CardTitle>
              <CardDescription>
                写真の内容を分析し、魅力的な投稿文とハッシュタグを自動生成。各SNSに最適化された内容を作成します。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary mb-2" />
              <CardTitle>投稿カレンダー</CardTitle>
              <CardDescription>
                視覚的なカレンダーで投稿スケジュールを管理。予約投稿も簡単に設定できます。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>詳細な分析</CardTitle>
              <CardDescription>
                いいね数、コメント数などのエンゲージメントを追跡。どの投稿が効果的かを分析します。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2" />
              <CardTitle>自動コメント返信</CardTitle>
              <CardDescription>
                簡単な質問にはAIが自動で返信。重要なコメントは通知でお知らせします。
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  IG
                </div>
              </div>
              <CardTitle>マルチプラットフォーム対応</CardTitle>
              <CardDescription>
                Instagram、X (Twitter)、Threadsに同時投稿。各プラットフォームに最適化された内容を配信します。
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center space-y-6">
            <h3 className="text-3xl font-bold">今すぐSNS投稿を自動化</h3>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              ハゼモト建設様、クリニックアーキプロ様向けに最適化されたAI駆動型SNS管理プラットフォーム。
              まずはログインして、あなたのSNSアカウントを連携してみましょう。
            </p>
            <Button size="lg" variant="secondary" asChild>
              <a href={getLoginUrl()}>
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container py-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
