/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Plus, 
  GripVertical, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Sunset, 
  Moon,
  Sunrise,
  Sun,
  Flame, 
  Calendar, 
  Award, 
  X, 
  Clock, 
  Sparkles,
  BarChart2,
  TrendingUp,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowUpRight,
  Circle,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { syncHabitsWithTrackers } from '../utils/habitSync';
import { recordOfflineChange, clearPendingOfflineChange } from '../utils/offlineSync';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DailySalahRecord, PrayerStatus, DEFAULT_RECORD, PrayerDetail } from './SalahTracker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WaqtKey = 'maghrib' | 'isha' | 'fajr' | 'dhuhr' | 'asr';

export const WAQT_ORDER: WaqtKey[] = ['maghrib', 'isha', 'fajr', 'dhuhr', 'asr'];

export interface WaqtConfig {
  serial: number;
  key: WaqtKey;
  nameEn: string;
  nameBn: string;
  arabic: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  textColor: string;
  fardRakahs: number;
  breakdown: Array<{ labelEn: string; labelBn: string; key: string; rakahs: number }>;
}

export const WAQT_DETAILS: Record<WaqtKey, WaqtConfig> = {
  maghrib: {
    serial: 1,
    key: 'maghrib',
    nameEn: 'Maghrib',
    nameBn: 'মাগরিব',
    arabic: 'المغرب',
    icon: Sunset,
    color: '#f97316',
    badgeBg: 'bg-orange-500/15 border-orange-500/25',
    textColor: 'text-orange-500 dark:text-orange-400',
    fardRakahs: 3,
    breakdown: [
      { labelEn: '3 Fard', labelBn: '৩ রাকাত ফরজ', key: 'fard', rakahs: 3 },
      { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
      { labelEn: '2 Nafl', labelBn: '২ রাকাত নফল', key: 'nafl', rakahs: 2 },
    ],
  },
  isha: {
    serial: 2,
    key: 'isha',
    nameEn: 'Isha',
    nameBn: 'এশা',
    arabic: 'العشاء',
    icon: Moon,
    color: '#6366f1',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/25',
    textColor: 'text-indigo-500 dark:text-indigo-400',
    fardRakahs: 4,
    breakdown: [
      { labelEn: '4 Sunnah', labelBn: '৪ রাকাত পূর্ববর্তী সুন্নত', key: 'sunnahGhairMuakkadah', rakahs: 4 },
      { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 },
      { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
      { labelEn: '3 Witr Wajib', labelBn: '৩ রাকাত বিতর ওয়াজিব', key: 'witr', rakahs: 3 },
      { labelEn: '2 Nafl', labelBn: '২ রাকাত নফল', key: 'nafl', rakahs: 2 },
    ],
  },
  fajr: {
    serial: 3,
    key: 'fajr',
    nameEn: 'Fajr',
    nameBn: 'ফজর',
    arabic: 'الفجر',
    icon: Sunrise,
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/25',
    textColor: 'text-cyan-500 dark:text-cyan-400',
    fardRakahs: 2,
    breakdown: [
      { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
      { labelEn: '2 Fard', labelBn: '২ রাকাত ফরজ', key: 'fard', rakahs: 2 },
    ],
  },
  dhuhr: {
    serial: 4,
    key: 'dhuhr',
    nameEn: 'Dhuhr',
    nameBn: 'যোহর',
    arabic: 'الظهر',
    icon: Sun,
    color: '#eab308',
    badgeBg: 'bg-amber-500/15 border-amber-500/25',
    textColor: 'text-amber-500 dark:text-amber-400',
    fardRakahs: 4,
    breakdown: [
      { labelEn: '4 Sunnah Muakkadah', labelBn: '৪ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 4 },
      { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 },
      { labelEn: '2 Sunnah Ba\'diyyah', labelBn: '২ রাকাত পরবর্তী সুন্নত', key: 'nafl', rakahs: 2 },
    ],
  },
  asr: {
    serial: 5,
    key: 'asr',
    nameEn: 'Asr',
    nameBn: 'আসর',
    arabic: 'العصر',
    icon: Sun,
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/25',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    fardRakahs: 4,
    breakdown: [
      { labelEn: '4 Sunnah (Ghair Muakkadah)', labelBn: '৪ রাকাত সুন্নত (গায়রে মুয়াক্কাদাহ)', key: 'sunnahGhairMuakkadah', rakahs: 4 },
      { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 },
    ],
  },
};

export interface HabitItem {
  id: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  order?: number;
  waqt?: WaqtKey;
  createdAt?: string;
}

export interface HabitorProps {
  darkMode: boolean;
  lang: 'en' | 'bn';
  weekStartDay?: number;
  isSegmentedByWaqt?: boolean;
}

export const DEFAULT_HABIT_ORDER_MAP: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
  h7: 7,
  h8: 8,
  h9: 9,
  h10: 10,
  h11: 11,
  h12: 12,
  h13: 13,
  h14: 14,
  h15: 15,
};

export const DEFAULT_HABITS: HabitItem[] = [
  { id: 'h1', emoji: '🌅', title: 'Maghrib Prayer & Reflection', subtitle: 'At Sunset', order: 1, waqt: 'maghrib' },
  { id: 'h2', emoji: '🌙', title: 'Isha Prayer in Congregation', subtitle: 'Night Routine', order: 2, waqt: 'isha' },
  { id: 'h3', emoji: '💧', title: 'Drink Mineral Water', subtitle: 'Stay hydrated', order: 3, waqt: 'isha' },
  { id: 'h4', emoji: '📝', title: 'Evening Review & Gratitude', subtitle: 'Reflect on day', order: 4, waqt: 'isha' },
  { id: 'h5', emoji: '📖', title: 'Read a Book', subtitle: '15-20 pages', order: 5, waqt: 'isha' },
  { id: 'h6', emoji: '🛏️', title: 'Early Sleep Routine', subtitle: '', order: 6, waqt: 'isha' },
  { id: 'h7', emoji: '✨', title: 'Night Sunnah & Witr', subtitle: 'Before sleep', order: 7, waqt: 'isha' },
  { id: 'h8', emoji: '🕌', title: 'Fajr Prayer & Adhkar', subtitle: '', order: 8, waqt: 'fajr' },
  { id: 'h9', emoji: '📜', title: 'Quran Recitation & Tadabbur', subtitle: '', order: 9, waqt: 'fajr' },
  { id: 'h10', emoji: '☀️', title: 'Morning Masnoon Adhkar', subtitle: 'Protection', order: 10, waqt: 'fajr' },
  { id: 'h11', emoji: '🏃', title: 'Morning Light Exercise / Walk', subtitle: '20 mins', order: 11, waqt: 'fajr' },
  { id: 'h12', emoji: '💼', title: 'Dhuhr Prayer & Deep Work', subtitle: 'Midday focus', order: 12, waqt: 'dhuhr' },
  { id: 'h13', emoji: '🌤️', title: 'Asr Prayer in Congregation', subtitle: 'Late afternoon', order: 13, waqt: 'asr' },
  { id: 'h14', emoji: '🚶', title: 'Outdoor Walk & Active Move', subtitle: 'Fresh air', order: 14, waqt: 'asr' },
  { id: 'h15', emoji: '🫁', title: 'Breathing & Evening Calm', subtitle: 'Relax & reset', order: 15, waqt: 'asr' },
];

export function playHabitCheckSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.setValueAtTime(0.12, now);
    gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {}
}

export function getHabitWaqt(habit: HabitItem): WaqtKey {
  if (habit.waqt && (['maghrib', 'isha', 'fajr', 'dhuhr', 'asr'] as string[]).includes(habit.waqt)) {
    return habit.waqt;
  }
  const defaultWaqtMap: Record<string, WaqtKey> = {
    h1: 'maghrib',
    h2: 'isha',
    h3: 'isha',
    h4: 'isha',
    h5: 'isha',
    h6: 'isha',
    h7: 'isha',
    h8: 'fajr',
    h9: 'fajr',
    h10: 'fajr',
    h11: 'fajr',
    h12: 'dhuhr',
    h13: 'asr',
    h14: 'asr',
    h15: 'asr',
  };
  if (habit.id && defaultWaqtMap[habit.id]) {
    return defaultWaqtMap[habit.id];
  }
  const text = `${habit.title || ''} ${habit.subtitle || ''}`.toLowerCase();
  if (/maghrib|dinner|সন্ধ্যা/i.test(text)) return 'maghrib';
  if (/isha|esa|sleep|bed|night|রাত্রি|বই|hjob/i.test(text)) return 'isha';
  if (/fajr|fazr|tahajjud|quran|suhur|morning|সকাল|ফজর/i.test(text)) return 'fajr';
  if (/dhuhr|zohr|johar|deep work|noon|lunch|দুপুর/i.test(text)) return 'dhuhr';
  if (/asr|walk|exercise|breathing|বিকাল|আসর/i.test(text)) return 'asr';

  const ord = habit.order || 1;
  if (ord <= 1) return 'maghrib';
  if (ord <= 7) return 'isha';
  if (ord <= 11) return 'fajr';
  if (ord <= 12) return 'dhuhr';
  return 'asr';
}

import { getDhakaSunsetTime, getDhakaLogicalDateKey } from '../utils/sunsetDate';
export { getDhakaSunsetTime, getDhakaLogicalDateKey };


/**
 * Base Day Arrays (Sunday = 0, Monday = 1, ..., Saturday = 6)
 */
export const ALL_DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const ALL_DAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
export const ALL_DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const ALL_DAY_LETTERS_BN = ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'];
export const ALL_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const ALL_FULL_NAMES_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

/**
 * Calculates Week Number where weekStartDay (default 6 = Saturday) is the first day of the week.
 */
export function getWeekNumber(d: Date, weekStartDay: number = 6): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jan1 = new Date(target.getFullYear(), 0, 1);
  const jan1StartIndex = (jan1.getDay() - weekStartDay + 7) % 7; 
  const dayOfYear = Math.floor((target.getTime() - jan1.getTime()) / 86400000);
  return Math.floor((dayOfYear + jan1StartIndex) / 7) + 1;
}

// Backward compatibility alias
function getSaturdayWeekNumber(d: Date): number {
  return getWeekNumber(d, 6);
}

/**
 * Builds 7-day week array around the current logical date starting from weekStartDay (default 6 = Saturday)
 */
export function getWeekDaysForDate(logicalDateStr: string, weekStartDay: number = 6, todayDateKey?: string) {
  const [y, m, d] = logicalDateStr.split('-').map(Number);
  const refDate = new Date(y, m - 1, d);
  
  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = refDate.getDay();
  
  // Distance back to weekStartDay
  const diffToStart = (dayOfWeek - weekStartDay + 7) % 7;
  
  const startDate = new Date(refDate);
  startDate.setDate(refDate.getDate() - diffToStart);
  
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    
    const dayIdx = (weekStartDay + i) % 7;

    weekDays.push({
      dayName: ALL_DAY_NAMES[dayIdx],
      dayNameBn: ALL_DAY_NAMES_BN[dayIdx],
      letter: ALL_DAY_LETTERS[dayIdx],
      letterBn: ALL_DAY_LETTERS_BN[dayIdx],
      fullName: ALL_FULL_NAMES[dayIdx],
      fullNameBn: ALL_FULL_NAMES_BN[dayIdx],
      dateNum: day.getDate(),
      dateKey: key,
      isToday: key === (todayDateKey || logicalDateStr),
      fullDate: day,
      dayIndex: dayIdx
    });
  }
  
  const weekNum = getWeekNumber(refDate, weekStartDay);
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const monthNameEn = monthNamesEn[refDate.getMonth()];
  const monthNameBn = monthNamesBn[refDate.getMonth()];

  return { 
    weekDays, 
    weekNum, 
    year: refDate.getFullYear(),
    monthNameEn,
    monthNameBn
  };
}

