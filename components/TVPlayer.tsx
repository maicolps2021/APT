import React, { useEffect, useRef, useState } from 'react';
import { loadPlaylist, subscribeToRaffleEvents, type TVItem } from '../lib/tv';
import { listenTvEvents, type TvEvent } from '../lib/tvBus';
import { getTvChannel } from '../lib/broadcastService';
import type { TVEventMessage, TVRaffleMessage, TVWelcomeMessage } from '../lib/tvTypes';
import { TV_WELCOME_DURATION_MS, TV_RAFFLE_DURATION_MS, TV_OVERLAY_THEME, TV_SHOW_QUEUE_COUNT, TV_LOGO_URL, TV_RAFFLE_THEME } from '../lib/config';

// Combined queue item type
type QueueItem = TVWelcomeMessage | TVRaffleMessage;

// --- Sub-components for Overlays ---

const WelcomeOverlay: React.FC<{ msg: TVWelcomeMessage, queueCount: number }> = ({ msg, queueCount }) => (
    <div
      className="max-w-[1200px] w-full rounded-3xl bg-white/90 dark:bg-black/75 shadow-2xl ring-1 ring-white/30 dark:ring-black/30 px-[min(6vw,40px)] py-[min(5vw,32px)]"
    >
      <div className="flex items-center justify-between mb-[min(3vw,20px)]">
        <div className="text-[min(3.8vw,22px)] font-semibold tracking-tight text-gray-800 dark:text-gray-100">
          Welcome!
        </div>
        <div className="flex items-center gap-3">
          {TV_SHOW_QUEUE_COUNT && queueCount > 0 && (
            <span className="text-[min(2.7vw,14px)] font-medium text-white bg-black/40 rounded-full px-3 py-1">
              Up next: {queueCount}
            </span>
          )}
          {TV_LOGO_URL && <img src={TV_LOGO_URL} alt="logo" className="h-[min(8vw,56px)] w-auto object-contain" />}
        </div>
      </div>
      <div className="space-y-[min(2.5vw,16px)]">
        <div className="leading-[1.05] font-extrabold text-gray-900 dark:text-white" style={{ fontSize: 'clamp(32px, min(10vw, 72px), 72px)' }}>
          {`Hi ${msg.firstName || 'there'}!`}
        </div>
        <p className="text-gray-800/90 dark:text-gray-100/90 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden" style={{ fontSize: 'clamp(16px, min(4.6vw, 28px), 28px)', lineHeight: 1.2 }}>
          {msg.text}
        </p>
        {msg.company && (
          <div className="text-gray-700/90 dark:text-gray-200/80" style={{ fontSize: 'clamp(14px, min(3.6vw, 20px), 20px)' }}>
            {msg.company}
          </div>
        )}
      </div>
    </div>
);

const RaffleOverlay: React.FC<{ msg: TVRaffleMessage }> = ({ msg }) => (
    <div className={`relative w-[90%] max-w-5xl text-center rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-2xl ${
        TV_RAFFLE_THEME === 'glass' 
            ? 'backdrop-blur-lg bg-black/40 border border-white/20' 
            : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'
    }`}>
        <div className="confetti" />
        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-500 animate-pulse">
            WINNER!
        </h2>
        <div className="mt-4 text-5xl md:text-8xl font-extrabold drop-shadow-lg">
            {msg.winnerName}
        </div>
        {msg.winnerCompany && (
            <div className="mt-1 text-2xl md:text-4xl opacity-90 drop-shadow-md">{msg.winnerCompany}</div>
        )}
        <div className="mt-8 text-xl md:text-2xl opacity-90 font-light">
            Has won the <span className="font-semibold">{msg.raffleName}</span>
        </div>
        {msg.prize && (
            <div className="mt-2 text-2xl md:text-3xl font-bold text-yellow-300">
                {msg.prize}
            </div>
        )}
    </div>
);

