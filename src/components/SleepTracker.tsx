/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Moon, 
  Clock, 
  Sparkles, 
  Calendar, 
  Check, 
  Plus, 
  History as HistoryIcon, 
  Trash2, 
  ArrowLeft, 
  Info,
  TrendingUp,
  Award,
  Bed,
  AlarmClock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CircularSleepDial from './CircularSleepDial';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SleepRecord {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  totalMinutes: number;
  durationDisplay: string;
  createdAt: number;
}

interface SleepTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
}

export default function SleepTracker({ darkMode, lang = 'en' }: SleepTrackerProps) {
  const isBn = lang === 'bn';

  const formatNum = (num: number | string) => {
    if (!isBn) return String(num);
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, d => bnDigits[Number(d)]);
  };

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatHistoryDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const today = getLocalDateString(new Date());
      
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateString(yesterdayDate);

      if (dateStr === today) {
        return isBn ? 'আজ' : 'Today';
      }
      if (dateStr === yesterday) {
        return isBn ? 'গতকাল' : 'Yesterday';
      }

      if (isBn) {
        const monthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
        return `${formatNum(d)} ${monthsBn[m - 1]}`;
      } else {
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d} ${monthsEn[m - 1]}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const [sleepBedTime, setSleepBedTime] = useState<string>(() => {
    return localStorage.getItem('ratbod_sleep_bed') || '23:00';
  });
  const [sleepWakeTime, setSleepWakeTime] = useState<string>(() => {
    return localStorage.getItem('ratbod_sleep_wake') || '07:00';
  });
  const [selectedSleepDate, setSelectedSleepDate] = useState<string>(() => getLocalDateString());
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_sleep_records');
      if (saved) return JSON.parse(saved);
      // Fallback check from water tracker data
      const waterData = localStorage.getItem('ratbod_water_tracker_data');
      if (waterData) {
        const parsed = JSON.parse(waterData);
        if (Array.isArray(parsed.sleepRecords) && parsed.sleepRecords.length > 0) {
          return parsed.sleepRecords;
        }
      }
    } catch (e) {}
    return [];
  });

  const [showSleepHistoryModal, setShowSleepHistoryModal] = useState<boolean>(false);
  const [sleepSavedToast, setSleepSavedToast] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load from Firestore if user logged in
  useEffect(() => {
    const loadData = async (user = auth.currentUser) => {
      if (!user) {
        setIsLoaded(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'sleepTracker'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.sleepBedTime) setSleepBedTime(data.sleepBedTime);
          if (data.sleepWakeTime) setSleepWakeTime(data.sleepWakeTime);
          if (Array.isArray(data.sleepRecords)) setSleepRecords(data.sleepRecords);
        } else {
          // Check waterTracker document as fallback
          const waterSnap = await getDoc(doc(db, 'users', user.uid, 'appData', 'waterTracker'));
          if (waterSnap.exists()) {
            const wData = waterSnap.data();
            if (wData.sleepBedTime) setSleepBedTime(wData.sleepBedTime);
            if (wData.sleepWakeTime) setSleepWakeTime(wData.sleepWakeTime);
            if (Array.isArray(wData.sleepRecords) && wData.sleepRecords.length > 0) {
              setSleepRecords(wData.sleepRecords);
            }
          }
        }
      } catch (e) {
        console.error("Error loading sleep tracker data", e);
      }
      setIsLoaded(true);
    };

    loadData();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadData(user);
    });
    return () => unsub();
  }, []);

  // Save to localStorage and Firestore
  const persistSleepData = (bed: string, wake: string, records: SleepRecord[]) => {
    try {
      localStorage.setItem('ratbod_sleep_bed', bed);
      localStorage.setItem('ratbod_sleep_wake', wake);
      localStorage.setItem('ratbod_sleep_records', JSON.stringify(records));
      
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'sleepTracker'), {
          sleepBedTime: bed,
          sleepWakeTime: wake,
          sleepRecords: records,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  };

  // Helper to calculate total sleep duration
  const calculateSleepDuration = (bed: string, wake: string) => {
    if (!bed || !wake) {
      return {
        hours: 0,
        minutes: 0,
        totalMinutes: 0,
        display: '0h 00m',
        displayBn: '০ঘ ০০মি',
      };
    }
    const [bedH, bedM] = bed.split(':').map(Number);
    const [wakeH, wakeM] = wake.split(':').map(Number);
    if (isNaN(bedH) || isNaN(bedM) || isNaN(wakeH) || isNaN(wakeM)) {
      return {
        hours: 0,
        minutes: 0,
        totalMinutes: 0,
        display: '0h 00m',
        displayBn: '০ঘ ০০মি',
      };
    }
    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60; // Crosses midnight
    }
    const diff = wakeMinutes - bedMinutes;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const padMin = String(minutes).padStart(2, '0');
    return {
      hours,
      minutes,
      totalMinutes: diff,
      display: minutes > 0 ? `${hours}h ${padMin}m` : `${hours}h 00m`,
      displayBn: minutes > 0 ? `${formatNum(hours)}ঘ ${formatNum(minutes)}মি` : `${formatNum(hours)}ঘ ০০মি`,
    };
  };

  const get12HourParts = (timeStr: string) => {
    if (!timeStr) return { time: '--:--', ampm: 'AM' };
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return { time: timeStr, ampm: 'AM' };
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const padM = String(m).padStart(2, '0');
    const timeFormatted = isBn ? `${formatNum(h)}:${formatNum(padM)}` : `${h}:${padM}`;
    return { time: timeFormatted, ampm };
  };

  const handleToggleBedAmPm = () => {
    const [h, m] = sleepBedTime.split(':').map(Number);
    const newH = ((h || 0) + 12) % 24;
    const updated = `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    setSleepBedTime(updated);
    persistSleepData(updated, sleepWakeTime, sleepRecords);
  };

  const handleToggleWakeAmPm = () => {
    const [h, m] = sleepWakeTime.split(':').map(Number);
    const newH = ((h || 0) + 12) % 24;
    const updated = `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    setSleepWakeTime(updated);
    persistSleepData(sleepBedTime, updated, sleepRecords);
  };

  const formatSleepDurationText = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (isBn) {
      if (m === 0) return `${formatNum(h)} ঘণ্টা`;
      return `${formatNum(h)} ঘণ্টা ${formatNum(m)} মি`;
    }
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const adjustMinutes = (timeStr: string, deltaMin: number): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = ((h * 60 + m + deltaMin) % 1440 + 1440) % 1440;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleAdjustBed = (deltaMin: number) => {
    const updated = adjustMinutes(sleepBedTime, deltaMin);
    setSleepBedTime(updated);
    persistSleepData(updated, sleepWakeTime, sleepRecords);
  };

  const handleAdjustWake = (deltaMin: number) => {
    const updated = adjustMinutes(sleepWakeTime, deltaMin);
    setSleepWakeTime(updated);
    persistSleepData(sleepBedTime, updated, sleepRecords);
  };

  const handleDialChange = (newBed: string, newWake: string) => {
    setSleepBedTime(newBed);
    setSleepWakeTime(newWake);
    persistSleepData(newBed, newWake, sleepRecords);
  };

  const sleepDuration = calculateSleepDuration(sleepBedTime, sleepWakeTime);

  const handleLogSleepRecord = () => {
    const targetDate = selectedSleepDate || getLocalDateString(new Date());
    const newRecord: SleepRecord = {
      id: String(Date.now()),
      date: targetDate,
      bedTime: sleepBedTime,
      wakeTime: sleepWakeTime,
      totalMinutes: sleepDuration.totalMinutes,
      durationDisplay: isBn ? sleepDuration.displayBn : sleepDuration.display,
      createdAt: Date.now()
    };

    const filtered = sleepRecords.filter(r => r.date !== targetDate);
    const updated = [newRecord, ...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
    setSleepRecords(updated);
    persistSleepData(sleepBedTime, sleepWakeTime, updated);

    setSleepSavedToast(true);
    setTimeout(() => setSleepSavedToast(false), 2500);
    window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
  };

  const handleDeleteSleepRecord = (id: string) => {
    const updated = sleepRecords.filter(r => r.id !== id);
    setSleepRecords(updated);
    persistSleepData(sleepBedTime, sleepWakeTime, updated);
  };

  // Check if selected date already has a log
  const existingRecordForSelectedDate = sleepRecords.find(r => r.date === selectedSleepDate);

  const todayStr = getLocalDateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  // Metrics for analytics
  const totalLogs = sleepRecords.length;
  const avgMinutes = totalLogs > 0 
    ? Math.round(sleepRecords.reduce((acc, r) => acc + r.totalMinutes, 0) / totalLogs)
    : sleepDuration.totalMinutes;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMin = avgMinutes % 60;
  const avgDisplay = isBn 
    ? `${formatNum(avgHours)}ঘ ${formatNum(avgMin)}মি`
    : `${avgHours}h ${String(avgMin).padStart(2, '0')}m`;

  const optimalCount = sleepRecords.filter(r => {
    const h = r.totalMinutes / 60;
    return h >= 7 && h <= 9;
  }).length;

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-4xl mx-auto w-full pb-0">
      {/* Outer Section Header matching Apple Bedtime style */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300">
          {isBn ? 'ঘুমানো ও ওঠার সময় (Bedtime & Wake Up)' : 'Bedtime and Wake Up'}
        </h2>
        {/* Quick History Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowSleepHistoryModal(true)}
          className={cn(
            "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs active:scale-95",
            darkMode 
              ? "bg-[#181a20] text-indigo-300 border-indigo-500/30 hover:bg-[#20232c]" 
              : "bg-white text-indigo-700 border-gray-200 hover:bg-gray-50"
          )}
        >
          <HistoryIcon size={13} />
          <span>{isBn ? 'ইতিহাস' : 'Logs'} ({formatNum(totalLogs)})</span>
        </button>
      </div>

      {/* Main Apple Clock Bedtime & Wake Up Card */}
      <div className={cn(
        "rounded-3xl p-4 sm:p-6 border transition-colors duration-200 relative overflow-hidden",
        darkMode
          ? "bg-[#1c1c1e] text-white border-white/10 shadow-xl"
          : "bg-white text-gray-900 border-gray-200/80 shadow-lg shadow-gray-200/60"
      )}>
        {/* Top Header Row: Bedtime (Left) and Wake Up (Right) */}
        {(() => {
          const bedParts = get12HourParts(sleepBedTime);
          const wakeParts = get12HourParts(sleepWakeTime);
          return (
            <div className="flex items-start justify-between gap-2 pb-2">
              {/* Bedtime Readout */}
              <div className="flex flex-col items-start min-w-0">
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  <Bed size={13.5} className={darkMode ? "text-sky-400 shrink-0" : "text-sky-600 shrink-0"} strokeWidth={2.4} />
                  <span className="truncate">{isBn ? 'ঘুমানোর সময়' : 'BEDTIME'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    "text-xl sm:text-2xl font-extrabold tracking-tight font-mono",
                    darkMode ? "text-white" : "text-gray-900"
                  )}>
                    {bedParts.time}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleBedAmPm}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-black border transition-all cursor-pointer active:scale-95 select-none",
                      darkMode
                        ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border-sky-500/40"
                        : "bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 shadow-2xs"
                    )}
                    title={isBn ? "AM/PM পরিবর্তন করুন" : "Toggle AM / PM"}
                  >
                    {bedParts.ampm}
                  </button>
                </div>
                {/* Quick Micro-step buttons */}
                <div className="flex items-center gap-1 mt-1 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleAdjustBed(-15)}
                    className={cn(
                      "px-1.5 py-0.5 rounded active:scale-95 transition-all cursor-pointer",
                      darkMode
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/80"
                    )}
                    title="-15m"
                  >
                    -15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustBed(15)}
                    className={cn(
                      "px-1.5 py-0.5 rounded active:scale-95 transition-all cursor-pointer",
                      darkMode
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/80"
                    )}
                    title="+15m"
                  >
                    +15m
                  </button>
                </div>
              </div>

              {/* Wake Up Readout */}
              <div className="flex flex-col items-end min-w-0 text-right">
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  <AlarmClock size={13.5} className={darkMode ? "text-amber-400 shrink-0" : "text-amber-600 shrink-0"} strokeWidth={2.4} />
                  <span className="truncate">{isBn ? 'ওঠার সময়' : 'WAKE UP'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <button
                    type="button"
                    onClick={handleToggleWakeAmPm}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-black border transition-all cursor-pointer active:scale-95 select-none",
                      darkMode
                        ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/40"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-2xs"
                    )}
                    title={isBn ? "AM/PM পরিবর্তন করুন" : "Toggle AM / PM"}
                  >
                    {wakeParts.ampm}
                  </button>
                  <span className={cn(
                    "text-xl sm:text-2xl font-extrabold tracking-tight font-mono",
                    darkMode ? "text-white" : "text-gray-900"
                  )}>
                    {wakeParts.time}
                  </span>
                </div>
                {/* Quick Micro-step buttons */}
                <div className="flex items-center gap-1 mt-1 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleAdjustWake(-15)}
                    className={cn(
                      "px-1.5 py-0.5 rounded active:scale-95 transition-all cursor-pointer",
                      darkMode
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/80"
                    )}
                    title="-15m"
                  >
                    -15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustWake(15)}
                    className={cn(
                      "px-1.5 py-0.5 rounded active:scale-95 transition-all cursor-pointer",
                      darkMode
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/80"
                    )}
                    title="+15m"
                  >
                    +15m
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Circular Adjustable Dial in the Center */}
        <div className="my-2 flex flex-col items-center justify-center">
          <CircularSleepDial
            bedTime={sleepBedTime}
            wakeTime={sleepWakeTime}
            onChange={handleDialChange}
            darkMode={darkMode}
            lang={lang}
            formatNum={formatNum}
          />

          {/* Duration Display Under Dial */}
          <div className="mt-2 text-center flex flex-col items-center">
            <div className={cn(
              "text-2xl sm:text-3xl font-extrabold tracking-tight font-mono",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              {formatSleepDurationText(sleepDuration.totalMinutes)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                  ? (darkMode
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs")
                  : (sleepDuration.hours < 7
                      ? (darkMode
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs")
                      : (darkMode
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-purple-50 text-purple-800 border-purple-200 shadow-2xs"))
              )}>
                <Sparkles size={11} />
                {sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                  ? (isBn ? 'উপযুক্ত ঘুম (Optimal 7–9h)' : 'Optimal (7–9 hrs)')
                  : (sleepDuration.hours < 7 ? (isBn ? 'স্বল্প ঘুম (<৭ ঘণ্টা)' : 'Short Sleep (<7 hrs)') : (isBn ? 'দীর্ঘ ঘুম (>৯ ঘণ্টা)' : 'Long Sleep (>9 hrs)'))}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Sleeping Timer Logging Section */}
        <div className={cn(
          "mt-4 pt-3.5 border-t flex flex-col items-center gap-2.5",
          darkMode ? "border-white/10" : "border-gray-200/70"
        )}>
          {/* Compact 1-Line Date Row on Mobile and Desktop */}
          <div className="flex items-center justify-between gap-1.5 w-full">
            {/* Left: Quick Date Segments (Today & Yesterday) */}
            <div className="flex items-center gap-1 min-w-0">
              <span className={cn(
                "text-[11px] font-bold flex items-center gap-1 shrink-0",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}>
                <Calendar size={12} className="text-indigo-500 shrink-0" />
                <span className="hidden xs:inline">{isBn ? 'তারিখ:' : 'Date:'}</span>
              </span>

              <div className={cn(
                "inline-flex items-center p-0.5 rounded-lg border text-[11px] font-bold shrink-0",
                darkMode ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200/80"
              )}>
                <button
                  type="button"
                  onClick={() => setSelectedSleepDate(todayStr)}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-[10.5px] sm:text-xs font-semibold",
                    selectedSleepDate === todayStr 
                      ? (darkMode
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-indigo-700 shadow-xs border border-gray-200/50") 
                      : (darkMode
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  {isBn ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSleepDate(yesterdayStr)}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-[10.5px] sm:text-xs font-semibold",
                    selectedSleepDate === yesterdayStr 
                      ? (darkMode
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-indigo-700 shadow-xs border border-gray-200/50") 
                      : (darkMode
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  {isBn ? 'গতকাল' : 'Yesterday'}
                </button>
              </div>
            </div>

            {/* Right: Compact Date Input fitting smoothly in one line */}
            <div className="relative flex items-center shrink-0">
              <input
                type="date"
                value={selectedSleepDate}
                onChange={(e) => setSelectedSleepDate(e.target.value)}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer w-[118px] sm:w-[130px] text-center",
                  darkMode
                    ? "bg-white/10 text-white border-white/10 hover:border-white/20 [color-scheme:dark]"
                    : "bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-300 [color-scheme:light]"
                )}
              />
            </div>
          </div>

          {/* Tiny Little Centrally Button: "Save Sleep" */}
          <div className="flex justify-center w-full pt-0.5">
            <button
              type="button"
              onClick={handleLogSleepRecord}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95",
                sleepSavedToast
                  ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400"
                  : (darkMode
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20")
              )}
            >
              {sleepSavedToast ? (
                <>
                  <Check size={13} strokeWidth={2.8} />
                  <span>{isBn ? 'যোগ হয়েছে!' : 'Added!'}</span>
                </>
              ) : (
                <>
                  <Plus size={13} strokeWidth={2.4} />
                  <span>{isBn ? 'ঘুম যোগ করুন' : 'Add Sleep'}</span>
                </>
              )}
            </button>
          </div>

          {/* Status note about the selected date if already logged */}
          {existingRecordForSelectedDate && (
            <div className={cn(
              "w-full text-[10px] sm:text-[11px] flex items-center justify-between px-2.5 py-1 rounded-lg border",
              darkMode
                ? "bg-white/5 border-white/5 text-gray-300"
                : "bg-indigo-50/70 border-indigo-100 text-indigo-950"
            )}>
              <span className="truncate">
                {isBn 
                  ? `ইতোমধ্যে লগ আছে: ${existingRecordForSelectedDate.durationDisplay} (${existingRecordForSelectedDate.bedTime} → ${existingRecordForSelectedDate.wakeTime})` 
                  : `Already logged: ${existingRecordForSelectedDate.durationDisplay} (${existingRecordForSelectedDate.bedTime} → ${existingRecordForSelectedDate.wakeTime})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSleepBedTime(existingRecordForSelectedDate.bedTime);
                  setSleepWakeTime(existingRecordForSelectedDate.wakeTime);
                }}
                className={cn(
                  "font-bold ml-2 underline cursor-pointer shrink-0",
                  darkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-800"
                )}
              >
                {isBn ? 'ডায়ালে লোড' : 'Load'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Stats Overview - Clean 3-Column Compact Grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        <div className={cn(
          "p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-3",
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
        )}>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
            <TrendingUp size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold block truncate">
              {isBn ? 'গড় ঘুম' : 'Average'}
            </span>
            <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-mono truncate block">
              {avgDisplay}
            </span>
          </div>
        </div>

        <div className={cn(
          "p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-3",
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
        )}>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <Award size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold block truncate">
              {isBn ? 'উপযুক্ত রাত' : 'Optimal'}
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {formatNum(optimalCount)}/{formatNum(totalLogs || 1)}
            </span>
          </div>
        </div>

        <div className={cn(
          "p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-3",
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
        )}>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Info size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold block truncate">
              {isBn ? 'লক্ষ্য' : 'Target'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate block">
              {isBn ? '৭-৯ ঘণ্টা' : '7–9 hrs'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Sleep History Modal with Top Corner Back Button */}
      <AnimatePresence>
        {showSleepHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              key="sleep-history-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-3xl border shadow-2xl my-auto",
                darkMode ? "bg-[#0c101c] border-indigo-500/30 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              {/* Sticky Header with Back Button in top corner */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/20 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/30">
                    <Moon size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                      {isBn ? 'ঘুমের ইতিহাস' : 'Sleep History'}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {isBn ? 'সংরক্ষিত সকল দৈনিক ঘুমের রেকর্ড' : 'All saved daily sleep records'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSleepHistoryModal(false)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95",
                    darkMode
                      ? "bg-[#181a20] text-gray-300 border-gray-700/80 hover:bg-[#22252d] hover:text-white"
                      : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                  )}
                >
                  <ArrowLeft size={14} />
                  <span>{isBn ? 'ফিরে যান' : 'Back'}</span>
                </button>
              </div>

              {/* Scrollable Content - Saved Daily Sleep Records */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                {sleepRecords.length === 0 ? (
                  <div className={cn(
                    "p-6 rounded-2xl border text-center space-y-1.5 my-4",
                    darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
                  )}>
                    <Moon size={24} className="mx-auto text-indigo-400 mb-1 opacity-80" />
                    <p className="text-xs font-semibold">
                      {isBn ? 'এখনো কোনো রেকর্ড সংরক্ষণ করা হয়নি।' : 'No sleep records saved yet.'}
                    </p>
                    <p className="text-[11px] opacity-75">
                      {isBn ? 'উপরে সময় নির্ধারণ করে "ঘুম যোগ করুন" চাপলে আপনার রেকর্ড এখানে যুক্ত হবে।' : 'Set your sleep schedule above and tap "Add Sleep" to log records here.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sleepRecords.map((record) => {
                      const recHours = Math.floor(record.totalMinutes / 60);
                      const isOptimal = recHours >= 7 && recHours <= 9;
                      return (
                        <div 
                          key={record.id}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-between gap-2 transition-all shadow-2xs",
                            darkMode 
                              ? (isOptimal ? "bg-indigo-950/20 border-indigo-500/25" : "bg-white/5 border-white/10") 
                              : (isOptimal ? "bg-indigo-50/70 border-indigo-200" : "bg-gray-50 border-gray-200")
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs",
                              isOptimal ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                            )}>
                              <Moon size={13} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                                {formatHistoryDate(record.date)}
                              </span>
                              <span className="text-[10.5px] text-gray-500 dark:text-gray-400 font-mono">
                                {record.bedTime} → {record.wakeTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              "font-extrabold text-xs px-2 py-0.5 rounded-md border",
                              isOptimal 
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30" 
                                : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-400/30"
                            )}>
                              {record.durationDisplay}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSleepRecord(record.id)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200/20 dark:border-white/10 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSleepHistoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-xs shadow-indigo-500/20 active:scale-95"
                >
                  {isBn ? 'ঠিক আছে (Close)' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
