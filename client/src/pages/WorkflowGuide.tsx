import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import {
  BookOpen, Sparkles, GitCompare, PenLine, MapPin,
  Save, Calendar, History, FileText, CheckSquare,
  Users, Wrench, ChevronDown, ChevronUp, Info
} from "lucide-react";

// ===== データ定義 =====

const DEPT_COLORS: Record<string, string> = {
  "🙋 利用者":  "bg-blue-100 text-blue-800 border-blue-200",
  "👩‍💼 支援員":  "bg-purple-100 text-purple-800 border-purple-200",
  "🤖 システム": "bg-gray-100 text-gray-700 border-gray-200",
  "🏢 管理者":  "bg-orange-100 text-orange-800 border-orange-200",
  "—":          "bg-transparent text-muted-foreground border-transparent",
};

const TOOL_BADGES: Record<string, string> = {
  "SNS自動化アプリ":    "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Googleアカウント":   "bg-red-50 text-red-700 border-red-200",
  "Googleフォト":       "bg-green-50 text-green-700 border-green-200",
  "テンプレート機能":   "bg-yellow-50 text-yellow-700 border-yellow-200",
  "予約投稿機能":       "bg-teal-50 text-teal-700 border-teal-200",
  "GBP":                "bg-orange-50 text-orange-700 border-orange-200",
  "通知機能":           "bg-pink-50 text-pink-700 border-pink-200",
  "端末":               "bg-slate-50 text-slate-700 border-slate-200",
};

type Step = {
  step: string;
  action: string;
  dept: string;
  tools: string[];
  note?: string;
};

type Flow = {
  id: number;
  title: string;
  icon: React.ElementType;
  category: string;
  summary: string;
  caution?: string;
  steps: Step[];
  extra?: { label: string; rows: { col1: string; col2: string; col3?: string }[] };
};

