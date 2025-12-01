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
 * Google フォト共有アルバムから画像URLを取得
 * 
 * 共有アルバムのHTMLをパースして実際の画像URLを抽出します。
 */
export async function fetchPhotosFromAlbum(albumUrl: string): Promise<GooglePhotoItem[]> {
  const album = HAZEMOTO_ALBUMS.find(a => a.url === albumUrl);
  if (!album) {
    throw new Error("Album not found");
  }

  try {
    // Googleフォト共有アルバムのHTMLを取得
    const response = await fetch(albumUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch album: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // HTMLから画像URLを抽出
    // Googleフォトの共有アルバムには、画像が"https://lh3.googleusercontent.com/"で始まるURLとして埋め込まれている
    const imageUrlPattern = /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+/g;
    const matches = html.match(imageUrlPattern);
    
    if (!matches || matches.length === 0) {
      console.warn(`No images found in album: ${albumUrl}`);
      return [];
    }
    
    // 重複を除去し、ユニークな画像URLのみを取得
    const uniqueUrls = Array.from(new Set(matches));
    
    // GooglePhotoItem形式に変換
    const photos: GooglePhotoItem[] = uniqueUrls.map((url, index) => ({
      url: `${url}=w2048-h2048`, // 高解像度版
      thumbnailUrl: `${url}=w400-h400`, // サムネイル
      title: `${album.year}年 竣工物件 ${index + 1}`,
      description: `${album.title}からの写真`,
      albumYear: album.year,
    }));
    
    console.log(`Fetched ${photos.length} photos from album: ${album.title}`);
    return photos;
    
  } catch (error) {
    console.error(`Error fetching photos from album ${albumUrl}:`, error);
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
  const album = selectRandomAlbum();
  const photos = await fetchPhotosFromAlbum(album.url);
  const photo = selectRandomPhoto(photos);
  
  return { photo, album };
}
