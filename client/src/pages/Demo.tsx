import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Instagram, Twitter, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Demo() {
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const getPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setGeneratedContent(null);
      toast.success("写真の分析が完了しました！");
    },
    onError: (error) => {
      toast.error(`エラーが発生しました: ${error.message}`);
    },
  });

  const generatePostMutation = trpc.demo.generatePostDemo.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("投稿文の生成が完了しました！");
    },
    onError: (error) => {
      toast.error(`エラーが発生しました: ${error.message}`);
    },
  });

  const handleGetRandomPhoto = () => {
    getPhotoMutation.mutate();
  };

  const handleGeneratePost = () => {
    if (!analysisResult) {
      toast.error("まず写真を取得してください");
      return;
    }

    generatePostMutation.mutate({
      platform: selectedPlatform,
      companyName: "ハゼモト建設",
      imageAnalysis: analysisResult.analysis,
    });
  };

  const isLoading = getPhotoMutation.isPending || generatePostMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI投稿デモ</h1>
          <p className="text-muted-foreground mt-2">
            Google フォトから写真を取得し、AIが自動で分析・投稿文を生成します
          </p>
        </div>

        {/* Step 1: 写真取得 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ステップ1: ランダムな竣工写真を取得
            </CardTitle>
            <CardDescription>
              Google フォトアルバムからランダムに写真を選び、AIが内容を分析します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGetRandomPhoto} disabled={isLoading}>
              {getPhotoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                "写真を取得して分析"
              )}
            </Button>

            {analysisResult && (
              <div className="mt-4 space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">選択されたアルバム</h3>
                  <p className="text-sm">{analysisResult.album.title}</p>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">AI分析結果</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">カテゴリー: </span>
                      <span>{analysisResult.analysis.category}</span>
                    </div>
                    <div>
                      <span className="font-medium">スタイル: </span>
                      <span>{analysisResult.analysis.style}</span>
                    </div>
                    <div>
                      <span className="font-medium">説明: </span>
                      <span>{analysisResult.analysis.description}</span>
                    </div>
                    <div>
                      <span className="font-medium">キーワード: </span>
                      <span>{analysisResult.analysis.keywords.join(", ")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: 投稿文生成 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ステップ2: SNS投稿文を生成
            </CardTitle>
            <CardDescription>
              プラットフォームを選択して、最適化された投稿文を生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={selectedPlatform === "instagram" ? "default" : "outline"}
                onClick={() => setSelectedPlatform("instagram")}
                disabled={!analysisResult}
              >
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </Button>
              <Button
                variant={selectedPlatform === "x" ? "default" : "outline"}
                onClick={() => setSelectedPlatform("x")}
                disabled={!analysisResult}
              >
                <Twitter className="mr-2 h-4 w-4" />
                X (Twitter)
              </Button>
              <Button
                variant={selectedPlatform === "threads" ? "default" : "outline"}
                onClick={() => setSelectedPlatform("threads")}
                disabled={!analysisResult}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Threads
              </Button>
            </div>

            <Button onClick={handleGeneratePost} disabled={isLoading || !analysisResult}>
              {generatePostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "投稿文を生成"
              )}
            </Button>

            {generatedContent && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/50 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">生成された投稿文</h3>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.caption}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">ハッシュタグ</h3>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.hashtags.map((tag: string, index: number) => (
                      <span key={index} className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">完成した投稿プレビュー</h3>
                  <div className="bg-background border rounded-lg p-4 text-sm">
                    <p className="whitespace-pre-wrap">{generatedContent.caption}</p>
                    <p className="mt-3 text-primary">
                      {generatedContent.hashtags.map((tag: string) => `#${tag}`).join(" ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 説明 */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">デモについて</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              このデモでは、Google フォトの竣工写真アルバムからランダムに写真を選び、
              OpenAI Vision APIで画像の内容を分析します。
            </p>
            <p>
              その後、分析結果を基に各SNSプラットフォーム（Instagram、X、Threads）に
              最適化された投稿文とハッシュタグを自動生成します。
            </p>
            <p className="font-medium text-primary">
              実際の運用では、これらの処理が完全自動で定期的に実行されます。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
