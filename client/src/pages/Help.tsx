import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, BookOpen, Lightbulb, Settings as SettingsIcon, Image as ImageIcon, Calendar } from "lucide-react";

export default function Help() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ヘルプ & 使い方ガイド</h1>
          <p className="text-muted-foreground mt-2">
            AI-Powered SNS Automation Platformの使い方を説明します
          </p>
        </div>

        {/* クイックスタートガイド */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              クイックスタートガイド
            </CardTitle>
            <CardDescription>
              3ステップでSNS投稿を自動生成できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center">1</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">ユーザー設定を完了する</h4>
                <p className="text-sm text-muted-foreground">
                  設定ページで会社名とGoogle フォトアルバムのURLを登録してください。
                  これにより、AIがあなたの会社に合わせた投稿文を生成できるようになります。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center">2</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">デモページで写真を取得</h4>
                <p className="text-sm text-muted-foreground">
                  デモページで「写真を取得 & AI分析」ボタンをクリックすると、
                  登録したGoogle フォトアルバムからランダムに写真が選ばれ、AIが自動で分析します。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center">3</Badge>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">投稿文を生成してコピー</h4>
                <p className="text-sm text-muted-foreground">
                  「全SNSの投稿文を生成」ボタンをクリックすると、Instagram、X、Threadsそれぞれに
                  最適化された投稿文とハッシュタグが生成されます。「コピー」ボタンで簡単にコピーできます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* よくある質問 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              よくある質問（FAQ）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Google フォトアルバムのURLはどこで取得できますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>以下の手順でGoogle フォトアルバムの共有URLを取得できます：</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Google フォトにアクセスし、共有したいアルバムを開きます</li>
                    <li>画面右上の「共有」ボタンをクリックします</li>
                    <li>「リンクを作成」をクリックします</li>
                    <li>表示されたURLをコピーして、設定ページに貼り付けます</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>複数のアルバムを登録できますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  はい、複数のアルバムを登録できます。設定ページで「新しいアルバムを追加」フォームを使用して、
                  何個でもアルバムURLを追加できます。デモページで写真を取得する際は、
                  登録されたすべてのアルバムからランダムに選択されます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>生成された投稿文は編集できますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  はい、生成された投稿文はコピーした後に自由に編集できます。
                  AIが生成した投稿文はあくまで提案なので、必要に応じて内容を調整してください。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>投稿を保存するとどうなりますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  「投稿を保存」ボタンをクリックすると、生成した投稿内容がデータベースに保存されます。
                  保存した投稿は「投稿履歴」ページで確認でき、後から再利用することができます。
                  また、投稿予約日時を設定することで、将来の投稿スケジュールを管理できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>複数写真の比較機能はどのように使いますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  デモページの「複数写真を比較」カードで、取得枚数（2〜10枚）を指定して
                  「写真を取得 & 比較」ボタンをクリックします。AIが各写真を分析してスコアを付け、
                  スコアの高い順に表示されます。気に入った写真をクリックして選択し、
                  その写真で投稿文を生成できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>実際のSNSに自動投稿できますか？</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  現在のバージョンでは、生成された投稿文をコピーして手動で各SNSに投稿する必要があります。
                  将来のアップデートで、Instagram Graph API、X API、Threads APIと連携した
                  自動投稿機能を追加する予定です。
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* 機能説明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              主な機能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <SettingsIcon className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">ユーザー設定</h4>
                <p className="text-sm text-muted-foreground">
                  会社名、業種、Google フォトアルバムURLを管理します。
                  これらの情報はAIが投稿文を生成する際に使用されます。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <ImageIcon className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">AI画像分析</h4>
                <p className="text-sm text-muted-foreground">
                  OpenAI Vision APIを使用して、写真の内容（カテゴリー、スタイル、説明、キーワード）を
                  自動で分析します。この分析結果を基に、魅力的な投稿文が生成されます。
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Calendar className="h-6 w-6 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">投稿スケジュール</h4>
                <p className="text-sm text-muted-foreground">
                  生成した投稿を特定の日時に予約できます。投稿履歴ページで
                  過去の投稿や予約投稿を一覧で確認できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ヒントとコツ */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">ヒントとコツ</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>会社名を正確に設定：</strong> 
              AIは会社名を基に投稿文のトーンや内容を調整します。
              正確な会社名を設定することで、より適切な投稿文が生成されます。
            </p>
            <p>
              <strong>高品質な写真を使用：</strong> 
              Google フォトアルバムには、明るく鮮明な写真をアップロードしてください。
              写真の品質が高いほど、AIの分析精度も向上します。
            </p>
            <p>
              <strong>複数写真を比較：</strong> 
              迷ったときは「複数写真を比較」機能を使用して、
              AIが最も魅力的と判断した写真を選ぶことができます。
            </p>
            <p className="font-medium text-primary">
              投稿文は必ず確認してから投稿してください。
              AIが生成した内容が適切かどうか、最終的な判断はユーザーが行う必要があります。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
