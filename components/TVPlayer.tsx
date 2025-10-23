import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPlaylist, TVItem } from '../lib/tv';
import { WHATSAPP } from '../lib/config';
import { QRCodeSVG } from 'qrcode.react';
import { getTvChannel, TVWelcomeMessage } from '../lib/broadcastService';
import { listenTvEvents } from '../lib/tvFallback';

// --- Sub-componente para el contenido de fondo (Playlist) ---
const MainPlayerContent: React.FC<{ item: TVItem | null; onEnded: () => void }> = React.memo(({ item, onEnded }) => {
  if (!item) return null;

  return (
    <div key={item.src} className="absolute inset-0 transition-opacity duration-1000 animate-fade-in">
      {item.type === 'video' ? (
        <video
          src={item.src}
          autoPlay
          muted
          playsInline
          onEnded={onEnded}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${item.src})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/30" />
      {item.overlay && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center p-4 bg-black/50 rounded-lg">
          <h2 className="text-4xl font-bold text-white shadow-lg">{item.overlay}</h2>
        </div>
      )}
    </div>
  );
});

// --- Sub-componente para la capa de bienvenida (Overlay) ---
const WelcomeOverlay: React.FC<{ message: TVWelcomeMessage | null, formUrl: string, waLink: string }> = React.memo(({ message, formUrl, waLink }) => {
  if (!message) return null;

  return (
    <div className="absolute inset-0 bg-blue-900/95 flex flex-col items-center justify-center text-center p-12 animate-fade-in z-20">
      <h1 className="text-6xl font-extrabold text-white animate-text-pop-in" style={{ animationDelay: '200ms' }}>¡Bienvenido!</h1>
      <h2 className="text-8xl font-bold text-yellow-300 mt-4 animate-text-pop-in" style={{ animationDelay: '400ms' }}>
        {message.lead.name}
      </h2>
      <h3 className="text-5xl text-white mt-2 animate-text-pop-in" style={{ animationDelay: '600ms' }}>
        de {message.lead.company}
      </h3>
      <p className="text-3xl text-blue-200 mt-12 max-w-4xl animate-text-pop-in" style={{ animationDelay: '800ms' }}>
        "{message.welcomeMessage}"
      </p>
      <div className="absolute bottom-8 right-8 bg-white p-4 rounded-lg shadow-2xl flex flex-col items-center gap-2">
        <p className="font-bold text-slate-800">Scan to Register</p>
        <QRCodeSVG value={formUrl} size={150} />
      </div>
      <div className="absolute bottom-8 left-8 bg-white p-4 rounded-lg shadow-2xl flex flex-col items-center gap-2">
        <p className="font-bold text-slate-800">Contact Us</p>
        <QRCodeSVG value={waLink} size={150} />
      </div>
    </div>
  );
});


const TVPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<TVItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState<TVWelcomeMessage | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const playlistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const waMsg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${waMsg}`;

  // Cargar la playlist principal una sola vez
  useEffect(() => {
    async function init() {
      try {
        const loadedPlaylist = await loadPlaylist();
        if (loadedPlaylist.length === 0) {
          setError("Playlist is empty. Please add media in the Settings page.");
        } else {
          setPlaylist(loadedPlaylist);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load playlist. Ensure it exists and the storage bucket is public.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);
  
  // Lógica para avanzar en la playlist principal
  const advanceToNextItem = useCallback(() => {
    if (playlist.length > 0) {
      setCurrentItemIndex(prevIndex => (prevIndex + 1) % playlist.length);
    }
  }, [playlist.length]);

  // Efecto para gestionar el timer de la playlist principal
  useEffect(() => {
    if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
    if (playlist.length === 0 || isLoading) return;
    
    const currentItem = playlist[currentItemIndex];
    // Solo se necesita timer para las imágenes, los videos avanzan con onEnded
    if (currentItem?.type === 'image') {
      playlistTimerRef.current = setTimeout(advanceToNextItem, currentItem.duration || 8000);
    }
    
    return () => {
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
    };
  }, [currentItemIndex, playlist, advanceToNextItem, isLoading]);

  // Efecto para escuchar los mensajes de bienvenida (BroadcastChannel o Fallback)
  useEffect(() => {
    const handleNewMessage = (event: MessageEvent<TVWelcomeMessage>) => {
      const message = event.data;
      if (message?.lead) {
        setWelcomeMessage(message);
        
        if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);

        welcomeTimerRef.current = setTimeout(() => {
          setWelcomeMessage(null);
        }, 12000); // Mostrar por 12 segundos
      }
    };

    const channel = getTvChannel();
    let unsubscribeFromFallback: (() => void) | null = null;

    if (channel) {
      channel.addEventListener('message', handleNewMessage);
    } else {
      console.warn("BroadcastChannel not supported, using Firestore fallback for TV messages.");
      unsubscribeFromFallback = listenTvEvents((eventData) => {
        // Adapt the Firestore event to look like a MessageEvent for the handler
        handleNewMessage({ data: eventData } as MessageEvent<TVWelcomeMessage>);
      });
    }

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleNewMessage);
      }
      if (unsubscribeFromFallback) {
        unsubscribeFromFallback();
      }
      if (playlistTimerRef.current) clearTimeout(playlistTimerRef.current);
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, []);

  const currentPlaylistItem = playlist.length > 0 ? playlist[currentItemIndex] : null;

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {isLoading ? (
        <div className="text-white text-3xl flex items-center justify-center h-full">Loading Playlist...</div>
      ) : error ? (
        <div className="text-red-300 text-2xl p-8 bg-black/50 rounded-lg flex items-center justify-center h-full">{error}</div>
      ) : (
        <>
          {/* Capa Base: Siempre renderiza el contenido de la playlist */}
          <div className="absolute inset-0 z-10">
             <MainPlayerContent item={currentPlaylistItem} onEnded={advanceToNextItem} />
          </div>

          {/* Capa Superpuesta: Aparece/desaparece con transición */}
          <div className={`absolute inset-0 z-20 transition-opacity duration-500 ${welcomeMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <WelcomeOverlay message={welcomeMessage} formUrl={formUrl} waLink={waLink} />
          </div>
        </>
      )}
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in { animation: fade-in 0.7s ease-out forwards; }
          
          @keyframes text-pop-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-text-pop-in {
            opacity: 0;
            animation: text-pop-in 0.5s ease-out forwards;
          }
       `}</style>
    </div>
  );
};

export default TVPlayer;
