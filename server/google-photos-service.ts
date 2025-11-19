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
 * デモ用に、サンプル画像URLを返します。
 * 実際の実装では、共有アルバムのHTMLをパースして画像URLを抽出します。
 */
export async function fetchPhotosFromAlbum(albumUrl: string): Promise<GooglePhotoItem[]> {
  // デモ用: 実際の実装では、albumUrlにアクセスしてHTMLをパースし、画像URLを抽出
  // ここでは、サンプルデータを返します
  
  const album = HAZEMOTO_ALBUMS.find(a => a.url === albumUrl);
  if (!album) {
    throw new Error("Album not found");
  }

  // デモ用のサンプル画像データ
  // 実際の実装では、HTMLパースやAPIを使用して実際の画像URLを取得
  const samplePhotos: GooglePhotoItem[] = [
    {
      url: "https://lh3.googleusercontent.com/sample1",
      thumbnailUrl: "https://lh3.googleusercontent.com/sample1_thumb",
      title: `${album.year}年 竣工物件 1`,
      albumYear: album.year,
    },
    {
      url: "https://lh3.googleusercontent.com/sample2",
      thumbnailUrl: "https://lh3.googleusercontent.com/sample2_thumb",
      title: `${album.year}年 竣工物件 2`,
      albumYear: album.year,
    },
    {
      url: "https://lh3.googleusercontent.com/sample3",
      thumbnailUrl: "https://lh3.googleusercontent.com/sample3_thumb",
      title: `${album.year}年 竣工物件 3`,
      albumYear: album.year,
    },
  ];

  return samplePhotos;
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