const flows: Flow[] = [
  {
    id: 1,
    title: "AI投稿生成",
    icon: Sparkles,
    category: "投稿を作る",
    summary: "写真をアップロードし、AIが自動で投稿文を生成してSNSに投稿する。最もよく使う基本フローです。",
    caution: "承認フローが有効な場合、ステップ10の後に支援員による承認（No.10フロー）が必要です。",
    steps: [
      { step: "1", action: "アプリにログインする", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "左メニュー「AI投稿生成」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "投稿する会社を選ぶ（ドロップダウン）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "テンプレートを選ぶ（任意）", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "テンプレート機能"] },
      { step: "5", action: "投稿モードを選ぶ（通常投稿 / ビフォーアフター）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "6", action: "写真を取得する（ローカル or Googleフォト）", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleフォト", "端末"] },
      { step: "7", action: "AIが投稿文を自動生成する（約10〜30秒）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
      { step: "8", action: "生成された文章を確認・編集する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "9", action: "投稿先SNSを選ぶ（Instagram / X / Threads）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "10", action: "今すぐ投稿 / 予約投稿 / 下書き保存を選ぶ", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "予約投稿機能"] },
      { step: "11", action: "投稿完了（自動送信）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
    ],
  },
  {
    id: 2,
    title: "ビフォーアフター投稿",
    icon: GitCompare,
    category: "投稿を作る",
    summary: "施工前・施工後の写真2枚を使い、比較投稿を作成してSNSに投稿する。",
    caution: "ビフォー写真とアフター写真の順番を間違えないよう注意してください。写真は必ず2枚必要です。",
    steps: [
      { step: "1", action: "アプリにログインする", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "左メニュー「ビフォーアフター投稿」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "会社を選択する（ドロップダウン）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "ビフォー写真を取得する（ローカル or Googleフォト）", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleフォト", "端末"] },
      { step: "5", action: "アフター写真を取得する（ローカル or Googleフォト）", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleフォト", "端末"] },
      { step: "6", action: "AIがビフォーアフター投稿文を自動生成する（約15〜30秒）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
      { step: "7", action: "生成された文章を確認・編集する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "8", action: "投稿先SNSを選ぶ（Instagram / X / Threads）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "9", action: "今すぐ投稿 / 予約投稿 / 下書き保存を選ぶ", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "予約投稿機能"] },
      { step: "10", action: "投稿完了（自動送信）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
    ],
  },
  {
    id: 3,
    title: "社長コラム投稿",
    icon: PenLine,
    category: "投稿を作る",
    summary: "社長の想いや哲学をAIが文章化し、SNSに投稿する。テーマを選ぶだけでよい。",
    steps: [
      { step: "1", action: "アプリにログインする", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "左メニュー「社長コラム」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "コラムタイプを選択する（6種類から選ぶ）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "投稿プラットフォームを選択する（Instagram / X / Threads）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "5", action: "キーワード・テーマを入力する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "6", action: "「AIで文章を生成」ボタンをクリック（約10〜20秒）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "7", action: "生成された文章を確認・編集する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "8", action: "今すぐ投稿 / 予約投稿 / 下書き保存を選ぶ", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "予約投稿機能"] },
      { step: "9", action: "投稿完了（自動送信）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
    ],
    extra: {
      label: "コラムタイプ一覧",
      rows: [
        { col1: "🏠 家づくりの哲学", col2: "設計へのこだわり・想い" },
        { col1: "🌆 北九州への感謝", col2: "地域への愛着・地元貢献" },
        { col1: "💡 日常の気づき", col2: "現場や日常で感じたこと" },
        { col1: "🔨 職人への敬意", col2: "職人さんの技術・現場のリアル" },
        { col1: "🤝 お客様エピソード", col2: "印象に残ったお客様との会話" },
        { col1: "🚀 挑戦の記録", col2: "失敗から学んだこと・挑戦の歴史" },
      ],
    },
  },
  {
    id: 4,
    title: "GBP投稿",
    icon: MapPin,
    category: "投稿を作る",
    summary: "Google検索やGoogleマップに表示されるビジネスプロフィールに投稿する。",
    caution: "現在APIの承認待ち中のため、実際の投稿は承認後に可能です。画像はURL形式での入力が必要で、ファイル直接アップロードは不可です。",
    steps: [
      { step: "1", action: "アプリにログインする", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "左メニュー「GBP投稿」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "投稿する拠点（会社）を選択する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "Google認証を確認する（未認証の場合はGoogleログイン）", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "5", action: "投稿タイプを選択する（最新情報 / イベント / 特典）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "6", action: "投稿内容を入力 or 他SNSから流用する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "7", action: "CTAボタンを設定する（任意）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "8", action: "即時投稿 or 予約投稿を選択する", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "予約投稿機能"] },
      { step: "9", action: "「投稿する」または「予約する」ボタンをクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "10", action: "投稿完了（Googleの審査を経て掲載）", dept: "🤖 システム", tools: ["SNS自動化アプリ", "GBP"] },
    ],
  },
  {
    id: 5,
    title: "下書き管理",
    icon: Save,
    category: "投稿を管理する",
    summary: "保存した下書きを確認・編集・投稿・削除する。",
    caution: "削除すると元に戻せません。投稿前に必ず内容を確認してください。",
    steps: [
      { step: "1", action: "アプリにログインし、左メニュー「下書き」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "下書き一覧が表示される（作成日・内容・プラットフォームが表示）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "確認したい下書きカードをクリック → 詳細ダイアログが開く", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4A", action: "【投稿する】「投稿する」ボタン → 確認 → 投稿完了", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4B", action: "【編集する】「編集」ボタン → AI投稿生成画面に内容が引き継がれる", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4C", action: "【削除する】「削除」ボタン → 確認ダイアログ → 「削除する」ボタン", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "5", action: "完了", dept: "—", tools: [] },
    ],
  },
  {
    id: 6,
    title: "予約投稿管理",
    icon: Calendar,
    category: "投稿を管理する",
    summary: "予約した投稿の確認・変更・キャンセルを行う。",
    caution: "予約時刻になると自動で投稿されます。キャンセルすると投稿されなくなります。",
    steps: [
      { step: "1", action: "アプリにログインし、左メニュー「予約投稿管理」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "予約投稿一覧が表示される（今後の予約 / 全ての予約）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "確認したい投稿カードをクリック → 詳細ダイアログが開く", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4A", action: "【確認のみ】「閉じる」ボタン", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4B", action: "【今すぐ投稿に変更】「今すぐ投稿」ボタン → 確認 → 投稿完了", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4C", action: "【GBPに流用する】「GBPに流用」ボタン → GBP投稿画面に移動", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "GBP"] },
      { step: "4D", action: "【予約をキャンセル】「削除」ボタン → 確認 → 削除完了", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "5", action: "完了（予約時刻になると自動投稿）", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
    ],
  },
  {
    id: 7,
    title: "投稿カレンダー",
    icon: Calendar,
    category: "投稿を管理する",
    summary: "カレンダー形式で投稿予定・投稿済みを一覧確認する。",
    steps: [
      { step: "1", action: "アプリにログインし、左メニュー「投稿カレンダー」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "カレンダーが表示される（月表示）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "投稿がある日付に色付きマーカーが表示される", dept: "🤖 システム", tools: ["SNS自動化アプリ"] },
      { step: "4A", action: "【月を変える】「＜」「＞」ボタンで前月・翌月に移動", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4B", action: "【特定の日の投稿を見る】日付をクリック → 投稿一覧が表示", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4C", action: "【投稿の詳細を見る】投稿タイトルをクリック → 詳細ダイアログ", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "5", action: "確認完了", dept: "—", tools: [] },
    ],
    extra: {
      label: "カレンダーのマーカー色",
      rows: [
        { col1: "🔵 青色", col2: "Instagram投稿" },
        { col1: "⚫ 黒色", col2: "X（Twitter）投稿" },
        { col1: "🟣 紫色", col2: "Threads投稿" },
        { col1: "🟢 緑色", col2: "GBP投稿" },
        { col1: "薄い色", col2: "予約投稿（まだ投稿されていない）" },
      ],
    },
  },
  {
    id: 8,
    title: "投稿履歴",
    icon: History,
    category: "投稿を管理する",
    summary: "過去に投稿した内容を確認・フィルタリングする。",
    steps: [
      { step: "1", action: "アプリにログインし、左メニュー「投稿履歴」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "投稿履歴一覧が表示される（新しい順）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "プラットフォームで絞り込む（任意）：すべて / Instagram / X / Threads / GBP", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "確認したい投稿カードをクリック → 詳細が展開表示される", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "5", action: "投稿日時・投稿文・プラットフォーム・ステータスを確認する", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "6", action: "完了（失敗の場合は支援員に相談）", dept: "🙋 利用者", tools: [] },
    ],
    extra: {
      label: "投稿ステータスの見方",
      rows: [
        { col1: "✅ 成功", col2: "正常に投稿された", col3: "そのままでOK" },
        { col1: "❌ 失敗", col2: "エラーで投稿できなかった", col3: "支援員に相談する" },
        { col1: "⏳ 処理中", col2: "投稿中（少し待つ）", col3: "しばらく待つ" },
      ],
    },
  },
  {
    id: 9,
    title: "テンプレート管理",
    icon: FileText,
    category: "投稿を管理する",
    summary: "よく使う投稿パターンをテンプレートとして保存・管理し、次回から素早く投稿できるようにする。",
    steps: [
      { step: "1", action: "アプリにログインし、左メニュー「テンプレート」をクリック", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "テンプレート一覧が表示される（カテゴリ別タブで絞り込み可能）", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3A", action: "【新規作成】「新しいテンプレートを作成」ボタン → タイトル・カテゴリ・内容を入力 → 「保存」", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3B", action: "【編集】テンプレートカードの「編集」ボタン → 内容を修正 → 「保存」", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3C", action: "【削除】テンプレートカードの「削除」ボタン → 確認 → 削除完了", dept: "🙋 利用者", tools: ["SNS自動化アプリ"] },
      { step: "3D", action: "【適用】AI投稿生成画面でテンプレートを選択 → 「テンプレートを適用」ボタン", dept: "🙋 利用者", tools: ["SNS自動化アプリ", "テンプレート機能"] },
      { step: "4", action: "完了", dept: "—", tools: [] },
    ],
    extra: {
      label: "テンプレートカテゴリ一覧",
      rows: [
        { col1: "📋 その他", col2: "汎用テンプレート" },
        { col1: "🍚 子ども食堂", col2: "子ども食堂関連の投稿" },
        { col1: "🤝 就労支援B型", col2: "就労支援関連の投稿" },
        { col1: "🏗️ 建設本業", col2: "ハゼモト建設の施工投稿" },
        { col1: "🍞 ラトリエルアッシュ", col2: "パン屋関連の投稿" },
      ],
    },
  },
  {
    id: 10,
    title: "承認・フィードバック",
    icon: CheckSquare,
    category: "支援員向け",
    summary: "支援員が利用者の作成した投稿を確認し、承認・却下・フィードバックを行う。支援員専用フローです。",
    caution: "承認すると自動で投稿されます。却下理由は利用者にわかりやすく記入してください。",
    steps: [
      { step: "1", action: "ログインし、左メニュー「支援員ダッシュボード」または「承認待ち投稿」をクリック", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ", "Googleアカウント"] },
      { step: "2", action: "承認待ちの投稿一覧が表示される", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "3", action: "確認したい投稿カードをクリック → 詳細ダイアログが開く", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "4", action: "投稿内容を確認する（文章・写真・投稿先SNS）", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "5A", action: "【承認する】「承認」ボタン → 確認 → 承認完了（自動で投稿される）", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "5B", action: "【却下する】「却下」ボタン → 却下理由を入力 → 「却下する」ボタン → 却下完了", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "5C", action: "【フィードバックを送る】「フィードバック」ボタン → 種類選択 → コメント入力 → 送信", dept: "👩‍💼 支援員", tools: ["SNS自動化アプリ"] },
      { step: "6", action: "利用者に通知が届く", dept: "🤖 システム", tools: ["SNS自動化アプリ", "通知機能"] },
      { step: "7", action: "完了", dept: "—", tools: [] },
    ],
    extra: {
      label: "フィードバックの種類",
      rows: [
        { col1: "🌟 ほめる", col2: "よくできた投稿を褒める" },
        { col1: "💡 アドバイス", col2: "改善のヒントを伝える" },
        { col1: "📝 修正依頼", col2: "修正してほしい箇所を伝える" },
      ],
    },
  },
];

// ===== サブコンポーネント =====

function DeptBadge({ dept }: { dept: string }) {
  const cls = DEPT_COLORS[dept] ?? "bg-gray-100 text-gray-700 border-gray-200";
  if (dept === "—") return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls} whitespace-nowrap`}>
      {dept}
    </span>
  );
}

function ToolBadges({ tools }: { tools: string[] }) {
  if (!tools.length) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tools.map((t) => {
        const cls = TOOL_BADGES[t] ?? "bg-gray-50 text-gray-700 border-gray-200";
        return (
          <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${cls} whitespace-nowrap`}>
            {t}
          </span>
        );
      })}
    </div>
  );
}

function FlowCard({ flow }: { flow: Flow }) {
  const [open, setOpen] = useState(false);
  const Icon = flow.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">No.{flow.id}</span>
                <CardTitle className="text-base leading-tight">{flow.title}</CardTitle>
                <Badge variant="outline" className="text-xs">{flow.category}</Badge>
              </div>
              <CardDescription className="mt-0.5 text-sm line-clamp-2">{flow.summary}</CardDescription>
            </div>
          </div>
          <div className="flex-shrink-0">
            {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {flow.caution && (
            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{flow.caution}</span>
            </div>
          )}

          {/* ステップ表 */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16 text-center">ステップ</TableHead>
                  <TableHead>操作内容</TableHead>
                  <TableHead className="w-36">担当部署</TableHead>
                  <TableHead className="w-56">必要ツール</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flow.steps.map((s) => (
                  <TableRow key={s.step} className={s.dept === "🤖 システム" ? "bg-gray-50/60" : ""}>
                    <TableCell className="text-center font-mono text-sm text-muted-foreground">{s.step}</TableCell>
                    <TableCell className="text-sm">{s.action}</TableCell>
                    <TableCell><DeptBadge dept={s.dept} /></TableCell>
                    <TableCell><ToolBadges tools={s.tools} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 補足テーブル */}
          {flow.extra && (
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">{flow.extra.label}</p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableBody>
                    {flow.extra.rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm w-40">{r.col1}</TableCell>
                        <TableCell className="text-sm">{r.col2}</TableCell>
                        {r.col3 !== undefined && <TableCell className="text-sm">{r.col3}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ===== メインページ =====

export default function WorkflowGuide() {
  const categories = ["すべて", "投稿を作る", "投稿を管理する", "支援員向け"];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            業務フロー 担当部署・ツール一覧
          </h1>
          <p className="text-muted-foreground mt-2">
            各業務フローのステップごとに、担当部署と必要なツールをまとめています。
            フロー名をクリックすると詳細が表示されます。
          </p>
        </div>

        {/* 凡例 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="h-4 w-4" /> 担当部署の凡例
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(DEPT_COLORS).filter(([k]) => k !== "—").map(([dept, cls]) => (
                <span key={dept} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
                  {dept}
                </span>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Wrench className="h-4 w-4" /> 必要ツールの凡例
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(TOOL_BADGES).map(([tool, cls]) => (
                <span key={tool} className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${cls}`}>
                  {tool}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 早見表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">フロー別 担当部署・ツール 早見表</CardTitle>
            <CardDescription>全10フローの概要をまとめています</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">No.</TableHead>
                    <TableHead>フロー名</TableHead>
                    <TableHead className="w-28">カテゴリ</TableHead>
                    <TableHead className="w-28">主担当</TableHead>
                    <TableHead>主要ツール</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flows.map((f) => {
                    const Icon = f.icon;
                    const mainDept = f.steps.find((s) => s.dept !== "🤖 システム" && s.dept !== "—")?.dept ?? "—";
                    const allTools = Array.from(new Set(f.steps.flatMap((s) => s.tools)));
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="text-center text-sm text-muted-foreground font-mono">{f.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm">{f.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{f.category}</Badge>
                        </TableCell>
                        <TableCell><DeptBadge dept={mainDept} /></TableCell>
                        <TableCell><ToolBadges tools={allTools.slice(0, 3)} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 詳細フロー（タブ切り替え） */}
        <div>
          <h2 className="text-xl font-semibold mb-4">詳細フロー一覧</h2>
          <Tabs defaultValue="すべて">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-sm">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((cat) => (
              <TabsContent key={cat} value={cat} className="space-y-3 mt-0">
                {flows
                  .filter((f) => cat === "すべて" || f.category === cat)
                  .map((f) => (
                    <FlowCard key={f.id} flow={f} />
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <p className="text-xs text-muted-foreground text-right pt-2">
          作成日：2026年3月20日 / 対象システム：SNS自動化アプリ（AI-Powered SNS Automation Platform）
        </p>
      </div>
    </DashboardLayout>
  );
}
