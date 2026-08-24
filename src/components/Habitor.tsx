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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Plays a mechanical click sound on habit check
 */
function playHabitCheckSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Crisp, sharp "click" sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.015);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch (e) {
    // Audio context fallback
  }
}

export interface HabitItem {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  createdAt: string;
}

export interface HabitorProps {
  darkMode: boolean;
  lang: 'en' | 'bn';
}

// Default initial habits matching screenshot
const DEFAULT_HABITS: HabitItem[] = [
  { id: 'h1', title: 'Post-Maghrib Dinner', subtitle: 'Within 6-7 Pm', emoji: '🥗', createdAt: new Date().toISOString() },
  { id: 'h2', title: 'Esa Jamat', subtitle: 'With Witr / Tarawee', emoji: '🤲', createdAt: new Date().toISOString() },
  { id: 'h3', title: 'Drink Mineral Water', subtitle: '13 Glass ( 3-4 Ltr ) Detox, Alkaline', emoji: '💧', createdAt: new Date().toISOString() },
  { id: 'h4', title: 'PlanNextDay', subtitle: 'Before Sleep', emoji: '📝', createdAt: new Date().toISOString() },
  { id: 'h5', title: 'Read a Book', subtitle: '10 Pages', emoji: '📗', createdAt: new Date().toISOString() },
  { id: 'h6', title: 'Avoid Hjobs', subtitle: '', emoji: '🍌', createdAt: new Date().toISOString() },
  { id: 'h7', title: 'Sleep Early', subtitle: '@ 9pm | Do Sleep Ritual |', emoji: '🛌', createdAt: new Date().toISOString() },
  { id: 'h8', title: 'Tahajjud/ Suhur', subtitle: '', emoji: '🧎', createdAt: new Date().toISOString() },
  { id: 'h9', title: 'Fazr Jamat', subtitle: '', emoji: '🤲', createdAt: new Date().toISOString() },
  { id: 'h10', title: 'Quran Recitation', subtitle: '30 Min', emoji: '📖', createdAt: new Date().toISOString() },
  { id: 'h11', title: 'Zikr Adhkar', subtitle: 'Before Sunrise & Sunset', emoji: '📿', createdAt: new Date().toISOString() },
  { id: 'h12', title: 'Deep Work', subtitle: '4 Focused Hrs ( 8-13 Pm )', emoji: '👨‍💻', createdAt: new Date().toISOString() },
  { id: 'h13', title: 'Dhikr - Walk', subtitle: '10,000 Steps (Sun & Grass)', emoji: '🚶', createdAt: new Date().toISOString() },
  { id: 'h14', title: 'Strength Exercise', subtitle: 'Resistance / Dumbbell Strength Full Body', emoji: '🏋️', createdAt: new Date().toISOString() },
  { id: 'h15', title: 'Breathing With Dhikr', subtitle: 'Wim Hoff, 4:7:8, Humming', emoji: '🫁', createdAt: new Date().toISOString() },
];

/**
 * Calculates Dhaka, Bangladesh sunset time dynamically for a given date
 * Lat: 23.8103° N, Long: 90.4125° E (UTC+6)
 */
