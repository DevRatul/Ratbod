/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
    <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full pb-0">
      {/* Top Banner Card */}
      <div className={cn(
        "p-3 sm:p-5 rounded-xl sm:rounded-3xl border transition-all shadow-xs",
        darkMode 
          ? "bg-[#0f1422] border-indigo-500/25 shadow-indigo-950/20 text-white" 
          : "bg-white border-indigo-100 shadow-indigo-500/5 text-gray-900"
      )}>
        <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-indigo-500/15">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
              <Moon size={17} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight truncate">
                  {isBn ? 'স্লিপ অ্যানালিটিক্স' : 'Sleep Analytics'}
                </h2>
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0",
                  sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                    ? (darkMode ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                    : (darkMode ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200")
                )}>
                  <Sparkles size={10} />
                  {sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                    ? (isBn ? 'উপযুক্ত ঘুম' : 'Optimal 7-9h')
                    : (sleepDuration.hours < 7 ? (isBn ? 'স্বল্প ঘুম' : 'Short (<7h)') : (isBn ? 'দীর্ঘ ঘুম' : 'Long (>9h)'))}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isBn ? 'দৈনিক ঘুমের সময়সূচি ও বিজ্ঞানসম্মত বিশ্রাম বিশ্লেষণ' : 'Daily sleep schedule and scientific rest tracking'}
              </p>
            </div>
          </div>

          {/* Quick History Button */}
          <button
            type="button"
            onClick={() => setShowSleepHistoryModal(true)}
            className={cn(
              "px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 border shadow-2xs active:scale-95",
              darkMode 
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30" 
                : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            )}
          >
            <HistoryIcon size={13} />
            <span>{isBn ? 'ইতিহাস' : 'Logs'} ({formatNum(totalLogs)})</span>
          </button>
        </div>

        {/* Input Controls Grid: Compact 3-Column on Mobile & Desktop */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-2.5 sm:pt-4">
          {/* Bed Time */}
          <div className={cn(
            "p-1.5 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col justify-between gap-1",
            darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate">
                <Moon size={11} className="text-indigo-400 shrink-0" />
                <span className="truncate">{isBn ? 'ঘুমানো' : 'Bed Time'}</span>
              </span>
            </div>
            <input
              type="time"
              value={sleepBedTime}
              onChange={(e) => {
                setSleepBedTime(e.target.value);
                persistSleepData(e.target.value, sleepWakeTime, sleepRecords);
              }}
              className={cn(
                "w-full px-1 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-center font-mono",
                darkMode
                  ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                  : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
              )}
            />
          </div>

          {/* Wake Up Time */}
          <div className={cn(
            "p-1.5 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col justify-between gap-1",
            darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate">
                <Clock size={11} className="text-amber-400 shrink-0" />
                <span className="truncate">{isBn ? 'ওঠার সময়' : 'Wake Up'}</span>
              </span>
            </div>
            <input
              type="time"
              value={sleepWakeTime}
              onChange={(e) => {
                setSleepWakeTime(e.target.value);
                persistSleepData(sleepBedTime, e.target.value, sleepRecords);
              }}
              className={cn(
                "w-full px-1 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-center font-mono",
                darkMode
                  ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                  : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
              )}
            />
          </div>

          {/* Record Date */}
          <div className={cn(
            "p-1.5 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col justify-between gap-1",
            darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate">
                <Calendar size={11} className="text-indigo-400 shrink-0" />
                <span className="truncate">{isBn ? 'তারিখ' : 'Date'}</span>
              </span>
            </div>
            <input
              type="date"
              value={selectedSleepDate}
              onChange={(e) => setSelectedSleepDate(e.target.value)}
              className={cn(
                "w-full px-1 py-1 sm:px-2.5 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-center font-mono",
                darkMode
                  ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                  : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
              )}
            />
          </div>
        </div>

        {/* Compact Calculation & Save Bar */}
        <div className={cn(
          "mt-2.5 sm:mt-3.5 p-2 sm:p-3 rounded-lg sm:rounded-xl border flex items-center justify-between gap-2",
          darkMode ? "bg-indigo-950/40 border-indigo-500/30" : "bg-indigo-50/80 border-indigo-200"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
              {isBn ? 'বিশ্রাম:' : 'Duration:'}
            </span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {isBn ? sleepDuration.displayBn : sleepDuration.display}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogSleepRecord}
            className={cn(
              "px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0",
              sleepSavedToast
                ? "bg-emerald-600 text-white shadow-emerald-600/30"
                : (darkMode 
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20")
            )}
          >
            {sleepSavedToast ? (
              <>
                <Check size={13} strokeWidth={3} />
                <span>{isBn ? 'সংরক্ষিত!' : 'Saved!'}</span>
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>{isBn ? 'লগ সংরক্ষণ' : 'Log Sleep'}</span>
              </>
            )}
          </button>
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

      {/* Recent Sleep Logs List */}
      <div className={cn(
        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-2.5 sm:space-y-3",
        darkMode ? "bg-[#0f1422] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
            <Calendar size={13} className="text-indigo-500" />
            <span>{isBn ? 'সাম্প্রতিক ঘুমের রেকর্ড' : 'Recent Sleep Logs'}</span>
          </h3>
          {sleepRecords.length > 0 && (
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
              {isBn ? `মোট ${formatNum(sleepRecords.length)}টি` : `${sleepRecords.length} records`}
            </span>
          )}
        </div>

        {sleepRecords.length === 0 ? (
          <div className={cn(
            "p-4 sm:p-6 rounded-lg sm:rounded-xl border text-center space-y-1",
            darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
          )}>
            <p className="text-xs font-medium">
              {isBn ? 'এখনো কোনো ঘুমের রেকর্ড সংরক্ষণ করা হয়নি।' : 'No sleep records saved yet.'}
            </p>
            <p className="text-[11px] opacity-75">
              {isBn ? 'উপরে সময় নির্ধারণ করে "লগ সংরক্ষণ" চাপুন।' : 'Set your sleep schedule above and tap "Log Sleep".'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {sleepRecords.slice(0, 5).map((record) => {
              const recHours = Math.floor(record.totalMinutes / 60);
              const isOptimal = recHours >= 7 && recHours <= 9;
              return (
                <div 
                  key={record.id}
                  className={cn(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl border flex items-center justify-between gap-1.5 sm:gap-2 transition-all shadow-2xs",
                    darkMode 
                      ? (isOptimal ? "bg-indigo-950/20 border-indigo-500/25" : "bg-white/5 border-white/10") 
                      : (isOptimal ? "bg-indigo-50/70 border-indigo-200" : "bg-gray-50 border-gray-200")
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs",
                      isOptimal ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    )}>
                      <Moon size={13} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                        {formatHistoryDate(record.date)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        {record.bedTime} → {record.wakeTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={cn(
                      "font-black text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border font-mono",
                      isOptimal 
                        ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30" 
                        : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-400/30"
                    )}>
                      {record.durationDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSleepRecord(record.id)}
                      className="p-1 sm:p-1.5 rounded-md sm:rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                      {isBn ? 'দৈনিক ঘুমের ইতিহাস' : 'Daily Sleep History'}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {isBn ? 'দৈনিক ঘুমের সময় ও রেকর্ডের বিবরণ' : 'Daily sleep schedule and duration logs'}
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
                {/* Active Sleep Schedule Summary Card */}
                <div className={cn(
                  "p-3.5 rounded-2xl border space-y-2.5",
                  darkMode ? "bg-indigo-950/20 border-indigo-500/30" : "bg-indigo-50/70 border-indigo-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                        {isBn ? 'বর্তমান ঘুমের লক্ষ্য' : "Current Sleep Target"}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                      sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                        ? (darkMode ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                        : (darkMode ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200")
                    )}>
                      {sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                        ? (isBn ? 'উপযুক্ত ঘুম (Optimal)' : 'Optimal 7-9h')
                        : (sleepDuration.hours < 7 ? (isBn ? 'স্বল্প ঘুম (Short)' : 'Short Sleep (<7h)') : (isBn ? 'দীর্ঘ ঘুম (Long)' : 'Long Sleep (>9h)'))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={cn(
                      "p-2 rounded-xl border flex flex-col gap-0.5",
                      darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
                    )}>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                        {isBn ? 'ঘুমাতে যাওয়ার সময়' : 'Bed Time'}
                      </span>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white font-mono">
                        {sleepBedTime}
                      </span>
                    </div>
                    <div className={cn(
                      "p-2 rounded-xl border flex flex-col gap-0.5",
                      darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
                    )}>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                        {isBn ? 'ঘুম থেকে ওঠার সময়' : 'Wake Up Time'}
                      </span>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white font-mono">
                        {sleepWakeTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {isBn ? 'মোট বিশ্রামের সময়:' : 'Total Duration:'}
                    </span>
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {isBn ? sleepDuration.displayBn : sleepDuration.display}
                    </span>
                  </div>
                </div>

                {/* Past Daily Sleep History Records */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-500" />
                    {isBn ? 'সংরক্ষিত দৈনিক রেকর্ডসমূহ' : 'Saved Sleep History Logs'}
                  </h4>

                  {sleepRecords.length === 0 ? (
                    <div className={cn(
                      "p-4 rounded-xl border text-center space-y-1",
                      darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
                    )}>
                      <p className="text-xs font-medium">
                        {isBn ? 'এখনো কোনো রেকর্ড সংরক্ষণ করা হয়নি।' : 'No sleep records saved yet.'}
                      </p>
                      <p className="text-[10.5px] opacity-75">
                        {isBn ? 'স্লিপ অ্যানালিটিক্সে "লগ সংরক্ষণ করুন" চাপলে আপনার রেকর্ড এখানে যুক্ত হবে।' : 'Save your sleep schedule to log your daily records here.'}
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
