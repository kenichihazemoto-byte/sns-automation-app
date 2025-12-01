// Googleフォトアルバムから画像URLを取得するテストスクリプト

const testAlbumUrl = "https://photos.app.goo.gl/JmEw1Lnr7eN13cJ68"; // 〜2009年竣工写真

async function testFetchPhotos() {
  try {
    console.log(`Fetching album: ${testAlbumUrl}`);
    const response = await fetch(testAlbumUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`HTML length: ${html.length} characters`);
    
    // 画像URLパターンを試す
    const patterns = [
      /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+/g,
      /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/g,
      /"(https:\/\/lh3\.googleusercontent\.com\/[^"]+)"/g,
    ];
    
    patterns.forEach((pattern, index) => {
      const matches = html.match(pattern);
      console.log(`\nPattern ${index + 1}: ${pattern}`);
      console.log(`Matches found: ${matches ? matches.length : 0}`);
      if (matches && matches.length > 0) {
        console.log(`First 3 matches:`);
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`  ${i + 1}. ${match.substring(0, 100)}...`);
        });
      }
    });
    
    // HTMLの一部を表示（最初の1000文字）
    console.log(`\n--- HTML Sample (first 1000 chars) ---`);
    console.log(html.substring(0, 1000));
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testFetchPhotos();
