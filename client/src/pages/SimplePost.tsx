import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ProgressSteps";
import { HelpButton } from "@/components/HelpButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, FileText, Calendar, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SimplePost() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [generatedPost, setGeneratedPost] = useState<any>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const utils = trpc.useUtils();

  const steps = [
    { id: 1, title: "写真を選ぶ", description: "リフォーム事例の写真" },
    { id: 2, title: "投稿文を作る", description: "AIが自動生成" },
    { id: 3, title: "内容を確認", description: "投稿文をチェック" },
    { id: 4, title: "予約する", description: "日時を設定" },
    { id: 5, title: "完了", description: "予約完了" },
  ];

  // 写真取得
  const fetchPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation({
    onSuccess: (data) => {
      setSelectedImage(data);
      toast.success("写真を取得しました！");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 投稿文生成
  const generatePostMutation = trpc.demo.generateAllPlatformContents.useMutation({
    onSuccess: (data) => {
      setGeneratedPost(data);
      toast.success("投稿文を生成しました！");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
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
    
    createScheduleMutation.mutate({
      imageId: selectedImage.id,
      companyName: "ハゼモト建設",
      scheduledAt,
      platform,
      postContent: generatedPost[platform].post,
      hashtags: generatedPost[platform].hashtags,
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
                  onClick={() => fetchPhotoMutation.mutate({ companyName: "ハゼモト建設" })}
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
                      imageUrl: selectedImage.url,
                      analysis: selectedImage.analysis,
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
                  <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
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

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">投稿文</h3>
                  <p className="whitespace-pre-wrap">{generatedPost[platform].post}</p>
                  
                  <h3 className="font-semibold mt-4 mb-2">ハッシュタグ</h3>
                  <p className="text-primary">{generatedPost[platform].hashtags.join(" ")}</p>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  内容を確認したら「次へ」ボタンを押してください
                </p>
              </div>
            )}

            {/* ステップ4: 予約する */}
            {currentStep === 4 && (
              <div className="space-y-4">
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
