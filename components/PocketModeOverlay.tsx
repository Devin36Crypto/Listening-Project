import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface PocketModeOverlayProps {
  isActive: boolean;
  onUnlock: () => void;
  statusText?: string;
}

const PocketModeOverlay: React.FC<PocketModeOverlayProps> = ({ isActive, onUnlock, statusText }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Controls visibility of UI
  const [progress, setProgress] = useState(0);
  
  const pressStartTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const fadeTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setIsPressing(false);
      setIsVisible(false);
    } else {
        // Reset visibility when entering pocket mode
        setIsVisible(false);
    }
  }, [isActive]);

  const handleInteraction = () => {
    // Reveal UI on interaction
    setIsVisible(true);
    
    // Auto-hide after 3 seconds of no interaction to save battery/screen
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    fadeTimeout.current = window.setTimeout(() => {
        if (!isPressing) setIsVisible(false);
    }, 3000);
  };

  const handleStart = () => {
    handleInteraction();
    setIsPressing(true);
    pressStartTime.current = Date.now();
    
    const updateProgress = () => {
      if (!pressStartTime.current) return;
      const elapsed = Date.now() - pressStartTime.current;
      const newProgress = Math.min(elapsed / 1500, 1) * 100; // 1.5 seconds to unlock
      
      setProgress(newProgress);

      if (newProgress >= 100) {
        onUnlock();
        handleEnd();
      } else {
        animationFrame.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame.current = requestAnimationFrame(updateProgress);
  };

  const handleEnd = () => {
    setIsPressing(false);
    pressStartTime.current = null;
    setProgress(0);
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    // Restart fade timer
    handleInteraction();
  };

  if (!isActive) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between py-20 px-6 touch-none select-none"
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
    >
      {/* Content Container - Only visible after purposeful interaction */}
      <div 
        className={`flex flex-col items-center justify-between w-full h-full transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
          {/* Top Status Area */}
          <div className="flex flex-col items-center gap-4 opacity-50">
            <Lock size={48} className="text-slate-500" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-wider text-slate-300">POCKET MODE</h2>
              <p className="text-sm font-light text-slate-500">
                {statusText || "App is active & listening"}
              </p>
              <p className="text-xs text-slate-700">Display dimmed to save power.</p>
            </div>
          </div>

          {/* Unlock Button Area */}
          <div className="w-full max-w-xs flex flex-col items-center gap-4 pointer-events-auto">
            <div 
              className="relative w-24 h-24 rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center overflow-hidden cursor-pointer transition-transform active:scale-95"
              onMouseDown={handleStart}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchEnd={handleEnd}
            >
              {/* Progress Circle Background */}
              <div 
                className="absolute inset-0 bg-blue-900/40 transition-all duration-75"
                style={{ 
                  transform: `translateY(${100 - progress}%)`,
                  opacity: isPressing ? 1 : 0
                }}
              />
              
              <Unlock 
                size={32} 
                className={`relative z-10 transition-colors ${isPressing ? 'text-blue-400' : 'text-slate-600'}`} 
              />
              
              {/* Circular Progress Ring */}
              <svg className="absolute inset-0 rotate-[-90deg]" width="96" height="96">
                <circle
                  cx="48"
                  cy="48"
                  r="46"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="4"
                  strokeDasharray="289"
                  strokeDashoffset={289 - (289 * progress) / 100}
                  className="transition-all duration-75 ease-linear"
                  style={{ opacity: isPressing ? 1 : 0 }}
                />
              </svg>
            </div>
            <p className="text-sm text-slate-600 font-medium tracking-wide">
              {isPressing ? "UNLOCKING..." : "HOLD TO UNLOCK"}
            </p>
          </div>
      </div>
    </div>
  );
};

export default PocketModeOverlay;