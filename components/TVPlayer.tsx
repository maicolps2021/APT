import React, { useEffect, useRef, useState } from 'react';
import { loadPlaylist, type TVItem } from '../lib/tv';
import { listenTvEvents, type TvEvent } from '../lib/tvBus';
import { getTvChannel } from '../lib/broadcastService';

const WELCOME_MS = 12_000;

// FIX: Refactored to a React.FC with an interface to correctly handle the 'key' prop passed by the parent, resolving a TypeScript error.
interface MainPlayerContentProps {
  item: TVItem;
  onVideoEnd: () => void;
}

// Renderizador base (respeta tu diseño existente)
const MainPlayerContent: React.FC<MainPlayerContentProps> = ({ item, onVideoEnd }) => {
  if (item.type === 'video') {
    return (
      <video
        key={item.src}
        src={item.src}
        className="w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        onEnded={onVideoEnd}
        onError={(e) => console.error('Video error', e)}
      />
    );
  }
  return (
    <div
      key={item.src}
      className="w-full h-full object-cover bg-cover bg-center"
      style={{ backgroundImage: `url(${item.src})` }}
    />
  );
}

const TVPlayer: React.FC = () => {
  const [items, setItems] = useState<TVItem[]>([]);
  const [idx, setIdx] = useState(0);

  // Estado visible del overlay:
  const [welcome, setWelcome] = useState<{ name: string; aiMessage: string } | null>(null);

  // ---- NUEVO: cola y control ----
  const queueRef = useRef<TvEvent[]>([]);
  const welcomeTimer = useRef<number | null>(null);

  function clearWelcomeTimer() {
    if (welcomeTimer.current) {
      clearTimeout(welcomeTimer.current);
      welcomeTimer.current = null;
    }
  }

  function showNextFromQueue() {
    clearWelcomeTimer();
    const next = queueRef.current.shift();
    if (!next) {
      setWelcome(null);
      return;
    }
    setWelcome({ name: next.lead?.name ?? 'Guest', aiMessage: next.welcomeMessage ?? '' });
    welcomeTimer.current = window.setTimeout(() => {
      // setWelcome(null); // No es necesario, showNextFromQueue lo sobreescribirá o limpiará
      showNextFromQueue();
    }, WELCOME_MS);
  }

  function enqueue(evt: TvEvent) {
    queueRef.current.push(evt);
    // Si no hay nada mostrándose, iniciar el ciclo
    if (!welcome && !welcomeTimer.current) {
      showNextFromQueue();
    }
  }
  // ---- FIN NUEVO ----

  // Carga de playlist (sin tocar tu lógica original)
  useEffect(() => {
    (async () => {
      const list = await loadPlaylist();
      setItems(list);
    })().catch(console.error);
  }, []);

  // Suscripciones: Firestore (principal) + BroadcastChannel (secundario)
  useEffect(() => {
    // Principal: Firestore (multidispositivo)
    const unsubBus = listenTvEvents((evt) => enqueue(evt));

    // Secundario: BroadcastChannel (mismo dispositivo)
    const ch = getTvChannel();
    const onMsg = (e: MessageEvent<any>) => {
      const d = e.data;
      if (!d?.lead || !d.welcomeMessage) return;
      enqueue({
        lead: { id: d.lead?.id ?? '', name: d.lead?.name ?? 'Guest', company: d.lead?.company, notes: d.lead?.notes },
        welcomeMessage: d.welcomeMessage ?? '',
      });
    };
    if (ch) ch.addEventListener('message', onMsg);

    return () => {
      clearWelcomeTimer();
      if (ch) ch.removeEventListener('message', onMsg);
      unsubBus();
    };
  }, []);

  // Avance de playlist (respeta tu implementación actual)
  useEffect(() => {
    if (items.length === 0) return;
    const current = items[idx];
    if (!current) return;
    if (current.type === 'image') {
      const d = Math.max(3000, current.duration ?? 8000);
      const t = window.setTimeout(() => setIdx((i) => (i + 1) % items.length), d);
      return () => clearTimeout(t);
    }
  }, [idx, items]);

  function onVideoEnd() {
    if (items.length > 0) {
      setIdx((i) => (i + 1) % items.length);
    }
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Capa base: playlist (no se pausa) */}
      <div className="absolute inset-0 z-10">
        {items.length > 0 && (
          <MainPlayerContent
            key={idx}
            item={items[idx]}
            onVideoEnd={onVideoEnd}
          />
        )}
      </div>

      {/* Capa overlay: bienvenida con cola */}
      <div className={`absolute inset-0 z-20 transition-opacity duration-700 ${welcome ? 'opacity-100' : 'opacity-0 pointer-events-none'} flex items-center justify-center bg-black/50`}>
        {welcome && (
          <div className="w-[85vw] max-w-[1200px] bg-white/95 dark:bg-gray-900/95 rounded-2xl p-8 shadow-2xl text-center text-gray-800 dark:text-gray-100 animate-fade-in-up">
            <h2 className="text-5xl md:text-7xl font-extrabold text-blue-600 dark:text-blue-400">¡Bienvenido, {welcome.name}!</h2>
            <p className="text-2xl md:text-4xl leading-snug my-6">{welcome.aiMessage}</p>
            {queueRef.current.length > 0 && (
              <p className="text-lg opacity-70">Siguientes en cola: {queueRef.current.length}</p>
            )}
          </div>
        )}
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default TVPlayer;