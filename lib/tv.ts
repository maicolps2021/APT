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

// Define the shape of the raw item before src is resolved
type RawTVItem = Omit<TVItem, 'src'> & { src: string };

const resolveMediaUrls = async (rawItems: RawTVItem[]): Promise<TVItem[]> => {
    const assetPromises = (rawItems || []).map(async (item) => {
      const assetRef = ref(storage, `${TV_PREFIX}/${item.src}`);
      const assetUrl = await getDownloadURL(assetRef);
      return { ...item, src: assetUrl };
    });
    return Promise.all(assetPromises);
};

export async function loadPlaylist(): Promise<TVItem[]> {
  try {
    const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
    const playlistUrl = await getDownloadURL(playlistRef);

    const res = await fetch(`${playlistUrl}?cb=${Date.now()}`, { cache: 'no-store' });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch playlist: ${res.status}`);
    }
    const data = await res.json();
    
    // Tolerate both { items: [] } and [] formats
    const rawItems: RawTVItem[] = data.items ?? data;
    
    try {
        // Cache the raw playlist data (before URL resolution)
        localStorage.setItem('last_playlist_json', JSON.stringify(rawItems));
    } catch (e) {
        console.warn("Could not write to localStorage:", e);
    }
    
    return resolveMediaUrls(rawItems);
  } catch (error) {
    console.error("Error loading playlist from Firebase Storage:", error);
    
    // Fallback to local cache if network fails
    const cached = localStorage.getItem('last_playlist_json');
    if (cached) {
        console.log("Using cached playlist as a fallback.");
        const rawItems: RawTVItem[] = JSON.parse(cached);
        return resolveMediaUrls(rawItems);
    }

    if (error instanceof Error && error.message.includes('storage/object-not-found')) {
      throw new Error(`'playlist.json' not found in Firebase Storage folder '${TV_PREFIX}'. Please create it via the Settings page.`);
    }
    throw error;
  }
}