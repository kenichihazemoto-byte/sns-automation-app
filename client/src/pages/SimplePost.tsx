import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ProgressSteps";
import { HelpButton } from "@/components/HelpButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VoiceGuide } from "@/components/VoiceGuide";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, FileText, Calendar, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Wand2, RotateCcw, Scissors, Smile, Hash, Megaphone, AlertTriangle, Star } from "lucide-react";

export default function SimplePost() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [generatedPost, setGeneratedPost] = useState<any>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editedPostText, setEditedPostText] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [showSupportAlert, setShowSupportAlert] = useState(false);

  const utils = trpc.useUtils();

  const refineMutation = trpc.postQuality.refine.useMutation();
  const scoreMutation = trpc.postQuality.score.useMutation();
  const [notionSynced, setNotionSynced] = useState(false);
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);
  const syncToNotionMutation = trpc.notion.syncPost.useMutation({
    onSuccess: (data) => {
      setNotionSynced(true);
      setNotionPageUrl(data.url);
      toast.success("Notionに保存しました！");
    },
    onError: (err) => {
      if (err.message.includes("Notion連携が設定")) {
        toast.error("まずNotion連携設定を行ってください。サイドバーの「Notion連携」から設定できます。");
      } else {
        toast.error(`Notion保存エラー: ${err.message}`);
      }
    },
  });

  const steps = [
    { id: 1, title: "写真を選ぶ", description: "リフォーム事例の写真" },
    { id: 2, title: "投稿文を作る", description: "AIが自動生成" },
    { id: 3, title: "内容を確認", description: "投稿文をチェック" },
    { id: 4, title: "予約する", description: "日時を設定" },
    { id: 5, title: "完了", description: "予約完了" },
  ];

  // 作業履歴記録
  const logActivityMutation = trpc.activityLog.create.useMutation();

  // 写真取得
  const fetchPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation({
    onSuccess: (data) => {
      setSelectedImage(data);
      toast.success("写真を取得しました！");
      
      // 作業履歴を記録
      logActivityMutation.mutate({
        activityType: "photo_upload",
        description: "かんたん投稿で写真を選択しました",
        status: "success",
        metadata: JSON.stringify({ imageUrl: data.url, fileName: data.fileName }),
      });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "photo_upload",
        description: "写真の取得に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ error: error.message }),
      });
    },
  });

  // 投稿文生成
  const generatePostMutation = trpc.demo.generateAllPlatformContents.useMutation({
    onSuccess: (data) => {
      setGeneratedPost(data);
      toast.success("投稿文を生成しました！");
      
      // 作業履歴を記録
      logActivityMutation.mutate({
        activityType: "post_generation",
        description: "かんたん投稿でAI投稿文を生成しました",
        status: "success",
        metadata: JSON.stringify({ 
          platforms: ["instagram", "x", "threads"],
          imageUrl: selectedImage?.url 
        }),
      });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "post_generation",
        description: "投稿文の生成に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ error: error.message }),
      });
    },
  });

  // 下書き保存（承認待ち）
  const createDraftMutation = trpc.approval.createDraft.useMutation({
    onSuccess: (data) => {
      toast.success("承認待ちとして保存しました！", {
        description: "支援員が確認後、予約投稿に登録されます",
      });
      setCurrentStep(5);
      
      // 作業履歴を記録
      logActivityMutation.mutate({
        activityType: "post_schedule",
        description: "承認待ち投稿を作成しました（かんたん投稿）",
        status: "success",
        metadata: JSON.stringify({ 
          draftId: data.id,
          platform,
          scheduledAt: `${scheduleDate}T${scheduleTime}` 
        }),
      });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "post_schedule",
        description: "承認待ち投稿の作成に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ error: error.message }),
      });
    },
  });

  // 予約投稿作成
  const createScheduleMutation = trpc.posts.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("予約投稿を作成しました！");
      setCurrentStep(5);
      utils.posts.schedules.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedImage) {
      toast.error("まず写真を選んでください");
      return;
    }
    if (currentStep === 2 && !generatedPost) {
      toast.error("投稿文を生成してください");
      return;
    }
    if (currentStep === 4 && (!scheduleDate || !scheduleTime)) {
      toast.error("日時を入力してください");
      return;
    }

    if (currentStep === 4) {
      setShowConfirmDialog(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmSchedule = () => {
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    
    // 下書き保存（承認待ち）
    createDraftMutation.mutate({
      imageId: selectedImage.id,
      companyName: "ハゼモト建設",
      platform,
      postContent: generatedPost[platform].post,
      hashtags: JSON.stringify(generatedPost[platform].hashtags),
      scheduledAt: scheduledAt.toISOString(),
    });

    setShowConfirmDialog(false);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedImage(null);
    setGeneratedPost(null);
    setScheduleDate("");
    setScheduleTime("");
    setPlatform("instagram");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">かんたん投稿</h1>
            <p className="text-muted-foreground mt-2">
              4つのステップでSNS投稿を予約できます
            </p>
          </div>
          <HelpButton
            title="かんたん投稿の使い方"
            content={
              <div className="space-y-2">
                <p>このページでは、簡単な操作でSNS投稿を予約できます。</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>「写真を取得」ボタンをクリック</li>
                  <li>「投稿文を生成」ボタンをクリック</li>
                  <li>生成された投稿文を確認</li>
                  <li>投稿する日時を選択</li>
                  <li>「次へ」ボタンで予約完了</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  困ったときは、各ステップの「？」ボタンを押してください。
                </p>
              </div>
            }
          />
        </div>

        {/* 進行状況バー */}
        <ProgressSteps steps={steps} currentStep={currentStep} />

        {/* メインコンテンツ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <ImageIcon className="h-5 w-5" />}
              {currentStep === 2 && <FileText className="h-5 w-5" />}
              {currentStep === 3 && <FileText className="h-5 w-5" />}
              {currentStep === 4 && <Calendar className="h-5 w-5" />}
              {currentStep === 5 && <CheckCircle className="h-5 w-5 text-primary" />}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ステップ1: 写真を選ぶ */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <VoiceGuide
                  text="ステップ1、写真を選びます。「写真を取得」ボタンを押すと、リフォーム事例の写真が表示されます。"
                  autoPlay
                />
                <div className="text-center py-8">
                  {selectedImage ? (
                    <div className="space-y-4">
                      <img
                        src={selectedImage.url}
                        alt="選択された写真"
                        className="max-w-md mx-auto rounded-lg shadow-lg"
                      />
                      <p className="text-sm text-muted-foreground">
                        この写真で投稿文を作成します
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="h-24 w-24 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        「写真を取得」ボタンを押すと、<br />
                        リフォーム事例の写真が表示されます
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => fetchPhotoMutation.mutate()}
                  disabled={fetchPhotoMutation.isPending}
                  size="lg"
                  className="w-full"
                >
                  {fetchPhotoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      写真を取得中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-5 w-5" />
                      写真を取得
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* ステップ2: 投稿文を作る */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <VoiceGuide text="ステップ2です。投稿文を生成ボタンを押すと、AIが写真から投稿文を自動で作成します。生成には少し時間がかかります。" />
                <div className="text-center py-8">
                  {generatedPost ? (
                    <div className="space-y-4">
                      <CheckCircle className="h-16 w-16 mx-auto text-primary" />
                      <p className="text-lg font-semibold">投稿文が生成されました！</p>
                      <p className="text-sm text-muted-foreground">
                        次のステップで内容を確認できます
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FileText className="h-24 w-24 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        「投稿文を生成」ボタンを押すと、<br />
                        AIが写真から投稿文を作成します
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() =>
                    generatePostMutation.mutate({
                      imageAnalysis: selectedImage.analysis,
                      companyName: "ハゼモト建設",
                    })
                  }
                  disabled={generatePostMutation.isPending || !selectedImage}
                  size="lg"
                  className="w-full"
                >
                  {generatePostMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      投稿文を生成中...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      投稿文を生成
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* ステップ3: 内容を確認 */}
            {currentStep === 3 && generatedPost && (
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

                {/* 投稿文表示・編集エリア */}
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">投稿文</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditedPostText(editedPostText !== null ? null : (generatedPost[platform].post))}
                    >
                      {editedPostText !== null ? "編集を閉じる" : "手動で編集"}
                    </Button>
                  </div>
                  {editedPostText !== null ? (
                    <Textarea
                      value={editedPostText}
                      onChange={(e) => setEditedPostText(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{generatedPost[platform].post}</p>
                  )}
                  
                  <h3 className="font-semibold mt-2">ハッシュタグ</h3>
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
                          const currentText = editedPostText ?? generatedPost[platform].post;
                          refineMutation.mutate(
                            { postText: currentText, platform, refineType: type as any, companyName: "ハゼモト建設" },
                            {
                              onSuccess: (result) => {
                                setEditedPostText(typeof result.refinedText === "string" ? result.refinedText : null);
                                setQualityScore(null);
                                toast.success("投稿文を修正しました");
                                setIsRefining(false);
                              },
                              onError: () => {
                                toast.error("修正に失敗しました");
                                setIsRefining(false);
                              },
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

                {/* 品質スコアリング */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isScoring}
                    onClick={() => {
                      setIsScoring(true);
                      const currentText = editedPostText ?? generatedPost[platform].post;
                      scoreMutation.mutate(
                        { postText: currentText, platform, companyName: "ハゼモト建設" },
                        {
                          onSuccess: (result) => {
                            setQualityScore(result);
                            setIsScoring(false);
                          },
                          onError: () => {
                            toast.error("品質チェックに失敗しました");
                            setIsScoring(false);
                          },
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
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>ハゼモトらしさ: {qualityScore.brand_voice}/30</div>
                        <div>地域貢献: {qualityScore.community_contribution}/20</div>
                        <div>読みやすさ: {qualityScore.readability}/20</div>
                        <div>ハッシュタグ: {qualityScore.hashtags}/15</div>
                        <div>CTA: {qualityScore.cta}/15</div>
                      </div>
                      {qualityScore.feedback && (
                        <p className="text-sm text-muted-foreground">💡 {qualityScore.feedback}</p>
                      )}
                      {!qualityScore.pass && (
                        <p className="text-sm text-orange-700 font-medium">
                          ↑ 上の修正ボタンで投稿文を改善すると、より良い投稿になります！
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* エラー時の支援員通知 */}
                {showSupportAlert && (
                  <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">支援員に相談しましょう</p>
                      <p className="text-sm text-yellow-700 mt-1">投稿文の修正に困ったときは、近くの支援員に尊ねてみてください。あなたの作業をサポートします！</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowSupportAlert(false)}>閉じる</Button>
                    </div>
                  </div>
                )}

                {/* Notion同期ボタン */}
                <div className="border border-dashed border-muted-foreground/30 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {notionSynced ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        ✅ Notionに保存済み
                        {notionPageUrl && (
                          <a href={notionPageUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs ml-1">
                            開く
                          </a>
                        )}
                      </span>
                    ) : (
                      <span>Notionに保存する（任意）</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncToNotionMutation.isPending || notionSynced}
                    onClick={() => {
                      const currentText = editedPostText ?? generatedPost?.instagram?.postText ?? "";
                      const platformLabel = platform === "instagram" ? "Instagram" : platform === "x" ? "X（Twitter）" : "Threads";
                      syncToNotionMutation.mutate({
                        title: `${platformLabel}投稿 ${new Date().toLocaleDateString("ja-JP")}`,
                        platform: platformLabel,
                        companyName: "ハゼモト建設",
                        postText: currentText,
                        status: "draft",
                        hashtags: generatedPost?.instagram?.hashtags?.join(" ") ?? "",
                      });
                    }}
                  >
                    {syncToNotionMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      "📋"
                    )}
                    Notionに保存
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  内容を確認したら「次へ」ボタンを押してください
                </p>
              </div>
            )}

            {/* ステップ4: 予約する */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <VoiceGuide text="ステップ4です。投稿する日時を選んでください。カレンダーから日付を選び、時刻を入力します。入力が終わったら、確認して保存ボタンを押してください。" />
                <div>
                  <Label htmlFor="schedule-date">投稿する日付</Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="mt-2"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="schedule-time">投稿する時刻</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="border rounded-lg p-4 bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    📅 予約投稿の日時を選択してください。<br />
                    設定した日時の30分前に通知が届きます。
                  </p>
                </div>
              </div>
            )}

            {/* ステップ5: 完了 */}
            {currentStep === 5 && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="h-24 w-24 mx-auto text-primary" />
                <h2 className="text-2xl font-bold">予約完了！</h2>
                <p className="text-muted-foreground">
                  予約投稿が登録されました。<br />
                  投稿時刻の30分前に通知が届きます。
                </p>
                <Button onClick={handleReset} size="lg" className="mt-4">
                  もう一度投稿を作成する
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ナビゲーションボタン */}
        {currentStep < 5 && (
          <div className="flex justify-between gap-4">
            <Button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              variant="outline"
              size="lg"
              className="w-32"
            >
              戻る
            </Button>

            <Button
              onClick={handleNextStep}
              disabled={
                (currentStep === 1 && !selectedImage) ||
                (currentStep === 2 && !generatedPost) ||
                (currentStep === 4 && (!scheduleDate || !scheduleTime))
              }
              size="lg"
              className="w-32"
            >
              {currentStep === 4 ? "予約する" : "次へ"}
            </Button>
          </div>
        )}

        {/* 確認ダイアログ */}
        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="予約投稿を作成しますか？"
          description={`${scheduleDate} ${scheduleTime}に${platform}へ投稿する予約を作成します。よろしいですか？`}
          confirmText="予約する"
          cancelText="キャンセル"
          onConfirm={handleConfirmSchedule}
        />
      </div>
    </DashboardLayout>
  );
}
