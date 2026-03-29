import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image,
  Sparkles,
  Calendar,
  MapPin,
  MessageSquare,
  Star,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  FileText,
  Link2,
  Hash,
  Building2,
  ChevronRight,
} from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">{APP_TITLE}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#why" className="hover:text-foreground transition-colors">なぜ必要か</a>
            <a href="#method" className="hover:text-foreground transition-colors">永友メソッド</a>
            <a href="#features" className="hover:text-foreground transition-colors">機能一覧</a>
            <a href="#steps" className="hover:text-foreground transition-colors">使い方</a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/dashboard">ダッシュボード</a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/demo">デモを試す</a>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-blue-50/30">
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="container max-w-5xl mx-auto relative">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="text-sm px-4 py-1">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AIO（AI最適化）対策に特化した工務店向けSNS自動化ツール
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              AIに選ばれる工務店になる
              <br />
              <span className="text-primary">SNS自動化プラットフォーム</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              ChatGPT・Gemini・Perplexityなど生成AIが「地元の工務店」を回答する時代。
              Googleビジネスプロフィール・Instagram・X・Threadsへの投稿を
              <strong className="text-foreground">AIが自動生成・一括管理</strong>し、
              AIに信頼される会社づくりをサポートします。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <>
                  <Button size="lg" asChild className="gap-2">
                    <a href="/dashboard">
                      ダッシュボードへ <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="/demo">デモを試す</a>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild className="gap-2">
                    <a href={getLoginUrl()}>
                      無料で始める <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#method">永友メソッドとは</a>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 対応プラットフォーム */}
          <div className="mt-16 flex flex-wrap justify-center gap-3">
            {[
              { label: "Googleビジネスプロフィール", color: "bg-blue-100 text-blue-700 border-blue-200" },
              { label: "Instagram", color: "bg-pink-100 text-pink-700 border-pink-200" },
              { label: "X (Twitter)", color: "bg-slate-100 text-slate-700 border-slate-200" },
              { label: "Threads", color: "bg-purple-100 text-purple-700 border-purple-200" },
              { label: "Notion連携", color: "bg-orange-100 text-orange-700 border-orange-200" },
            ].map((p) => (
              <span
                key={p.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${p.color}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* なぜ必要か */}
      <section id="why" className="py-20 px-4 bg-slate-900 text-white">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-slate-600 text-slate-300 mb-4">
              時代の変化
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              「Google検索」から「AI回答」へ
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              住宅会社を探す人の行動が変わりました。今やAIに「北九州市のおすすめ工務店は？」と聞く時代です。
              AIに正しく・魅力的に認識されることが、集客の鍵になっています。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingUp className="h-6 w-6 text-yellow-400" />,
                title: "AIO対策が急務",
                desc: "ChatGPT・Gemini・Perplexityなど生成AIが地元企業を回答する時代。AIに信頼される情報発信が差別化の鍵。",
              },
              {
                icon: <Building2 className="h-6 w-6 text-blue-400" />,
                title: "GBPが最重要媒体",
                desc: "GoogleビジネスプロフィールはAIが最も参照する情報源のひとつ。写真・投稿・口コミ・返信の継続更新が不可欠。",
              },
              {
                icon: <Link2 className="h-6 w-6 text-green-400" />,
                title: "情報の一貫性が命",
                desc: "HP・SNS・GBP・ポータルサイトの情報が一致していないと、AIが古い・誤った情報を回答するリスクがある。",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800 rounded-xl p-6 space-y-3">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 永友一郎メソッド紹介 */}
      <section id="method" className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              監修：永友一郎メソッド
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              住宅会社のAIO対策 7つの施策
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Webコンサルタント・永友一郎氏が提唱する、住宅会社がAIに選ばれるための体系的な戦略。
              本アプリはこのメソッドに基づいて設計されています。
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                num: "①",
                title: "GBP（Googleビジネスプロフィール）",
                highlight: true,
                items: [
                  "写真：モデルハウス・施工事例・スタッフ・イベント・地域風景を継続追加",
                  "投稿：見学会・施工事例・ブログ更新・地域活動を定期発信",
                  "口コミ：「土地提案」「動線」「光熱費」「担当者対応」など具体語が入る依頼文を設計",
                  "返信：すべての口コミに具体的に返信し、信頼性を可視化",
                  "導線：投稿から施工事例・来場予約・資料請求へつなぐ",
                ],
              },
              {
                num: "②",
                title: "HP（ホームページ）強化",
                items: [
                  "施工事例・お客様の声などコンテンツを強化",
                  "自社でしか言えない情報・経験を組み込む（オリジナリティ）",
                ],
              },
              {
                num: "③",
                title: "コラム（ブログ記事）",
                items: [
                  "結論ファースト → AIが回答を引用しやすくなる",
                  "見出しの活用 → AIが記事構成を把握しやすくなる",
                  "著者明確 → 誰が書いているかを明記し信頼度を高める",
                  "⚠️ AIに頼り切りのコラムでは効果が出にくい",
                ],
              },
              {
                num: "④",
                title: "SNS（リアルタイム更新）",
                items: [
                  "AIにとって「今もアクティブか」を示す指標",
                  "HP等の情報とプロフィール情報を統一させる",
                  "地域名と特徴のハッシュタグを使用する",
                  "投稿からHPのページへリンクを張る",
                ],
              },
              {
                num: "⑤",
                title: "外部サイト（情報統一）",
                items: [
                  "SUUMO・HOMES・タウンライフ等のポータルサイトをリストアップ",
                  "HPやInstagramの情報と齟齬がないか確認",
                  "AIが古い・誤った情報を回答するリスクを抑える",
                ],
              },
              {
                num: "⑥⑦",
                title: "メディア発信・PR TIMES",
                items: [
                  "受賞歴・地域貢献・新モデルハウス等をPR TIMESでプレスリリース",
                  "権威・信頼のあるメディアへの掲載でAIに信頼される",
                  "タグ・キーワード・関連URLの設定も重要",
                ],
              },
            ].map((item) => (
              <div
                key={item.num}
                className={`rounded-xl border p-6 space-y-3 ${item.highlight ? "border-primary/50 bg-primary/5" : "bg-card"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">{item.num}</span>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  {item.highlight && (
                    <Badge className="ml-auto text-xs">このアプリで対応</Badge>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {item.items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
            <p className="text-yellow-800 font-semibold text-lg">
              HP・コラム・GBP・ポータルサイト・外部サイト・PR TIMESの各媒体に
              <br />
              情報を<strong>正しく魅力的に</strong>掲載することが、AIO対策の本質です。
            </p>
            <p className="text-yellow-700 text-sm mt-2">— 永友一郎（住宅ビジネス研究会 第3講座より）</p>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">機能一覧</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              永友メソッドを実践する6つの機能
            </h2>
            <p className="text-muted-foreground text-lg">
              AIO対策に必要な施策をすべてカバーする、工務店特化のSNS自動化ツールです。
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <MapPin className="h-6 w-6 text-blue-600" />,
                bg: "bg-blue-100",
                title: "GBP投稿 AI生成",
                desc: "施工事例・見学会・地域活動・口コミ依頼文・口コミ返信など10種類の投稿タイプに対応。永友メソッド準拠の具体語（光熱費・担当者対応・土地提案）と導線CTAを自動挿入。",
                badge: "GBP特化",
              },
              {
                icon: <Image className="h-6 w-6 text-pink-600" />,
                bg: "bg-pink-100",
                title: "AI画像分析・SNS投稿生成",
                desc: "Google フォトの写真をAIが分析し、Instagram・X・Threadsに最適化された投稿文とハッシュタグを自動生成。地域名ハッシュタグとHP誘導リンクも自動付与。",
                badge: "SNS対応",
              },
              {
                icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
                bg: "bg-purple-100",
                title: "口コミ依頼文テンプレート",
                desc: "「土地提案」「動線」「光熱費」「担当者対応」など具体語が入るGoogleマップ口コミ依頼文を自動生成。そのままお客様に送れる完成形の文章を作成。",
                badge: "口コミ強化",
              },
              {
                icon: <FileText className="h-6 w-6 text-green-600" />,
                bg: "bg-green-100",
                title: "写真撮影ガイド",
                desc: "投稿タイプに連動して、モデルハウス・施工事例・スタッフ・イベント・地域風景など各カテゴリの撮影ポイント・NGポイント・おすすめ構図を表示。",
                badge: "写真品質向上",
              },
              {
                icon: <Hash className="h-6 w-6 text-orange-600" />,
                bg: "bg-orange-100",
                title: "Notion連携・投稿管理",
                desc: "生成した投稿をNotionデータベースに自動保存。スケジュール管理・投稿履歴の確認・チームでの共有が可能。SNS運用を組織的に継続できる仕組みを構築。",
                badge: "チーム運用",
              },
              {
                icon: <Star className="h-6 w-6 text-yellow-600" />,
                bg: "bg-yellow-100",
                title: "投稿スケジューラー",
                desc: "作成した投稿を日時指定でGBP・各SNSに自動投稿。月間投稿バランスを管理し、施工事例・地域活動・スタッフ紹介・見学会の適切な比率を維持。",
                badge: "自動投稿",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-xl border p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center`}>
                    {f.icon}
                  </div>
                  <Badge variant="outline" className="text-xs">{f.badge}</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section id="steps" className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">使い方</Badge>
            <h2 className="text-3xl font-bold mb-4">4ステップで運用開始</h2>
            <p className="text-muted-foreground">
              設定から投稿まで、すべてこのアプリで完結します。
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "初期設定",
                desc: "会社名・Google フォトアルバムURL・GBPアカウントを登録。Notion連携も設定すると投稿管理が一元化されます。",
                href: "/settings",
                color: "bg-blue-600",
              },
              {
                step: "2",
                title: "投稿タイプを選んでAI生成",
                desc: "GBP投稿ページで「施工事例」「見学会」「口コミ依頼文」など投稿タイプを選択。AIが永友メソッド準拠の投稿文を自動生成します。写真撮影ガイドも同時に表示。",
                href: "/gbp",
                color: "bg-primary",
              },
              {
                step: "3",
                title: "SNS投稿も一括生成",
                desc: "デモページでGoogle フォトから写真を取得し、Instagram・X・Threads用の投稿文とハッシュタグを一括生成。地域名ハッシュタグとHP誘導リンクも自動付与。",
                href: "/demo",
                color: "bg-pink-600",
              },
              {
                step: "4",
                title: "スケジュール投稿・管理",
                desc: "生成した投稿を日時指定で自動投稿。Notionに自動保存されるので、チームでの投稿管理・振り返りも簡単です。",
                href: "/dashboard",
                color: "bg-green-600",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start p-6 bg-card rounded-xl border hover:shadow-sm transition-shadow">
                <div className={`flex-shrink-0 w-12 h-12 ${s.color} text-white rounded-full flex items-center justify-center font-bold text-lg`}>
                  {s.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
                {isAuthenticated && (
                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                    <a href={s.href}>
                      開く <ChevronRight className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="gap-2">
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                {isAuthenticated ? "ダッシュボードへ" : "今すぐ無料で始める"}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            AIに選ばれる工務店へ、今日から始める
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            GBP・Instagram・X・Threadsへの投稿をAIが自動生成。
            永友一郎メソッドに基づいた戦略的なSNS運用で、
            生成AIに信頼される会社づくりをサポートします。
          </p>
          <Button size="lg" variant="secondary" asChild className="gap-2">
            <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
              {isAuthenticated ? "ダッシュボードへ" : "無料で始める"}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t py-8 px-4 mt-auto">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={APP_LOGO} alt="Logo" className="h-6 w-6" />
              <span className="font-semibold text-sm">{APP_TITLE}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              &copy; 2025 {APP_TITLE}. 永友一郎メソッドに基づくAIO対策SNS自動化ツール
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
