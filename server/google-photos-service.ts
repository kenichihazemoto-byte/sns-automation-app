/**
 * Google フォト共有アルバムから画像を取得するサービス
 * 
 * 注意: Google Photos Library APIは2025年4月以降、アプリが作成したコンテンツのみアクセス可能。
 * そのため、共有アルバムのURLから直接画像を取得する方法を使用します。
 */

export interface GooglePhotoAlbum {
  url: string;
  year: string;
  title: string;
}

export interface GooglePhotoItem {
  url: string;
  thumbnailUrl: string;
  title?: string;
  description?: string;
  albumYear: string;
}

/**
 * ハゼモト建設の竣工写真アルバム一覧
 */
export const HAZEMOTO_ALBUMS: GooglePhotoAlbum[] = [
  { url: "https://photos.app.goo.gl/JmEw1Lnr7eN13cJ68", year: "2009", title: "〜2009年竣工写真" },
  { url: "https://photos.app.goo.gl/RDD9DbPKngWjVTbz5", year: "2010", title: "2010年竣工写真" },
  { url: "https://photos.app.goo.gl/dSGiAuUaAQaw5UPEA", year: "2011", title: "2011年竣工写真" },
  { url: "https://photos.app.goo.gl/7yfwAtrLYrQvnvX39", year: "2012", title: "2012年竣工写真" },
  { url: "https://photos.app.goo.gl/gNLTxupRqMmXuKBX9", year: "2013", title: "2013年竣工写真" },
  { url: "https://photos.app.goo.gl/5YPK2Wmkq1prqaYG7", year: "2014", title: "2014年竣工写真" },
  { url: "https://photos.app.goo.gl/dgW4bei9uHZ67TtT8", year: "2015", title: "2015年竣工写真" },
  { url: "https://photos.app.goo.gl/fkQ8q1b3N2Kwuer56", year: "2016", title: "2016年竣工写真" },
  { url: "https://photos.app.goo.gl/aSebzS1qC9TYiGr47", year: "2017", title: "2017年竣工写真" },
  { url: "https://photos.app.goo.gl/Smy6ZNFm15AcZChn7", year: "2018", title: "2018年竣工写真" },
  { url: "https://photos.app.goo.gl/K28tHuNJRckC4qky6", year: "2019", title: "2019年竣工写真" },
  { url: "https://photos.app.goo.gl/RUhEqxEvvpLVbzYUA", year: "2020", title: "2020年竣工写真" },
  { url: "https://photos.app.goo.gl/oyybCnMGzoD9Gg7TA", year: "2021", title: "2021年竣工写真" },
  { url: "https://photos.app.goo.gl/morf3MfQcn2QiRVH9", year: "2022", title: "2022年竣工写真" },
  { url: "https://photos.app.goo.gl/4BmS9zm9XSsx27Mi6", year: "2023", title: "2023年竣工写真" },
  { url: "https://photos.app.goo.gl/ibJ6TAfQRsnaNmoPA", year: "2024", title: "2024年竣工写真" },
  { url: "https://photos.app.goo.gl/Bvkig8pTc6cAw4ew5", year: "2025", title: "2025年竣工写真" },
];

/**
 * 画像URLの検証
 */
function isValidImageUrl(url: string): boolean {
  // 基本的なURL形式チェック
  if (!url || typeof url !== 'string') return false;
  
  // lh3.googleusercontent.comドメインのチェック
  if (!url.startsWith('https://lh3.googleusercontent.com/')) return false;
  
  // 最小限の長さチェック（ドメイン + パス）
  if (url.length < 50) return false;
  
  // 無効な文字が含まれていないかチェック
  if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) return false;
  
  return true;
}

/**
 * 複数のパターンで画像URLを抽出（フォールバック機構）
 */
