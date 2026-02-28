import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressSteps } from "@/components/ProgressSteps";
import { toast } from "sonner";
import {
  Loader2, Image as ImageIcon, FileText, Calendar, CheckCircle,
  ArrowLeftRight, Scissors, Smile, Hash, Megaphone, RotateCcw, Star
} from "lucide-react";

export default function BeforeAfterPost() {
  const [currentStep, setCurrentStep] = useState(1);
  const [beforeImage, setBeforeImage] = useState<any>(null);
  const [afterImage, setAfterImage] = useState<any>(null);
  const [generatedPost, setGeneratedPost] = useState<any>(null);
  const [editedPostText, setEditedPostText] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [platform, setPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const utils = trpc.useUtils();
  const logActivityMutation = trpc.activityLog.create.useMutation();
  const refineMutation = trpc.postQuality.refine.useMutation();
  const scoreMutation = trpc.postQuality.score.useMutation();

  const steps = [
    { id: 1, title: "ビフォー写真", description: "施工前の写真" },
    { id: 2, title: "アフター写真", description: "施工後の写真" },
    { id: 3, title: "投稿文を生成", description: "AIが比較投稿を作成" },
    { id: 4, title: "内容を確認", description: "投稿文をチェック" },
    { id: 5, title: "予約する", description: "日時を設定" },
    { id: 6, title: "完了", description: "予約完了" },
  ];

  const fetchPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation();

  const generateBeforeAfterMutation = trpc.demo.generateAllPlatformContents.useMutation({
    onSuccess: (data) => {
      setGeneratedPost(data);
      toast.success("ビフォーアフター投稿文を生成しました！");
      logActivityMutation.mutate({
        activityType: "post_generation",
        description: "ビフォーアフター投稿文を生成しました",
        status: "success",
        metadata: JSON.stringify({ type: "before_after", platform }),
      });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const createDraftMutation = trpc.approval.createDraft.useMutation({
    onSuccess: () => {
      toast.success("承認待ちとして保存しました！");
      setCurrentStep(6);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleFetchBefore = () => {
    fetchPhotoMutation.mutate(undefined, {
      onSuccess: (data) => {
        setBeforeImage(data);
        toast.success("ビフォー写真を取得しました！");
      },
    });
  };

  const handleFetchAfter = () => {
    fetchPhotoMutation.mutate(undefined, {
      onSuccess: (data) => {
        setAfterImage(data);
        toast.success("アフター写真を取得しました！");
      },
    });
  };

  const handleGenerate = () => {
    const beforeDesc = beforeImage?.analysis?.description ?? "施工前の状態";
    const afterDesc = afterImage?.analysis?.description ?? "施工後の状態";
    const combinedAnalysis = {
      category: beforeImage?.analysis?.category ?? "リフォーム",
      style: beforeImage?.analysis?.style ?? "ビフォーアフター",
      description: `「施工前（ビフォー）」${beforeDesc}\n\n「施工後（アフター）」${afterDesc}\n\n施工前後の変化を魅力的に会えてください。`,
      keywords: [...(beforeImage?.analysis?.keywords ?? []), ...(afterImage?.analysis?.keywords ?? []), "ビフォーアフター", "施工事例"],
    };
    generateBeforeAfterMutation.mutate({
      imageAnalysis: combinedAnalysis,
      companyName: "ハゼモト建設",
    });
  };

  const handleSchedule = () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("日時を入力してください");
      return;
    }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    createDraftMutation.mutate({
      imageId: afterImage?.id ?? beforeImage?.id,
      companyName: "ハゼモト建設",
      platform,
      postContent: editedPostText ?? generatedPost[platform].post,
      hashtags: JSON.stringify(generatedPost[platform].hashtags),
      scheduledAt: scheduledAt.toISOString(),
    });
  };

  const handleNext = () => {
    if (currentStep === 1 && !beforeImage) { toast.error("ビフォー写真を選んでください"); return; }
    if (currentStep === 2 && !afterImage) { toast.error("アフター写真を選んでください"); return; }
    if (currentStep === 3 && !generatedPost) { toast.error("投稿文を生成してください"); return; }
    if (currentStep === 5) { handleSchedule(); return; }
    setCurrentStep(currentStep + 1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-primary" />
            ビフォーアフター投稿
          </h1>
          <p className="text-muted-foreground mt-2">
            施工前後の写真を使って、ハゼモト建設の技術力を伝える投稿を作成します
          </p>
        </div>

        <ProgressSteps steps={steps} currentStep={currentStep} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* ステップ1: ビフォー写真 */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-orange-50 border-orange-200">
                  <p className="text-sm font-medium text-orange-700 mb-2">📸 施工前（ビフォー）</p>
                  {beforeImage ? (
                    <div className="space-y-3">
                      <img src={beforeImage.url} alt="ビフォー" className="max-w-sm mx-auto rounded-lg shadow" />
                      <p className="text-sm text-muted-foreground">施工前の写真が選ばれました</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImageIcon className="h-16 w-16 mx-auto text-orange-300" />
                      <p className="text-muted-foreground">施工前の写真を取得してください</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleFetchBefore}
                  disabled={fetchPhotoMutation.isPending}
                  size="lg"
                  className="w-full"
                  variant="outline"
                >
                  {fetchPhotoMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ImageIcon className="mr-2 h-5 w-5" />}
                  ビフォー写真を取得
                </Button>
              </div>
            )}

            {/* ステップ2: アフター写真 */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* ビフォー写真のサムネイル表示 */}
                {beforeImage && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <img src={beforeImage.url} alt="ビフォー" className="w-16 h-16 object-cover rounded" />
                    <div>
                      <p className="text-xs text-muted-foreground">施工前（ビフォー）</p>
                      <p className="text-sm font-medium">選択済み ✓</p>
                    </div>
                  </div>
                )}
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-green-50 border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-2">✨ 施工後（アフター）</p>
                  {afterImage ? (
                    <div className="space-y-3">
                      <img src={afterImage.url} alt="アフター" className="max-w-sm mx-auto rounded-lg shadow" />
                      <p className="text-sm text-muted-foreground">施工後の写真が選ばれました</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImageIcon className="h-16 w-16 mx-auto text-green-300" />
                      <p className="text-muted-foreground">施工後の写真を取得してください</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleFetchAfter}
                  disabled={fetchPhotoMutation.isPending}
                  size="lg"
                  className="w-full"
                >
                  {fetchPhotoMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ImageIcon className="mr-2 h-5 w-5" />}
                  アフター写真を取得
                </Button>
              </div>
            )}

            {/* ステップ3: 投稿文生成 */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* ビフォーアフター並べて表示 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-orange-600">📸 ビフォー</p>
                    {beforeImage && <img src={beforeImage.url} alt="ビフォー" className="w-full rounded-lg shadow-sm" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-600">✨ アフター</p>
                    {afterImage && <img src={afterImage.url} alt="アフター" className="w-full rounded-lg shadow-sm" />}
                  </div>
                </div>

                {generatedPost ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800">投稿文が生成されました！</p>
                      <p className="text-sm text-green-700">次のステップで内容を確認できます</p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={generateBeforeAfterMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    {generateBeforeAfterMutation.isPending ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />生成中...</>
                    ) : (
                      <><ArrowLeftRight className="mr-2 h-5 w-5" />ビフォーアフター投稿文を生成</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* ステップ4: 内容確認 */}
            {currentStep === 4 && generatedPost && (
              <div className="space-y-4">
                <div>
                  <Label>投稿するプラットフォーム</Label>
                  <Select value={platform} onValueChange={(v: any) => { setPlatform(v); setEditedPostText(null); setQualityScore(null); }}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                      <SelectItem value="threads">Threads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">投稿文</h3>
                    <Button variant="ghost" size="sm" onClick={() => setEditedPostText(editedPostText !== null ? null : generatedPost[platform].post)}>
                      {editedPostText !== null ? "編集を閉じる" : "手動で編集"}
                    </Button>
                  </div>
                  {editedPostText !== null ? (
                    <Textarea value={editedPostText} onChange={(e) => setEditedPostText(e.target.value)} rows={6} className="resize-none" />
                  ) : (
                    <p className="whitespace-pre-wrap">{generatedPost[platform].post}</p>
                  )}
                  <h3 className="font-semibold">ハッシュタグ</h3>
                  <p className="text-primary">{generatedPost[platform].hashtags.join(" ")}</p>
                </div>

                {/* 修正提案ボタン */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">投稿文を修正する</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: "shorter", label: "もっと短く", icon: Scissors },
                      { type: "friendlier", label: "もっと親しみやすく", icon: Smile },
                      { type: "more_hashtags", label: "ハッシュタグ追加", icon: Hash },
                      { type: "add_cta", label: "CTAを追加", icon: Megaphone },
                      { type: "regenerate", label: "全体を書き直す", icon: RotateCcw },
                    ].map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        disabled={isRefining}
                        onClick={() => {
                          setIsRefining(true);
                          refineMutation.mutate(
                            { postText: editedPostText ?? generatedPost[platform].post, platform, refineType: type as any, companyName: "ハゼモト建設" },
                            {
                              onSuccess: (result) => {
                                setEditedPostText(typeof result.refinedText === "string" ? result.refinedText : null);
                                setQualityScore(null);
                                toast.success("投稿文を修正しました");
                                setIsRefining(false);
                              },
                              onError: () => { toast.error("修正に失敗しました"); setIsRefining(false); },
                            }
                          );
                        }}
                        className="flex items-center gap-1 text-xs"
                      >
                        {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 品質スコア */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isScoring}
                  onClick={() => {
                    setIsScoring(true);
                    scoreMutation.mutate(
                      { postText: editedPostText ?? generatedPost[platform].post, platform, companyName: "ハゼモト建設" },
                      {
                        onSuccess: (result) => { setQualityScore(result); setIsScoring(false); },
                        onError: () => { toast.error("品質チェックに失敗しました"); setIsScoring(false); },
                      }
                    );
                  }}
                >
                  {isScoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                  品質チェックをする
                </Button>

                {qualityScore && (
                  <div className={`border rounded-lg p-4 space-y-3 ${qualityScore.pass ? "border-green-300 bg-green-50" : "border-orange-300 bg-orange-50"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">品質スコア</span>
                      <Badge variant={qualityScore.pass ? "default" : "secondary"} className={qualityScore.pass ? "bg-green-600" : "bg-orange-500 text-white"}>
                        {qualityScore.total}点 / 100点
                      </Badge>
                    </div>
                    <Progress value={qualityScore.total} className="h-2" />
                    {qualityScore.feedback && <p className="text-sm text-muted-foreground">💡 {qualityScore.feedback}</p>}
                  </div>
                )}
              </div>
            )}

            {/* ステップ5: 予約 */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schedule-date">投稿する日付</Label>
                  <Input id="schedule-date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="mt-2" min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <Label htmlFor="schedule-time">投稿する時刻</Label>
                  <Input id="schedule-time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="mt-2" />
                </div>
                <div className="border rounded-lg p-4 bg-primary/5">
                  <p className="text-sm text-muted-foreground">📅 予約投稿の日時を選択してください。支援員が確認後、予約投稿に登録されます。</p>
                </div>
              </div>
            )}

            {/* ステップ6: 完了 */}
            {currentStep === 6 && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="h-24 w-24 mx-auto text-primary" />
                <h2 className="text-2xl font-bold">予約完了！</h2>
                <p className="text-muted-foreground">
                  ビフォーアフター投稿が承認待ちとして保存されました。<br />
                  支援員が確認後、予約投稿に登録されます。
                </p>
                <Button onClick={() => { setCurrentStep(1); setBeforeImage(null); setAfterImage(null); setGeneratedPost(null); setEditedPostText(null); setQualityScore(null); }} size="lg">
                  もう一度作成する
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ナビゲーション */}
        {currentStep < 6 && (
          <div className="flex justify-between gap-4">
            <Button onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} variant="outline" size="lg" className="w-32">
              戻る
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !beforeImage) ||
                (currentStep === 2 && !afterImage) ||
                (currentStep === 3 && !generatedPost) ||
                (currentStep === 5 && (!scheduleDate || !scheduleTime)) ||
                createDraftMutation.isPending
              }
              size="lg"
              className="w-32"
            >
              {createDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStep === 5 ? "予約する" : "次へ"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
