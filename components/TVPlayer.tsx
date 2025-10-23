import React, { useEffect, useRef, useState } from 'react';
import { loadPlaylist, type TVItem } from '../lib/tv';
import { listenTvEvents, type TvEvent } from '../lib/tvBus';
import { getTvChannel } from '../lib/broadcastService';
import { TV_WELCOME_DURATION_MS, TV_OVERLAY_THEME, TV_SHOW_QUEUE_COUNT, TV_LOGO_URL } from '../lib/config';

// Tipos para el mensaje de bienvenida
type WelcomeMsg = {
  id: string;
  name?: string;
  company?: string;
  message: string;
};

// Componente para el contenido principal (video/imagen)
interface MainPlayerContentProps {
  item: TVItem;
  onVideoEnd: () => void;
}
const MainPlayerContent: React.FC<MainPlayerContentProps> = React.memo(({ item, onVideoEnd }) => {
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
      className="w-full h-full bg-cover bg-center"
      style={{ backgroundImage: `url(${item.src})` }}
    />
  );
});

const TVPlayer: React.FC = () => {
  const [items, setItems] = useState<TVItem[]>([]);
  const [idx, setIdx] = useState(0);

  // Estado y refs para la cola de bienvenida y el overlay
  const [welcomeQueue, setWelcomeQueue] = useState<WelcomeMsg[]>([]);
  const [activeWelcome, setActiveWelcome] = useState<WelcomeMsg | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const animTimerRef = useRef<number | null>(null);

  // Función para encolar nuevos mensajes
  function enqueueWelcome(msg: TvEvent) {
    const normalizedMsg: WelcomeMsg = {
      id: msg.lead.id || `${Date.now()}`,
      name: msg.lead.name,
      company: msg.lead.company,
      message: (msg.welcomeMessage || '').trim() || 'Great to have you here—enjoy the experience!',
    };
    setWelcomeQueue(q => [...q, normalizedMsg]);
  }

  // Loop de consumo de la cola (FIFO)
  useEffect(() => {
    if (activeWelcome || welcomeQueue.length === 0) return;

    const nextInQueue = welcomeQueue[0];
    setActiveWelcome(nextInQueue);
    setWelcomeQueue(q => q.slice(1));

    // Mostrar overlay
    setOverlayVisible(true);

    // Limpiar timers previos
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    
    // Programar ocultación
    hideTimerRef.current = window.setTimeout(() => {
      setOverlayVisible(false);
      // Limpiar el mensaje activo después de la transición de salida
      animTimerRef.current = window.setTimeout(() => setActiveWelcome(null), 300);
    }, TV_WELCOME_DURATION_MS);

  }, [welcomeQueue, activeWelcome]);
  
  // Carga de playlist
  useEffect(() => {
    loadPlaylist().then(setItems).catch(console.error);
  }, []);

  // Suscripciones a eventos
  useEffect(() => {
    const unsubBus = listenTvEvents(enqueueWelcome);
    const ch = getTvChannel();
    const onMsg = (e: MessageEvent<TvEvent>) => {
        if (e.data?.lead && e.data.welcomeMessage) {
            enqueueWelcome(e.data);
        }
    };
    if (ch) ch.addEventListener('message', onMsg as EventListener);

    return () => {
      unsubBus();
      if (ch) ch.removeEventListener('message', onMsg as EventListener);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Avance de playlist
  useEffect(() => {
    if (items.length === 0) return;
    const current = items[idx];
    if (current?.type === 'image') {
      const duration = Math.max(3000, current.duration ?? 8000);
      const timer = setTimeout(() => setIdx(i => (i + 1) % items.length), duration);
      return () => clearTimeout(timer);
    }
  }, [idx, items]);

  const onVideoEnd = () => {
    if (items.length > 0) setIdx(i => (i + 1) % items.length);
  };

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Capa base: playlist (nunca se pausa) */}
      <div className="absolute inset-0 z-10">
        {items.length > 0 && <MainPlayerContent item={items[idx]} onVideoEnd={onVideoEnd} />}
      </div>

      {/* Overlay de bienvenida */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-0 z-20 transition-opacity duration-300 ease-out ${overlayVisible && activeWelcome ? 'opacity-100' : 'opacity-0'}`}
        style={{ contain: 'layout paint', willChange: 'opacity' }}
      >
        {TV_OVERLAY_THEME === 'glass' ? (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[8px]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/70 via-purple-700/60 to-fuchsia-600/70" />
        )}
        <div className="relative h-full w-full flex items-center justify-center p-[min(6vw,40px)]">
          {activeWelcome && (
            <div
              className={`max-w-[1200px] w-full rounded-3xl bg-white/90 dark:bg-black/75 shadow-2xl ring-1 ring-white/30 dark:ring-black/30 px-[min(6vw,40px)] py-[min(5vw,32px)] transition-transform duration-300 ease-out ${overlayVisible ? 'scale-100' : 'scale-95'}`}
            >
              <div className="flex items-center justify-between mb-[min(3vw,20px)]">
                <div className="text-[min(3.8vw,22px)] font-semibold tracking-tight text-gray-800 dark:text-gray-100">
                  Welcome!
                </div>
                <div className="flex items-center gap-3">
                  {TV_SHOW_QUEUE_COUNT && welcomeQueue.length > 0 && (
                    <span className="text-[min(2.7vw,14px)] font-medium text-white bg-black/40 rounded-full px-3 py-1">
                      Up next: {welcomeQueue.length}
                    </span>
                  )}
                  {TV_LOGO_URL && <img src={TV_LOGO_URL} alt="logo" className="h-[min(8vw,56px)] w-auto object-contain" />}
                </div>
              </div>
              <div className="space-y-[min(2.5vw,16px)]">
                <div className="leading-[1.05] font-extrabold text-gray-900 dark:text-white" style={{ fontSize: 'clamp(32px, min(10vw, 72px), 72px)' }}>
                  {`Hi ${activeWelcome.name?.split(' ')[0] || 'there'}!`}
                </div>
                <p className="text-gray-800/90 dark:text-gray-100/90 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden" style={{ fontSize: 'clamp(16px, min(4.6vw, 28px), 28px)', lineHeight: 1.2 }}>
                  {activeWelcome.message}
                </p>
                {activeWelcome.company && (
                  <div className="text-gray-700/90 dark:text-gray-200/80" style={{ fontSize: 'clamp(14px, min(3.6vw, 20px), 20px)' }}>
                    {activeWelcome.company}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TVPlayer;