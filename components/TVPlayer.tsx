import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTVMessage } from '../contexts/TVMessageContext';
import { loadPlaylist, TVItem } from '../lib/tv';
import { WHATSAPP } from '../lib/config';
import { QRCodeSVG } from 'qrcode.react';

// Extend TVItem to include a potential welcome message type
type PlaylistItem = TVItem | { 
    type: 'welcome'; 
    message: { lead: { name: string; company?: string }, welcomeMessage: string };
    duration: number;
    src: string; // Add src for key prop uniqueness
};

const TVPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { message, clearMessage } = useTVMessage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const waMsg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${waMsg}`;

  const advanceToNextItem = useCallback(() => {
    setPlaylist(prevPlaylist => {
      // Clean up any 'welcome' slides that might have finished
      const cleanedPlaylist = prevPlaylist.filter(item => item.type !== 'welcome');
      
      setCurrentItemIndex(prevIndex => {
        // Find the src of the item that was just playing in the cleaned list
        const lastPlayedSrc = prevPlaylist[prevIndex]?.src;
        const lastPlayedIndexInCleaned = cleanedPlaylist.findIndex(item => item.src === lastPlayedSrc);
        
        // If the last played item was a welcome slide, it won't be in the cleaned list.
        // In that case, we stay at the index it was inserted at.
        const nextIndex = (lastPlayedIndexInCleaned !== -1 ? lastPlayedIndexInCleaned + 1 : prevIndex);
        
        return nextIndex % (cleanedPlaylist.length || 1);
      });
      return cleanedPlaylist;
    });
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const loadedPlaylist = await loadPlaylist();
        if (loadedPlaylist.length === 0) {
          setError("Playlist is empty. Please configure it in the Settings page.");
        }
        setPlaylist(loadedPlaylist);
      } catch (err: any) {
        setError(err.message || 'Failed to load playlist. Please ensure it exists and the storage bucket is public.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);
  
  // Effect to inject a welcome slide when a new message arrives
  useEffect(() => {
    if (message && playlist.length > 0) {
      const welcomeSlide: PlaylistItem = {
        type: 'welcome',
        message: message,
        duration: 12000, // Show for 12 seconds
        src: `welcome-${message.lead.id}` // Unique key
      };

      setPlaylist(currentPlaylist => {
        const newPlaylist = [...currentPlaylist];
        // Insert the welcome slide right after the current item
        newPlaylist.splice(currentItemIndex + 1, 0, welcomeSlide);
        return newPlaylist;
      });
      
      // Clear the message from context so it doesn't get re-added
      clearMessage(); 
    }
  }, [message, clearMessage, playlist.length, currentItemIndex]);


  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (playlist.length === 0 || isLoading) {
      return;
    }
    
    const currentItem = playlist[currentItemIndex];
    if (currentItem?.type === 'image' || currentItem?.type === 'welcome') {
      timerRef.current = setTimeout(advanceToNextItem, currentItem.duration || 8000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItemIndex, playlist, advanceToNextItem, isLoading]);
  

  const renderCurrentItem = () => {
    if (isLoading) {
      return <div className="text-white text-3xl flex items-center justify-center h-full">Loading Playlist...</div>;
    }
    if (error) {
      return <div className="text-red-300 text-2xl p-8 bg-black/50 rounded-lg flex items-center justify-center h-full">{error}</div>;
    }
    if (playlist.length === 0) {
      return <div className="text-white text-3xl flex items-center justify-center h-full">Playlist is empty.</div>
    }

    const item = playlist[currentItemIndex];
    
    if (item.type === 'welcome') {
        return (
            <div className="absolute inset-0 bg-blue-900/95 flex flex-col items-center justify-center text-center p-12 animate-welcome-in">
                <h1 className="text-6xl font-extrabold text-white animate-text-pop-in" style={{ animationDelay: '200ms' }}>¡Bienvenido!</h1>
                <h2 className="text-8xl font-bold text-yellow-300 mt-4 animate-text-pop-in" style={{ animationDelay: '400ms' }}>
                    {item.message.lead.name}
                </h2>
                <h3 className="text-5xl text-white mt-2 animate-text-pop-in" style={{ animationDelay: '600ms' }}>
                    de {item.message.lead.company}
                </h3>
                <p className="text-3xl text-blue-200 mt-12 max-w-4xl animate-text-pop-in" style={{ animationDelay: '800ms' }}>
                    "{item.message.welcomeMessage}"
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

    return (
      <>
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            src={item.src}
            autoPlay
            muted
            onEnded={advanceToNextItem}
            className="absolute top-0 left-0 w-full h-full object-cover"
            key={item.src}
          />
        ) : (
          <div
            className="absolute top-0 left-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${item.src})` }}
            key={item.src}
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
      </>
    );
  };
  
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {renderCurrentItem()}
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