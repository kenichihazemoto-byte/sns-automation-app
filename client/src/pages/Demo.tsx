import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, RefreshCw, Image as ImageIcon, Instagram, Twitter, MessageSquare, Save, Calendar } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Demo() {
  const [companyName, setCompanyName] = useState<"ハゼモト建設" | "クリニックアーキプロ">("ハゼモト建設");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [contents, setContents] = useState<any>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [photoCount, setPhotoCount] = useState<number>(5);
  const [multiplePhotos, setMultiplePhotos] = useState<any[]>([]);

  const utils = trpc.useUtils();

  const fetchPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation({
    onSuccess: (data) => {
      setSelectedImage(data);
      setAnalysis(data.analysis);
      setContents(null);
      setMultiplePhotos([]);
      toast.success("写真を取得し、AI分析が完了しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const fetchMultiplePhotosMutation = trpc.demo.getMultiplePhotosWithAnalysis.useMutation({
    onSuccess: (data) => {
      setMultiplePhotos(data);
      // 最もスコアが高い写真を自動選択
      if (data.length > 0) {
        setSelectedImage(data[0]);
        setAnalysis(data[0].analysis);
        setContents(null);
      }
      toast.success(`${data.length}枚の写真を取得し、AI分析が完了しました`);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const generateAllContentsMutation = trpc.demo.generateAllPlatformContents.useMutation({
    onSuccess: (data) => {
      setContents(data);
      toast.success("全プラットフォームの投稿文を生成しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const savePostMutation = trpc.demo.saveGeneratedPost.useMutation({
    onSuccess: () => {
      toast.success("投稿を保存しました");
      utils.demo.getSavedPosts.invalidate();
    },
    onError: (error) => {
      toast.error(`保存エラー: ${error.message}`);
    },
  });

  const handleFetchAndAnalyze = () => {
    fetchPhotoMutation.mutate();
  };

  const handleFetchMultiple = () => {
    fetchMultiplePhotosMutation.mutate({ count: photoCount });
  };

  const handleGenerateAll = async () => {
    if (!analysis) {
      toast.error("まず写真を取得してください");
      return;
    }

    generateAllContentsMutation.mutate({
      companyName,
      imageAnalysis: analysis,
    });
  };

  const handleSavePost = () => {
    if (!selectedImage || !analysis || !contents) {
      toast.error("写真と投稿文を生成してから保存してください");
      return;
    }

    const scheduledAt = scheduledDate ? new Date(scheduledDate) : undefined;

    savePostMutation.mutate({
      companyName,
      imageUrl: selectedImage.photo.url,
      imageAnalysis: analysis,
      contents,
      scheduledAt,
    });
  };

  const handleCopyContent = (platform: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPlatform(platform);
    toast.success(`${platform}の投稿文をコピーしました`);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const handleSelectPhoto = (photo: any) => {
    setSelectedImage(photo);
    setAnalysis(photo.analysis);
    setContents(null);
  };

  const isLoading = fetchPhotoMutation.isPending || generateAllContentsMutation.isPending || 
                    savePostMutation.isPending || fetchMultiplePhotosMutation.isPending;

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold">SNS投稿自動生成デモ</h1>
          <p className="text-muted-foreground mt-2">
            Google フォトから竣工写真を取得し、AIが自動で各SNSに最適化された投稿文を生成します
          </p>
        </div>

        {/* 会社選択 */}
        <Card>
          <CardHeader>
            <CardTitle>会社選択</CardTitle>
            <CardDescription>投稿する会社を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={companyName} onValueChange={(value: any) => setCompanyName(value)}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ハゼモト建設">ハゼモト建設</SelectItem>
                <SelectItem value="クリニックアーキプロ">クリニックアーキプロ</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1枚の写真を取得</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleFetchAndAnalyze}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {fetchPhotoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    取得・分析中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    写真を取得 & AI分析
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">複数写真を比較</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="photoCount">取得枚数</Label>
                <Input
                  id="photoCount"
                  type="number"
                  min="2"
                  max="10"
                  value={photoCount}
                  onChange={(e) => setPhotoCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleFetchMultiple}
                disabled={isLoading}
                size="lg"
                className="w-full"
                variant="outline"
              >
                {fetchMultiplePhotosMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    取得・分析中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {photoCount}枚の写真を取得 & 比較
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 複数写真の表示 */}
        {multiplePhotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>写真の比較（スコア順）</CardTitle>
              <CardDescription>
                AIが各写真を評価しました。クリックして選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {multiplePhotos.map((photo, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectPhoto(photo)}
                    className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                      selectedImage === photo ? "border-primary shadow-lg" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={photo.photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2 bg-background">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        スコア: {photo.score.toFixed(1)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {photo.analysis.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleGenerateAll}
            disabled={!analysis || isLoading}
            size="lg"
            className="flex-1 min-w-[200px]"
          >
            {generateAllContentsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                全SNSの投稿文を生成
              </>
            )}
          </Button>

          <Button
            onClick={handleSavePost}
            disabled={!contents || isLoading}
            size="lg"
            variant="secondary"
            className="flex-1 min-w-[200px]"
          >
            {savePostMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                投稿を保存
              </>
            )}
          </Button>
        </div>

        {/* 投稿予約日時 */}
        {contents && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">投稿スケジュール（オプション）</CardTitle>
              <CardDescription>
                特定の日時に投稿を予約する場合は日時を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側: 画像と分析結果 */}
          <div className="space-y-6">
            {/* 選択された画像 */}
            {selectedImage && (
              <Card>
                <CardHeader>
                  <CardTitle>選択された写真</CardTitle>
                  <CardDescription>{selectedImage.album.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <img
                    src={selectedImage.photo.url}
                    alt="Selected"
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                </CardContent>
              </Card>
            )}

            {/* AI分析結果 */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>AI画像分析結果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">カテゴリー</h4>
                    <Badge variant="secondary">{analysis.category}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">スタイル</h4>
                    <Badge variant="outline">{analysis.style}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">説明</h4>
                    <p className="text-sm text-gray-700">{analysis.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">キーワード</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右側: 生成された投稿文 */}
          <div>
            {contents && (
              <Card>
                <CardHeader>
                  <CardTitle>生成された投稿文</CardTitle>
                  <CardDescription>
                    各SNSに最適化された投稿文が生成されました
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="instagram" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </TabsTrigger>
                      <TabsTrigger value="x" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        X
                      </TabsTrigger>
                      <TabsTrigger value="threads" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Threads
                      </TabsTrigger>
                    </TabsList>

                    {["instagram", "x", "threads"].map((platform) => (
                      <TabsContent key={platform} value={platform} className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold flex items-center gap-2">
                              {getPlatformIcon(platform)}
                              投稿文
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleCopyContent(
                                  platform,
                                  `${contents[platform].caption}\n\n${contents[platform].hashtags.map((tag: string) => `#${tag}`).join(" ")}`
                                )
                              }
                            >
                              {copiedPlatform === platform ? (
                                <>
                                  <Check className="mr-2 h-4 w-4 text-green-600" />
                                  コピー済み
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  コピー
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm whitespace-pre-wrap mb-4">
                            {contents[platform].caption}
                          </p>
                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">ハッシュタグ</h4>
                            <div className="flex flex-wrap gap-2">
                              {contents[platform].hashtags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-background border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">投稿プレビュー</h4>
                          <div className="text-sm space-y-2">
                            <p className="whitespace-pre-wrap">{contents[platform].caption}</p>
                            <p className="text-primary">
                              {contents[platform].hashtags.map((tag: string) => `#${tag}`).join(" ")}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {!contents && !isLoading && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p>写真を取得して「全SNSの投稿文を生成」ボタンを押してください</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 説明 */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">デモについて</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              このデモでは、Google フォトの竣工写真アルバム（2009年〜2025年）からランダムに写真を選び、
              OpenAI Vision APIで画像の内容を分析します。
            </p>
            <p>
              その後、分析結果を基に各SNSプラットフォーム（Instagram、X、Threads）に
              最適化された投稿文とハッシュタグを自動生成します。
            </p>
            <p className="font-medium text-primary">
              生成された投稿文は「コピー」ボタンで簡単にコピーでき、各SNSに手動で投稿できます。
              また、「投稿を保存」ボタンで投稿内容をデータベースに保存し、後から確認・再利用できます。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
