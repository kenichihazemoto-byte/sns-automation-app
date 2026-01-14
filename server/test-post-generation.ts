import { analyzeImage, generatePostContent } from './ai-service';
import { storagePut } from './storage';
import fs from 'fs';

async function testPostGeneration() {
  console.log('=== ハゼモト建設 投稿生成テスト ===\n');

  // 1. 画像をS3にアップロード
  console.log('1. 画像をS3にアップロード中...');
  const imageBuffer = fs.readFileSync('/home/ubuntu/sns-automation-app/test-house.jpg');
  const { url: imageUrl } = await storagePut(
    `test/house-${Date.now()}.jpg`,
    imageBuffer,
    'image/jpeg'
  );
  console.log(`   アップロード完了: ${imageUrl}\n`);

  // 2. 画像を分析
  console.log('2. AI画像分析中...');
  const imageAnalysis = await analyzeImage(imageUrl);
  console.log('   分析結果:');
  console.log(`   - カテゴリー: ${imageAnalysis.category}`);
  console.log(`   - スタイル: ${imageAnalysis.style}`);
  console.log(`   - 説明: ${imageAnalysis.description}`);
  console.log(`   - キーワード: ${imageAnalysis.keywords.join(', ')}\n`);

  // 3. 各プラットフォーム向けの投稿を生成
  const platforms: Array<"instagram" | "x" | "threads"> = ['instagram', 'x', 'threads'];
  
  for (const platform of platforms) {
    console.log(`3. ${platform.toUpperCase()} 投稿生成中...`);
    const content = await generatePostContent({
      platform,
      imageAnalysis,
      companyName: 'ハゼモト建設',
    });
    
    console.log(`\n【${platform.toUpperCase()} 投稿文】`);
    console.log('─────────────────────────────');
    console.log(content.caption);
    console.log('');
    console.log('【ハッシュタグ】');
    console.log(content.hashtags.map(tag => `#${tag}`).join(' '));
    console.log('─────────────────────────────\n');
  }

  console.log('=== テスト完了 ===');
}

testPostGeneration().catch(console.error);
