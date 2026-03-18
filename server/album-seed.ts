import { getDb } from "./db";
import { googlePhotoAlbums } from "../drizzle/schema";

const DEFAULT_ALBUMS = [
  {
    title: "生成画像アルバム",
    url: "https://photos.app.goo.gl/qyVKRvekQFzNYcg57",
    label: "AI生成",
    isActive: 1,
    sortOrder: 0,
  },
];

/**
 * DBにアルバムが1件もない場合にデフォルトアルバムを登録する
 */
export async function seedDefaultAlbum(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AlbumSeed] Database not available, skipping seed");
    return;
  }

  const existing = await db.select().from(googlePhotoAlbums).limit(1);
  if (existing.length > 0) {
    console.log("[AlbumSeed] Albums already exist, skipping seed");
    return;
  }

  for (const album of DEFAULT_ALBUMS) {
    await db.insert(googlePhotoAlbums).values({
      title: album.title,
      url: album.url,
      label: album.label,
      isActive: album.isActive,
      sortOrder: album.sortOrder,
      targetSnsAccountIds: null,
    });
    console.log(`[AlbumSeed] Seeded album: ${album.title}`);
  }

  console.log(`[AlbumSeed] Seeded ${DEFAULT_ALBUMS.length} default album(s)`);
}
