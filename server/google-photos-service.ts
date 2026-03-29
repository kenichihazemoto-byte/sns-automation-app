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
  /** 紐付けSNSアカウントID（nullまたは空配列は全アカウント対象） */
  targetSnsAccountIds?: number[] | null;
  /** 投稿タイプカテゴリ（nullは全タイプ対応） */
  postCategory?: string | null;
}

export interface GooglePhotoItem {
  url: string;
  thumbnailUrl: string;
  title?: string;
  description?: string;
  albumYear: string;
}

/**
 * アルバム一覧（DBが利用できない場合のフォールバック用定数）
 */
export const HAZEMOTO_ALBUMS: GooglePhotoAlbum[] = [
  { url: "https://photos.app.goo.gl/qyVKRvekQFzNYcg57", year: "2026", title: "生成画像アルバム" },
];

/**
 * DBからアクティブなアルバム一覧を取得する
 * DB接続不可の場合はHAZEMOTO_ALBUMSにフォールバック
 */
async function getActiveAlbumsFromDb(): Promise<GooglePhotoAlbum[]> {
  try {
    const { getDb } = await import("./db");
    const { googlePhotoAlbums } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return HAZEMOTO_ALBUMS;
    const rows = await db
      .select()
      .from(googlePhotoAlbums)
      .where(eq(googlePhotoAlbums.isActive, 1));
    if (rows.length === 0) return HAZEMOTO_ALBUMS;
    return rows.map(row => ({
      url: row.url,
      year: new Date(row.createdAt).getFullYear().toString(),
      title: row.title,
      targetSnsAccountIds: row.targetSnsAccountIds
        ? (() => { try { return JSON.parse(row.targetSnsAccountIds!); } catch { return null; } })()
        : null,
      postCategory: row.postCategory ?? null,
    }));
  } catch (e) {
    console.warn("[GooglePhotos] Failed to load albums from DB, using fallback:", e);
    return HAZEMOTO_ALBUMS;
  }
}

/**
 * 画像URLの検証
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('https://lh3.googleusercontent.com/')) return false;
  if (url.length < 50) return false;
  if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) return false;
  return true;
}

/**
 * 複数のパターンで画像URLを抽出（フォールバック機構）
 */
function extractImageUrls(html: string): string[] {
  const allUrls: string[] = [];
  
  const pattern1 = /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+(?:=[a-z0-9-]+)?/g;
  const matches1 = html.match(pattern1);
  if (matches1) allUrls.push(...matches1);
  
  const pattern2 = /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\/-]+/g;
  const matches2 = html.match(pattern2);
  if (matches2) allUrls.push(...matches2);
  
  const pattern3 = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/g;
  const matches3 = html.match(pattern3);
  if (matches3) allUrls.push(...matches3);
  
  const uniqueUrls = Array.from(new Set(allUrls));
  const validUrls = uniqueUrls.filter(isValidImageUrl);
  
  console.log(`[GooglePhotos] Extracted ${allUrls.length} URLs, ${uniqueUrls.length} unique, ${validUrls.length} valid`);
  
  return validUrls;
}

/**
 * Google フォト共有アルバムから画像URLを取得
 */
export async function fetchPhotosFromAlbum(
  albumUrl: string,
  albumList?: GooglePhotoAlbum[]
): Promise<GooglePhotoItem[]> {
  const list = albumList ?? HAZEMOTO_ALBUMS;
  const album = list.find(a => a.url === albumUrl) ?? HAZEMOTO_ALBUMS.find(a => a.url === albumUrl);
  if (!album) {
    throw new Error("Album not found");
  }

  try {
    const response = await fetch(albumUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album: ${response.statusText}`);
    }
    
    const html = await response.text();
    const imageUrls = extractImageUrls(html);
    
    if (imageUrls.length === 0) {
      console.warn(`[GooglePhotos] No images found in album: ${albumUrl}`);
      return [];
    }
    
    const photos: GooglePhotoItem[] = imageUrls.map((url, index) => {
      const baseUrl = url.split('=')[0];
      return {
        url: `${baseUrl}=w2048-h2048`,
        thumbnailUrl: `${baseUrl}=w400-h400`,
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
export function selectRandomAlbum(albums?: GooglePhotoAlbum[]): GooglePhotoAlbum {
  const list = albums && albums.length > 0 ? albums : HAZEMOTO_ALBUMS;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

/**
 * ランダムに写真を選択
 */
export function selectRandomPhoto(photos: GooglePhotoItem[]): GooglePhotoItem {
  const randomIndex = Math.floor(Math.random() * photos.length);
  return photos[randomIndex];
}

/**
 * ランダムな競工写真を１枚取得（DBのアルバム設定を反映）
 * albumオブジェクトにtargetSnsAccountIdsを含めて返す
 * postCategoryを指定するとそのカテゴリのアルバムを優先選択
 */
export async function getRandomConstructionPhoto(postCategory?: string | null): Promise<{
  photo: GooglePhotoItem;
  album: GooglePhotoAlbum;
}> {
  try {
    const activeAlbums = await getActiveAlbumsFromDb();
    // postCategoryが指定された場合、一致するアルバムを優先選択
    let candidateAlbums = activeAlbums;
    if (postCategory) {
      const matched = activeAlbums.filter(a => a.postCategory === postCategory);
      if (matched.length > 0) {
        candidateAlbums = matched;
        console.log(`[GooglePhotos] Filtered by postCategory="${postCategory}": ${matched.length} album(s)`);
      } else {
        console.log(`[GooglePhotos] No album matched postCategory="${postCategory}", using all albums`);
      }
    }
    const album = selectRandomAlbum(candidateAlbums);
    console.log(`[GooglePhotos] Selected album: ${album.title} (${album.year}) targetSnsAccountIds:`, album.targetSnsAccountIds);
    
    const photos = await fetchPhotosFromAlbum(album.url, activeAlbums);
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
