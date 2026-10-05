/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  LayoutDashboard, 
  Scale, 
  Droplets, 
  Moon, 
  Footprints, 
  BookOpen, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Target, 
  ArrowRight, 
  Flame, 
  Award,
  CheckCircle2,
  Check,
  SunMedium
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDhakaLogicalDate, getDhakaLogicalDateKey } from '../utils/sunsetDate';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Timeframe = 'weekly' | 'monthly' | 'yearly';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  lang?: string;
  unit: 'metric' | 'imperial';
  currentWeight?: number; // in kg
  historyList?: any[];
  savedGoal?: any;
  onNavigateTab?: (tab: string, subTab?: string) => void;
  isInline?: boolean;
  weekStartDay?: number;
}

export default function DashboardModal({
  isOpen,
  onClose,
  darkMode,
  lang = 'en',
  unit,
  currentWeight,
  historyList = [],
  savedGoal,
  onNavigateTab,
  isInline = false,
  weekStartDay = 6
}: DashboardModalProps) {
  const isBn = lang === 'bn';
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  // Activity Data States (Real-time synced)
  const [waterData, setWaterData] = useState<any>(null);
  const [sleepRecords, setSleepRecords] = useState<any[]>([]);
  const [stepRecords, setStepRecords] = useState<any[]>([]);
  const [readingRecords, setReadingRecords] = useState<any[]>([]);
  const [savedBooks, setSavedBooks] = useState<any[]>([]);
  const [habitsList, setHabitsList] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, string[]>>({});
  const [salahRecordsMap, setSalahRecordsMap] = useState<Record<string, any>>({});
  const [weightHistory, setWeightHistory] = useState<any[]>([]);

  // Helper for localized numbers
  const formatNum = (num: number | string | undefined | null, maxDecimals = 1) => {
    if (num === undefined || num === null || num === '') return '0';
    let finalStr = '';
    if (typeof num === 'number') {
      if (Number.isInteger(num)) {
        finalStr = num.toLocaleString();
      } else {
        finalStr = parseFloat(num.toFixed(maxDecimals)).toString();
      }
    } else {
      finalStr = String(num);
    }
    if (!isBn) return finalStr;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return finalStr.replace(/[0-9]/g, d => bnDigits[Number(d)]);
  };

  // Days in timeframe
  const timeframeDays = useMemo(() => {
    if (timeframe === 'weekly') return 7;
    if (timeframe === 'monthly') return 30;
    return 365;
  }, [timeframe]);

  // Read local cache immediately
  const syncFromLocalStorage = useCallback(() => {
    // 1. Water
    try {
      const raw = localStorage.getItem('ratbod_water_tracker_data') || localStorage.getItem('ratool_water_tracker_data');
      if (raw) setWaterData(JSON.parse(raw));
    } catch {}

    // 2. Sleep
    try {
      const raw = localStorage.getItem('ratbod_sleep_records');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSleepRecords(parsed);
      }
    } catch {}

    // 3. Steps
    try {
      const raw = localStorage.getItem('ratbod_steps_records');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setStepRecords(parsed);
      }
    } catch {}

    // 4. Reading
    try {
      const rawR = localStorage.getItem('ratbod_reading_records');
      if (rawR) {
        const parsedR = JSON.parse(rawR);
        if (Array.isArray(parsedR)) setReadingRecords(parsedR);
      }
      const rawB = localStorage.getItem('ratbod_user_books');
      if (rawB) {
        const parsedB = JSON.parse(rawB);
        if (Array.isArray(parsedB)) setSavedBooks(parsedB);
      }
    } catch {}

    // 5. Habits
    try {
      const rawH = localStorage.getItem('ratbod_habits_v1') || localStorage.getItem('ratool_habits_v1');
      if (rawH) {
        const parsedH = JSON.parse(rawH);
        if (Array.isArray(parsedH)) setHabitsList(parsedH);
      }
      const rawL = localStorage.getItem('ratbod_habit_logs_v1') || localStorage.getItem('ratool_habit_logs_v1');
      if (rawL) {
        const parsedL = JSON.parse(rawL);
        if (parsedL && typeof parsedL === 'object') setHabitLogs(parsedL);
      }
    } catch {}

    // 6. Salah
    try {
      const rawS = localStorage.getItem('ratbod_salah_records_map');
      if (rawS) {
        const parsedS = JSON.parse(rawS);
        if (parsedS && typeof parsedS === 'object') setSalahRecordsMap(parsedS);
      }
    } catch {}

    // 7. Weight History
    try {
      if (Array.isArray(historyList) && historyList.length > 0) {
        setWeightHistory(historyList);
      } else {
        const rawW = localStorage.getItem('ratbod_history') || localStorage.getItem('ratool_history');
        if (rawW) setWeightHistory(JSON.parse(rawW));
      }
    } catch {}
  }, [historyList]);

  // Real-time Firestore & LocalStorage Synchronization
  useEffect(() => {
    if (!isOpen && !isInline) return;

    // Initial read from local cache
    syncFromLocalStorage();

    const unsubscribers: (() => void)[] = [];
    const user = auth.currentUser;

    if (user) {
      // 1. Water Tracker
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'waterTracker'), (snap) => {
          if (snap.exists()) setWaterData(snap.data());
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 2. Sleep Tracker
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'sleepTracker'), (snap) => {
          if (snap.exists() && Array.isArray(snap.data().sleepRecords)) {
            setSleepRecords(snap.data().sleepRecords);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 3. Steps Tracker
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'stepsTracker'), (snap) => {
          if (snap.exists() && Array.isArray(snap.data().records)) {
            setStepRecords(snap.data().records);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 4. Reading Tracker
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'readingTracker'), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.records)) setReadingRecords(d.records);
            if (Array.isArray(d.books)) setSavedBooks(d.books);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 5. Habits
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'habits'), (snap) => {
          if (snap.exists() && Array.isArray(snap.data().habits)) {
            setHabitsList(snap.data().habits);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 6. Habit Logs
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'habitLogs'), (snap) => {
          if (snap.exists() && snap.data().completedLogs) {
            setHabitLogs(snap.data().completedLogs);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}

      // 7. Salah Tracker
      try {
        const unsub = onSnapshot(doc(db, 'users', user.uid, 'appData', 'salahTracker'), (snap) => {
          if (snap.exists() && snap.data().recordsMap) {
            setSalahRecordsMap(snap.data().recordsMap);
          }
        }, () => {});
        unsubscribers.push(unsub);
      } catch {}
    }

    // Window storage and focus listeners for real-time reactivity
    const handleStorageOrFocus = () => {
      syncFromLocalStorage();
    };

    window.addEventListener('storage', handleStorageOrFocus);
    window.addEventListener('focus', handleStorageOrFocus);

    // Periodic 3s tick for live reactive timestamps
    const ticker = setInterval(syncFromLocalStorage, 3000);

    return () => {
      unsubscribers.forEach(fn => {
        try { fn(); } catch {}
      });
      window.removeEventListener('storage', handleStorageOrFocus);
      window.removeEventListener('focus', handleStorageOrFocus);
      clearInterval(ticker);
    };
  }, [isOpen, isInline, syncFromLocalStorage]);

  // Cutoff timestamp for the timeframe (aligned with Dhaka sunset rollover)
  const cutoffTime = useMemo(() => {
    const { date: logicalDate } = getDhakaLogicalDate();
    const d = new Date(logicalDate);
    if (timeframe === 'weekly') {
      const day = d.getDay();
      const diffToStart = (day - weekStartDay + 7) % 7;
      d.setDate(d.getDate() - diffToStart);
    } else {
      d.setDate(d.getDate() - timeframeDays);
    }
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [timeframe, timeframeDays, weekStartDay]);

  // ==================== 1. SALAH METRICS (#1 PRIORITY) ====================
  const salahMetrics = useMemo(() => {
    const todayStr = getDhakaLogicalDateKey().dateKey;
    const todayRec = salahRecordsMap[todayStr];
    const prayers = todayRec?.prayers || {};
    const prayerKeys: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const completedCount = prayerKeys.filter(p => prayers[p]?.completed).length;
    const percentage = Math.round((completedCount / 5) * 100);

    // Streak of full 5 prayers
    let fullStreak = 0;
    const { date: lDate } = getDhakaLogicalDate();
    const cur = new Date(lDate);
    for (let i = 0; i < 60; i++) {
      const d = new Date(cur);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${dd}`;
      const rec = salahRecordsMap[k];
      const done = prayerKeys.filter(p => rec?.prayers?.[p]?.completed).length;
      if (done === 5) {
        fullStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Timeframe points
    const points: number[] = [];
    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date(cur);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${dd}`;
      const rec = salahRecordsMap[k];
      const done = prayerKeys.filter(p => rec?.prayers?.[p]?.completed).length;
      points.push(done);
    }

    return {
      completedCount,
      percentage,
      fullStreak,
      prayers,
      points: points.length > 0 ? points : [completedCount]
    };
  }, [salahRecordsMap, timeframeDays]);

  // ==================== 2. WATER INTAKE METRICS ====================
  const waterMetrics = useMemo(() => {
    const todayStr = getDhakaLogicalDateKey().dateKey;
    const historyArr: any[] = Array.isArray(waterData?.history) ? waterData.history : [];
    
    let todayConsumed = 0;
    if (waterData?.todayDate === todayStr && Array.isArray(waterData?.todayEntries)) {
      todayConsumed = waterData.todayEntries.reduce((acc: number, e: any) => acc + (e.amountMl || 0), 0);
    }

    const allDaysMap = new Map<string, number>();
    historyArr.forEach(item => {
      if (item && item.date && item.consumedMl !== undefined) {
        allDaysMap.set(item.date, item.consumedMl);
      }
    });
    if (todayConsumed > 0 || !allDaysMap.has(todayStr)) {
      allDaysMap.set(todayStr, todayConsumed);
    }

    const filteredPoints: number[] = [];
    let totalMl = 0;

    allDaysMap.forEach((consumed, dateStr) => {
      const time = new Date(dateStr).getTime();
      if (time >= cutoffTime) {
        totalMl += consumed;
        filteredPoints.push(consumed);
      }
    });

    const daysCount = Math.max(1, Math.min(timeframeDays, filteredPoints.length || 1));
    const dailyAvgMl = Math.round(totalMl / daysCount);
    const dailyAvgGlasses = (dailyAvgMl / 250).toFixed(1);
    const totalLiters = (totalMl / 1000).toFixed(1);
    const totalGlasses = Math.round(totalMl / 250);

    const targetMl = ((waterData?.goalGlasses || 8) * (waterData?.glassVolumeMl || 250));
    const todayPercent = Math.min(100, Math.round((todayConsumed / (targetMl || 2000)) * 100));
    const completionRate = Math.min(100, Math.round((dailyAvgMl / (targetMl || 2000)) * 100));

    return {
      todayConsumed,
      todayPercent,
      targetMl,
      dailyAvgMl,
      dailyAvgGlasses,
      totalLiters,
      totalGlasses,
      completionRate,
      points: filteredPoints.length > 0 ? filteredPoints : [dailyAvgMl]
    };
  }, [waterData, cutoffTime, timeframeDays]);

  // ==================== 3. HABIT METRICS ====================
  const habitMetrics = useMemo(() => {
    const todayStr = getDhakaLogicalDateKey().dateKey;
    const totalHabits = habitsList.length || 14;
    const todayCompleted = (habitLogs[todayStr] || []).length;
    const todayPercent = Math.min(100, Math.round((todayCompleted / Math.max(1, totalHabits)) * 100));

    let streak = 0;
    const { date: lDate } = getDhakaLogicalDate();
    const cur = new Date(lDate);
    for (let i = 0; i < 60; i++) {
      const d = new Date(cur);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${dd}`;
      const count = (habitLogs[k] || []).length;
      if (count > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    let timeframeCompleted = 0;
    let timeframePossible = 0;
    const points: number[] = [];
    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date(cur);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${dd}`;
      const count = (habitLogs[k] || []).length;
      timeframeCompleted += count;
      timeframePossible += totalHabits;
      points.push(count);
    }
    const timeframeRate = Math.min(100, Math.round((timeframeCompleted / Math.max(1, timeframePossible)) * 100));

    return {
      totalHabits,
      todayCompleted,
      todayPercent,
      streak,
      timeframeRate,
      points: points.length > 0 ? points : [todayCompleted]
    };
  }, [habitsList, habitLogs, timeframeDays]);

  // ==================== 4. SLEEP METRICS ====================
  const sleepMetrics = useMemo(() => {
    const relevant = sleepRecords.filter(r => new Date(r.date).getTime() >= cutoffTime);
    const records = relevant.length > 0 ? relevant : sleepRecords.slice(0, timeframeDays);

    let totalMinutes = 0;
    const points: number[] = [];

    records.forEach(r => {
      const mins = Number(r.totalMinutes) || 0;
      if (mins > 0) {
        totalMinutes += mins;
        points.push(mins);
      }
    });

    const count = Math.max(1, records.length);
    const avgMinutes = Math.round(totalMinutes / count);
    const avgHours = (avgMinutes / 60).toFixed(1);
    const avgRemMins = avgMinutes % 60;
    const avgDisplay = `${Math.floor(avgMinutes / 60)}h ${avgRemMins}m`;

    const totalHours = Math.floor(totalMinutes / 60);
    const totalRemMins = totalMinutes % 60;
    const totalDisplay = `${totalHours}h ${totalRemMins}m`;

    const isOptimal = avgMinutes >= 420 && avgMinutes <= 540;

    return {
      avgDisplay,
      totalDisplay,
      isOptimal,
      avgMinutes,
      avgHours,
      totalHours,
      totalLogs: records.length,
      points: points.length > 0 ? points : [avgMinutes]
    };
  }, [sleepRecords, cutoffTime, timeframeDays]);

  // ==================== 5. STEPS METRICS ====================
  const stepMetrics = useMemo(() => {
    const todayStr = getDhakaLogicalDateKey().dateKey;
    const relevant = stepRecords.filter(r => new Date(r.date).getTime() >= cutoffTime);
    const records = relevant.length > 0 ? relevant : stepRecords.slice(0, timeframeDays);

    let totalSteps = 0;
    let totalDistanceKm = 0;
    let totalCalories = 0;
    const points: number[] = [];

    records.forEach(r => {
      const steps = Number(r.steps) || 0;
      totalSteps += steps;
      totalDistanceKm += Number(r.distanceKm) || ((steps * 0.762) / 1000);
      totalCalories += Number(r.calories) || Math.round(steps * 0.04);
      points.push(steps);
    });

    const todayEntry = stepRecords.find(r => r.date === todayStr);
    const todaySteps = Number(todayEntry?.steps) || 0;

    const daysCount = Math.max(1, records.length);
    const avgSteps = Math.round(totalSteps / daysCount);
    const distanceDisplay = unit === 'imperial' 
      ? `${(totalDistanceKm * 0.621371).toFixed(1)} ${isBn ? 'মাইল' : 'mi'}`
      : `${totalDistanceKm.toFixed(1)} ${isBn ? 'কিমি' : 'km'}`;

    return {
      todaySteps,
      totalSteps,
      avgSteps,
      distanceDisplay,
      totalCalories,
      totalKm: totalDistanceKm.toFixed(1),
      points: points.length > 0 ? points : [avgSteps]
    };
  }, [stepRecords, cutoffTime, timeframeDays, unit, isBn]);

  // ==================== 6. READING METRICS ====================
  const readingMetrics = useMemo(() => {
    const relevant = readingRecords.filter(r => new Date(r.date).getTime() >= cutoffTime);
    const records = relevant.length > 0 ? relevant : readingRecords.slice(0, timeframeDays);

    let totalPages = 0;
    let totalMinutes = 0;
    const bookMap = new Map<string, number>();
    const points: number[] = [];

    records.forEach(r => {
      const p = Number(r.pages) || 0;
      const m = Number(r.minutes) || 0;
      totalPages += p;
      totalMinutes += m;
      points.push(p);

      const title = (r.bookTitle || '').trim();
      if (title) {
        bookMap.set(title, (bookMap.get(title) || 0) + p);
      }
    });

    const booksList = Array.from(bookMap.entries()).map(([title, pages]) => {
      const matched = savedBooks.find(b => (b.title || '').trim().toLowerCase() === title.toLowerCase());
      return {
        title,
        pages,
        totalPages: matched?.totalPages,
        currentPage: matched?.currentPage
      };
    }).sort((a, b) => b.pages - a.pages);

    const countBooks = booksList.length;
    const avgPagesPerDay = Math.round(totalPages / Math.max(1, Math.min(timeframeDays, records.length || 1)));

    return {
      totalPages,
      totalMinutes,
      countBooks,
      booksList,
      avgPagesPerDay,
      totalSessions: records.length,
      points: points.length > 0 ? points : [totalPages]
    };
  }, [readingRecords, savedBooks, cutoffTime, timeframeDays]);

  // ==================== 7. WEIGHT METRICS ====================
  const weightMetrics = useMemo(() => {
    const unitLabel = unit === 'imperial' ? (isBn ? 'পাউন্ড' : 'lbs') : (isBn ? 'কেজি' : 'kg');
    const toUserWeight = (kg: number) => unit === 'imperial' ? kg * 2.20462 : kg;

    const sortedHistory = [...weightHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const relevant = sortedHistory.filter(
      item => new Date(item.date).getTime() >= cutoffTime
    );

    const entries = relevant.length > 0 ? relevant : sortedHistory;
    
    let latestKg = currentWeight || 0;
    let startKg = latestKg;

    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      latestKg = typeof lastEntry.weight === 'number' ? lastEntry.weight : (lastEntry.metrics?.weight || latestKg);
      
      const firstEntry = entries[0];
      startKg = typeof firstEntry.weight === 'number' ? firstEntry.weight : (firstEntry.metrics?.weight || latestKg);
    }

    const latestDisplay = toUserWeight(latestKg);
    const startDisplay = toUserWeight(startKg);
    const deltaDisplay = latestDisplay - startDisplay;
    const isGain = deltaDisplay > 0.05;
    const isLoss = deltaDisplay < -0.05;

    const targetKg = savedGoal?.targetWeight ? Number(savedGoal.targetWeight) : null;
    const targetDisplay = targetKg ? toUserWeight(targetKg) : null;
    let goalDiffDisplay: number | null = null;
    let goalPercent: number | null = null;

    if (targetDisplay && latestDisplay) {
      goalDiffDisplay = Math.abs(latestDisplay - targetDisplay);
      if (startDisplay !== targetDisplay) {
        const totalToLose = Math.abs(startDisplay - targetDisplay);
        const achieved = Math.abs(startDisplay - latestDisplay);
        goalPercent = Math.min(100, Math.round((achieved / (totalToLose || 1)) * 100));
      }
    }

    const points: number[] = [];
    if (entries.length > 1) {
      entries.forEach(e => {
        const w = typeof e.weight === 'number' ? e.weight : (e.metrics?.weight || 0);
        if (w > 0) points.push(toUserWeight(w));
      });
    } else if (latestDisplay > 0) {
      points.push(startDisplay, latestDisplay);
    }

    return {
      latestDisplay,
      deltaDisplay,
      isGain,
      isLoss,
      targetDisplay,
      goalDiffDisplay,
      goalPercent,
      unitLabel,
      points
    };
  }, [weightHistory, cutoffTime, currentWeight, unit, isBn, savedGoal]);

  // ==================== VITALITY & DAILY PULSE SCORE ====================
  const vitalityScore = useMemo(() => {
    const salahScore = salahMetrics.percentage;
    const waterScore = Math.min(100, waterMetrics.todayPercent || 0);
    const habitScore = Math.min(100, habitMetrics.todayPercent || 0);
    const stepTarget = 10000;
    const stepScore = Math.min(100, Math.round(((stepMetrics.todaySteps || stepMetrics.avgSteps || 0) / stepTarget) * 100));
    const sleepScore = Math.min(100, Math.round(((Number(sleepMetrics.avgHours) || 0) / 8) * 100));
    const readingScore = Math.min(100, Math.round(((readingMetrics.totalPages || 0) / 10) * 100));

    const total = Math.round(
      (salahScore * 0.25) +
      (waterScore * 0.20) +
      (habitScore * 0.20) +
      (stepScore * 0.15) +
      (sleepScore * 0.10) +
      (readingScore * 0.10)
    );

    return Math.min(100, Math.max(0, total));
  }, [salahMetrics, waterMetrics, habitMetrics, stepMetrics, sleepMetrics, readingMetrics]);

  // Sparkline Generator
  const renderSparkline = (points: number[], color: string, height = 24, width = 76) => {
    if (!points || points.length === 0) return null;
    const valid = points.filter(p => !isNaN(p));
    if (valid.length === 0) return null;

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = (max - min) || 1;

    const stepX = width / Math.max(1, valid.length - 1);
    const coords = valid.map((val, idx) => {
      const x = idx * stepX;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return { x, y };
    });

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return (
      <div className="relative inline-flex items-center shrink-0">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-16 sm:w-20 h-5 sm:h-6 overflow-visible"
        >
          <defs>
            <linearGradient id={`grad_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#grad_${color.replace('#', '')})`} />
          <path 
            d={pathD} 
            fill="none" 
            stroke={color} 
            strokeWidth="1.75" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="2.2"
              fill={color}
              className="animate-pulse"
            />
          )}
        </svg>
      </div>
    );
  };

  const renderDashboardBody = (isInlineView: boolean) => (
    <div className={cn("space-y-3 sm:space-y-3.5", isInlineView ? "px-3 sm:px-5 py-3" : "flex-1 overflow-y-auto px-3 sm:px-5 py-3")}>
      
      {/* ================= HERO: REAL-TIME VITALITY PULSE RING ================= */}
      <div className={cn(
        "p-3.5 sm:p-4 rounded-2xl border relative overflow-hidden transition-all",
        darkMode 
          ? "bg-gradient-to-br from-[#121620] via-[#0f1118] to-[#0c0e14] border-white/10 shadow-lg shadow-black/40" 
          : "bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/40 border-gray-200/80 shadow-sm"
      )}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-5">
          {/* Left: Radial Progress Ring with Score */}
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className={darkMode ? "text-white/10" : "text-gray-200/90"}
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="transition-all duration-700 ease-out"
                  strokeDasharray={`${vitalityScore}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="url(#vitalityGradient)"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <defs>
                  <linearGradient id="vitalityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="40%" stopColor="#06b6d4" />
                    <stop offset="70%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-black tracking-tight leading-none text-gray-900 dark:text-white">
                  {formatNum(vitalityScore)}%
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                  {isBn ? 'স্কোর' : 'Score'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isBn ? 'রিয়েল-টাইম লাইভ ওভারভিউ' : 'Live Real-Time Vitality'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight">
                {vitalityScore >= 80 
                  ? (isBn ? 'অসাধারণ ধারাবাহিকতা ও আত্মিক প্রশান্তি!' : 'Optimal Flow & Peak Vitality!') 
                  : vitalityScore >= 50 
                    ? (isBn ? 'দারুণ অগ্রগতি, লক্ষ্য স্পর্শে থাকুন' : 'Strong Momentum & Building Well') 
                    : (isBn ? 'আজকের সুস্থতার শুভ সূচনা' : 'Fresh Start — Keep Praying & Moving')}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                {isBn 
                  ? `সালাত ${formatNum(salahMetrics.percentage)}% • পানি ${formatNum(waterMetrics.todayPercent)}% • অভ্যাস ${formatNum(habitMetrics.todayPercent)}%`
                  : `Prayers ${formatNum(salahMetrics.percentage)}% • Water ${formatNum(waterMetrics.todayPercent)}% • Habits ${formatNum(habitMetrics.todayPercent)}%`}
              </p>
            </div>
          </div>

          {/* Right: Quick Dimension Breakdown (Salah #1 Position) */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 w-full sm:w-auto shrink-0">
            <div className={cn("px-2.5 py-1.5 rounded-xl border text-center", darkMode ? "bg-white/5 border-white/5" : "bg-white/80 border-gray-200/70")}>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'সালাত' : 'Salah'}</span>
              <span className="text-xs font-black text-sky-500 dark:text-sky-400">{formatNum(salahMetrics.completedCount)}/5</span>
            </div>
            <div className={cn("px-2.5 py-1.5 rounded-xl border text-center", darkMode ? "bg-white/5 border-white/5" : "bg-white/80 border-gray-200/70")}>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'পানি' : 'Water'}</span>
              <span className="text-xs font-black text-cyan-500 dark:text-cyan-400">{formatNum(waterMetrics.todayConsumed)} ml</span>
            </div>
            <div className={cn("px-2.5 py-1.5 rounded-xl border text-center", darkMode ? "bg-white/5 border-white/5" : "bg-white/80 border-gray-200/70")}>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'অভ্যাস' : 'Habits'}</span>
              <span className="text-xs font-black text-emerald-500 dark:text-emerald-400">{formatNum(habitMetrics.todayCompleted)}/{formatNum(habitMetrics.totalHabits)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= QUICK AT-A-GLANCE STRIP (Salah at #1 Position) ================= */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
        {/* 1. Salah (NUMBER 1 POSITION) */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('salah') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'সালাত' : 'Salah'}
        >
          <SunMedium size={13} className={cn("mb-0.5", darkMode ? "text-sky-400" : "text-sky-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'সালাত' : 'Salah'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-sky-400" : "text-sky-600")}>
            {formatNum(salahMetrics.completedCount)}/5
          </span>
        </button>

        {/* 2. Water */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'water') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'পানি' : 'Water'}
        >
          <Droplets size={13} className={cn("mb-0.5", darkMode ? "text-cyan-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'পানি' : 'Water'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-cyan-400" : "text-gray-900")}>
            {formatNum(waterMetrics.dailyAvgGlasses)} {isBn ? 'গ্লাস' : 'gls'}
          </span>
        </button>

        {/* 3. Habits */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('habits') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'অভ্যাস' : 'Habits'}
        >
          <CheckCircle2 size={13} className={cn("mb-0.5", darkMode ? "text-emerald-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'অভ্যাস' : 'Habits'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-emerald-400" : "text-gray-900")}>
            {formatNum(habitMetrics.todayCompleted)}/{formatNum(habitMetrics.totalHabits)}
          </span>
        </button>

        {/* 4. Sleep */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'sleep') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'ঘুম' : 'Sleep'}
        >
          <Moon size={13} className={cn("mb-0.5", darkMode ? "text-indigo-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'ঘুম' : 'Sleep'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-indigo-400" : "text-gray-900")}>
            {formatNum(sleepMetrics.avgHours)} {isBn ? 'ঘণ্টা' : 'h'}
          </span>
        </button>

        {/* 5. Steps */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'steps') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'হাঁটা' : 'Steps'}
        >
          <Footprints size={13} className={cn("mb-0.5", darkMode ? "text-teal-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'হাঁটা' : 'Steps'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-teal-400" : "text-gray-900")}>
            {formatNum(stepMetrics.avgSteps >= 1000 ? Math.round(stepMetrics.avgSteps / 1000) + 'k' : stepMetrics.avgSteps)}
          </span>
        </button>

        {/* 6. Reading */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'reading') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'পড়া' : 'Read'}
        >
          <BookOpen size={13} className={cn("mb-0.5", darkMode ? "text-amber-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'পড়া' : 'Read'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-amber-400" : "text-gray-900")}>
            {formatNum(readingMetrics.avgPagesPerDay)} {isBn ? 'পৃষ্ঠা' : 'p'}
          </span>
        </button>

        {/* 7. Weight */}
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('calculator') : onClose()}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95 col-span-2 sm:col-span-1",
            darkMode 
              ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/5" 
              : "bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs"
          )}
          title={isBn ? 'ওজন' : 'Weight'}
        >
          <Scale size={13} className={cn("mb-0.5", darkMode ? "text-orange-400" : "text-gray-600")} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'ওজন' : 'Weight'}</span>
          <span className={cn("text-xs sm:text-sm font-black", darkMode ? "text-orange-400" : "text-gray-900")}>
            {weightMetrics.isLoss ? '-' : weightMetrics.isGain ? '+' : ''}{formatNum(Math.abs(weightMetrics.deltaDisplay))} {weightMetrics.unitLabel}
          </span>
        </button>
      </div>

      {/* ================= ROW 1: SALAH (NUMBER 1 POSITION) & WATER CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: Salah / Spiritual Vitality (NUMBER 1 POSITION) */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('salah') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20" 
                    : "bg-sky-50 text-sky-700 border-sky-200/70"
                )}>
                  <SunMedium size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{isBn ? 'সালাত ও আত্মিক প্রশান্তি' : 'Salah & Spiritual Rhythm'}</span>
                    {salahMetrics.fullStreak > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Award size={10} />
                        <span>{formatNum(salahMetrics.fullStreak)}d</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'দৈনিক ৫ ওয়াক্ত সালাতের স্থিতি' : 'Daily 5 prayers fulfillment'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(salahMetrics.points, '#0284c7')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('salah');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'সালাত' : 'Track'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(salahMetrics.completedCount)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">/ 5</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2">{isBn ? 'ওয়াক্ত সম্পন্ন' : 'prayers done'}</span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-black border",
                darkMode 
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/20" 
                  : "bg-sky-50 text-sky-700 border-sky-200/70"
              )}>
                {formatNum(salahMetrics.percentage, 0)}% {isBn ? 'সম্পন্ন' : 'completed'}
              </div>
            </div>

            {/* 5 Prayers Check Pills */}
            <div className="grid grid-cols-5 gap-1 my-2">
              {[
                { key: 'fajr', label: isBn ? 'ফজর' : 'Fajr' },
                { key: 'dhuhr', label: isBn ? 'যোহর' : 'Dhuhr' },
                { key: 'asr', label: isBn ? 'আসর' : 'Asr' },
                { key: 'maghrib', label: isBn ? 'মাগরিব' : 'Maghrib' },
                { key: 'isha', label: isBn ? 'এশা' : 'Isha' }
              ].map(({ key, label }) => {
                const done = salahMetrics.prayers[key]?.completed;
                return (
                  <div
                    key={key}
                    className={cn(
                      "py-1.5 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5",
                      done 
                        ? (darkMode ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-black" : "bg-emerald-50 border-emerald-200 text-emerald-700 font-black")
                        : (darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-200/70 text-gray-500")
                    )}
                  >
                    <span className="text-[9px] font-bold uppercase truncate">{label}</span>
                    <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center", done ? "bg-emerald-500 text-white" : "border border-gray-400/30")}>
                      {done && <Check size={9} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">{isBn ? 'আজকের সালাত সম্পন্ন:' : 'Prayers fulfilled:'}</span>
            <span className="font-bold text-gray-900 dark:text-sky-400">{formatNum(salahMetrics.completedCount)} / 5 ({formatNum(salahMetrics.percentage)}%)</span>
          </div>
        </div>

        {/* Card 2: Water Intake Card */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'water') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                    : "bg-cyan-50 text-cyan-700 border-cyan-200/70"
                )}>
                  <Droplets size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{isBn ? 'পানি পানের হাইড্রেশন' : 'Hydration Analytics'}</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'আজকের গ্রহণ ও দৈনিক লক্ষ্য' : 'Today intake & daily goal'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(waterMetrics.points, '#06b6d4')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('logify', 'water');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'লগ' : 'Log'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(waterMetrics.todayConsumed)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">ml</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2">/ {formatNum(waterMetrics.targetMl)} ml</span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-black border",
                darkMode 
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" 
                  : "bg-cyan-50 text-cyan-700 border-cyan-200/70"
              )}>
                {formatNum(waterMetrics.todayPercent, 0)}% {isBn ? 'পূর্ণ' : 'done'}
              </div>
            </div>

            {/* Minimal Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, waterMetrics.todayPercent)}%` }} 
              />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">{isBn ? 'দৈনিক গড়:' : 'Daily Average:'}</span>
            <span className="font-bold text-gray-900 dark:text-cyan-400">{formatNum(waterMetrics.dailyAvgGlasses)} {isBn ? 'গ্লাস/দিন' : 'gls/day'} (~{formatNum(waterMetrics.dailyAvgMl)} ml)</span>
          </div>
        </div>
      </div>

      {/* ================= ROW 2: HABITS & SLEEP CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 3: Habitor Progress Card */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('habits') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                )}>
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{isBn ? 'হ্যাবিট অ্যানালিটিক্স' : 'Habit Analytics'}</span>
                    {habitMetrics.streak > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <Flame size={10} className="fill-rose-500" />
                        <span>{formatNum(habitMetrics.streak)}d</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'সম্পন্ন অভ্যাস ও ধারাবাহিকতা' : 'Completed tasks & active streak'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(habitMetrics.points, '#10b981')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('habits');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'হ্যাবিট' : 'View'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(habitMetrics.todayCompleted)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">/ {formatNum(habitMetrics.totalHabits)}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2">{isBn ? 'আজ সম্পন্ন' : 'done today'}</span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-black border",
                darkMode 
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/70"
              )}>
                {formatNum(habitMetrics.todayPercent, 0)}% {isBn ? 'সম্পন্ন' : 'completed'}
              </div>
            </div>

            {/* Minimal Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, habitMetrics.todayPercent)}%` }} 
              />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">{isBn ? 'ধারাবাহিকতার হার:' : 'Consistency Rate:'}</span>
            <span className="font-bold text-gray-900 dark:text-emerald-400">{formatNum(habitMetrics.timeframeRate)}% {isBn ? 'সময়সীমায়' : 'in period'}</span>
          </div>
        </div>

        {/* Card 4: Sleep Quality & Hours Card */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'sleep') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                    : "bg-indigo-50 text-indigo-700 border-indigo-200/70"
                )}>
                  <Moon size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{isBn ? 'ঘুম ও বিশ্রাম অ্যানালিটিক্স' : 'Sleep & Recovery'}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'গড় ঘুম ও রেকর্ডের সংখ্যা' : 'Average sleep & recovery'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(sleepMetrics.points, '#6366f1')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('logify', 'sleep');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'লগ' : 'Log'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(sleepMetrics.avgHours)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">{isBn ? 'ঘণ্টা/রাত' : 'hrs/night'}</span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-black border",
                sleepMetrics.isOptimal
                  ? (darkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200/70")
                  : (darkMode ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/20" : "bg-gray-100 text-gray-700 border-gray-200/70")
              )}>
                {sleepMetrics.isOptimal ? (isBn ? 'আদর্শ ঘুম' : 'Optimal Rest') : `${formatNum(sleepMetrics.totalLogs)} ${isBn ? 'দিন' : 'nights'}`}
              </div>
            </div>

            {/* Progress to 8h Goal */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round(((Number(sleepMetrics.avgHours) || 0) / 8) * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">{isBn ? 'মোট বিশ্রামের সময়:' : 'Total Rest Time:'}</span>
            <span className="font-bold text-gray-900 dark:text-indigo-400">{formatNum(sleepMetrics.totalHours)} {isBn ? 'ঘণ্টা' : 'hours'}</span>
          </div>
        </div>
      </div>

      {/* ================= ROW 3: STEPS & READING CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 5: Steps Card */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'steps') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/20" 
                    : "bg-teal-50 text-teal-700 border-teal-200/70"
                )}>
                  <Footprints size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{isBn ? 'হাঁটা ও শারীরিক সক্রিয়তা' : 'Steps & Activity'}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'দৈনিক কদম ও আনুমানিক দূরত্ব' : 'Daily steps & distance'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(stepMetrics.points, '#14b8a6')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('logify', 'steps');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'লগ' : 'Log'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between my-1">
              <div>
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(stepMetrics.todaySteps || stepMetrics.avgSteps)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">{isBn ? 'কদম' : 'steps'}</span>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-black border",
                darkMode 
                  ? "bg-teal-500/15 text-teal-400 border-teal-500/20" 
                  : "bg-teal-50 text-teal-700 border-teal-200/70"
              )}>
                ~{formatNum(stepMetrics.totalKm)} {isBn ? 'কিমি' : 'km'}
              </div>
            </div>

            {/* Progress to 10k Goal */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round(((stepMetrics.todaySteps || stepMetrics.avgSteps) / 10000) * 100))}%` }} 
              />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">{isBn ? 'দৈনিক গড় কদম:' : 'Daily Average:'}</span>
            <span className="font-bold text-gray-900 dark:text-teal-400">{formatNum(stepMetrics.avgSteps)} {isBn ? 'কদম/দিন' : 'steps/day'} (~{formatNum(stepMetrics.totalCalories)} kcal)</span>
          </div>
        </div>

        {/* Card 6: Reading Tracker Summary Card */}
        <div 
          onClick={() => onNavigateTab ? onNavigateTab('logify', 'reading') : onClose()}
          className={cn(
            "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
            darkMode 
              ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
              : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  darkMode 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                    : "bg-amber-50 text-amber-700 border-amber-200/70"
                )}>
                  <BookOpen size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{isBn ? 'বই পড়ার অ্যানালিটিক্স' : 'Reading Insights'}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'মোট পৃষ্ঠা ও পড়ার সেশন' : 'Pages, reading minutes & library'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderSparkline(readingMetrics.points, '#f59e0b')}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateTab) onNavigateTab('logify', 'reading');
                    else onClose();
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                    darkMode 
                      ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
                  )}
                >
                  <span>{isBn ? 'লাইব্রেরি' : 'Library'}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
              <div className={cn("p-2 rounded-xl border", darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200/70")}>
                <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'মোট পৃষ্ঠা' : 'Pages'}</span>
                <span className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">{formatNum(readingMetrics.totalPages)}</span>
              </div>
              <div className={cn("p-2 rounded-xl border", darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200/70")}>
                <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'সময়' : 'Minutes'}</span>
                <span className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">{formatNum(readingMetrics.totalMinutes)}m</span>
              </div>
              <div className={cn("p-2 rounded-xl border", darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200/70")}>
                <span className="text-[9px] text-gray-500 dark:text-gray-400 block uppercase font-bold">{isBn ? 'সেশন' : 'Sessions'}</span>
                <span className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">{formatNum(readingMetrics.totalSessions)}</span>
              </div>
            </div>
          </div>

          {savedBooks.length > 0 ? (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">{isBn ? 'সক্রিয় বই:' : 'Active books:'}</span>
              {savedBooks.slice(0, 2).map((book: any, idx: number) => (
                <div 
                  key={idx}
                  className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
                  )}
                >
                  <span className="truncate max-w-[120px]">{book.title}</span>
                  <span className="text-amber-500 font-mono text-[9px]">({formatNum(book.pages || book.currentPage)}p)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 text-[10px] text-gray-400">
              {isBn ? 'দৈনিক গড় পাঠ:' : 'Daily avg:'} <span className="font-bold text-gray-700 dark:text-gray-300">{formatNum(readingMetrics.avgPagesPerDay)} {isBn ? 'পৃষ্ঠা/দিন' : 'p/day'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= ROW 4: WEIGHT PROGRESS CARD ================= */}
      <div 
        onClick={() => onNavigateTab ? onNavigateTab('calculator') : onClose()}
        className={cn(
          "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group",
          darkMode 
            ? "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]" 
            : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg border",
              darkMode 
                ? "bg-orange-500/10 text-orange-400 border-orange-500/20" 
                : "bg-orange-50 text-orange-700 border-orange-200/70"
            )}>
              <Scale size={14} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{isBn ? 'ওজন ও শরীর পরিবর্তন অ্যানালিটিক্স' : 'Body Weight & Goal Analytics'}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{isBn ? 'সর্বশেষ রেকর্ড ও লক্ষ্যমাত্রা' : 'Latest record & target distance'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderSparkline(weightMetrics.points, '#f97316')}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateTab) onNavigateTab('calculator');
                else onClose();
              }}
              className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95",
                darkMode 
                  ? "bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200/80"
              )}
            >
              <span>{isBn ? 'লগ' : 'Log'}</span>
              <ArrowRight size={10} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between my-1">
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{formatNum(weightMetrics.latestDisplay)}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">{weightMetrics.unitLabel}</span>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 border",
            weightMetrics.isLoss 
              ? (darkMode ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200/70") 
              : weightMetrics.isGain 
                ? (darkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200/70") 
                : (darkMode ? "bg-gray-500/15 text-gray-400 border-gray-500/20" : "bg-gray-100 text-gray-700 border-gray-200/70")
          )}>
            {weightMetrics.isLoss && <TrendingDown size={12} />}
            {weightMetrics.isGain && <TrendingUp size={12} />}
            {!weightMetrics.isLoss && !weightMetrics.isGain && <Minus size={12} />}
            <span>{formatNum(Math.abs(weightMetrics.deltaDisplay))} {weightMetrics.unitLabel}</span>
          </div>
        </div>

        {weightMetrics.targetDisplay ? (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Target size={11} className="text-gray-500 dark:text-primary" />
              {isBn ? 'লক্ষ্যমাত্রা:' : 'Goal Target:'}
            </span>
            <span className="font-bold text-gray-900 dark:text-primary">
              {formatNum(weightMetrics.targetDisplay)} {weightMetrics.unitLabel} 
              {weightMetrics.goalDiffDisplay !== null && (
                <span className="text-gray-400 ml-1 font-normal">({formatNum(weightMetrics.goalDiffDisplay)} {weightMetrics.unitLabel} {isBn ? 'বাকি' : 'remaining'})</span>
              )}
            </span>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-white/10 text-[10px] text-gray-400">
            {isBn ? 'লক্ষ্য সেট করা হয়নি — ক্যালকুলেটরে সেট করুন' : 'No target set yet — tap to set goal in calculator'}
          </div>
        )}
      </div>

    </div>
  );

  if (isInline) {
    return (
      <div 
        id="dashboard_inline_container"
        className={cn(
          "w-full max-w-4xl mx-auto flex flex-col rounded-2xl sm:rounded-3xl border shadow-sm overflow-hidden",
          darkMode 
            ? "bg-[#0F0F0F] border-white/10 text-white shadow-black/40" 
            : "bg-white border-gray-200/90 text-gray-900 shadow-sm shadow-gray-200/40"
        )}
      >
        <div className={cn(
          "flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0",
          darkMode ? "border-white/10 bg-white/[0.02]" : "border-gray-100 bg-gray-50/70"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center border",
              darkMode 
                ? "bg-primary/20 border-primary/30 text-primary" 
                : "bg-gray-100 border-gray-200 text-gray-800"
            )}>
              <LayoutDashboard size={15} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                {isBn ? 'ওভারভিউ' : 'Overview'}
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none hidden xs:block">
                {isBn ? 'রিয়েল-টাইম লাইভ অ্যানালিটিক্স ও সারাংশ' : 'Real-time live analytics & holistic summary'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "flex p-0.5 rounded-xl border",
              darkMode ? "bg-black/40 border-white/10" : "bg-gray-100 border-gray-200/80"
            )}>
              {(['weekly', 'monthly', 'yearly'] as Timeframe[]).map((t) => {
                const isSelected = timeframe === t;
                const label = t === 'weekly' 
                  ? (isBn ? 'সাপ্তাহিক' : 'Weekly') 
                  : t === 'monthly' 
                    ? (isBn ? 'মাসিক' : 'Monthly') 
                    : (isBn ? 'বার্ষিক' : 'Yearly');
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "relative px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer select-none",
                      isSelected
                        ? (darkMode ? "text-white font-black" : "text-gray-900 font-black")
                        : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-900")
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeDashboardInlineTimeframe"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          darkMode 
                            ? "bg-white/15 border border-white/20 shadow-xs" 
                            : "bg-white shadow-2xs border border-gray-200/80"
                        )}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {renderDashboardBody(true)}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div 
      id="dashboard_modal_overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        id="dashboard_modal_container"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl",
          darkMode 
            ? "bg-[#121212]/95 border-white/10 text-white shadow-black/80" 
            : "bg-white/95 border-gray-200/90 text-gray-900 shadow-gray-400/30"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Title, Timeframe Pills & Close button */}
        <div className={cn(
          "flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0",
          darkMode ? "border-white/10 bg-white/[0.02]" : "border-gray-100 bg-gray-50/70"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center border",
              darkMode 
                ? "bg-primary/20 border-primary/30 text-primary" 
                : "bg-gray-100 border-gray-200 text-gray-800"
            )}>
              <LayoutDashboard size={15} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                {isBn ? 'ওভারভিউ' : 'Overview'}
              </h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none hidden xs:block">
                {isBn ? 'রিয়েল-টাইম লাইভ অ্যানালিটিক্স ও সারাংশ' : 'Real-time live analytics & holistic summary'}
              </p>
            </div>
          </div>

          {/* Timeframe Selector Pill (Weekly, Monthly, Yearly) */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex p-0.5 rounded-xl border",
              darkMode ? "bg-black/40 border-white/10" : "bg-gray-100 border-gray-200/80"
            )}>
              {(['weekly', 'monthly', 'yearly'] as Timeframe[]).map((t) => {
                const isSelected = timeframe === t;
                const label = t === 'weekly' 
                  ? (isBn ? 'সাপ্তাহিক' : 'Weekly') 
                  : t === 'monthly' 
                    ? (isBn ? 'মাসিক' : 'Monthly') 
                    : (isBn ? 'বার্ষিক' : 'Yearly');
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "relative px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer select-none",
                      isSelected
                        ? (darkMode ? "text-white font-black" : "text-gray-900 font-black")
                        : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-900")
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeDashboardTimeframe"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          darkMode 
                            ? "bg-white/15 border border-white/20 shadow-xs" 
                            : "bg-white shadow-2xs border border-gray-200/80"
                        )}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Close Modal Button */}
            <button
              id="close_dashboard_modal"
              type="button"
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-xl border transition-colors cursor-pointer",
                darkMode 
                  ? "border-white/10 hover:bg-white/10 text-gray-400 hover:text-white" 
                  : "border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900"
              )}
              aria-label="Close Dashboard"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {renderDashboardBody(false)}

        {/* Modal Footer: Action shortcuts & close */}
        <div className={cn(
          "px-3.5 sm:px-5 py-2 sm:py-2.5 border-t shrink-0 flex items-center justify-between text-xs",
          darkMode ? "border-white/10 bg-white/[0.01]" : "border-black/5 bg-gray-50/50"
        )}>
          <span className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {isBn ? 'সকল ট্র্যাকার রিয়েল-টাইমে লাইভ সিঙ্ক হচ্ছে' : 'All trackers syncing in live real-time'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer active:scale-95",
              darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-900 hover:bg-black text-white"
            )}
          >
            {isBn ? 'সম্পন্ন' : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
