/**
 * 「社長っぽく」ボタンの生成テストスクリプト
 * 実際のAIを呼び出して結果を評価する
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';

// .envを読み込む
config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

// companyProfiles.tsからsystemPromptを読み込む（簡易版）
const systemPromptPath = '/home/ubuntu/sns-automation-app/shared/companyProfiles.ts';
const companyProfilesContent = readFileSync(systemPromptPath, 'utf-8');

// systemPromptを抽出（バッククォートの間の内容）
const systemPromptMatch = companyProfilesContent.match(/systemPrompt: `([\s\S]*?)`,\s*\},\s*"クリニックアーキプロ"/);
const systemPrompt = systemPromptMatch ? systemPromptMatch[1] : '';

console.log('=== システムプロンプト（最初の200文字）===');
console.log(systemPrompt.substring(0, 200));
console.log('...\n');

async function callLLM(messages) {
  const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// テスト1: 「社長っぽく」リライト（既存投稿を書き直す）
async function testPresidentStyleRewrite() {
  console.log('=== テスト1: 「社長っぽく」リライト ===\n');
  
  const originalPost = `今日は北九州市内の現場で、新築住宅の上棟式を行いました。
天気にも恵まれ、無事に棟が上がりました。
お施主様ご家族も参加してくださり、職人たちと一緒に記念撮影。
これからの工事も安全第一で進めてまいります。
#ハゼモト建設 #北九州工務店 #上棟式 #注文住宅`;

  console.log('【元の投稿文】');
  console.log(originalPost);
  console.log('\n---\n');

  const instruction = '社長・櫨本健一の一人称スタイルに書き直してください。「今日ね、現場でこんなことがあって」「うちでは」「正直に言うと」など、社長の胃の言葉で。明るく、ユーモアがあり、人の気配が感じられる文体に。';

  const result = await callLLM([
    {
      role: 'system',
      content: `あなたはハゼモト建設の社長・櫨本健一です。instagram向けの投稿文を修正するエキスパートです。修正後の投稿文は500文字以内に収めてください。`,
    },
    {
      role: 'user',
      content: `以下の投稿文を修正してください。\n\n「修正指示」\n${instruction}\n\n「元の投稿文」\n${originalPost}\n\n修正後の投稿文のみを返してください。説明やコメントは不要です。`,
    },
  ]);

  console.log('【リライト結果（簡易プロンプト）】');
  console.log(result);
  console.log('\n');

  // systemPromptを使ったリライト
  const result2 = await callLLM([
    {
      role: 'system',
      content: systemPrompt + '\n\ninstagram向けの投稿文を修正するエキスパートです。修正後の投稿文は500文字以内に収めてください。',
    },
    {
      role: 'user',
      content: `以下の投稿文を「社長・櫨本健一の一人称スタイル」に書き直してください。\n\n「元の投稿文」\n${originalPost}\n\n修正後の投稿文のみを返してください。説明やコメントは不要です。`,
    },
  ]);

  console.log('【リライト結果（systemPromptあり）】');
  console.log(result2);
  console.log('\n');

  return { original: originalPost, simple: result, withSystemPrompt: result2 };
}

// テスト2: 社長コラム生成（テキストのみ）
async function testPresidentColumnGeneration() {
  console.log('=== テスト2: 社長コラム生成 ===\n');
  
  const topic = '上棟式で職人さんたちと施主家族が一緒に記念写真を撮った瞬間の感動';
  const columnType = '職人への敬意・現場の話';

  console.log(`テーマ: ${topic}`);
  console.log(`コラムの種類: ${columnType}`);
  console.log('\n---\n');

  // 現在の簡易プロンプト（routers.tsの現状）
  const result1 = await callLLM([
    {
      role: 'system',
      content: `あなたはハゼモト建設株式会社の社長、橨本健一（はぜもと けんいち）です。
昇和39年生まれ、明治大学建築学科卒。北九州で生まれ、北九州で育った。
一級建築士、一級建築施工管理技士。「地元で生まれ地元で育った北九州の工務店」を誇りに思っている。

話し方の特徴：
- 「あのな、」「今日な、」「実はさ、」「これなんですよ、」など、語りかけるような一人称で書く
- 建築の話を、人生や地域と結びつけて語る
- 小難しい技術的な話も、ゆっくりと分かりやすく話す
- 最後は必ず「ハゼモト建設 社長 橨本」と署名する
- 投稿の最後に改行してハッシュタグを付ける`,
    },
    {
      role: 'user',
      content: `以下のテーマで、instagram向けの「社長コラム」投稿文を作成してください。

コラムの種類：${columnType}
テーマ：${topic}

ガイドライン：
- 文字数：200ー300文字程度
- ハッシュタグ：20ー30個
- 写真なしのテキストのみの投稿なので、言葉だけで心を動かす内容にする
- 社長の個人的な体験や想いを盛り込む

投稿文とハッシュタグを生成してください。`,
    },
  ]);

  console.log('【社長コラム生成結果（現在のプロンプト）】');
  console.log(result1);
  console.log('\n');

  // systemPromptを使った生成
  const result2 = await callLLM([
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `以下のテーマで、instagram向けの「社長コラム」投稿文を作成してください。

コラムの種類：${columnType}
テーマ：${topic}

ガイドライン：
- 文字数：200ー300文字程度
- ハッシュタグ：20ー30個
- 写真なしのテキストのみの投稿なので、言葉だけで心を動かす内容にする
- 社長の個人的な体験や想いを盛り込む

投稿文とハッシュタグを生成してください。`,
    },
  ]);

  console.log('【社長コラム生成結果（systemPromptあり）】');
  console.log(result2);
  console.log('\n');

  return { simple: result1, withSystemPrompt: result2 };
}

// メイン実行
async function main() {
  try {
    const rewriteResults = await testPresidentStyleRewrite();
    const columnResults = await testPresidentColumnGeneration();

    console.log('\n=== 評価まとめ ===\n');
    console.log('テスト完了。上記の結果を比較して、プロンプトの改善点を特定してください。');
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

main();
