import { storage } from './supabaseClient'; // Path kept for simplicity, points to Firebase now
import { ref, getDownloadURL } from 'firebase/storage';
import { TV_PREFIX } from './config';

export type TVItem = {
  type: "video" | "image";
  src: string;
  duration?: number;
  overlay?: string;
  qr?: boolean;
};

export async function loadPlaylist(): Promise<TVItem[]> {
  try {
    // 1. Get the public URL for the playlist.json file from Firebase Storage
    const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
    const playlistUrl = await getDownloadURL(playlistRef);

    // 2. Fetch the playlist file
    const res = await fetch(playlistUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch playlist: ${res.status} ${res.statusText}. Ensure 'playlist.json' exists in '${TV_PREFIX}' and Storage is public.`);
    }
    const json = await res.json() as { items: Omit<TVItem, 'src'> & { src: string }[] }; // src is relative path here

    // 3. Normalize asset URLs
    const assetPromises = (json.items || []).map(async (item) => {
      const assetRef = ref(storage, `${TV_PREFIX}/${item.src}`);
      const assetUrl = await getDownloadURL(assetRef);
      return { ...item, src: assetUrl };
    });

    return Promise.all(assetPromises);
  } catch (error) {
    console.error("Error loading playlist from Firebase Storage:", error);
    if (error instanceof Error && error.message.includes('storage/object-not-found')) {
      throw new Error(`'playlist.json' not found in Firebase Storage folder '${TV_PREFIX}'. Please create it via the Settings page.`);
    }
    throw error;
  }
}
