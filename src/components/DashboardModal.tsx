/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Sparkles,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

  // Activity Data States
  const [waterData, setWaterData] = useState<any>(null);
  const [sleepRecords, setSleepRecords] = useState<any[]>([]);
  const [stepRecords, setStepRecords] = useState<any[]>([]);
  const [readingRecords, setReadingRecords] = useState<any[]>([]);
  const [savedBooks, setSavedBooks] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Helper for date string
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Days in timeframe
  const timeframeDays = useMemo(() => {
    if (timeframe === 'weekly') return 7;
    if (timeframe === 'monthly') return 30;
    return 365;
  }, [timeframe]);

  // Load latest activity data from localStorage and Firestore
  useEffect(() => {
    if (!isOpen && !isInline) return;

    const loadAllActivities = async () => {
      setIsLoading(true);
      const user = auth.currentUser;

      // 1. Water Data
      try {
        let wData: any = null;
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'waterTracker'));
            if (snap.exists()) wData = snap.data();
          } catch (e) {}
        }
        if (!wData) {
          const raw = localStorage.getItem('ratbod_water_tracker_data');
          if (raw) wData = JSON.parse(raw);
        }
        setWaterData(wData || {});
      } catch (e) {}

      // 2. Sleep Records
      try {
        let sList: any[] = [];
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'sleepTracker'));
            if (snap.exists() && Array.isArray(snap.data().sleepRecords)) {
              sList = snap.data().sleepRecords;
            }
          } catch (e) {}
        }
        if (sList.length === 0) {
          const raw = localStorage.getItem('ratbod_sleep_records');
          if (raw) sList = JSON.parse(raw);
        }
        setSleepRecords(sList || []);
      } catch (e) {}

      // 3. Step Records
      try {
        let stList: any[] = [];
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'stepsTracker'));
            if (snap.exists() && Array.isArray(snap.data().records)) {
              stList = snap.data().records;
            }
          } catch (e) {}
        }
        if (stList.length === 0) {
          const raw = localStorage.getItem('ratbod_steps_records');
          if (raw) stList = JSON.parse(raw);
        }
        setStepRecords(stList || []);
      } catch (e) {}

      // 4. Reading Records & Saved Books
      try {
        let rList: any[] = [];
        let bList: any[] = [];
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'));
            if (snap.exists()) {
              const d = snap.data();
              if (Array.isArray(d.records)) rList = d.records;
              if (Array.isArray(d.books)) bList = d.books;
            }
          } catch (e) {}
        }
        if (rList.length === 0) {
          const raw = localStorage.getItem('ratbod_reading_records');
          if (raw) rList = JSON.parse(raw);
        }
        if (bList.length === 0) {
          const raw = localStorage.getItem('ratbod_user_books');
          if (raw) bList = JSON.parse(raw);
        }
        setReadingRecords(rList || []);
        setSavedBooks(bList || []);
      } catch (e) {}

      // 5. Weight History
      try {
        let wHistory: any[] = [];
        if (Array.isArray(historyList) && historyList.length > 0) {
          wHistory = historyList;
        } else {
          const raw = localStorage.getItem('ratbod_history') || localStorage.getItem('ratool_history');
          if (raw) wHistory = JSON.parse(raw);
        }
        setWeightHistory(wHistory || []);
      } catch (e) {}

      setIsLoading(false);
    };

    loadAllActivities();
  }, [isOpen, historyList]);

  // Cutoff timestamp for the timeframe
  const cutoffTime = useMemo(() => {
    const d = new Date();
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

  // ==================== 1. WEIGHT & GOAL METRICS ====================
  const weightMetrics = useMemo(() => {
    const unitLabel = unit === 'imperial' ? (isBn ? 'পাউন্ড' : 'lbs') : (isBn ? 'কেজি' : 'kg');
    const toUserWeight = (kg: number) => unit === 'imperial' ? kg * 2.20462 : kg;

    // Filter history entries within timeframe or take all sorted
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

    // Target Goal
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

    // Sparkline points (7-12 normalized points)
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

  // ==================== 2. WATER INTAKE METRICS ====================
  const waterMetrics = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const historyArr: any[] = Array.isArray(waterData?.history) ? waterData.history : [];
    
    // Combine history with today's entries
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

    // Filter within timeframe
    const filteredPoints: number[] = [];
    let totalMl = 0;
    let activeDays = 0;

    allDaysMap.forEach((consumed, dateStr) => {
      const time = new Date(dateStr).getTime();
      if (time >= cutoffTime) {
        totalMl += consumed;
        filteredPoints.push(consumed);
        if (consumed > 0) activeDays++;
      }
    });

    const daysCount = Math.max(1, Math.min(timeframeDays, filteredPoints.length || 1));
    const dailyAvgMl = Math.round(totalMl / daysCount);
    const dailyAvgGlasses = (dailyAvgMl / 250).toFixed(1);
    const totalLiters = (totalMl / 1000).toFixed(1);
    const totalGlasses = Math.round(totalMl / 250);

    const targetMl = ((waterData?.goalGlasses || 8) * (waterData?.glassVolumeMl || 250));
    const percentGoal = Math.min(100, Math.round((dailyAvgMl / (targetMl || 2000)) * 100));
    const completionRate = percentGoal;

    return {
      dailyAvgMl,
      dailyAvgGlasses,
      totalLiters,
      totalGlasses,
      percentGoal,
      completionRate,
      points: filteredPoints.length > 0 ? filteredPoints : [dailyAvgMl]
    };
  }, [waterData, cutoffTime, timeframeDays]);

  // ==================== 3. SLEEP METRICS ====================
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

    // Sleep quality status
    const isOptimal = avgMinutes >= 420 && avgMinutes <= 540; // 7-9 hours

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

  // ==================== 4. STEPS METRICS ====================
  const stepMetrics = useMemo(() => {
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

    const daysCount = Math.max(1, records.length);
    const avgSteps = Math.round(totalSteps / daysCount);
    const distanceDisplay = unit === 'imperial' 
      ? `${(totalDistanceKm * 0.621371).toFixed(1)} ${isBn ? 'মাইল' : 'mi'}`
      : `${totalDistanceKm.toFixed(1)} ${isBn ? 'কিমি' : 'km'}`;

    return {
      totalSteps,
      avgSteps,
      distanceDisplay,
      totalCalories,
      totalKm: totalDistanceKm.toFixed(1),
      points: points.length > 0 ? points : [avgSteps]
    };
  }, [stepRecords, cutoffTime, timeframeDays, unit, isBn]);

  // ==================== 5. READING METRICS & BOOKS ====================
  const readingMetrics = useMemo(() => {
    const relevant = readingRecords.filter(r => new Date(r.date).getTime() >= cutoffTime);
    const records = relevant.length > 0 ? relevant : readingRecords.slice(0, timeframeDays);

    let totalPages = 0;
    let totalMinutes = 0;
    const bookMap = new Map<string, number>(); // Title -> Pages
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

  // Sparkline Generator
  const renderSparkline = (points: number[], color: string, height = 28, width = 80) => {
    if (!points || points.length === 0) return null;
    const valid = points.filter(p => !isNaN(p));
    if (valid.length === 0) return null;

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = (max - min) || 1;

    // Generate path points
    const stepX = width / Math.max(1, valid.length - 1);
    const coords = valid.map((val, idx) => {
      const x = idx * stepX;
      // Invert Y: 0 is top, height is bottom
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return { x, y };
    });

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return (
      <div className="relative inline-flex items-center">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-16 sm:w-20 h-6 sm:h-7 overflow-visible"
        >
          <defs>
            <linearGradient id={`grad_${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#grad_${color})`} />
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
              r="2.5"
              fill={color}
              className="animate-pulse"
            />
          )}
        </svg>
      </div>
    );
  };

  const renderDashboardBody = (isInlineView: boolean) => (
    <div className={cn("space-y-2.5 sm:space-y-3", isInlineView ? "px-3 sm:px-5 py-3" : "flex-1 overflow-y-auto px-3 sm:px-5 py-3")}>
      {/* Quick At-a-Glance Strip (5 compact badges) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {/* Weight */}
        <div className={cn(
          "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all",
          darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-black/5"
        )}>
          <Scale size={12} className="text-orange-400 mb-0.5" />
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'ওজন' : 'Weight'}</span>
          <span className="text-xs sm:text-sm font-black text-orange-400">
            {weightMetrics.isLoss ? '-' : weightMetrics.isGain ? '+' : ''}{formatNum(Math.abs(weightMetrics.deltaDisplay))} {weightMetrics.unitLabel}
          </span>
        </div>

        {/* Water */}
        <div className={cn(
          "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all",
          darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-black/5"
        )}>
          <Droplets size={12} className="text-cyan-400 mb-0.5" />
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'পানি' : 'Water'}</span>
          <span className="text-xs sm:text-sm font-black text-cyan-400">
            {formatNum(waterMetrics.dailyAvgGlasses)} {isBn ? 'গ্লাস' : 'gls'}
          </span>
        </div>

        {/* Sleep */}
        <div className={cn(
          "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all",
          darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-black/5"
        )}>
          <Moon size={12} className="text-indigo-400 mb-0.5" />
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'ঘুম' : 'Sleep'}</span>
          <span className="text-xs sm:text-sm font-black text-indigo-400">
            {formatNum(sleepMetrics.avgHours)} {isBn ? 'ঘণ্টা' : 'h'}
          </span>
        </div>

        {/* Steps */}
        <div className={cn(
          "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all",
          darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-black/5"
        )}>
          <Footprints size={12} className="text-emerald-400 mb-0.5" />
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'হাঁটা' : 'Steps'}</span>
          <span className="text-xs sm:text-sm font-black text-emerald-400">
            {formatNum(stepMetrics.avgSteps >= 1000 ? Math.round(stepMetrics.avgSteps / 1000) + 'k' : stepMetrics.avgSteps)}
          </span>
        </div>

        {/* Reading */}
        <div className={cn(
          "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all",
          darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-black/5"
        )}>
          <BookOpen size={12} className="text-amber-400 mb-0.5" />
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isBn ? 'পড়া' : 'Read'}</span>
          <span className="text-xs sm:text-sm font-black text-amber-400">
            {formatNum(readingMetrics.avgPagesPerDay)} {isBn ? 'পৃষ্ঠা' : 'p'}
          </span>
        </div>
      </div>

      {/* Row 1: Weight & Water side by side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Weight Tracking Card */}
        <div className={cn(
          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between",
          darkMode ? "bg-white/[0.02] border-white/10 hover:border-white/20" : "bg-gray-50/70 border-black/5 hover:border-black/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                <Scale size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold">{isBn ? 'ওজনের পরিবর্তন' : 'Weight Progress'}</h3>
                <p className="text-[10px] text-gray-400">{isBn ? 'সর্বশেষ রেকর্ড ও লক্ষ্য' : 'Latest record & target'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('calculator') : onClose()}
              className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{isBn ? 'লগ' : 'Log'}</span>
              <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-xl sm:text-2xl font-black">{formatNum(weightMetrics.latestDisplay)}</span>
              <span className="text-xs font-bold text-gray-400 ml-1">{weightMetrics.unitLabel}</span>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1",
              weightMetrics.isLoss ? "bg-emerald-500/15 text-emerald-400" :
              weightMetrics.isGain ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/15 text-gray-400"
            )}>
              {weightMetrics.isLoss && <TrendingDown size={12} />}
              {weightMetrics.isGain && <TrendingUp size={12} />}
              {!weightMetrics.isLoss && !weightMetrics.isGain && <Minus size={12} />}
              <span>{formatNum(Math.abs(weightMetrics.deltaDisplay))} {weightMetrics.unitLabel}</span>
            </div>
          </div>

          {weightMetrics.targetDisplay ? (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 flex items-center justify-between text-[11px]">
              <span className="text-gray-400 flex items-center gap-1">
                <Target size={11} className="text-primary" />
                {isBn ? 'লক্ষ্যমাত্রা:' : 'Goal Target:'}
              </span>
              <span className="font-bold text-primary">{formatNum(weightMetrics.targetDisplay)} {weightMetrics.unitLabel}</span>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 text-[10px] text-gray-400">
              {isBn ? 'লক্ষ্য সেট করা হয়নি' : 'No target weight set yet'}
            </div>
          )}
        </div>

        {/* Water Intake Card */}
        <div className={cn(
          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between",
          darkMode ? "bg-white/[0.02] border-white/10 hover:border-white/20" : "bg-gray-50/70 border-black/5 hover:border-black/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Droplets size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold">{isBn ? 'পানি পানের অগ্রগতি' : 'Hydration Intake'}</h3>
                <p className="text-[10px] text-gray-400">{isBn ? 'দৈনিক লক্ষ্য ও পূর্ণতার হার' : 'Daily target & completion'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('logify', 'water') : onClose()}
              className="text-[10px] font-bold text-cyan-400 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{isBn ? 'লগ' : 'Log'}</span>
              <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-xl sm:text-2xl font-black text-cyan-400">{formatNum(waterMetrics.totalGlasses)}</span>
              <span className="text-xs font-bold text-gray-400 ml-1">{isBn ? 'গ্লাস (মোট)' : 'glasses total'}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg text-xs font-black bg-cyan-500/15 text-cyan-400">
              {formatNum(waterMetrics.completionRate, 0)}% {isBn ? 'লক্ষ্য পূরণ' : 'of goal'}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">{isBn ? 'দৈনিক গড়:' : 'Daily Average:'}</span>
            <span className="font-bold text-cyan-400">{formatNum(waterMetrics.dailyAvgGlasses)} {isBn ? 'গ্লাস/দিন' : 'gls/day'}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Sleep & Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Sleep Quality & Hours Card */}
        <div className={cn(
          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between",
          darkMode ? "bg-white/[0.02] border-white/10 hover:border-white/20" : "bg-gray-50/70 border-black/5 hover:border-black/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Moon size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold">{isBn ? 'ঘুম ট্র্যাকিং' : 'Sleep Tracking'}</h3>
                <p className="text-[10px] text-gray-400">{isBn ? 'গড় ঘুম ও রেকর্ডের সংখ্যা' : 'Average sleep & logs'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('logify', 'sleep') : onClose()}
              className="text-[10px] font-bold text-indigo-400 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{isBn ? 'লগ' : 'Log'}</span>
              <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-xl sm:text-2xl font-black text-indigo-400">{formatNum(sleepMetrics.avgHours)}</span>
              <span className="text-xs font-bold text-gray-400 ml-1">{isBn ? 'ঘণ্টা/রাত' : 'hrs/night'}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg text-xs font-black bg-indigo-500/15 text-indigo-400">
              {formatNum(sleepMetrics.totalLogs)} {isBn ? 'দিন রেকর্ড' : 'nights logged'}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">{isBn ? 'মোট বিশ্রামের সময়:' : 'Total Rest Time:'}</span>
            <span className="font-bold text-indigo-400">{formatNum(sleepMetrics.totalHours)} {isBn ? 'ঘণ্টা' : 'hours'}</span>
          </div>
        </div>

        {/* Steps Card */}
        <div className={cn(
          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between",
          darkMode ? "bg-white/[0.02] border-white/10 hover:border-white/20" : "bg-gray-50/70 border-black/5 hover:border-black/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Footprints size={14} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold">{isBn ? 'হাঁটার হিসাব' : 'Steps & Activity'}</h3>
                <p className="text-[10px] text-gray-400">{isBn ? 'মোট কদম ও দূরত্ব' : 'Total steps & distance'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('logify', 'steps') : onClose()}
              className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{isBn ? 'লগ' : 'Log'}</span>
              <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{formatNum(stepMetrics.totalSteps)}</span>
              <span className="text-xs font-bold text-gray-400 ml-1">{isBn ? 'কদম' : 'steps'}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-400">
              ~{formatNum(stepMetrics.totalKm)} {isBn ? 'কিমি' : 'km'}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">{isBn ? 'দৈনিক গড় কদম:' : 'Daily Average:'}</span>
            <span className="font-bold text-emerald-400">{formatNum(stepMetrics.avgSteps)} {isBn ? 'কদম/দিন' : 'steps/day'}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Reading Tracker Summary Card */}
      <div className={cn(
        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all",
        darkMode ? "bg-white/[0.02] border-white/10" : "bg-gray-50/70 border-black/5"
      )}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <BookOpen size={14} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold">{isBn ? 'বই পড়ার সারাংশ' : 'Reading Insights'}</h3>
              <p className="text-[10px] text-gray-400">{isBn ? 'মোট পৃষ্ঠা, পড়ার সময় ও সক্রিয় বই' : 'Pages, reading minutes & library'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('logify', 'reading') : onClose()}
            className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>{isBn ? 'লগ' : 'Log'}</span>
            <ArrowRight size={10} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1 text-center">
          <div className={cn("p-2 rounded-xl", darkMode ? "bg-white/5" : "bg-white shadow-xs")}>
            <span className="text-[10px] text-gray-400 block">{isBn ? 'মোট পৃষ্ঠা' : 'Pages Read'}</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{formatNum(readingMetrics.totalPages)}</span>
          </div>
          <div className={cn("p-2 rounded-xl", darkMode ? "bg-white/5" : "bg-white shadow-xs")}>
            <span className="text-[10px] text-gray-400 block">{isBn ? 'মোট সময়' : 'Minutes'}</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{formatNum(readingMetrics.totalMinutes)} {isBn ? 'মি.' : 'm'}</span>
          </div>
          <div className={cn("p-2 rounded-xl", darkMode ? "bg-white/5" : "bg-white shadow-xs")}>
            <span className="text-[10px] text-gray-400 block">{isBn ? 'পড়ার সেশন' : 'Sessions'}</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{formatNum(readingMetrics.totalSessions)}</span>
          </div>
        </div>

        {savedBooks.length > 0 ? (
          <div className="mt-2.5 pt-2 border-t border-dashed border-gray-500/20 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-gray-400 mr-1">{isBn ? 'লাইব্রেরি বই:' : 'Library books:'}</span>
            {savedBooks.slice(0, 3).map((book: any, idx: number) => (
              <div 
                key={idx}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border",
                  darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5"
                )}
              >
                <BookOpen size={10} className="text-amber-400 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[200px]">{book.title}</span>
                <span className="px-1 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[9px]">
                  {formatNum(book.pages)}{book.totalPages ? ` / ${formatNum(book.totalPages)}p` : 'p'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 italic">
            {isBn ? 'এই সময়সীমায় কোনো পড়ার তথ্য রেকর্ড করা হয়নি।' : 'No reading sessions logged for this timeframe yet.'}
          </p>
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
            : "bg-white border-black/10 text-gray-900 shadow-gray-200/50"
        )}
      >
        <div className={cn(
          "flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0",
          darkMode ? "border-white/10 bg-white/[0.02]" : "border-black/5 bg-gray-50/50"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center border",
              darkMode 
                ? "bg-primary/20 border-primary/30 text-primary" 
                : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <LayoutDashboard size={15} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                {isBn ? 'হোম ড্যাশবোর্ড' : 'Home Dashboard'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium leading-none hidden xs:block">
                {isBn ? 'সাপ্তাহিক, মাসিক ও বার্ষিক সারাংশ' : 'Weekly, monthly & yearly summary'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "flex p-0.5 rounded-xl border",
              darkMode ? "bg-black/40 border-white/10" : "bg-gray-100/80 border-black/5"
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
                        : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeDashboardInlineTimeframe"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          darkMode 
                            ? "bg-white/15 border border-white/20 shadow-xs" 
                            : "bg-white shadow-xs border border-black/5"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity"
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
          "w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl",
          darkMode 
            ? "bg-[#121212]/95 border-white/10 text-white shadow-black/80" 
            : "bg-white/95 border-black/10 text-gray-900 shadow-gray-400/40"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Title, Timeframe Pills & Close button */}
        <div className={cn(
          "flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0",
          darkMode ? "border-white/10 bg-white/[0.02]" : "border-black/5 bg-gray-50/50"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center border",
              darkMode 
                ? "bg-primary/20 border-primary/30 text-primary" 
                : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <LayoutDashboard size={15} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                {isBn ? 'অ্যাক্টিভিটি ড্যাশবোর্ড' : 'Activity Dashboard'}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium leading-none hidden xs:block">
                {isBn ? 'সাপ্তাহিক, মাসিক ও বার্ষিক সারাংশ' : 'Weekly, monthly & yearly summary'}
              </p>
            </div>
          </div>

          {/* Timeframe Selector Pill (Weekly, Monthly, Yearly) */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex p-0.5 rounded-xl border",
              darkMode ? "bg-black/40 border-white/10" : "bg-gray-100/80 border-black/5"
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
                        : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeDashboardTimeframe"
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          darkMode 
                            ? "bg-white/15 border border-white/20 shadow-xs" 
                            : "bg-white shadow-xs border border-black/5"
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
                  : "border-black/5 hover:bg-black/5 text-gray-500 hover:text-gray-800"
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
          <span className="text-[10px] sm:text-[11px] text-gray-400">
            {isBn ? 'প্রতিটি ট্র্যাকার রিয়েল-টাইমে ক্লাউডে সিঙ্ক থাকে' : 'Trackers sync in real-time to your profile'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer",
              darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-900 hover:bg-black text-white"
            )}
          >
            {isBn ? 'বন্ধ করুন' : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
