import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Image, Sparkles, Calendar } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" asChild>
                  <a href="/dashboard">ダッシュボード</a>
                </Button>
                <Button asChild>
                  <a href="/demo">デモを試す</a>
                </Button>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            AIがSNS投稿を
            <br />
            <span className="text-primary">自動生成</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Google フォトの写真をAIが分析し、Instagram、X、Threadsに最適化された
            投稿文とハッシュタグを自動生成します
          </p>
          <div className="flex gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <>
                <Button size="lg" asChild>
                  <a href="/demo">今すぐ試す</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/help">使い方を見る</a>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <a href={getLoginUrl()}>無料で始める</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">機能を見る</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section id="features" className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Image className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">AI画像分析</h3>
              <p className="text-muted-foreground">
                OpenAI Vision APIで写真の内容を自動分析。
                カテゴリー、スタイル、キーワードを抽出します。
              </p>
            </div>

            <div className="space-y-3 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">プラットフォーム最適化</h3>
              <p className="text-muted-foreground">
                Instagram、X、Threadsそれぞれに最適化された
                投稿文とハッシュタグを自動生成。
              </p>
            </div>

            <div className="space-y-3 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">投稿管理</h3>
              <p className="text-muted-foreground">
                生成した投稿を保存し、スケジュール管理。
                過去の投稿履歴も確認できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">3ステップで簡単</h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">設定を完了</h3>
                <p className="text-muted-foreground">
                  会社名とGoogle フォトアルバムのURLを登録します。
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">写真を取得</h3>
                <p className="text-muted-foreground">
                  デモページで写真を取得し、AIが自動で分析します。
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">投稿文を生成</h3>
                <p className="text-muted-foreground">
                  全SNSの投稿文を一括生成し、コピーして使用します。
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <a href={isAuthenticated ? "/demo" : getLoginUrl()}>
                {isAuthenticated ? "デモを試す" : "今すぐ始める"}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t py-8 px-4 mt-auto">
        <div className="container max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 {APP_TITLE}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
