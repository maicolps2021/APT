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
  // 1. Obtiene la URL pública para el archivo playlist.json
  const playlistPath = `${TV_PREFIX}/playlist.json`;
  const { data: playlistUrlData } = supabase.storage.from(TV_BUCKET).getPublicUrl(playlistPath);

  if (!playlistUrlData?.publicUrl) {
    throw new Error("No se pudo construir la URL pública para playlist.json. Revisa los permisos del bucket y las variables de entorno.");
  }
  
  // 2. Obtiene el archivo de la playlist
  const res = await fetch(playlistUrlData.publicUrl);
  if (!res.ok) {
    // Esto ahora lanzará un error HTTP más estándar si no se encuentra el archivo (404)
    throw new Error(`Fallo al obtener la playlist: ${res.status} ${res.statusText}. Asegúrate de que 'playlist.json' existe en '${TV_BUCKET}/${TV_PREFIX}' y que el bucket es público.`);
  }
  const json = await res.json() as { items: TVItem[] };

  // 3. Construye la URL base para otros activos en la misma carpeta eliminando el nombre del archivo
  const publicBase = playlistUrlData.publicUrl.replace(/playlist\.json$/, "");

  // 4. Normaliza las URLs de los activos
  return (json.items || []).map(it => {
    const isAbsoluteUrl = /^https?:\/\//i.test(it.src);
    // Añade la URL base solo si el src es una ruta relativa
    return { ...it, src: isAbsoluteUrl ? it.src : `${publicBase}${it.src}` };
  });
}
