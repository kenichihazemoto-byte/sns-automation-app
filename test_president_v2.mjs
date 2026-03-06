/**
 * 修正後の「社長っぽく」プロンプトの再テスト
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

// companyProfiles.tsからsystemPromptを読み込む
const companyProfilesContent = readFileSync('/home/ubuntu/sns-automation-app/shared/companyProfiles.ts', 'utf-8');
const systemPromptMatch = companyProfilesContent.match(/systemPrompt: `([\s\S]*?)`,\s*\},\s*"クリニックアーキプロ"/);
const systemPrompt = systemPromptMatch ? systemPromptMatch[1] : '';

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

// テスト1: 「社長っぽく」リライト（修正後のプロンプト）
async function testPresidentStyleRewrite() {
  console.log('=== テスト1: 「社長っぽく」リライト（修正後） ===\n');
  
  const originalPost = `今日は北九州市内の現場で、新築住宅の上棟式を行いました。
天気にも恵まれ、無事に棟が上がりました。
お施主様ご家族も参加してくださり、職人たちと一緒に記念撮影。
これからの工事も安全第一で進めてまいります。
#ハゼモト建設 #北九州工務店 #上棟式 #注文住宅`;

  console.log('【元の投稿文】');
  console.log(originalPost);
  console.log('\n---\n');

  const maxLength = 500;
  const instruction = '社長・櫨本健一の一人称スタイルに書き直してください。「今日ね、現場でこんなことがあって」「うちでは」「正直に言うと」など、社長の胃の言葉で。明るく、ユーモアがあり、人の気配が感じられる文体に。';

  // 修正後：systemPromptを使用
  const result = await callLLM([
    {
      role: 'system',
      content: systemPrompt + `\n\ninstagram向けの投稿文を修正するエキスパートです。修正後の投稿文は${maxLength}文字以内に収めてください。`,
    },
    {
      role: 'user',
      content: `以下の投稿文を修正してください。\n\n「修正指示」\n${instruction}\n\n「元の投稿文」\n${originalPost}\n\n修正後の投稿文のみを返してください。説明やコメントは不要です。`,
    },
  ]);

  console.log('【リライト結果（修正後）】');
  console.log(result);
  console.log(`\n文字数: ${result.length}文字\n`);
  
  return result;
}

// テスト2: 社長コラム生成（修正後のプロンプト）
async function testPresidentColumnGeneration() {
  console.log('=== テスト2: 社長コラム生成（修正後） ===\n');
  
  const topic = '上棟式で職人さんたちと施主家族が一緒に記念写真を撮った瞬間の感動';
  const columnType = '職人への敬意・現場の話';

  console.log(`テーマ: ${topic}`);
  console.log(`コラムの種類: ${columnType}`);
  console.log('\n---\n');

  const result = await callLLM([
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

推奨ハッシュタグ（以下から適切なものを選択）：
#ハゼモト建設 #北九州工務店 #社長の話 #家づくり #注文住宅 #北九州新築 #工務店北九州 #北九州市 #地元工務店 #建築士 #一級建築士 #北九州家づくり #ハゼモト建設株式会社 #北九州リフォーム #マイホーム北九州 #北九州一戸建て #北九州子育て #北九州地元企業 #北九州職人 #北九州建築 #北九州住宅

投稿文とハッシュタグを生成してください。`,
    },
  ]);

  console.log('【社長コラム生成結果（修正後）】');
  console.log(result);
  console.log(`\n文字数: ${result.length}文字\n`);
  
  return result;
}

// テスト3: 別のシナリオ（写真投稿の「社長っぽく」）
async function testDifferentScenario() {
  console.log('=== テスト3: 別シナリオ（子ども食堂の写真投稿）===\n');
  
  const originalPost = `今月も子ども食堂を開催しました。
たくさんの子どもたちが来てくれて、みんなで楽しく食事をしました。
地域の皆さんに支えられて、毎月続けることができています。
ありがとうございました。
#ハゼモト建設 #子ども食堂 #北九州 #地域活動`;

  const maxLength = 500;
  const instruction = '社長・櫨本健一の一人称スタイルに書き直してください。「今日ね、現場でこんなことがあって」「うちでは」「正直に言うと」など、社長の胃の言葉で。明るく、ユーモアがあり、人の気配が感じられる文体に。';

  const result = await callLLM([
    {
      role: 'system',
      content: systemPrompt + `\n\ninstagram向けの投稿文を修正するエキスパートです。修正後の投稿文は${maxLength}文字以内に収めてください。`,
    },
    {
      role: 'user',
      content: `以下の投稿文を修正してください。\n\n「修正指示」\n${instruction}\n\n「元の投稿文」\n${originalPost}\n\n修正後の投稿文のみを返してください。説明やコメントは不要です。`,
    },
  ]);

  console.log('【元の投稿文】');
  console.log(originalPost);
  console.log('\n---\n');
  console.log('【リライト結果】');
  console.log(result);
  console.log(`\n文字数: ${result.length}文字\n`);
  
  return result;
}

async function main() {
  try {
    await testPresidentStyleRewrite();
    await testPresidentColumnGeneration();
    await testDifferentScenario();
    
    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

main();
