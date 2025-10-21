import React, { useRef } from 'react';
import TVPlayer from '../components/TVPlayer';

const TV: React.FC = () => {
  const tvContainerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    if (!tvContainerRef.current) return;

    if (!document.fullscreenElement) {
      tvContainerRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div ref={tvContainerRef} className="fixed inset-0 bg-black flex items-center justify-center text-white">
      {/* The TVPlayer component now handles all content rendering */}
      <TVPlayer />
      
      {/* Fullscreen toggle button is styled to be unobtrusive */}
      <button
        onClick={handleFullscreen}
        className="absolute bottom-5 right-5 bg-black/50 hover:bg-black/80 text-white font-semibold p-3 rounded-full backdrop-blur-sm transition-all z-20"
        aria-label="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </div>
  );
};

export default TV;
