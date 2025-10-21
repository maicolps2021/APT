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
  // 1. Get the public URL for the playlist.json file
  const playlistPath = `${TV_PREFIX}/playlist.json`;
  const { data: playlistUrlData } = supabase.storage.from(TV_BUCKET).getPublicUrl(playlistPath);

  if (!playlistUrlData?.publicUrl) {
    throw new Error("Could not construct public URL for playlist.json. Check bucket permissions and environment variables.");
  }
  
  // 2. Fetch the playlist file
  const res = await fetch(playlistUrlData.publicUrl);
  if (!res.ok) {
    // This will now throw a more standard HTTP error if the file is not found (404)
    throw new Error(`Failed to fetch playlist: ${res.status} ${res.statusText}. Make sure 'playlist.json' exists in '${TV_BUCKET}/${TV_PREFIX}' and the bucket is public.`);
  }
  const json = await res.json() as { items: TVItem[] };

  // 3. Construct the base URL for other assets in the same folder by removing the filename
  const publicBase = playlistUrlData.publicUrl.replace(/playlist\.json$/, "");

  // 4. Normalize asset URLs
  return (json.items || []).map(it => {
    const isAbsoluteUrl = /^https?:\/\//i.test(it.src);
    // Prepend the base URL only if the src is a relative path
    return { ...it, src: isAbsoluteUrl ? it.src : `${publicBase}${it.src}` };
  });
}
