/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Check } from 'lucide-react';
import { isOnline, subscribeNetworkStatus, getPendingOfflineKeys } from '../utils/offlineSync';

interface NetworkStatusIndicatorProps {
  darkMode?: boolean;
  lang?: 'en' | 'bn';
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  darkMode = true,
  lang = 'en'
}) => {
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [showOnlineToast, setShowOnlineToast] = useState<boolean>(false);
  const prevOnlineRef = useRef<boolean>(isOnline());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = subscribeNetworkStatus((isNowOnline) => {
      const wasOnline = prevOnlineRef.current;
      prevOnlineRef.current = isNowOnline;

      if (timerRef.current) clearTimeout(timerRef.current);

      if (!isNowOnline && wasOnline) {
        // Transitioned to Offline: Show at top for exactly 1 second
        setShowOnlineToast(false);
        setShowOfflineToast(true);
        timerRef.current = setTimeout(() => {
          setShowOfflineToast(false);
        }, 1000);
      } else if (isNowOnline && !wasOnline) {
        // Transitioned to Online: Pop "Updated" at top for exactly 1 second
        setShowOfflineToast(false);
        setShowOnlineToast(true);
        timerRef.current = setTimeout(() => {
          setShowOnlineToast(false);
        }, 1000);
      }
    });

    const handleSyncSuccess = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowOfflineToast(false);
      setShowOnlineToast(true);
      timerRef.current = setTimeout(() => {
        setShowOnlineToast(false);
      }, 1000);
    };

    window.addEventListener('ratbod_offline_sync_success', handleSyncSuccess);

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('ratbod_offline_sync_success', handleSyncSuccess);
    };
  }, []);

  // Offline banner pop (at top, lasts 1 sec, strictly 1 line on mobile)
  if (showOfflineToast) {
    return (
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-xl text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-amber-500/95 text-white border border-amber-400/40 whitespace-nowrap max-w-[92vw] overflow-hidden"
        role="status"
        aria-live="polite"
      >
        <WifiOff size={14} className="shrink-0 text-amber-100" />
        <span className="truncate">
          {lang === 'bn' 
            ? 'অফলাইন মোড • লোকালি সেভ হচ্ছে' 
            : 'Offline mode • Saved locally'}
        </span>
      </div>
    );
  }

  // Online "Updated" confirmation pop (at top, lasts 1 sec, strictly 1 line on mobile)
  if (showOnlineToast) {
    return (
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-xl text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-emerald-600/95 text-white border border-emerald-400/40 whitespace-nowrap max-w-[92vw]"
        role="status"
        aria-live="polite"
      >
        <Check size={14} className="shrink-0 text-emerald-200" strokeWidth={3} />
        <span>
          {lang === 'bn' ? 'আপডেট সম্পন্ন (Updated)' : 'Updated'}
        </span>
      </div>
    );
  }

  return null;
};
