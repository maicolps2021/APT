import React, { useState, useEffect, useRef } from 'react';
import { QRDisplay } from './QRDisplay';

// --- Configuration ---
// Add your local media files from the `public/tv/` folder here.
// For images, set a duration in milliseconds.
// For videos, the duration is determined by the video length itself.
const PLAYLIST = [
  // Example: Add an image from `public/tv/arenal-volcano.jpg`
  { type: 'image', src: '/tv/arenal-volcano.jpg', text: 'Welcome to Arenal Conagui 2025!', duration: 7000 },
  // Example: Add a video from `public/tv/costa-rica-nature.mp4`
  { type: 'video', src: '/tv/costa-rica-nature.mp4', text: 'Experience the best tours and transfers.' },
  // Example: Add another image
  { type: 'image', src: '/tv/la-fortuna-waterfall.jpg', text: 'Your adventure starts here.' , duration: 7000 },
];

// Duration for the final QR code slide
const QR_SLIDE_DURATION = 15000; // 15 seconds

const TVPlayer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalItemsInLoop = PLAYLIST.length + 1; // +1 for the QR slide

  useEffect(() => {
    const isQrSlide = currentIndex === PLAYLIST.length;
    const currentItem = !isQrSlide ? PLAYLIST[currentIndex] : null;

    let timer: number;

    if (isQrSlide) {
      // Timer for the QR slide
      timer = window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % totalItemsInLoop);
      }, QR_SLIDE_DURATION);
    } else if (currentItem?.type === 'image') {
      // Timer for image slides
      timer = window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % totalItemsInLoop);
      }, currentItem.duration);
    }

    // For video, the onEnded event handles the transition, so no timer is needed.
    
    return () => clearTimeout(timer);
  }, [currentIndex, totalItemsInLoop]);

  const handleVideoEnded = () => {
    setCurrentIndex((prev) => (prev + 1) % totalItemsInLoop);
  };
  
  const renderContent = () => {
      const isQrSlide = currentIndex === PLAYLIST.length;
      
      if (isQrSlide) {
          const formUrl = `${window.location.origin}/#/capture`;
          return (
              <div key="qr-slide" className="w-full h-full flex flex-col items-center justify-center bg-slate-900 animate-fade-in p-8">
                  <QRDisplay url={formUrl} />
                  <h1 className="mt-8 text-3xl md:text-5xl font-bold text-center text-white">
                      Pide tarifa colaborador aquí
                  </h1>
              </div>
          );
      }

      const item = PLAYLIST[currentIndex];
      return (
          <div key={item.src} className="relative w-full h-full animate-fade-in">
              {item.type === 'image' ? (
                  <img src={item.src} alt="TV Display Background" className="w-full h-full object-cover" />
              ) : (
                  <video
                      ref={videoRef}
                      src={item.src}
                      autoPlay
                      muted
                      playsInline
                      onEnded={handleVideoEnded}
                      // Handle potential video load errors
                      onError={() => {
                          console.warn(`Video not found or failed to load: ${item.src}. Skipping.`);
                          handleVideoEnded();
                      }}
                      className="w-full h-full object-cover"
                  />
              )}
              {item.text && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/60 backdrop-blur-md p-5 rounded-xl border border-white/20 shadow-lg">
                      <p className="text-2xl md:text-4xl font-semibold text-white text-center tracking-wide leading-tight">
                          {item.text}
                      </p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="w-full h-full overflow-hidden bg-black">
        {renderContent()}
        <style>{`
            @keyframes fade-in {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            .animate-fade-in {
                animation: fade-in 1.2s ease-in-out forwards;
            }
        `}</style>
    </div>
  );
};

export default TVPlayer;