function getDhakaSunsetTime(date: Date = new Date()): { hours: number; minutes: number; displayStr: string } {
  try {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    // NOAA Astronomical Sunrise/Sunset Algorithm for Dhaka
    const lat = 23.8103;
    const lng = 90.4125;
    const zenith = 90.833;

    const N1 = Math.floor(275 * m / 9);
    const N2 = Math.floor((m + 9) / 12);
    const N3 = (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3));
    const N = N1 - (N2 * N3) + d - 30;

    const lngHour = lng / 15;
    const t = N + ((18 - lngHour) / 24);

    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(M * Math.PI / 180)) + (0.020 * Math.sin(2 * M * Math.PI / 180)) + 282.634;
    L = (L + 360) % 360;

    let RA = (180 / Math.PI) * Math.atan(0.91764 * Math.tan(L * Math.PI / 180));
    RA = (RA + 360) % 360;

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin(L * Math.PI / 180);
    const cosDec = Math.cos(Math.asin(sinDec));

    const cosH = (Math.cos(zenith * Math.PI / 180) - (sinDec * Math.sin(lat * Math.PI / 180))) / (cosDec * Math.cos(lat * Math.PI / 180));
    const H = (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH))) / 15;

    const T = H + RA - (0.06571 * t) - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;

    // Dhaka local time = UTC + 6
    let localSunset = UT + 6.0;
    localSunset = (localSunset + 24) % 24;

    const hours = Math.floor(localSunset);
    const minutes = Math.floor((localSunset - hours) * 60);

    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayStr = `${displayHours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;

    return { hours, minutes, displayStr };
  } catch (e) {
    return { hours: 18, minutes: 36, displayStr: '6:36 PM' };
  }
}

/**
 * Returns current date key formatted according to Dhaka Sunset Reset rule.
 * If current Dhaka time is after sunset, date shifts to the next date cycle!
 */
function getDhakaLogicalDateKey(now = new Date()): { dateKey: string; isPastSunsetToday: boolean; sunsetStr: string; dhakaTimeStr: string } {
  // Get Dhaka time string
  const dhakaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const dhakaNow = new Date(dhakaStr);
  
  const sunset = getDhakaSunsetTime(dhakaNow);
  const dhakaHour = dhakaNow.getHours();
  const dhakaMin = dhakaNow.getMinutes();
  
  const isPastSunsetToday = (dhakaHour > sunset.hours) || (dhakaHour === sunset.hours && dhakaMin >= sunset.minutes);
  
  const logicalDate = new Date(dhakaNow);
  if (isPastSunsetToday) {
    // Shifting to next day after sunset
    logicalDate.setDate(logicalDate.getDate() + 1);
  }
  
  const yyyy = logicalDate.getFullYear();
  const mm = String(logicalDate.getMonth() + 1).padStart(2, '0');
  const dd = String(logicalDate.getDate()).padStart(2, '0');
  
  const dhakaFormattedTime = dhakaNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    isPastSunsetToday,
    sunsetStr: sunset.displayStr,
    dhakaTimeStr: dhakaFormattedTime
  };
}

/**
 * Calculates Week Number where Saturday is the first day of the week.
 */
function getSaturdayWeekNumber(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jan1 = new Date(target.getFullYear(), 0, 1);
  const jan1SatIndex = (jan1.getDay() + 1) % 7; 
  const dayOfYear = Math.floor((target.getTime() - jan1.getTime()) / 86400000);
  return Math.floor((dayOfYear + jan1SatIndex) / 7) + 1;
}

/**
 * Builds Saturday-to-Friday week array around the current logical date
 */
function getSaturdayToFridayWeek(logicalDateStr: string) {
  const [y, m, d] = logicalDateStr.split('-').map(Number);
  const refDate = new Date(y, m - 1, d);
  
  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = refDate.getDay();
  
  // Distance back to Saturday
  const diffToSat = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
  
  const satDate = new Date(refDate);
  satDate.setDate(refDate.getDate() + diffToSat);
  
  const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(satDate);
    day.setDate(satDate.getDate() + i);
    
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    
    weekDays.push({
      dayName: dayNames[i],
      dateNum: day.getDate(),
      dateKey: key,
      isToday: key === logicalDateStr,
      fullDate: day
    });
  }
  
  const weekNum = getSaturdayWeekNumber(refDate);
  return { weekDays, weekNum, year: refDate.getFullYear() };
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
}: HabitRowItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={habit.id}
      value={habit}
      id={habit.id}
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
      className={cn(
        "group relative p-2.5 sm:p-3 rounded-2xl border transition-colors flex items-center justify-between gap-3 select-none",
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
        {/* Dedicated Drag Grip Button with ample touch area */}
        <div 
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          className="p-2 sm:p-2.5 -my-2 -ml-1.5 rounded-xl cursor-grab active:cursor-grabbing text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-all touch-none flex items-center justify-center select-none"
          title={lang === 'bn' ? 'স্থান পরিবর্তন করতে টেনে আনুন' : 'Drag handle to reorder'}
        >
          <GripVertical size={17} />
        </div>
        
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenHabitId(isMenuOpen ? null : habit.id);
            }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
                  "absolute left-0 top-7 z-30 min-w-[120px] rounded-xl border p-1 shadow-xl backdrop-blur-md",
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
        <span className="text-xl shrink-0 select-none group-hover/title:scale-110 transition-transform">{habit.emoji}</span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className={cn(
              "text-xs sm:text-sm font-bold tracking-tight truncate transition-all",
              isCompleted ? "line-through opacity-80 text-[#32CD32]" : ""
            )}>
              {habit.title}
            </h3>
            <BarChart2 size={13} className="text-gray-500 dark:text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
          </div>
          {habit.subtitle && (
            <p className={cn(
              "text-[10px] sm:text-xs font-medium truncate mt-0.5",
              isCompleted ? "opacity-70 text-[#32CD32]" : "text-gray-400 dark:text-gray-400"
            )}>
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

export default function Habitor({ darkMode, lang }: HabitorProps) {
  const [habits, setHabits] = useState<HabitItem[]>(() => {
    const saved = localStorage.getItem('ratbod_habits_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let needsUpdate = false;
          const migratedParsed = parsed.map(h => {
            if ((h.id === 'h6' || h.id === 'h8' || h.id === 'h9') && h.subtitle !== '') {
              needsUpdate = true;
              return { ...h, subtitle: '' };
            }
            return h;
          });

          // Merge missing default habits if we have fewer than 15
          const existingIds = new Set(migratedParsed.map(h => h.id));
          const missingDefaults = DEFAULT_HABITS.filter(h => !existingIds.has(h.id));
          
          if (missingDefaults.length > 0 || needsUpdate) {
            const merged = [...migratedParsed, ...missingDefaults];
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
    const saved = localStorage.getItem('ratbod_habit_logs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const dhakaInfo = useMemo(() => getDhakaLogicalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(dhakaInfo.dateKey);

  const [isLoaded, setIsLoaded] = useState(false);

  // Sync state to localStorage & Firestore
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('ratbod_habits_v1', JSON.stringify(habits));
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'habits'), { habits }, { merge: true }).catch(e => {});
    }
  }, [habits, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('ratbod_habit_logs_v1', JSON.stringify(completedLogs));
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'), { completedLogs }, { merge: true }).catch(e => {});
    }
  }, [completedLogs, isLoaded]);

  // Initial load from Firestore
  useEffect(() => {
    const loadFirestoreData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoaded(true);
        return;
      }
      try {
        // Load Habits
        const habitsDoc = await getDoc(doc(db, 'users', user.uid, 'appData', 'habits'));
        if (habitsDoc.exists()) {
          const data = habitsDoc.data();
          if (data.habits && Array.isArray(data.habits)) {
            setHabits(data.habits);
          }
        }
        
        // Load Logs
        const logsDoc = await getDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'));
        if (logsDoc.exists()) {
          const data = logsDoc.data();
          if (data.completedLogs) {
            setCompletedLogs(data.completedLogs);
          }
        }
      } catch (e) {
        console.error("Failed to load habits from firestore", e);
      }
      setIsLoaded(true);
    };
    loadFirestoreData();
  }, []);

  // Week Days Saturday to Friday
  const { weekDays, weekNum, year } = useMemo(() => getSaturdayToFridayWeek(selectedDateKey), [selectedDateKey]);

  // Modal for adding habit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('✨');

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

    // Build Saturday-to-Friday week rows for the entire month
    const firstDayOfMonth = new Date(curYear, curMonth, 1);
    const lastDayOfMonth = new Date(curYear, curMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 6=Sat
    const diffToSat = firstDayOfWeek === 6 ? 0 : -(firstDayOfWeek + 1);
    
    let currentWeekSat = new Date(curYear, curMonth, 1 + diffToSat);
    const monthlyWeeks = [];

    while (currentWeekSat <= lastDayOfMonth || (currentWeekSat.getMonth() === curMonth && currentWeekSat.getDate() <= daysInMonthCount)) {
      const weekNum = getSaturdayWeekNumber(currentWeekSat);
      const daysInWeek = [];

      for (let i = 0; i < 7; i++) {
        const curDate = new Date(currentWeekSat);
        curDate.setDate(currentWeekSat.getDate() + i);

        const isCurrentMonth = curDate.getMonth() === curMonth;
        const yyyy = curDate.getFullYear();
        const mm = String(curDate.getMonth() + 1).padStart(2, '0');
        const dd = String(curDate.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;

        daysInWeek.push({
          dayNum: curDate.getDate(),
          dateKey,
          isCurrentMonth,
          isCompleted: datesSet.has(dateKey),
          isSaturdayOrFriday: i === 0 || i === 6 // 0=Sat, 6=Fri
        });
      }

      monthlyWeeks.push({
        weekNum,
        days: daysInWeek
      });

      // Advance to next Saturday
      currentWeekSat.setDate(currentWeekSat.getDate() + 7);
      if (currentWeekSat.getFullYear() > curYear || (currentWeekSat.getMonth() > curMonth && currentWeekSat.getDate() > 7)) {
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
  }, [analyticsHabit, completedLogs, selectedDateKey, lang]);

  // Active completed array for selected date
  const completedTodaySet = useMemo(() => {
    return new Set(completedLogs[selectedDateKey] || []);
  }, [completedLogs, selectedDateKey]);

  const toggleHabit = (id: string, dateKey?: string) => {
    const targetDateKey = dateKey || selectedDateKey;
    setCompletedLogs(prev => {
      const currentList = prev[targetDateKey] || [];
      let updatedList: string[];
      if (currentList.includes(id)) {
        updatedList = currentList.filter(item => item !== id);
      } else {
        updatedList = [...currentList, id];
        playHabitCheckSound();
      }
      return {
        ...prev,
        [targetDateKey]: updatedList
      };
    });
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: HabitItem = {
      id: 'h_' + Date.now(),
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      emoji: newEmoji.trim() || '📌',
      createdAt: new Date().toISOString()
    };

    setHabits(prev => [...prev, newItem]);
    setNewTitle('');
    setNewSubtitle('');
    setNewEmoji('✨');
    setIsAddModalOpen(false);
  };

  const handleUpdateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editingHabit.title.trim()) return;

    setHabits(prev => prev.map(h => h.id === editingHabit.id ? editingHabit : h));
    setEditingHabit(null);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setMenuOpenHabitId(null);
  };

  const completedCount = completedTodaySet.size;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-2.5 max-w-2xl mx-auto pb-10">
      {/* Horizontal Saturday to Friday Week Bar */}
      <div className={cn(
        "p-2 sm:p-2.5 rounded-2xl border transition-all",
        darkMode ? "bg-[#111116] border-white/10" : "bg-white border-black/5 shadow-xs"
      )}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
            <Calendar size={14} className="text-rose-500" />
            {lang === 'bn' ? `সপ্তাহ ${weekNum}` : `Week ${weekNum}`}
          </span>
          <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
            <Sunset size={13} className="text-amber-400 shrink-0" />
            {lang === 'bn' ? `সূর্যাস্ত: ${dhakaInfo.sunsetStr}` : `Sunset: ${dhakaInfo.sunsetStr}`}
          </span>
        </div>

        {/* 7 Days Grid: Saturday -> Sunday -> Monday -> Tuesday -> Wednesday -> Thursday -> Friday */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekDays.map((d) => {
            const isSelected = d.dateKey === selectedDateKey;
            const isToday = d.isToday;

            return (
              <button
                key={d.dateKey}
                onClick={() => setSelectedDateKey(d.dateKey)}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 sm:py-2 rounded-xl transition-all cursor-pointer relative select-none",
                  isSelected
                    ? "bg-[#FF5A5A] text-white shadow-md shadow-rose-500/30 scale-105 font-black z-10"
                    : isToday
                    ? (darkMode ? "bg-white/10 text-white border border-rose-500/40" : "bg-rose-50 text-rose-900 border border-rose-200")
                    : (darkMode ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                )}
              >
                <span className={cn(
                  "text-[10px] sm:text-[11px] font-bold tracking-tight uppercase",
                  isSelected ? "text-white opacity-90" : "opacity-70"
                )}>
                  {d.dayName}
                </span>
                <span className={cn(
                  "text-base sm:text-lg font-black tracking-tighter mt-0.5 leading-none",
                  isSelected ? "text-white" : ""
                )}>
                  {d.dateNum}
                </span>

                {/* Dot indicator underneath active selected date */}
                {isSelected && (
                  <span className="w-1.5 h-1.5 bg-white rounded-full mt-1 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Counter & Bar Header (Matching Screenshot with reduced margins) */}
      <div className={cn(
        "p-2.5 sm:p-3 rounded-2xl border space-y-1.5 transition-all mb-4",
        darkMode ? "bg-[#111116] border-white/10" : "bg-white border-black/5 shadow-xs"
      )}>
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

      {/* Habit Items List (Smooth Buttery Reorder with Motion Spring Physics) */}
      <div className="space-y-2">
        <Reorder.Group
          axis="y"
          values={habits}
          onReorder={setHabits}
          className="space-y-2 list-none p-0 m-0"
        >
          <AnimatePresence initial={false}>
            {habits.map((habit) => (
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
                      Emoji
                    </label>
                    <input
                      type="text"
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className={cn(
                        "w-full p-2 rounded-xl text-center text-lg border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
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
                      Emoji
                    </label>
                    <input
                      type="text"
                      value={editingHabit.emoji}
                      onChange={(e) => setEditingHabit({ ...editingHabit, emoji: e.target.value })}
                      className={cn(
                        "w-full p-2 rounded-xl text-center text-lg border font-bold focus:outline-none focus:border-rose-500",
                        darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
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
                    {analyticsHabit.emoji}
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
                    {/* Header Row: WN | SAT (OFF) | SUN | MON | TUE | WED | THU | FRI (OFF) */}
                    <div className="grid grid-cols-8 gap-1 text-center text-[10px] font-black uppercase pb-1 border-b border-white/10">
                      <span className="text-gray-500 py-0.5">WN</span>
                      <span className="text-rose-400 bg-rose-500/10 rounded-md py-0.5" title="Weekly Off">SAT (OFF)</span>
                      <span className="text-gray-500 dark:text-gray-400 py-0.5">SUN</span>
                      <span className="text-gray-500 dark:text-gray-400 py-0.5">MON</span>
                      <span className="text-gray-500 dark:text-gray-400 py-0.5">TUE</span>
                      <span className="text-gray-500 dark:text-gray-400 py-0.5">WED</span>
                      <span className="text-gray-500 dark:text-gray-400 py-0.5">THU</span>
                      <span className="text-rose-400 bg-rose-500/10 rounded-md py-0.5" title="Weekly Off">FRI (OFF)</span>
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
    </div>
  );
}