const MainPlayerContent: React.FC<{ item: TVItem; onVideoEnd: () => void }> = React.memo(({ item, onVideoEnd }) => {
  if (item.type === 'video') {
    return <video key={item.src} src={item.src} className="w-full h-full object-cover" muted autoPlay playsInline onEnded={onVideoEnd} />;
  }
  return <div key={item.src} className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.src})` }} />;
});


const TVPlayer: React.FC = () => {
  const [items, setItems] = useState<TVItem[]>([]);
  const [idx, setIdx] = useState(0);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<QueueItem | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const processedIds = useRef(new Set<string>());
  const processTimer = useRef<number | null>(null);

  const enqueue = (msg: QueueItem) => {
    const id = msg.kind === 'raffle' ? msg.raffleId : msg.leadId;
    if (processedIds.current.has(id)) {
      console.log(`Duplicate event skipped: ${id}`);
      return; // Avoid duplicates
    }
    processedIds.current.add(id);
    setQueue(q => [...q, msg]);
  };

  // Event Listeners
  useEffect(() => {
    // 1. Listen for local events (instant)
    const channel = getTvChannel();
    const handleBroadcast = (e: MessageEvent<TVEventMessage>) => enqueue(e.data);
    if(channel) channel.addEventListener('message', handleBroadcast);
    
    // 2. Listen for remote welcome events
    const unsubWelcome = listenTvEvents((evt: TvEvent) => {
        enqueue({
            kind: 'welcome',
            leadId: evt.lead.id,
            firstName: (evt.lead.name || '').split(' ')[0],
            company: evt.lead.company,
            text: evt.welcomeMessage,
        });
    });

    // 3. Listen for remote raffle events
    const unsubRaffle = subscribeToRaffleEvents(enqueue);

    return () => {
      if(channel) channel.removeEventListener('message', handleBroadcast);
      unsubWelcome();
      unsubRaffle();
      if (processTimer.current) clearTimeout(processTimer.current);
    };
  }, []);
  
  // Playlist Loader
  useEffect(() => {
    loadPlaylist().then(setItems).catch(console.error);
  }, []);

  // Playlist advancement (for images)
  useEffect(() => {
    if (items.length === 0 || items[idx]?.type !== 'image') return;
    const duration = Math.max(3000, items[idx].duration ?? 8000);
    const timer = setTimeout(() => setIdx(i => (i + 1) % items.length), duration);
    return () => clearTimeout(timer);
  }, [idx, items]);

  // Queue Processor
  useEffect(() => {
    if (activeOverlay || queue.length === 0) return;

    const nextItem = queue[0];
    setActiveOverlay(nextItem);
    setOverlayVisible(true);

    const duration = nextItem.kind === 'raffle' ? TV_RAFFLE_DURATION_MS : TV_WELCOME_DURATION_MS;
    
    processTimer.current = window.setTimeout(() => {
        setOverlayVisible(false);
        // Allow fade-out animation before clearing
        setTimeout(() => {
            setActiveOverlay(null);
            setQueue(q => q.slice(1));
        }, 500);
    }, duration);

  }, [queue, activeOverlay]);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
            0% { transform: translateY(-100%) rotateZ(0deg); }
            100% { transform: translateY(100vh) rotateZ(360deg); }
        }
        .confetti::before, .confetti::after {
            content: ''; position: absolute; top: 0; left: 0; width: 10px; height: 10px;
            background: #ffd700; border-radius: 50%;
            animation: confetti-fall 5s linear infinite;
            box-shadow: 10vw 5vh 0 #ff4500, 20vw 15vh 0 #00ced1, 30vw 2vh 0 #ff69b4, 45vw 25vh 0 #32cd32, 55vw 8vh 0 #1e90ff, 65vw 30vh 0 #ff1493, 75vw 12vh 0 #ffa500, 88vw 40vh 0 #adff2f, 5vw -10vh 0 #ff6347;
        }
        .confetti::after { animation-delay: -2.5s; }
      `}</style>
      
      {items.length > 0 && <MainPlayerContent item={items[idx]} onVideoEnd={() => setIdx(i => (i + 1) % items.length)} />}

      <div
        aria-live="polite"
        className={`fixed inset-0 z-20 flex items-center justify-center p-4 transition-opacity duration-500 ease-out ${overlayVisible && activeOverlay ? 'opacity-100' : 'opacity-0'}`}
      >
        {activeOverlay?.kind === 'welcome' && <WelcomeOverlay msg={activeOverlay} queueCount={queue.length - 1} />}
        {activeOverlay?.kind === 'raffle' && <RaffleOverlay msg={activeOverlay} />}
      </div>
    </div>
  );
};

export default TVPlayer;
