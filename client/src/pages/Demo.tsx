import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, RefreshCw, Image as ImageIcon, Instagram, Twitter, MessageSquare, Save, Calendar, Download, Upload } from "lucide-react";
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

  const uploadImageMutation = trpc.demo.uploadAndAnalyzeImage.useMutation({
    onSuccess: (data) => {
      setSelectedImage(data);
      setAnalysis(data.analysis);
      setContents(null);
      setMultiplePhotos([]);
      toast.success("写真をアップロードし、AI分析が完了しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ファイルサイズは10MB以下にしてください");
      return;
    }

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      uploadImageMutation.mutate({
        imageBase64: base64,
        fileName: file.name,
        companyName,
      });
    };
    reader.readAsDataURL(file);
  };

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

  // 写真をダウンロードする関数
  const handleDownloadImage = async () => {
    if (!selectedImage) return;

    try {
      const response = await fetch(selectedImage.photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_${new Date().getTime()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("写真をダウンロードしました");
    } catch (error) {
      toast.error("写真のダウンロードに失敗しました");
    }
  };

  // 写真と投稿文を一括コピーする関数
  const handleCopyWithImage = async (platform: string, content: string) => {
    if (!selectedImage) {
      toast.error("写真が選択されていません");
      return;
    }

    try {
      // 画像をBlobとして取得
      const response = await fetch(selectedImage.photo.url);
      const blob = await response.blob();

      // ClipboardItemを使用して画像とテキストを一緒にコピー
      const clipboardItem = new ClipboardItem({
        'image/jpeg': blob,
        'text/plain': new Blob([content], { type: 'text/plain' }),
      });

      await navigator.clipboard.write([clipboardItem]);
      setCopiedPlatform(platform);
      toast.success(`${platform}の投稿文と写真をコピーしました`);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (error) {
      // フォールバック: テキストのみコピー
      navigator.clipboard.writeText(content);
      toast.info(`投稿文のみコピーしました（写真は手動でダウンロードしてください）`);
    }
  };

  const handleSelectPhoto = (photo: any) => {
    setSelectedImage(photo);
    setAnalysis(photo.analysis);
    setContents(null);
  };

  const isLoading = uploadImageMutation.isPending || fetchPhotoMutation.isPending || 
                    generateAllContentsMutation.isPending || savePostMutation.isPending || 
                    fetchMultiplePhotosMutation.isPending;

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
            写真をアップロードまたはGoogle フォトから取得し、AIが自動で各SNSに最適化された投稿文を生成します
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">写真をアップロード</CardTitle>
              <CardDescription>手動で写真を選択</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  {uploadImageMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      写真を選択
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  10MB以下のJPG、PNG画像
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1枚の写真を取得</CardTitle>
              <CardDescription>Google フォトから自動取得</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleFetchAndAnalyze}
                disabled={isLoading}
                size="lg"
                className="w-full"
                variant="outline"
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
              <CardDescription>Google フォトから複数取得</CardDescription>
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

        {/* 選択された写真の表示 */}
        {selectedImage && (
          <Card>
            <CardHeader>
              <CardTitle>選択された写真</CardTitle>
              <CardDescription>
                この写真で投稿文を生成します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full max-w-2xl mx-auto">
                <img
                  src={selectedImage.photo.url}
                  alt="Selected"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleDownloadImage} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  写真をダウンロード
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI分析結果 */}
        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle>AI分析結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">カテゴリー</Label>
                  <p className="font-medium">{analysis.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">スタイル</Label>
                  <p className="font-medium">{analysis.style}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">説明</Label>
                <p className="text-sm">{analysis.description}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">キーワード</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.keywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="secondary">{keyword}</Badge>
                  ))}
                </div>
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
            variant="outline"
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
              <CardTitle className="text-lg">投稿予約（オプション）</CardTitle>
              <CardDescription>
                特定の日時に投稿を予約する場合は日時を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="scheduledDate">予約日時</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 生成された投稿文 */}
        {contents && (
          <Card>
            <CardHeader>
              <CardTitle>生成された投稿文</CardTitle>
              <CardDescription>
                各プラットフォームに最適化された投稿文とハッシュタグが生成されました
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="instagram" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="instagram">
                    <Instagram className="mr-2 h-4 w-4" />
                    Instagram
                  </TabsTrigger>
                  <TabsTrigger value="x">
                    <Twitter className="mr-2 h-4 w-4" />
                    X
                  </TabsTrigger>
                  <TabsTrigger value="threads">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Threads
                  </TabsTrigger>
                </TabsList>

                {["instagram", "x", "threads"].map((platform) => (
                  <TabsContent key={platform} value={platform} className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap mb-3">
                        {contents[platform].caption}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {contents[platform].hashtags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCopyContent(
                          platform,
                          `${contents[platform].caption}\n\n${contents[platform].hashtags.map((t: string) => `#${t}`).join(" ")}`
                        )}
                        variant="outline"
                        className="flex-1"
                      >
                        {copiedPlatform === platform ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            コピー済み
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            投稿文をコピー
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleCopyWithImage(
                          platform,
                          `${contents[platform].caption}\n\n${contents[platform].hashtags.map((t: string) => `#${t}`).join(" ")}`
                        )}
                        className="flex-1"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        写真と投稿文を一括コピー
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
