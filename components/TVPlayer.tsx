import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPlaylist, TVItem } from '../lib/tv';
import { WHATSAPP } from '../lib/config';
import { QRCodeSVG } from 'qrcode.react';
import { tvChannel, TVWelcomeMessage } from '../lib/broadcastService';

const TVPlayer: React.FC = () => {
  const [mainPlaylist, setMainPlaylist] = useState<TVItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState<TVWelcomeMessage | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainPlaylistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const waMsg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${waMsg}`;

  const advanceToNextItem = useCallback(() => {
    if (mainPlaylist.length > 0) {
      setCurrentItemIndex(prevIndex => (prevIndex + 1) % mainPlaylist.length);
    }
  }, [mainPlaylist.length]);

  // Effect to load the main playlist once
  useEffect(() => {
    async function init() {
      try {
        const loadedPlaylist = await loadPlaylist();
        if (loadedPlaylist.length === 0) {
          setError("Playlist is empty. Please configure it in the Settings page.");
        }
        setMainPlaylist(loadedPlaylist);
      } catch (err: any) {
        setError(err.message || 'Failed to load playlist. Please ensure it exists and the storage bucket is public.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);
  
  // Effect to listen for welcome messages from the Broadcast Channel
  useEffect(() => {
    const handleNewMessage = (event: MessageEvent<TVWelcomeMessage>) => {
      const message = event.data;
      if (message && message.lead) {
          setWelcomeMessage(message);
          
          // Clear any previous welcome message timer
          if (welcomeTimerRef.current) {
            clearTimeout(welcomeTimerRef.current);
          }

          // Set a timer to hide the welcome message after a duration
          welcomeTimerRef.current = setTimeout(() => {
            setWelcomeMessage(null);
          }, 12000); // Show for 12 seconds
      }
    };

    tvChannel.addEventListener('message', handleNewMessage);

    // Cleanup timers and listener on unmount
    return () => {
      tvChannel.removeEventListener('message', handleNewMessage);
      if (mainPlaylistTimerRef.current) clearTimeout(mainPlaylistTimerRef.current);
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, []);

  // Effect to manage the main playlist's timer
  useEffect(() => {
    if (mainPlaylistTimerRef.current) {
      clearTimeout(mainPlaylistTimerRef.current);
    }
    
    if (mainPlaylist.length === 0 || isLoading) {
      return;
    }
    
    const currentItem = mainPlaylist[currentItemIndex];
    if (currentItem?.type === 'image') {
      mainPlaylistTimerRef.current = setTimeout(advanceToNextItem, currentItem.duration || 8000);
    }

    return () => {
      if (mainPlaylistTimerRef.current) clearTimeout(mainPlaylistTimerRef.current);
    };
  }, [currentItemIndex, mainPlaylist, advanceToNextItem, isLoading]);
  
  const renderWelcomeMessage = () => {
    if (!welcomeMessage) return null;

    return (
        <div className="absolute inset-0 bg-blue-900/95 flex flex-col items-center justify-center text-center p-12 animate-welcome-in z-20">
            <h1 className="text-6xl font-extrabold text-white animate-text-pop-in" style={{ animationDelay: '200ms' }}>¡Bienvenido!</h1>
            <h2 className="text-8xl font-bold text-yellow-300 mt-4 animate-text-pop-in" style={{ animationDelay: '400ms' }}>
                {welcomeMessage.lead.name}
            </h2>
            <h3 className="text-5xl text-white mt-2 animate-text-pop-in" style={{ animationDelay: '600ms' }}>
                de {welcomeMessage.lead.company}
            </h3>
            <p className="text-3xl text-blue-200 mt-12 max-w-4xl animate-text-pop-in" style={{ animationDelay: '800ms' }}>
                "{welcomeMessage.welcomeMessage}"
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
  }

  const renderMainPlaylistItem = () => {
    if (isLoading) {
      return <div className="text-white text-3xl flex items-center justify-center h-full">Loading Playlist...</div>;
    }
    if (error) {
      return <div className="text-red-300 text-2xl p-8 bg-black/50 rounded-lg flex items-center justify-center h-full">{error}</div>;
    }
    if (mainPlaylist.length === 0) {
      return <div className="text-white text-3xl flex items-center justify-center h-full">Playlist is empty.</div>
    }

    const item = mainPlaylist[currentItemIndex];
    
    return (
      <div className="absolute inset-0 z-10" key={item.src}>
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            src={item.src}
            autoPlay
            muted
            onEnded={advanceToNextItem}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute top-0 left-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${item.src})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        {item.overlay && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center p-4 bg-black/50 rounded-lg">
            <h2 className="text-4xl font-bold text-white shadow-lg">{item.overlay}</h2>
          </div>
        )}
        {item.qr && (
            <div className="absolute bottom-8 right-8 bg-white p-2 rounded-lg shadow-2xl">
                <QRCodeSVG value={formUrl} size={120} />
            </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {renderMainPlaylistItem()}
      {renderWelcomeMessage()}
       <style>{`
            @keyframes welcome-in {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-welcome-in { animation: welcome-in 0.5s ease-out forwards; }
            
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