// Backward compatibility alias
function getSaturdayToFridayWeek(logicalDateStr: string, todayDateKey?: string) {
  return getWeekDaysForDate(logicalDateStr, 6, todayDateKey);
}

interface HabitRowItemProps {
  key?: React.Key;
  habit: HabitItem;
  isCompleted: boolean;
  isMenuOpen: boolean;
  setMenuOpenHabitId: (id: string | null) => void;
  setEditingHabit: (habit: HabitItem) => void;
  setDeletingHabit: (habit: HabitItem) => void;
  setAnalyticsHabit: (habit: HabitItem) => void;
  toggleHabit: (id: string, dateKey?: string) => void;
  darkMode: boolean;
  lang: 'en' | 'bn';
  isSegmentedByWaqt?: boolean;
  currentWaqt?: WaqtKey;
  onMoveToWaqt?: (habitId: string, targetWaqt: WaqtKey) => void;
}

function HabitRowItem({
  habit,
  isCompleted,
  isMenuOpen,
  setMenuOpenHabitId,
  setEditingHabit,
  setDeletingHabit,
  setAnalyticsHabit,
  toggleHabit,
  darkMode,
  lang,
  isSegmentedByWaqt,
  currentWaqt,
  onMoveToWaqt,
}: HabitRowItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={habit.id}
      value={habit}
      id={habit.id}
      layout
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{ 
        scale: 1.025, 
        boxShadow: darkMode
          ? "0 20px 30px -10px rgba(0, 0, 0, 0.8), 0 0 0 2px #FF5A5A"
          : "0 20px 30px -10px rgba(0, 0, 0, 0.2), 0 0 0 2px #FF5A5A",
        zIndex: 50,
      }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 32
      }}
      style={{
        height: '65.4302px',
        borderRadius: '25px',
        boxSizing: 'border-box',
      }}
      className={cn(
        "group relative h-[65.4302px] max-h-[65.4302px] px-2.5 sm:px-3 py-1.5 rounded-[25px] border transition-colors flex items-center justify-between gap-3 select-none box-border",
        isCompleted
          ? (darkMode 
              ? "bg-[#0c1813] border-emerald-500/30 text-gray-300" 
              : "bg-emerald-50/80 border-emerald-200 text-gray-800")
          : (darkMode 
              ? "bg-[#111116] border-white/10 hover:border-white/20 text-white" 
              : "bg-white border-black/5 hover:border-black/10 text-gray-900 shadow-2xs")
      )}
    >
      {/* Left Grip Handle & Menu Dots */}
      <div className="flex items-center gap-0.5 shrink-0 text-gray-500 dark:text-gray-400">
        {/* Dedicated Drag Grip Button with ample touch area and HTML5 drag transfer */}
        <div 
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', habit.id);
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          className="p-2 sm:p-2.5 -my-2 -ml-1.5 rounded-xl cursor-grab active:cursor-grabbing text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-all touch-none flex items-center justify-center select-none"
          title={lang === 'bn' ? 'টেনে স্থানান্তর বা রিঅর্ডার করুন' : 'Drag handle to move or reorder'}
        >
          <GripVertical 
            size={22} 
            style={{ width: '21.9932px', height: '21.9932px' }} 
            className="w-[21.9932px] h-[21.9932px]" 
          />
        </div>
        
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenHabitId(isMenuOpen ? null : habit.id);
            }}
            style={{
              width: '24.9955px',
              height: '24.9955px',
            }}
            className="w-[24.9955px] h-[24.9955px] p-0 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MoreVertical size={15} />
          </button>

          {/* Quick Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className={cn(
                  "absolute left-0 top-7 z-30 min-w-[130px] rounded-xl border p-1 shadow-xl backdrop-blur-md",
                  darkMode ? "bg-[#181820] border-white/10 text-white" : "bg-white border-black/10 text-gray-800"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingHabit(habit);
                    setMenuOpenHabitId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer text-left"
                >
                  <Edit2 size={13} />
                  {lang === 'bn' ? 'সম্পাদনা' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingHabit(habit);
                    setMenuOpenHabitId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <Trash2 size={13} />
                  {lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                </button>

                {/* Move to another Waqt options in Waqt mode */}
                {isSegmentedByWaqt && onMoveToWaqt && (
                  <div className="pt-1 mt-1 border-t border-black/5 dark:border-white/10">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5 block">
                      {lang === 'bn' ? 'ওয়াক্তে সরান' : 'Move to Waqt'}
                    </span>
                    {WAQT_ORDER.filter(w => w !== currentWaqt).map(w => {
                      const wInfo = WAQT_DETAILS[w];
                      const WaqtIcon = wInfo.icon;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveToWaqt(habit.id, w);
                            setMenuOpenHabitId(null);
                          }}
                          className="w-full px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-left"
                        >
                          <WaqtIcon size={12} className="shrink-0 text-amber-500" />
                          <span>{lang === 'bn' ? wInfo.nameBn : wInfo.nameEn}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Middle Content: Emoji + Title + Subtitle - Click to open Analytics */}
      <div 
        onClick={() => setAnalyticsHabit(habit)}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group/title hover:opacity-90 transition-opacity"
        title={lang === 'bn' ? 'অ্যানালিটিক্স দেখতে ক্লিক করুন' : 'Click to view habit analytics'}
      >
        {habit.emoji ? (
          <span 
            style={{ fontSize: '21px' }}
            className="text-[21px] shrink-0 select-none group-hover/title:scale-110 transition-transform leading-none"
          >
            {habit.emoji}
          </span>
        ) : null}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 
              style={{ fontSize: '15px' }}
              className={cn(
                "text-[15px] font-bold tracking-tight truncate transition-all leading-snug",
                isCompleted ? "line-through opacity-80 text-[#32CD32]" : ""
              )}
            >
              {habit.title}
            </h3>
            <BarChart2 size={13} className="text-gray-500 dark:text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
          </div>
          {habit.subtitle && (
            <p 
              style={{ fontSize: '12px' }}
              className={cn(
                "text-[12px] font-medium truncate mt-0.5",
                isCompleted ? "opacity-70 text-[#32CD32]" : "text-gray-400 dark:text-gray-400"
              )}
            >
              {habit.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Big Circular Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleHabit(habit.id);
        }}
        className={cn(
          "w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0",
          isCompleted
            ? "bg-[#32CD32] border-[#32CD32] text-white shadow-xl shadow-[#32CD32]/50 scale-110 ring-4 ring-[#32CD32]/20"
            : (darkMode
                ? "border-gray-600 hover:border-gray-400 bg-white/5"
                : "border-gray-300 hover:border-gray-400 bg-gray-50")
        )}
      >
        {isCompleted && <Check size={16} strokeWidth={3} className="animate-in zoom-in-50 duration-200" />}
      </button>
    </Reorder.Item>
  );
}

export default function Habitor({ darkMode, lang, weekStartDay = 6, isSegmentedByWaqt: propIsSegmentedByWaqt }: HabitorProps) {
  const [habits, setHabits] = useState<HabitItem[]>(() => {
    const saved = localStorage.getItem('ratool_habits_v1') || localStorage.getItem('ratbod_habits_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let needsUpdate = false;
          const migratedParsed = parsed.map((h, idx) => {
            let updated = { ...h };
            if ((h.id === 'h6' || h.id === 'h8' || h.id === 'h9') && h.subtitle !== '') {
              needsUpdate = true;
              updated.subtitle = '';
            }
            if (updated.order === undefined) {
              needsUpdate = true;
              updated.order = DEFAULT_HABIT_ORDER_MAP[h.id] ?? (idx + 1);
            }
            return updated;
          });

          // Merge missing default habits if we have fewer than 15
          const existingIds = new Set(migratedParsed.map(h => h.id));
          const missingDefaults = DEFAULT_HABITS.filter(h => !existingIds.has(h.id));
          
          if (missingDefaults.length > 0 || needsUpdate) {
            const merged = [...migratedParsed, ...missingDefaults];
            localStorage.setItem('ratool_habits_v1', JSON.stringify(merged));
            localStorage.setItem('ratbod_habits_v1', JSON.stringify(merged));
            return merged;
          }
          
          return migratedParsed;
        }
      } catch (e) {}
    }
    return DEFAULT_HABITS;
  });

  // Map of dateKey -> Set/Array of completed habit IDs
  const [completedLogs, setCompletedLogs] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('ratool_habit_logs_v1') || localStorage.getItem('ratbod_habit_logs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const [dhakaInfo, setDhakaInfo] = useState(() => getDhakaLogicalDateKey());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getDhakaLogicalDateKey().dateKey);

  // Segmented by Waqt state & real-time sync with Profile settings
  const [isSegmentedByWaqt, setIsSegmentedByWaqt] = useState<boolean>(() => {
    if (propIsSegmentedByWaqt !== undefined) return propIsSegmentedByWaqt;
    try {
      const saved = localStorage.getItem('ratbod_segmented_by_waqt') || localStorage.getItem('ratool_segmented_by_waqt');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (propIsSegmentedByWaqt !== undefined) {
      setIsSegmentedByWaqt(propIsSegmentedByWaqt);
    }
  }, [propIsSegmentedByWaqt]);

  useEffect(() => {
    const handleWaqtSegmentChange = (e: any) => {
      if (e.detail?.isSegmentedByWaqt !== undefined) {
        setIsSegmentedByWaqt(Boolean(e.detail.isSegmentedByWaqt));
      }
    };
    window.addEventListener('ratbod_waqt_segment_changed', handleWaqtSegmentChange);
    window.addEventListener('ratool_waqt_segment_changed', handleWaqtSegmentChange);
    return () => {
      window.removeEventListener('ratbod_waqt_segment_changed', handleWaqtSegmentChange);
      window.removeEventListener('ratool_waqt_segment_changed', handleWaqtSegmentChange);
    };
  }, []);

  // Accordion state for 5 Waqt sections in Waqt mode (all open by default)
  const [openWaqts, setOpenWaqts] = useState<Record<WaqtKey, boolean>>({
    maghrib: true,
    isha: true,
    fajr: true,
    dhuhr: true,
    asr: true
  });

  const toggleWaqtAccordion = (wKey: WaqtKey) => {
    setOpenWaqts(prev => ({ ...prev, [wKey]: !prev[wKey] }));
  };

  // Salah Tracker sync & modal state for Waqt prayer pop-up
  const [salahRecordsMap, setSalahRecordsMap] = useState<Record<string, DailySalahRecord>>(() => {
    try {
      const raw = localStorage.getItem('ratbod_salah_records_map');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleSalahSync = () => {
      try {
        const raw = localStorage.getItem('ratbod_salah_records_map');
        if (raw) setSalahRecordsMap(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('ratbod_salah_sync', handleSalahSync);
    return () => window.removeEventListener('ratbod_salah_sync', handleSalahSync);
  }, []);

  const [selectedWaqtForSalahModal, setSelectedWaqtForSalahModal] = useState<WaqtKey | null>(null);

  const handleSavePrayerRecord = (targetWaqt: WaqtKey, updatedDetail: PrayerDetail) => {
    const current = salahRecordsMap[selectedDateKey] || DEFAULT_RECORD(selectedDateKey);
    const nextRecord: DailySalahRecord = {
      ...current,
      date: selectedDateKey,
      prayers: {
        ...current.prayers,
        [targetWaqt]: updatedDetail
      },
      updatedAt: Date.now()
    };
    
    const nextMap = { ...salahRecordsMap, [selectedDateKey]: nextRecord };
    setSalahRecordsMap(nextMap);
    try {
      localStorage.setItem('ratbod_salah_records_map', JSON.stringify(nextMap));
    } catch {}

    recordOfflineChange('salahTracker', {
      recordsMap: nextMap,
      updatedAt: Date.now()
    });

    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'salahTracker'), {
        recordsMap: nextMap,
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ratbod_salah_sync', { detail: { date: selectedDateKey, record: nextRecord } }));
    }
  };

  const handleMoveToWaqt = (habitId: string, targetWaqt: WaqtKey) => {
    const updated = habits.map(h => {
      if (h.id === habitId) {
        return { ...h, waqt: targetWaqt };
      }
      return h;
    });
    setHabits(updated);
    persistHabitsOrder(updated);
  };

  const handleReorderWaqt = (targetWaqt: WaqtKey, newOrderForWaqt: HabitItem[]) => {
    const updated = [...habits];
    newOrderForWaqt.forEach((item, idx) => {
      const foundIdx = updated.findIndex(h => h.id === item.id);
      if (foundIdx !== -1) {
        updated[foundIdx] = { ...updated[foundIdx], order: idx + 1, waqt: targetWaqt };
      }
    });
    setHabits(updated);
    persistHabitsOrder(updated);
  };

  // Keep Habitor date synchronized when sunset passes in real-time
  useEffect(() => {
    const updateSunsetDate = () => {
      const current = getDhakaLogicalDateKey();
      setDhakaInfo(current);
      const prevLogical = getDhakaLogicalDateKey(new Date(Date.now() - 30000)).dateKey;
      setSelectedDateKey((prev) => {
        if (!prev || prev === prevLogical) {
          return current.dateKey;
        }
        return prev;
      });
    };

    const interval = setInterval(updateSunsetDate, 15000);
    window.addEventListener('focus', updateSunsetDate);
    document.addEventListener('visibilitychange', updateSunsetDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateSunsetDate);
      document.removeEventListener('visibilitychange', updateSunsetDate);
    };
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  const persistHabitsOrder = (newHabits: HabitItem[]) => {
    try {
      localStorage.setItem('ratool_habits_v1', JSON.stringify(newHabits));
      localStorage.setItem('ratbod_habits_v1', JSON.stringify(newHabits));
    } catch (e) {}

    recordOfflineChange('habits', { habits: newHabits, updatedAt: Date.now() });

    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'habits'), { 
        habits: newHabits, 
        updatedAt: Date.now() 
      }, { merge: true })
      .then(() => clearPendingOfflineChange('habits'))
      .catch(err => {
        console.warn("Reordered habits stored offline, queued for sync:", err);
      });
    }
  };

  // Initial load and real-time auth sync with Firestore across all devices
  useEffect(() => {
    let unsubHabits: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;

    const setupHabitsSync = (user = auth.currentUser) => {
      // 1. Initial local cache
      try {
        const localHabits = localStorage.getItem('ratbod_habits_v1') || localStorage.getItem('ratool_habits_v1');
        if (localHabits) {
          const parsed = JSON.parse(localHabits);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((h: any, idx: number) => ({
              ...h,
              order: h.order !== undefined ? h.order : (DEFAULT_HABIT_ORDER_MAP[h.id] ?? (idx + 1))
            }));
            setHabits(normalized);
          }
        }
        const localLogs = localStorage.getItem('ratbod_habit_logs_v1') || localStorage.getItem('ratool_habit_logs_v1');
        if (localLogs) {
          const parsed = JSON.parse(localLogs);
          if (parsed && typeof parsed === 'object') setCompletedLogs(parsed);
        }
      } catch (e) {}

      if (unsubHabits) { unsubHabits(); unsubHabits = null; }
      if (unsubLogs) { unsubLogs(); unsubLogs = null; }

      if (user) {
        try {
          const habitsDocRef = doc(db, 'users', user.uid, 'appData', 'habits');
          unsubHabits = onSnapshot(habitsDocRef, (docSnap) => {
            if (docSnap.exists() && Array.isArray(docSnap.data().habits) && docSnap.data().habits.length > 0) {
              const liveHabits = docSnap.data().habits.map((h: any, idx: number) => ({
                ...h,
                order: h.order !== undefined ? h.order : (DEFAULT_HABIT_ORDER_MAP[h.id] ?? (idx + 1))
              }));
              setHabits(liveHabits);
              try {
                localStorage.setItem('ratool_habits_v1', JSON.stringify(liveHabits));
                localStorage.setItem('ratbod_habits_v1', JSON.stringify(liveHabits));
              } catch {}
            } else if (!docSnap.exists()) {
              // Only on first setup save initial habits
              setDoc(habitsDocRef, { habits, updatedAt: Date.now() }, { merge: true }).catch(() => {});
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}/appData/habits`);
          });

          const logsDocRef = doc(db, 'users', user.uid, 'appData', 'habitLogs');
          unsubLogs = onSnapshot(logsDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().completedLogs) {
              const liveLogs = docSnap.data().completedLogs;
              // Accept remote snapshot without resurrecting unticked habits
              setCompletedLogs(liveLogs);
              try {
                localStorage.setItem('ratool_habit_logs_v1', JSON.stringify(liveLogs));
                localStorage.setItem('ratbod_habit_logs_v1', JSON.stringify(liveLogs));
              } catch {}
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}/appData/habitLogs`);
          });
        } catch (e) {
          console.error("Failed to attach habit real-time sync:", e);
        }
      }
      setIsLoaded(true);
    };

    setupHabitsSync();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setupHabitsSync(u || undefined);
    });

    return () => {
      if (unsubHabits) unsubHabits();
      if (unsubLogs) unsubLogs();
      unsubAuth();
    };
  }, []);

  // Real-time listener for tracker auto-sync events (Water & Reading goals)
  useEffect(() => {
    const handleAutoSync = (e: any) => {
      if (e?.detail?.completedLogs) {
        setCompletedLogs(e.detail.completedLogs);
      } else {
        const { updatedLogs, changed } = syncHabitsWithTrackers();
        if (changed) setCompletedLogs(updatedLogs);
      }
    };
    const handleHabitsSync = (e: any) => {
      if (e?.detail?.habits) {
        setHabits(e.detail.habits);
      }
      if (e?.detail?.completedLogs) {
        setCompletedLogs(e.detail.completedLogs);
      }
    };
    window.addEventListener('ratbod_habit_logs_updated', handleAutoSync);
    window.addEventListener('ratbod_habits_sync', handleHabitsSync);
    window.addEventListener('storage', handleAutoSync);
    return () => {
      window.removeEventListener('ratbod_habit_logs_updated', handleAutoSync);
      window.removeEventListener('ratbod_habits_sync', handleHabitsSync);
      window.removeEventListener('storage', handleAutoSync);
    };
  }, []);

  // Check and auto-tick habits if water goal or reading sessions were logged
  useEffect(() => {
    if (isLoaded) {
      const { updatedLogs, changed } = syncHabitsWithTrackers(completedLogs);
      if (changed) {
        setCompletedLogs(updatedLogs);
      }
    }
  }, [isLoaded, selectedDateKey]);

  // Date currently shown in the week view (initially matches selectedDateKey)
  const [displayedDateKey, setDisplayedDateKey] = useState<string>(() => dhakaInfo.dateKey);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  // Week Days based on weekStartDay (default Saturday)
  const { weekDays, weekNum } = useMemo(
    () => getWeekDaysForDate(displayedDateKey, weekStartDay, dhakaInfo.dateKey), 
    [displayedDateKey, dhakaInfo.dateKey, weekStartDay]
  );

  const handleNavigateWeek = (step: number) => {
    // step: -1 for previous week, +1 for upcoming week
    setSlideDirection(step);

    const [y, m, d] = displayedDateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (step * 7));

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const newDisplayedKey = `${yyyy}-${mm}-${dd}`;
    setDisplayedDateKey(newDisplayedKey);

    // Also shift selectedDateKey by step * 7 days to preserve the weekday selection in the new week
    const [sy, sm, sd] = selectedDateKey.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    sDate.setDate(sDate.getDate() + (step * 7));
    const sYyyy = sDate.getFullYear();
    const sMm = String(sDate.getMonth() + 1).padStart(2, '0');
    const sDd = String(sDate.getDate()).padStart(2, '0');
    setSelectedDateKey(`${sYyyy}-${sMm}-${sDd}`);
  };

  const wasSwiping = React.useRef(false);
  const handleDaySelect = (dateKey: string) => {
    if (wasSwiping.current) return;
    setSelectedDateKey(dateKey);
    setDisplayedDateKey(dateKey);
  };

  // Touch and drag swipe handlers
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    wasSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) {
      wasSwiping.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      wasSwiping.current = true;
      if (deltaX > 0) {
        handleNavigateWeek(-1);
      } else {
        handleNavigateWeek(1);
      }
      setTimeout(() => {
        wasSwiping.current = false;
      }, 150);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const mouseStartX = React.useRef<number | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseStartX.current = e.clientX;
    wasSwiping.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current !== null && Math.abs(e.clientX - mouseStartX.current) > 15) {
      wasSwiping.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;
    if (Math.abs(deltaX) > 40) {
      wasSwiping.current = true;
      if (deltaX > 0) {
        handleNavigateWeek(-1);
      } else {
        handleNavigateWeek(1);
      }
      setTimeout(() => {
        wasSwiping.current = false;
      }, 150);
    }
    mouseStartX.current = null;
  };

  const lastWheelTime = React.useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 35) {
      const now = Date.now();
      if (now - lastWheelTime.current > 380) {
        lastWheelTime.current = now;
        if (e.deltaX > 0) {
          handleNavigateWeek(1);
        } else {
          handleNavigateWeek(-1);
        }
      }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.18 },
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 28 },
        opacity: { duration: 0.15 },
      },
    }),
  };

  const weekKey = weekDays.length > 0 ? `${weekDays[0].dateKey}_w${weekNum}` : displayedDateKey;

  // Modal for adding habit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  // Modal: Edit Habit
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [menuOpenHabitId, setMenuOpenHabitId] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitItem | null>(null);

  // Modal for detailed analytics
  const [analyticsHabit, setAnalyticsHabit] = useState<HabitItem | null>(null);
  const [analyticsViewTab, setAnalyticsViewTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const analyticsData = useMemo(() => {
    if (!analyticsHabit) return null;
    const habitId = analyticsHabit.id;
    
    // Find all dateKeys where this habit was completed
    const completedDates = Object.keys(completedLogs).filter(k => (completedLogs[k] || []).includes(habitId)).sort();
    const datesSet = new Set(completedDates);
    const totalCompletions = completedDates.length;

    // Calculate current streak & best streak
    let currentStreak = 0;
    let bestStreak = 0;
    
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    let checkDate = new Date(y, m - 1, d);
    
    let k = selectedDateKey;
    if (!datesSet.has(k)) {
      const yest = new Date(checkDate);
      yest.setDate(yest.getDate() - 1);
      const yestKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      if (datesSet.has(yestKey)) {
        checkDate = yest;
      }
    }

    while (true) {
      const yyyy = checkDate.getFullYear();
      const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      if (datesSet.has(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    let tempStreak = 0;
    let prevDate: Date | null = null;
    completedDates.forEach(dStr => {
      const p = dStr.split('-').map(Number);
      const curDate = new Date(p[0], p[1] - 1, p[2]);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffMs = curDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > bestStreak) bestStreak = tempStreak;
      prevDate = curDate;
    });

    // Monthly view weeks & days with Saturday as start of week
    const refDate = new Date(y, m - 1, d);
    const curYear = refDate.getFullYear();
    const curMonth = refDate.getMonth();
    const daysInMonthCount = new Date(curYear, curMonth + 1, 0).getDate();
    
    const monthlyDays = [];
    for (let dayNum = 1; dayNum <= daysInMonthCount; dayNum++) {
      const dateKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      monthlyDays.push({
        dayNum,
        dateKey,
        isCompleted: datesSet.has(dateKey)
      });
    }

    // Build week rows for the entire month based on weekStartDay
    const firstDayOfMonth = new Date(curYear, curMonth, 1);
    const lastDayOfMonth = new Date(curYear, curMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 6=Sat
    const diffToStart = (firstDayOfWeek - weekStartDay + 7) % 7;
    
    let currentWeekStart = new Date(curYear, curMonth, 1 - diffToStart);
    const monthlyWeeks = [];

    while (currentWeekStart <= lastDayOfMonth || (currentWeekStart.getMonth() === curMonth && currentWeekStart.getDate() <= daysInMonthCount)) {
      const weekNum = getWeekNumber(currentWeekStart, weekStartDay);
      const daysInWeek = [];

      for (let i = 0; i < 7; i++) {
        const curDate = new Date(currentWeekStart);
        curDate.setDate(currentWeekStart.getDate() + i);

        const isCurrentMonth = curDate.getMonth() === curMonth;
        const yyyy = curDate.getFullYear();
        const mm = String(curDate.getMonth() + 1).padStart(2, '0');
        const dd = String(curDate.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const dayIdx = (weekStartDay + i) % 7;

        daysInWeek.push({
          dayNum: curDate.getDate(),
          dateKey,
          isCurrentMonth,
          isCompleted: datesSet.has(dateKey),
          isSaturdayOrFriday: dayIdx === 5 || dayIdx === 6 // Weekend off days
        });
      }

      monthlyWeeks.push({
        weekNum,
        days: daysInWeek
      });

      // Advance to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      if (currentWeekStart.getFullYear() > curYear || (currentWeekStart.getMonth() > curMonth && currentWeekStart.getDate() > 7)) {
        break;
      }
    }

    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসেম্বর'];
    
    const yearlyBreakdown = monthNamesEn.map((mEn, idx) => {
      const daysCount = new Date(curYear, idx + 1, 0).getDate();
      let monthCompletedCount = 0;
      for (let day = 1; day <= daysCount; day++) {
        const key = `${curYear}-${String(idx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (datesSet.has(key)) monthCompletedCount++;
      }
      return {
        monthName: lang === 'bn' ? monthNamesBn[idx] : mEn,
        completions: monthCompletedCount,
        totalDays: daysCount,
        percent: Math.round((monthCompletedCount / daysCount) * 100)
      };
    });

    return {
      totalCompletions,
      currentStreak,
      bestStreak,
      monthlyDays,
      monthlyWeeks,
      yearlyBreakdown,
      curYear,
      curMonthName: refDate.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })
    };
  }, [analyticsHabit, completedLogs, selectedDateKey, lang, weekStartDay]);

  // Stable base habits in their canonical/user-defined order
  const baseHabits = useMemo(() => {
    return [...habits].sort((a, b) => {
      const orderA = a.order ?? DEFAULT_HABIT_ORDER_MAP[a.id] ?? 999;
      const orderB = b.order ?? DEFAULT_HABIT_ORDER_MAP[b.id] ?? 999;
      return orderA - orderB;
    });
  }, [habits]);

  // Active completed array for selected date
  const completedTodaySet = useMemo(() => {
    return new Set(completedLogs[selectedDateKey] || []);
  }, [completedLogs, selectedDateKey]);

  // Completed or ticked habits placed on top according to their position one after one.
  // Incomplete/unticked habits remain below in their original positions.
  // When an unticked habit is unticked, it repositions right back to its original slot!
  // In Waqt mode: completed habits do NOT move to top, they maintain position and are marked ticked.
  const orderedHabits = useMemo(() => {
    if (isSegmentedByWaqt) {
      return baseHabits;
    }
    const completed: HabitItem[] = [];
    const incomplete: HabitItem[] = [];
    for (const habit of baseHabits) {
      if (completedTodaySet.has(habit.id)) {
        completed.push(habit);
      } else {
        incomplete.push(habit);
      }
    }
    return [...completed, ...incomplete];
  }, [baseHabits, completedTodaySet, isSegmentedByWaqt]);

  // Grouped habits by the 5 Waqt Salah (Maghrib, Isha, Fajr, Dhuhr, Asr)
  const waqtGroupedHabits = useMemo(() => {
    const grouped: Record<WaqtKey, HabitItem[]> = {
      maghrib: [],
      isha: [],
      fajr: [],
      dhuhr: [],
      asr: []
    };
    baseHabits.forEach(habit => {
      const waqt = getHabitWaqt(habit);
      grouped[waqt].push(habit);
    });
    return grouped;
  }, [baseHabits]);

  // Real-time reorder handler: preserves exact custom positions across devices
  const handleReorder = (newVisualOrder: HabitItem[]) => {
    // If no habits are completed, visual order is exactly the base habits order
    if (completedTodaySet.size === 0) {
      const updated = newVisualOrder.map((h, idx) => ({ ...h, order: idx + 1 }));
      setHabits(updated);
      persistHabitsOrder(updated);
      return;
    }

    // When habits are completed (placed at the top), we preserve their original base slots:
    const completedItems = newVisualOrder.filter(h => completedTodaySet.has(h.id));
    const incompleteItems = newVisualOrder.filter(h => !completedTodaySet.has(h.id));

    let compIdx = 0;
    let incompIdx = 0;
    const reconstructed: HabitItem[] = baseHabits.map((h, i) => {
      let item: HabitItem;
      if (completedTodaySet.has(h.id)) {
        item = completedItems[compIdx++] || h;
      } else {
        item = incompleteItems[incompIdx++] || h;
      }
      return { ...item, order: i + 1 };
    });

    setHabits(reconstructed);
    persistHabitsOrder(reconstructed);
  };

  const toggleHabit = (id: string, dateKey?: string) => {
    const targetDateKey = dateKey || selectedDateKey;
    setCompletedLogs(prev => {
      const currentList = prev[targetDateKey] || [];
      let updatedList: string[];
      if (currentList.includes(id)) {
        // UNTICK: remove from completed list
        updatedList = currentList.filter(item => item !== id);
        // Record manual untick in localStorage so auto-sync never re-ticks it
        try {
          const raw = localStorage.getItem('ratbod_habit_manual_unticked');
          const manualUnticked: Record<string, string[]> = raw ? JSON.parse(raw) : {};
          const currentUnticked = manualUnticked[targetDateKey] || [];
          if (!currentUnticked.includes(id)) {
            manualUnticked[targetDateKey] = [...currentUnticked, id];
            localStorage.setItem('ratbod_habit_manual_unticked', JSON.stringify(manualUnticked));
          }
        } catch (e) {}
      } else {
        // TICK: add to completed list
        updatedList = [...currentList, id];
        playHabitCheckSound();
        // Clear from manual unticked
        try {
          const raw = localStorage.getItem('ratbod_habit_manual_unticked');
          if (raw) {
            const manualUnticked: Record<string, string[]> = JSON.parse(raw);
            if (manualUnticked[targetDateKey]) {
              manualUnticked[targetDateKey] = manualUnticked[targetDateKey].filter(item => item !== id);
              localStorage.setItem('ratbod_habit_manual_unticked', JSON.stringify(manualUnticked));
            }
          }
        } catch (e) {}
      }
      const nextLogs = {
        ...prev,
        [targetDateKey]: updatedList
      };

      try {
        localStorage.setItem('ratool_habit_logs_v1', JSON.stringify(nextLogs));
        localStorage.setItem('ratbod_habit_logs_v1', JSON.stringify(nextLogs));
      } catch (e) {}

      // Track in offline sync manager
      recordOfflineChange('habitLogs', { completedLogs: nextLogs, updatedAt: Date.now() });

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'), {
          completedLogs: nextLogs,
          updatedAt: Date.now()
        }, { merge: true })
        .then(() => clearPendingOfflineChange('habitLogs'))
        .catch(err => {
          console.warn("Habit toggle saved offline, queued for online sync:", err);
        });
      }

      window.dispatchEvent(new CustomEvent('ratbod_habit_logs_updated', { detail: { completedLogs: nextLogs } }));

      return nextLogs;
    });
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const maxOrder = habits.reduce((max, h) => Math.max(max, h.order ?? DEFAULT_HABIT_ORDER_MAP[h.id] ?? 0), 0);
      const newItem: HabitItem = {
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || undefined,
        emoji: newEmoji.trim() || undefined,
        createdAt: new Date().toISOString(),
        order: maxOrder + 1,
      };

      const updatedHabits = [...habits, newItem];
      setHabits(updatedHabits);
      localStorage.setItem('ratool_habits_v1', JSON.stringify(updatedHabits));
      localStorage.setItem('ratbod_habits_v1', JSON.stringify(updatedHabits));

      recordOfflineChange('habits', { habits: updatedHabits, updatedAt: Date.now() });

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habits'), { habits: updatedHabits }, { merge: true })
          .then(() => clearPendingOfflineChange('habits'))
          .catch(err => {
            console.warn("Habit saved offline, queued for sync:", err);
          });
      }

      setNewTitle('');
      setNewSubtitle('');
      setNewEmoji('');
      setIsAddModalOpen(false);
      window.dispatchEvent(new CustomEvent('ratool_saved_toast'));
      window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
    } catch (err) {
      console.error("Error creating new habit:", err);
    }
  };

  const handleUpdateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editingHabit.title.trim()) return;

    try {
      const updatedHabits = habits.map(h => h.id === editingHabit.id ? {
        ...editingHabit,
        title: editingHabit.title.trim(),
        subtitle: editingHabit.subtitle?.trim() || undefined,
        emoji: editingHabit.emoji?.trim() || undefined,
      } : h);
      setHabits(updatedHabits);
      localStorage.setItem('ratool_habits_v1', JSON.stringify(updatedHabits));
      localStorage.setItem('ratbod_habits_v1', JSON.stringify(updatedHabits));

      recordOfflineChange('habits', { habits: updatedHabits, updatedAt: Date.now() });

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habits'), { habits: updatedHabits }, { merge: true })
          .then(() => clearPendingOfflineChange('habits'))
          .catch(err => {
            console.warn("Habit update saved offline, queued for sync:", err);
          });
      }

      setEditingHabit(null);
      window.dispatchEvent(new CustomEvent('ratool_saved_toast'));
      window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
    } catch (err) {
      console.error("Error updating habit:", err);
    }
  };

  const handleDeleteHabit = (id: string) => {
    try {
      const updatedHabits = habits.filter(h => h.id !== id);
      setHabits(updatedHabits);
      localStorage.setItem('ratool_habits_v1', JSON.stringify(updatedHabits));
      localStorage.setItem('ratbod_habits_v1', JSON.stringify(updatedHabits));

      recordOfflineChange('habits', { habits: updatedHabits, updatedAt: Date.now() });

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habits'), { habits: updatedHabits }, { merge: true })
          .then(() => clearPendingOfflineChange('habits'))
          .catch(err => {
            console.warn("Habit delete saved offline, queued for sync:", err);
          });
      }

      setDeletingHabit(null);
      setMenuOpenHabitId(null);
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  };

  const completedCount = completedTodaySet.size;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-2.5 max-w-2xl mx-auto pb-0 sm:pb-10">
      {/* Top Current Week View & Sunset Card */}
      <div 
        style={{
          height: '100.405px',
          marginBottom: '8px',
          paddingTop: '8px',
          marginTop: '0px',
          boxSizing: 'border-box',
        }}
        className={cn(
          "px-2 sm:px-2.5 pb-2 sm:pb-2.5 pt-2 rounded-2xl border transition-all h-[100.405px] max-h-[100.405px] mb-2 mt-0 flex flex-col justify-between overflow-hidden box-border",
          darkMode ? "bg-[#111116] border-white/10" : "bg-white border-black/5 shadow-xs"
        )}
      >
        {/* Header: Week number on left with subtle step buttons, Sunset info on right */}
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleNavigateWeek(-1)}
              className="p-1 -ml-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer select-none active:scale-95"
              title={lang === 'bn' ? 'পূর্ববর্তী সপ্তাহ' : 'Previous week'}
              aria-label="Previous week"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1 select-none">
              <Calendar size={14} className="text-rose-500 shrink-0" />
              {lang === 'bn' ? `সপ্তাহ ${weekNum}` : `Week ${weekNum}`}
            </span>
            <button
              type="button"
              onClick={() => handleNavigateWeek(1)}
              className="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer select-none active:scale-95"
              title={lang === 'bn' ? 'পরবর্তী সপ্তাহ' : 'Next week'}
              aria-label="Next week"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <span 
            style={{ fontSize: '12px' }}
            className={cn(
              "text-[12px] font-bold flex items-center gap-1.5 select-none transition-colors",
              darkMode ? "text-white" : "text-amber-800"
            )}
          >
            <Sunset size={14} className={cn("shrink-0", darkMode ? "text-amber-400" : "text-amber-600")} />
            {lang === 'bn' ? `সূর্যাস্ত: ${dhakaInfo.sunsetStr}` : `Sunset: ${dhakaInfo.sunsetStr}`}
          </span>
        </div>

        {/* 7 Days Grid: Continuous week by week slide with touch, drag, wheel */}
        <div 
          className="relative overflow-hidden touch-pan-y select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            <motion.div
              key={weekKey}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                height: '55.9955px',
              }}
              className="grid grid-cols-7 gap-1 sm:gap-1.5 items-center w-full h-[55.9955px]"
            >
              {weekDays.map((d) => {
                const isSelected = d.dateKey === selectedDateKey;
                const isToday = d.isToday;
                const dayLabel = lang === 'bn' ? (d.dayNameBn || d.dayName) : d.dayName;

                if (isSelected) {
                  return (
                    <button
                      key={d.dateKey}
                      type="button"
                      onClick={() => handleDaySelect(d.dateKey)}
                      title={`${lang === 'bn' ? d.fullNameBn : d.fullName}, ${d.dateNum}`}
                      style={{
                        borderRadius: '17px',
                        backgroundColor: '#009427',
                      }}
                      className="flex flex-col items-center justify-between w-full h-[52px] sm:h-[55px] py-1 px-0.5 rounded-[17px] bg-[#009427] text-white shadow-md shadow-emerald-900/30 ring-2 ring-white/80 cursor-pointer select-none transition-all active:scale-95"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight leading-none text-white pt-0.5">
                        {dayLabel}
                      </span>
                      <div 
                        style={{
                          paddingBottom: '0px',
                          marginBottom: '3px',
                        }}
                        className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center shadow-xs pb-0 mb-[3px]"
                      >
                        <span className="text-xs sm:text-sm font-black text-gray-900 leading-none">
                          {d.dateNum}
                        </span>
                      </div>
                    </button>
                  );
                }

                if (isToday) {
                  return (
                    <button
                      key={d.dateKey}
                      type="button"
                      onClick={() => handleDaySelect(d.dateKey)}
                      title={`${lang === 'bn' ? d.fullNameBn : d.fullName}, ${d.dateNum} (${lang === 'bn' ? 'আজ' : 'Today'})`}
                      style={{
                        borderRadius: '17px',
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-[52px] sm:h-[55px] py-1 px-0.5 rounded-[17px] transition-all cursor-pointer select-none active:scale-95",
                        darkMode 
                          ? "bg-emerald-600/30 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-600/40" 
                          : "bg-emerald-100/90 border border-emerald-400 text-emerald-800 hover:bg-emerald-200"
                      )}
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold tracking-tight uppercase leading-none opacity-90">
                        {dayLabel}
                      </span>
                      <span className="text-base sm:text-lg font-black tracking-tighter mt-0.5 leading-none">
                        {d.dateNum}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => handleDaySelect(d.dateKey)}
                    title={`${lang === 'bn' ? d.fullNameBn : d.fullName}, ${d.dateNum}`}
                    style={{
                      borderRadius: '17px',
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-[52px] sm:h-[55px] py-1 px-0.5 rounded-[17px] transition-all cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/10 active:scale-95",
                      darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-tight uppercase opacity-70 leading-none">
                      {dayLabel}
                    </span>
                    <span className="text-base sm:text-lg font-black tracking-tighter mt-0.5 leading-none">
                      {d.dateNum}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Counter & Bar Header (Matching Screenshot with reduced margins) */}
      <div 
        style={{
          marginBottom: '15px',
          marginTop: '0px',
          paddingTop: '7px',
          paddingBottom: '7px',
        }}
        className={cn(
          "px-2.5 sm:px-3 py-[7px] mb-[15px] mt-0 rounded-2xl border space-y-1.5 transition-all",
          darkMode ? "bg-[#111116] border-white/10" : "bg-white border-black/5 shadow-xs"
        )}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[10px]">Progress</span>
          <span className="text-rose-500 dark:text-rose-400 font-extrabold text-xs">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Slim Progress Track */}
        <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Habit Items List: Segmented by 5 Waqt Salah or Standard Single Reorder List */}
      {isSegmentedByWaqt ? (
        <div className="space-y-3.5">
          {WAQT_ORDER.map((waqtKey) => {
            const waqtInfo = WAQT_DETAILS[waqtKey];
            const WaqtIcon = waqtInfo.icon;
            const waqtHabits = waqtGroupedHabits[waqtKey] || [];
            const completedInWaqt = waqtHabits.filter(h => completedTodaySet.has(h.id)).length;
            const isOpen = openWaqts[waqtKey];

            // Prayer status for this waqt on selected date
            const prayerDetail = (salahRecordsMap[selectedDateKey] || DEFAULT_RECORD(selectedDateKey)).prayers?.[waqtKey];
            const prayerStatus = prayerDetail?.status || 'not_prayed';

            return (
              <div 
                key={waqtKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const habitId = e.dataTransfer.getData('text/plain');
                  if (habitId) {
                    handleMoveToWaqt(habitId, waqtKey);
                  }
                }}
                className={cn(
                  "rounded-2xl border transition-all overflow-hidden",
                  darkMode 
                    ? "bg-[#141418]/90 border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]" 
                    : "bg-white border-black/[0.07] shadow-xs"
                )}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleWaqtAccordion(waqtKey)}
                  className={cn(
                    "p-3 sm:p-3.5 flex items-center justify-between gap-2.5 cursor-pointer select-none transition-colors",
                    darkMode ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"
                  )}
                >
                  {/* Left: Waqt Icon + Name + Arabic + Progress Badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      style={{ backgroundColor: `${waqtInfo.color}20`, borderColor: `${waqtInfo.color}35` }}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-xs"
                    >
                      <WaqtIcon size={16} style={{ color: waqtInfo.color }} />
                    </div>

                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={cn(
                        "font-black text-sm tracking-tight truncate",
                        darkMode ? "text-white" : "text-gray-900"
                      )}>
                        {lang === 'bn' ? waqtInfo.nameBn : waqtInfo.nameEn}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 hidden xs:inline">
                        {waqtInfo.arabic}
                      </span>
                    </div>

                    {/* Progress Count Badge */}
                    <span className={cn(
                      "text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      completedInWaqt === waqtHabits.length && waqtHabits.length > 0
                        ? (darkMode ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")
                        : (darkMode ? "bg-white/5 border-white/10 text-neutral-400" : "bg-gray-100 border-gray-200 text-gray-600")
                    )}>
                      {completedInWaqt}/{waqtHabits.length} {lang === 'bn' ? 'সম্পন্ন' : 'done'}
                    </span>

                    {/* Prayer Status Badge */}
                    {prayerStatus !== 'not_prayed' && (
                      <span className={cn(
                        "text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shrink-0 hidden sm:inline-flex items-center gap-1",
                        prayerStatus === 'prayed_jamaat'
                          ? (darkMode ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-teal-50 border-teal-200 text-teal-800")
                          : prayerStatus === 'prayed_on_time'
                          ? (darkMode ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800")
                          : (darkMode ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")
                      )}>
                        {prayerStatus === 'prayed_jamaat' 
                          ? (lang === 'bn' ? '✓ জামাত' : '✓ Jamaat')
                          : prayerStatus === 'prayed_on_time'
                          ? (lang === 'bn' ? '✓ ওয়াক্তে' : '✓ Prayed')
                          : (lang === 'bn' ? 'কাজা' : 'Qaza')}
                      </span>
                    )}
                  </div>

                  {/* Right: Arrow Button (Opens Salah options pop up) + Chevron Accordion Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWaqtForSalahModal(waqtKey);
                      }}
                      className={cn(
                        "h-7 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                        prayerStatus !== 'not_prayed'
                          ? (darkMode ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100")
                          : (darkMode ? "bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-100")
                      )}
                      title={lang === 'bn' ? `${waqtInfo.nameBn} সালাত রেকর্ড করুন` : `Log ${waqtInfo.nameEn} Salah`}
                    >
                      <span className="hidden xs:inline">
                        {lang === 'bn' ? 'সালাত' : 'Salah'}
                      </span>
                      <ArrowUpRight size={13} className="stroke-[2.5]" />
                    </button>

                    <button
                      type="button"
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-neutral-400 hover:text-neutral-200",
                        darkMode ? "hover:bg-white/5" : "hover:bg-black/5"
                      )}
                      aria-label={isOpen ? "Collapse segment" : "Expand segment"}
                    >
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 sm:p-2.5 pt-0 space-y-2">
                        <Reorder.Group
                          axis="y"
                          values={waqtHabits}
                          onReorder={(newOrder) => handleReorderWaqt(waqtKey, newOrder)}
                          className="space-y-2 list-none p-0 m-0"
                        >
                          <AnimatePresence initial={false}>
                            {waqtHabits.map((habit) => (
                              <HabitRowItem
                                key={habit.id}
                                habit={habit}
                                isCompleted={completedTodaySet.has(habit.id)}
                                isMenuOpen={menuOpenHabitId === habit.id}
                                setMenuOpenHabitId={setMenuOpenHabitId}
                                setEditingHabit={setEditingHabit}
                                setDeletingHabit={setDeletingHabit}
                                setAnalyticsHabit={setAnalyticsHabit}
                                toggleHabit={toggleHabit}
                                darkMode={darkMode}
                                lang={lang}
                                isSegmentedByWaqt={true}
                                currentWaqt={waqtKey}
                                onMoveToWaqt={handleMoveToWaqt}
                              />
                            ))}
                          </AnimatePresence>
                        </Reorder.Group>

                        {waqtHabits.length === 0 && (
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const habitId = e.dataTransfer.getData('text/plain');
                              if (habitId) {
                                handleMoveToWaqt(habitId, waqtKey);
                              }
                            }}
                            className={cn(
                              "text-center py-5 px-3 rounded-xl border border-dashed text-xs transition-colors",
                              darkMode ? "border-white/10 text-neutral-500 bg-white/[0.01]" : "border-gray-200 text-gray-400 bg-gray-50/50"
                            )}
                          >
                            <span>
                              {lang === 'bn' 
                                ? `${waqtInfo.nameBn}-এ কোনো হ্যাবিট নেই (এখানে টেনে আনুন বা ৩-ডট মেনু ব্যবহার করুন)` 
                                : `No habits in ${waqtInfo.nameEn} (Drag here or use 3-dots to move)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        /* Unsegmented single list mode (as before) */
        <div className="space-y-2">
          <Reorder.Group
            axis="y"
            values={orderedHabits}
            onReorder={handleReorder}
            className="space-y-2 list-none p-0 m-0"
          >
            <AnimatePresence initial={false}>
              {orderedHabits.map((habit) => (
                <HabitRowItem
                  key={habit.id}
                  habit={habit}
                  isCompleted={completedTodaySet.has(habit.id)}
                  isMenuOpen={menuOpenHabitId === habit.id}
                  setMenuOpenHabitId={setMenuOpenHabitId}
                  setEditingHabit={setEditingHabit}
                  setDeletingHabit={setDeletingHabit}
                  setAnalyticsHabit={setAnalyticsHabit}
                  toggleHabit={toggleHabit}
                  darkMode={darkMode}
                  lang={lang}
                  isSegmentedByWaqt={false}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {habits.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-700/50">
              <p className="text-xs text-gray-500 font-medium">
                {lang === 'bn' ? 'কোনো হ্যাবিট নেই। নতুন হ্যাবিট যোগ করুন!' : 'No habits created yet. Tap + to add one!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Plus Button for Adding Custom Habit */}
      <div className="flex justify-center pt-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsAddModalOpen(true)}
          className="w-12 h-12 rounded-full bg-[#FF5A5A] text-white flex items-center justify-center shadow-xl shadow-rose-500/40 cursor-pointer font-bold transition-all hover:bg-rose-600"
          title={lang === 'bn' ? 'নতুন হ্যাবিট যোগ করুন' : 'Add new habit'}
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* Modal: Add New Habit */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md p-5 rounded-2xl border shadow-2xl space-y-4 relative",
                darkMode ? "bg-[#181820] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b pb-3 border-gray-200/20">
                <h3 className="text-sm font-bold flex items-center gap-2 text-rose-500">
                  <Sparkles size={16} />
                  {lang === 'bn' ? 'নতুন হ্যাবিট যোগ করুন' : 'Add New Habit'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddHabit} className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-16">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                      {lang === 'bn' ? 'ইমোজি' : 'Emoji'}
                    </label>
                    <input
                      type="text"
                      placeholder=""
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className={cn(
                        "w-full p-2 rounded-xl text-center text-lg border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                      {lang === 'bn' ? 'হ্যাবিটের নাম' : 'Habit Title'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Read 10 Pages"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className={cn(
                        "w-full p-2 rounded-xl text-xs sm:text-sm border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                    {lang === 'bn' ? 'নোট / সময় (ঐচ্ছিক)' : 'Subtitle / Schedule (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Before Sleep, @ 9pm"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-rose-500",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-500/30 hover:bg-white/5 transition-colors"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#FF5A5A] hover:bg-rose-600 text-white transition-colors shadow-md shadow-rose-500/30"
                  >
                    {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Habit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Habit */}
      <AnimatePresence>
        {editingHabit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md p-5 rounded-2xl border shadow-2xl space-y-4 relative",
                darkMode ? "bg-[#181820] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b pb-3 border-gray-200/20">
                <h3 className="text-sm font-bold flex items-center gap-2 text-rose-500">
                  <Edit2 size={16} />
                  {lang === 'bn' ? 'হ্যাবিট সম্পাদনা করুন' : 'Edit Habit'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateHabit} className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-16">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                      {lang === 'bn' ? 'ইমোজি' : 'Emoji'}
                    </label>
                    <input
                      type="text"
                      placeholder=""
                      value={editingHabit.emoji || ''}
                      onChange={(e) => setEditingHabit({ ...editingHabit, emoji: e.target.value })}
                      className={cn(
                        "w-full p-2 rounded-xl text-center text-lg border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                      {lang === 'bn' ? 'হ্যাবিটের নাম' : 'Habit Title'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editingHabit.title}
                      onChange={(e) => setEditingHabit({ ...editingHabit, title: e.target.value })}
                      className={cn(
                        "w-full p-2 rounded-xl text-xs sm:text-sm border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block mb-1">
                    {lang === 'bn' ? 'নোট / সময় (ঐচ্ছিক)' : 'Subtitle / Schedule'}
                  </label>
                  <input
                    type="text"
                    value={editingHabit.subtitle || ''}
                    onChange={(e) => setEditingHabit({ ...editingHabit, subtitle: e.target.value })}
                    className={cn(
                      "w-full p-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-rose-500",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingHabit(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-500/30 hover:bg-white/5 transition-colors"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#FF5A5A] hover:bg-rose-600 text-white transition-colors shadow-md shadow-rose-500/30"
                  >
                    {lang === 'bn' ? 'আপডেট করুন' : 'Update Habit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Habit Detailed Analytics */}
      <AnimatePresence>
        {analyticsHabit && analyticsData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "w-full max-w-lg p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto no-scrollbar",
                darkMode ? "bg-[#14141c] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3 border-gray-200/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center text-xl shrink-0">
                    {analyticsHabit.emoji ? analyticsHabit.emoji : <CheckCircle2 size={20} className="text-rose-500" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black tracking-tight truncate text-rose-500 dark:text-rose-400">
                      {analyticsHabit.title}
                    </h3>
                    {analyticsHabit.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                        {analyticsHabit.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAnalyticsHabit(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* High Level Key Metric Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center text-center",
                  darkMode ? "bg-white/5 border-white/5" : "bg-rose-50/50 border-rose-100"
                )}>
                  <Award size={18} className="text-amber-400 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{lang === 'bn' ? 'মোট সম্পন্ন' : 'Total Done'}</span>
                  <span className="text-base sm:text-lg font-black text-rose-500 mt-0.5">
                    {analyticsData.totalCompletions} {lang === 'bn' ? 'দিন' : 'days'}
                  </span>
                </div>

                <div className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center text-center",
                  darkMode ? "bg-white/5 border-white/5" : "bg-amber-50/50 border-amber-100"
                )}>
                  <Flame size={18} className="text-rose-500 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{lang === 'bn' ? 'বর্তমান স্ট্রিক' : 'Streak'}</span>
                  <span className="text-base sm:text-lg font-black text-amber-500 mt-0.5">
                    {analyticsData.currentStreak} {lang === 'bn' ? 'দিন' : 'days'}
                  </span>
                </div>

                <div className={cn(
                  "p-3 rounded-2xl border flex flex-col items-center justify-center text-center",
                  darkMode ? "bg-white/5 border-white/5" : "bg-emerald-50/50 border-emerald-100"
                )}>
                  <Zap size={18} className="text-emerald-400 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{lang === 'bn' ? 'সেরা স্ট্রিক' : 'Best Streak'}</span>
                  <span className="text-base sm:text-lg font-black text-emerald-500 mt-0.5">
                    {analyticsData.bestStreak} {lang === 'bn' ? 'দিন' : 'days'}
                  </span>
                </div>
              </div>

              {/* View Switcher Tabs: Weekly | Monthly | Yearly */}
              <div className="flex p-1 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5">
                {(['weekly', 'monthly', 'yearly'] as const).map((vt) => (
                  <button
                    key={vt}
                    onClick={() => setAnalyticsViewTab(vt)}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer",
                      analyticsViewTab === vt
                        ? "bg-[#FF5A5A] text-white shadow-md shadow-rose-500/20"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    {vt === 'weekly' ? (lang === 'bn' ? 'সাপ্তাহিক' : 'Weekly') : vt === 'monthly' ? (lang === 'bn' ? 'মাসিক' : 'Monthly') : (lang === 'bn' ? 'বাৎসরিক' : 'Yearly')}
                  </button>
                ))}
              </div>

              {/* TAB 1: WEEKLY VIEW */}
              {analyticsViewTab === 'weekly' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span>{lang === 'bn' ? 'চলতি সপ্তাহ (শনিবার - শুক্রবার)' : 'Current Week (Sat - Fri)'}</span>
                    <span className="text-rose-500 font-extrabold">Week {weekNum}</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {weekDays.map((d) => {
                      const isDone = (completedLogs[d.dateKey] || []).includes(analyticsHabit.id);
                      return (
                        <button
                          key={d.dateKey}
                          onClick={() => toggleHabit(analyticsHabit.id, d.dateKey)}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-2xl border transition-all cursor-pointer",
                            isDone
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-black shadow-xs"
                              : (darkMode ? "bg-white/5 border-white/5 text-gray-500" : "bg-gray-100 border-gray-200 text-gray-500")
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase">{d.dayName}</span>
                          <span className="text-sm font-black mt-0.5">{d.dateNum}</span>
                          <div className="mt-1">
                            {isDone ? (
                              <CheckCircle2 size={15} className="text-emerald-400" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-gray-500/40" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center italic">
                    {lang === 'bn' ? 'যেকোনো দিনে ক্লিক করে টিক/আনটিক করুন' : 'Tap any day to toggle completion state'}
                  </p>
                </div>
              )}

              {/* TAB 2: MONTHLY CALENDAR VIEW */}
              {analyticsViewTab === 'monthly' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-rose-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {analyticsData.curMonthName}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-[11px]">
                      {analyticsData.monthlyDays.filter(d => d.isCompleted).length} / {analyticsData.monthlyDays.length} {lang === 'bn' ? 'দিন সম্পন্ন' : 'days completed'}
                    </span>
                  </div>

                  {/* Monthly Table / Grid with Week Numbers and Sat...Fri weekdays */}
                  <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 p-2 space-y-1.5">
                    {/* Header Row: WN | 7 day columns matching weekStartDay */}
                    <div className="grid grid-cols-8 gap-1 text-center text-[10px] font-black uppercase pb-1 border-b border-white/10">
                      <span className="text-gray-500 py-0.5">WN</span>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const dayIdx = (weekStartDay + i) % 7;
                        const isWeekend = dayIdx === 5 || dayIdx === 6;
                        return (
                          <span
                            key={i}
                            className={cn(
                              "py-0.5 rounded-md",
                              isWeekend
                                ? "text-rose-400 bg-rose-500/10"
                                : "text-gray-500 dark:text-gray-400"
                            )}
                            title={isWeekend ? (lang === 'bn' ? 'সাপ্তাহিক ছুটি' : 'Weekly Off') : undefined}
                          >
                            {lang === 'bn' ? ALL_DAY_NAMES_BN[dayIdx] : ALL_DAY_NAMES[dayIdx]}
                            {isWeekend ? ` (${lang === 'bn' ? 'ছুটি' : 'OFF'})` : ''}
                          </span>
                        );
                      })}
                    </div>

                    {/* Week Rows */}
                    <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
                      {analyticsData.monthlyWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="grid grid-cols-8 gap-1 items-center text-center">
                          {/* Week Number Badge */}
                          <span className="text-[10px] font-black text-rose-500/80 bg-rose-500/10 rounded-lg py-1.5 border border-rose-500/20">
                            W{week.weekNum}
                          </span>

                          {/* 7 Day Cells */}
                          {week.days.map((d, dIdx) => {
                            if (!d.isCurrentMonth) {
                              return (
                                <div key={dIdx} className="py-1.5 text-center text-[10px] text-gray-600/30 font-medium">
                                  {d.dayNum}
                                </div>
                              );
                            }

                            return (
                              <button
                                key={d.dateKey}
                                onClick={() => toggleHabit(analyticsHabit.id, d.dateKey)}
                                className={cn(
                                  "py-1.5 rounded-lg text-center text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center relative",
                                  d.isCompleted
                                    ? "bg-rose-500 text-white border-rose-500 shadow-xs shadow-rose-500/30 font-black"
                                    : (d.isSaturdayOrFriday
                                        ? (darkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100")
                                        : (darkMode ? "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200")
                                      )
                                )}
                                title={`${d.dateKey} ${d.isSaturdayOrFriday ? '(Weekly Off Day)' : ''}`}
                              >
                                <span>{d.dayNum}</span>
                                {d.isCompleted && <span className="w-1 h-1 bg-white rounded-full mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 px-1 pt-0.5">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500/40 border border-amber-500 inline-block" />
                      Saturday & Friday: Weekly Off
                    </span>
                    <span className="italic">{lang === 'bn' ? 'যেকোনো তারিখে ট্যাপ করুন' : 'Tap date to toggle'}</span>
                  </div>
                </div>
              )}

              {/* TAB 3: YEARLY OVERVIEW */}
              {analyticsViewTab === 'yearly' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span>{lang === 'bn' ? 'বাৎসরিক ওভারভিউ' : 'Annual Overview'} ({analyticsData.curYear})</span>
                    <span className="text-rose-500 font-black">{analyticsData.totalCompletions} {lang === 'bn' ? 'মোট দিন' : 'Total Days'}</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {analyticsData.yearlyBreakdown.map((m) => (
                      <div
                        key={m.monthName}
                        className={cn(
                          "p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1",
                          m.completions > 0
                            ? (darkMode ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-900")
                            : (darkMode ? "bg-white/5 border-white/5 text-gray-500" : "bg-gray-100 border-gray-200 text-gray-400")
                        )}
                      >
                        <span className="text-[11px] font-extrabold uppercase">{m.monthName}</span>
                        <span className="text-sm font-black text-rose-500">
                          {m.completions}d
                        </span>
                        {/* Mini progress bar */}
                        <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${m.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Habit Confirmation Modal (Extra Caution) */}
      <AnimatePresence>
        {deletingHabit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-sm p-5 rounded-3xl border shadow-2xl space-y-4 text-center",
                darkMode ? "bg-[#16161e] border-red-500/30 text-white" : "bg-white border-red-200 text-gray-900"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 size={24} />
              </div>

              <div>
                <h3 className="text-base font-black text-red-500 dark:text-red-400">
                  {lang === 'bn' ? 'হ্যাবিট মুছে ফেলবেন?' : 'Delete Habit?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {lang === 'bn' 
                    ? `আপনি কি নিশ্চিত যে "${deletingHabit.title}" হ্যাবিটটি মুছে ফেলতে চান? আপনার সকল রেকর্ড ও স্ট্রাইক হারিয়ে যাবে।`
                    : `Are you sure you want to delete "${deletingHabit.title}"? This will permanently erase its completion logs and streak history.`
                  }
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingHabit(null)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border",
                    darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteHabit(deletingHabit.id);
                    setDeletingHabit(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-md shadow-red-500/30"
                >
                  {lang === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Modal: Waqt Salah Logging (Prayer Status & Rakah Checklist) */}
      <AnimatePresence>
        {selectedWaqtForSalahModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "w-full max-w-md p-4 sm:p-5 rounded-2xl border shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto",
                darkMode ? "bg-[#16161c] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
              )}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-3 border-gray-200/20">
                <div className="flex items-center gap-2.5">
                  <div 
                    style={{ 
                      backgroundColor: `${WAQT_DETAILS[selectedWaqtForSalahModal].color}25`,
                      borderColor: `${WAQT_DETAILS[selectedWaqtForSalahModal].color}40`
                    }}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-xs"
                  >
                    {(() => {
                      const WaqtIcon = WAQT_DETAILS[selectedWaqtForSalahModal].icon;
                      return <WaqtIcon size={18} style={{ color: WAQT_DETAILS[selectedWaqtForSalahModal].color }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                      <span>{lang === 'bn' ? WAQT_DETAILS[selectedWaqtForSalahModal].nameBn : WAQT_DETAILS[selectedWaqtForSalahModal].nameEn}</span>
                      <span className="text-neutral-400 font-normal text-xs">({WAQT_DETAILS[selectedWaqtForSalahModal].arabic})</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {lang === 'bn' ? 'সালাত আদায় ও ওয়াক্তের স্ট্যাটাস' : 'Salah Performance & Waqt Status'} • {selectedDateKey}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWaqtForSalahModal(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Prayer Status 4-Card Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  {lang === 'bn' ? 'সালাতের অবস্থা' : 'Prayer Status'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'prayed_on_time' as PrayerStatus,
                      labelEn: 'Prayed on Time',
                      labelBn: 'ওয়াক্তমতো আদায়',
                      borderActive: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
                      lightActive: 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    },
                    {
                      id: 'prayed_jamaat' as PrayerStatus,
                      labelEn: 'In Congregation',
                      labelBn: 'জামাতে আদায়',
                      borderActive: 'border-teal-500 bg-teal-500/15 text-teal-300',
                      lightActive: 'border-teal-500 bg-teal-50 text-teal-800'
                    },
                    {
                      id: 'qaza' as PrayerStatus,
                      labelEn: 'Qaza',
                      labelBn: 'কাজা',
                      borderActive: 'border-amber-500 bg-amber-500/15 text-amber-300',
                      lightActive: 'border-amber-500 bg-amber-50 text-amber-800'
                    },
                    {
                      id: 'not_prayed' as PrayerStatus,
                      labelEn: 'Not Prayed',
                      labelBn: 'আদায় করা হয়নি',
                      borderActive: 'border-neutral-500 bg-neutral-500/15 text-neutral-300',
                      lightActive: 'border-neutral-400 bg-neutral-100 text-neutral-800'
                    }
                  ].map(st => {
                    const currentRecord = salahRecordsMap[selectedDateKey] || DEFAULT_RECORD(selectedDateKey);
                    const pDetail = currentRecord.prayers[selectedWaqtForSalahModal];
                    const isSelected = (pDetail?.status || 'not_prayed') === st.id;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          const nextDetail = { ...(pDetail || { fard: false, status: 'not_prayed' }) };
                          nextDetail.status = st.id;
                          if (st.id === 'prayed_on_time' || st.id === 'prayed_jamaat') {
                            nextDetail.fard = true;
                            if (nextDetail.sunnahMuakkadah !== undefined) nextDetail.sunnahMuakkadah = true;
                          } else if (st.id === 'not_prayed') {
                            nextDetail.fard = false;
                            if (nextDetail.sunnahMuakkadah !== undefined) nextDetail.sunnahMuakkadah = false;
                            if (nextDetail.nafl !== undefined) nextDetail.nafl = false;
                            if (nextDetail.witr !== undefined) nextDetail.witr = false;
                            if (nextDetail.sunnahGhairMuakkadah !== undefined) nextDetail.sunnahGhairMuakkadah = false;
                          }
                          handleSavePrayerRecord(selectedWaqtForSalahModal, nextDetail);
                          playHabitCheckSound();
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs",
                          isSelected
                            ? (darkMode ? st.borderActive : st.lightActive)
                            : (darkMode ? "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/5" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100")
                        )}
                      >
                        <span className="truncate">{lang === 'bn' ? st.labelBn : st.labelEn}</span>
                        {isSelected && <Check size={14} className="stroke-[3] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rakah Breakdown Checklist */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  {lang === 'bn' ? 'রাকাত বিবরণ' : 'Rakah Breakdown'}
                </label>
                <div className="space-y-1.5">
                  {WAQT_DETAILS[selectedWaqtForSalahModal].breakdown.map((item) => {
                    const currentRecord = salahRecordsMap[selectedDateKey] || DEFAULT_RECORD(selectedDateKey);
                    const pDetail = currentRecord.prayers[selectedWaqtForSalahModal];
                    const isChecked = Boolean((pDetail as any)?.[item.key]);

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          const nextDetail = { ...(pDetail || { fard: false, status: 'not_prayed' }) };
                          (nextDetail as any)[item.key] = !isChecked;
                          if (!isChecked && item.key === 'fard' && nextDetail.status === 'not_prayed') {
                            nextDetail.status = 'prayed_on_time';
                          }
                          handleSavePrayerRecord(selectedWaqtForSalahModal, nextDetail);
                          playHabitCheckSound();
                        }}
                        className={cn(
                          "w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all cursor-pointer",
                          isChecked
                            ? (darkMode ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900")
                            : (darkMode ? "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/5" : "bg-gray-50/80 border-gray-200 text-gray-700 hover:bg-gray-100")
                        )}
                      >
                        <span className="truncate">{lang === 'bn' ? item.labelBn : item.labelEn}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : (darkMode ? "border-neutral-600 bg-white/5" : "border-gray-300 bg-white")
                        )}>
                          {isChecked && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Done Footer */}
              <div className="pt-2 border-t border-gray-200/15 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedWaqtForSalahModal(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#FF5A5A] hover:bg-rose-600 text-white transition-colors shadow-md shadow-rose-500/30 cursor-pointer"
                >
                  {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
