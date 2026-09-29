/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudCheck } from 'lucide-react';
import { isOnline, subscribeNetworkStatus, getPendingOfflineKeys } from '../utils/offlineSync';

interface NetworkStatusIndicatorProps {
  darkMode?: boolean;
  lang?: 'en' | 'bn';
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  darkMode = true,
  lang = 'en'
}) => {
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [showSyncedToast, setShowSyncedToast] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const unsub = subscribeNetworkStatus((isNowOnline) => {
      setOnline(isNowOnline);
      if (isNowOnline) {
        setShowSyncedToast(true);
        const timer = setTimeout(() => {
          setShowSyncedToast(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    });

    const handleSyncSuccess = () => {
      setShowSyncedToast(true);
      setPendingCount(0);
      const timer = setTimeout(() => {
        setShowSyncedToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const interval = setInterval(() => {
      setPendingCount(getPendingOfflineKeys().length);
    }, 5000);

    window.addEventListener('ratbod_offline_sync_success', handleSyncSuccess);

    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener('ratbod_offline_sync_success', handleSyncSuccess);
    };
  }, []);

  // Offline banner pill
  if (!online) {
    return (
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full shadow-xl text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 bg-amber-500/90 text-white border border-amber-400/40"
        role="status"
        aria-live="polite"
      >
        <WifiOff size={15} className="animate-pulse text-amber-100" />
        <span>
          {lang === 'bn' 
            ? 'অফলাইন মোড • সকল আপডেট লোকালি সেভ হচ্ছে' 
            : 'Offline mode • Changes saved locally'}
        </span>
        {pendingCount > 0 && (
          <span className="bg-amber-700/60 px-2 py-0.5 rounded-full text-[11px] font-bold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Brief "Synced with cloud" confirmation upon reconnection
  if (showSyncedToast) {
    return (
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-xl text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 bg-emerald-600/90 text-white border border-emerald-400/40"
        role="status"
        aria-live="polite"
      >
        <CloudCheck size={16} className="text-emerald-200" />
        <span>
          {lang === 'bn' 
            ? 'অনলাইন • অফলাইনের সব তথ্য ক্লাউডে সিঙ্ক হয়েছে' 
            : 'Online • All offline updates synced to cloud'}
        </span>
      </div>
    );
  }

  return null;
};
