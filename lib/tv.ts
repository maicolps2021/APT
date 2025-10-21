import { supabase } from './supabaseClient';
import { TV_BUCKET, TV_PREFIX } from './config';

export type TVItem = {
  type: "video" | "image";
  src: string;
  duration?: number;
  overlay?: string;
  qr?: boolean;
};

export async function loadPlaylist(): Promise<TVItem[]> {
  const basePath = `${TV_PREFIX}/playlist.json`;
  const { data: signed, error } = await supabase.storage
    .from(TV_BUCKET)
    .createSignedUrl(basePath, 60);

  if (error) {
    console.error("Error creating signed URL for playlist:", error);
    throw error;
  }
  
  if (!signed) {
      throw new Error("Could not create a signed URL for the playlist.");
  }

  const res = await fetch(signed.signedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist: ${res.statusText}`);
  }
  const json = await res.json() as { items: TVItem[] };

  const { data: pubUrlData } = supabase.storage.from(TV_BUCKET).getPublicUrl(`${TV_PREFIX}/x`);
  
  if (!pubUrlData) {
      throw new Error("Could not get public URL for storage bucket.");
  }

  const publicBase = pubUrlData.publicUrl.replace(/x$/, "");

  return (json.items || []).map(it => {
    const isAbs = /^https?:\/\//i.test(it.src);
    return { ...it, src: isAbs ? it.src : `${publicBase}${it.src}` };
  });
}
