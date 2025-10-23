import React, { useEffect, useRef, useState } from "react";
import { loadPlaylist, TVItem } from "../lib/tv";
import { QRDisplay } from "./QRDisplay";
import { TV_PREFIX } from "../lib/config";

export default function TVPlayer() {
  const [items, setItems] = useState<TVItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const list = await loadPlaylist();
        if (list.length === 0) {
            setError("La playlist está vacía o no se pudo cargar.");
        }
        setItems(list);
        setIdx(0);
      } catch (e: any) {
        console.error("[TV] error en la playlist", e);
        setError(`Fallo al cargar la playlist: ${e.message}`);
      }
    })();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const cur = items[idx];
    if (cur.type === "image") {
      const t = setTimeout(() => next(), cur.duration ?? 8000);
      return () => clearTimeout(t);
    }
  }, [idx, items]);

  const next = () => setIdx(i => (items.length ? (i + 1) % items.length : 0));

  const cur = items[idx];
  
  if (error) {
    return (
        <div className="w-screen h-screen bg-black text-red-400 p-8 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold mb-4">Error en la Pantalla de TV</h2>
            <p className="max-w-xl">{error}</p>
            <p className="text-sm text-gray-400 mt-4">
                Por favor, revisa la carpeta '{TV_PREFIX}' en Firebase Storage para un archivo 'playlist.json' válido y accesible públicamente, y asegúrate de que todos los archivos multimedia referenciados estén subidos.
            </p>
        </div>
    );
  }

  if (!cur) return <div className="w-screen h-screen bg-black text-slate-300 p-6 flex items-center justify-center">Cargando playlist…</div>;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {cur.type === "video" ? (
        <video
          key={cur.src}
          ref={videoRef}
          src={cur.src}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          onEnded={next}
          onError={(e) => {
            console.error(`Error reproduciendo el video ${cur.src}`, e);
            next();
          }}
        />
      ) : (
        <img
          key={cur.src}
          src={cur.src}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error(`Error cargando la imagen ${cur.src}`, e);
            next();
          }}
          alt="slide"
        />
      )}

      {cur.overlay && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/60 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-lg">
          <p className="text-2xl md:text-4xl font-semibold text-white text-center tracking-wide leading-tight">
            {cur.overlay}
          </p>
        </div>
      )}

      {cur.qr && (
        <div className="absolute bottom-8 right-8">
            <QRDisplay url={`${window.location.origin}/#/capture`} />
        </div>
      )}

      <button
        onClick={next}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/30 border border-white/40 rounded-lg px-3 py-1 text-sm transition-opacity opacity-50 hover:opacity-100"
        aria-label="Siguiente"
      >
        Siguiente ▷
      </button>
    </div>
  );
}
