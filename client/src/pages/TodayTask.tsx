import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Star, Trophy, Flame, Target, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";
import { toast } from "sonner";

const BADGE_ICONS: Record<string, string> = {
  first_post: "🌱",
  "10_posts": "🎯",
  "50_posts": "🏆",
  quality_master: "⭐",
  streak_7: "🔥",
};

const BADGE_COLORS: Record<string, string> = {
  first_post: "bg-green-100 text-green-800 border-green-200",
  "10_posts": "bg-blue-100 text-blue-800 border-blue-200",
  "50_posts": "bg-yellow-100 text-yellow-800 border-yellow-200",
  quality_master: "bg-purple-100 text-purple-800 border-purple-200",
  streak_7: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function TodayTask() {
  const [, navigate] = useLocation();
  const { data: todayProgress, refetch: refetchProgress } = trpc.dailyTask.getToday.useQuery();
  const { data: weeklyStats } = trpc.dailyTask.getWeeklyStats.useQuery();
  const { data: myBadges, refetch: refetchBadges } = trpc.badges.getMyBadges.useQuery();
  const { data: activityStats } = trpc.activityLog.getStats.useQuery({});
  const { data: currentUser } = trpc.auth.me.useQuery();

  const today = new Date();
  const completed = todayProgress?.completedPostCount ?? 0;
  const target = todayProgress?.targetPostCount ?? 1;
  const progressPercent = Math.min(100, Math.round((completed / target) * 100));
  const isCompleted = completed >= target;

  // 今週の達成日数
  const weekAchieved = (weeklyStats ?? []).filter(d => d.completed >= d.target).length;

  // 作業ステップ定義
  const steps = [
    {
      id: 1,
      title: "写真を選んで投稿文を作る",
      description: "かんたん投稿で写真を1枚選び、AIに投稿文を作ってもらいましょう",
      icon: "📸",
      action: () => navigate("/simple-post"),
      done: completed >= 1,
    },
    {
      id: 2,
      title: "支援員に確認を依頼する",
      description: "作成した投稿文を承認キューに送り、支援員にチェックしてもらいましょう",
      icon: "✅",
      action: () => navigate("/post-drafts"),
      done: completed >= 1 && (activityStats?.totalActivities ?? 0) > 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            今日のタスク
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "M月d日（E）", { locale: ja })} — {currentUser?.name ?? ""}さん、今日もよろしくお願いします！
          </p>
        </div>

        {/* 今日の進捗カード */}
        <Card className={isCompleted ? "border-green-400 bg-green-50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                今日の目標
              </CardTitle>
              <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-600" : ""}>
                {completed} / {target} 投稿
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercent} className="h-3" />
            {isCompleted ? (
              <p className="text-green-700 font-medium text-sm flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                今日のタスク達成！お疲れ様でした！
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                あと <strong>{target - completed} 投稿</strong> で今日の目標達成です
              </p>
            )}
          </CardContent>
        </Card>

        {/* 作業ステップ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">今日やること</CardTitle>
            <CardDescription>順番に進めましょう。分からないことは支援員に聞いてください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  step.done
                    ? "bg-green-50 border-green-200"
                    : index === 0 || steps[index - 1]?.done
                    ? "bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10"
                    : "bg-muted/30 border-muted opacity-60"
                }`}
                onClick={step.done || index === 0 || steps[index - 1]?.done ? step.action : undefined}
              >
                <div className="text-2xl mt-0.5">{step.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                      ステップ {step.id}: {step.title}
                    </p>
                    {step.done && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                {!step.done && (index === 0 || steps[index - 1]?.done) && (
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 今週の達成状況 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              今週の達成状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dateStr = d.toISOString().slice(0, 10);
                const stat = (weeklyStats ?? []).find(s => s.date === dateStr);
                const achieved = stat ? stat.completed >= stat.target : false;
                const isToday = dateStr === today.toISOString().slice(0, 10);
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                        achieved
                          ? "bg-orange-400 border-orange-500 text-white"
                          : isToday
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {achieved ? "🔥" : format(d, "d")}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(d, "E", { locale: ja })}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              今週 <strong className="text-foreground">{weekAchieved}日</strong> 達成しました！
              {weekAchieved >= 5 && " 素晴らしい！この調子で続けましょう 🎉"}
              {weekAchieved >= 3 && weekAchieved < 5 && " 良いペースです！"}
              {weekAchieved < 3 && " 毎日少しずつ積み重ねましょう！"}
            </p>
          </CardContent>
        </Card>

        {/* バッジコレクション */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              獲得バッジ
            </CardTitle>
            <CardDescription>作業を続けると新しいバッジが獲得できます</CardDescription>
          </CardHeader>
          <CardContent>
            {myBadges && myBadges.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {myBadges.map((badge: any) => (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium ${
                      BADGE_COLORS[badge.badgeType] ?? "bg-gray-100 text-gray-800 border-gray-200"
                    }`}
                  >
                    <span>{BADGE_ICONS[badge.badgeType] ?? "🏅"}</span>
                    {badge.badgeName}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">まだバッジがありません</p>
                <p className="text-xs mt-1">投稿文を作成するとバッジが獲得できます！</p>
              </div>
            )}

            {/* 未獲得バッジのヒント */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">次に獲得できるバッジ</p>
              {[
                { type: "first_post", name: "はじめの一歩", desc: "初めての投稿文を生成する", icon: "🌱" },
                { type: "10_posts", name: "10投稿達成", desc: "投稿文を10件生成する", icon: "🎯" },
                { type: "streak_7", name: "連続投稿7日", desc: "7日連続で投稿文を作成する", icon: "🔥" },
                { type: "50_posts", name: "50投稿達成", desc: "投稿文を50件生成する", icon: "🏆" },
              ]
                .filter(b => !(myBadges ?? []).some((mb: any) => mb.badgeType === b.type))
                .slice(0, 2)
                .map(b => (
                  <div key={b.type} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="opacity-40">{b.icon}</span>
                    <span className="opacity-60">{b.name}</span>
                    <span className="text-xs">— {b.desc}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* クイックアクション */}
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => navigate("/simple-post")}>
            <Sparkles className="h-4 w-4 mr-2" />
            かんたん投稿を始める
          </Button>
          <Button variant="outline" onClick={() => navigate("/post-drafts")}>
            下書きを確認
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
