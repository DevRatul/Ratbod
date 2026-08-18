import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  darkMode?: boolean;
}

export default function PullToRefresh({ children, onRefresh, darkMode }: Props) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullThreshold = 80;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY > 0 && window.scrollY <= 0) {
        const currentY = e.touches[0].clientY;
        const dist = currentY - startY;
        if (dist > 0) {
          setPullDistance(Math.min(dist * 0.4, pullThreshold + 20));
          // Don't prevent default, lets it scroll naturally unless we want full control
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= pullThreshold && !refreshing) {
        setRefreshing(true);
        if (onRefresh) {
          await onRefresh();
        } else {
          setTimeout(() => window.location.reload(), 500);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, refreshing, onRefresh]);

  return (
    <div className="relative w-full h-full">
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center h-16 z-50 pointer-events-none transition-opacity duration-300"
        style={{ 
          transform: `translateY(${(refreshing ? pullThreshold : pullDistance) - 64}px)`,
          opacity: pullDistance > 10 || refreshing ? 1 : 0
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
          darkMode ? "bg-[#1A1A1A] text-white" : "bg-white text-gray-900",
          refreshing ? "animate-spin" : ""
        )}
        style={{ transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)` }}
        >
          <RefreshCw size={18} className="text-emerald-500" />
        </div>
      </div>
      <div 
        style={{ 
          transform: `translateY(${refreshing ? pullThreshold : pullDistance}px)`, 
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none' 
        }}
      >
        {children}
      </div>
    </div>
  );
}