function extractImageUrls(html: string): string[] {
  const allUrls: string[] = [];
  
  // パターン1: 最も一般的なパターン（=で終わるまで）
  const pattern1 = /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+(?:=[a-z0-9-]+)?/g;
  const matches1 = html.match(pattern1);
  if (matches1) {
    allUrls.push(...matches1);
  }
  
  // パターン2: より長いパス（スラッシュを含む）
  const pattern2 = /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\/-]+/g;
  const matches2 = html.match(pattern2);
  if (matches2) {
    allUrls.push(...matches2);
  }
  
  // パターン3: クエリパラメータを含む完全なURL
  const pattern3 = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/g;
  const matches3 = html.match(pattern3);
  if (matches3) {
    allUrls.push(...matches3);
  }
  
  // 重複を除去し、検証済みのURLのみを返す
  const uniqueUrls = Array.from(new Set(allUrls));
  const validUrls = uniqueUrls.filter(isValidImageUrl);
  
  console.log(`[GooglePhotos] Extracted ${allUrls.length} URLs, ${uniqueUrls.length} unique, ${validUrls.length} valid`);
  
  return validUrls;
}

/**
 * Google フォト共有アルバムから画像URLを取得
 * 
 * 共有アルバムのHTMLをパースして実際の画像URLを抽出します。
 * 複数のパターンでフォールバックし、取得成功率を向上させます。
 */
export async function fetchPhotosFromAlbum(albumUrl: string): Promise<GooglePhotoItem[]> {
  const album = HAZEMOTO_ALBUMS.find(a => a.url === albumUrl);
  if (!album) {
    throw new Error("Album not found");
  }

  try {
    // Googleフォト共有アルバムのHTMLを取得
    const response = await fetch(albumUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 複数のパターンで画像URLを抽出
    const imageUrls = extractImageUrls(html);
    
    if (imageUrls.length === 0) {
      console.warn(`[GooglePhotos] No images found in album: ${albumUrl}`);
      return [];
    }
    
    // GooglePhotoItem形式に変換
    const photos: GooglePhotoItem[] = imageUrls.map((url, index) => {
      // URLからサイズパラメータを除去（既に含まれている場合）
      const baseUrl = url.split('=')[0];
      
      return {
        url: `${baseUrl}=w2048-h2048`, // 高解像度版
        thumbnailUrl: `${baseUrl}=w400-h400`, // サムネイル
        title: `${album.year}年 竣工物件 ${index + 1}`,
        description: `${album.title}からの写真`,
        albumYear: album.year,
      };
    });
    
    console.log(`[GooglePhotos] Successfully fetched ${photos.length} photos from album: ${album.title}`);
    return photos;
    
  } catch (error) {
    console.error(`[GooglePhotos] Error fetching photos from album ${albumUrl}:`, error);
    throw new Error(`Failed to fetch photos from album: ${error}`);
  }
}

/**
 * ランダムにアルバムを選択
 */
export function selectRandomAlbum(): GooglePhotoAlbum {
  const randomIndex = Math.floor(Math.random() * HAZEMOTO_ALBUMS.length);
  return HAZEMOTO_ALBUMS[randomIndex];
}

/**
 * ランダムに写真を選択
 */
export function selectRandomPhoto(photos: GooglePhotoItem[]): GooglePhotoItem {
  const randomIndex = Math.floor(Math.random() * photos.length);
  return photos[randomIndex];
}

/**
 * デモ用: ランダムな竣工写真を1枚取得
 */
export async function getRandomConstructionPhoto(): Promise<{
  photo: GooglePhotoItem;
  album: GooglePhotoAlbum;
}> {
  try {
    const album = selectRandomAlbum();
    console.log(`[GooglePhotos] Selected album: ${album.title} (${album.year})`);
    
    const photos = await fetchPhotosFromAlbum(album.url);
    console.log(`[GooglePhotos] Fetched ${photos.length} photos from album`);
    
    if (photos.length === 0) {
      throw new Error(`No photos found in album: ${album.title}`);
    }
    
    const photo = selectRandomPhoto(photos);
    console.log(`[GooglePhotos] Selected photo: ${photo.title}`);
    console.log(`[GooglePhotos] Photo URL: ${photo.url.substring(0, 100)}...`);
    
    return { photo, album };
  } catch (error) {
    console.error(`[GooglePhotos] Error in getRandomConstructionPhoto:`, error);
    throw error;
  }
}
