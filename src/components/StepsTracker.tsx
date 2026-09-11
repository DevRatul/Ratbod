/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Footprints, 
  Flame, 
  MapPin, 
  Plus, 
  Check, 
  Calendar, 
  Trash2, 
  RotateCcw,
  Target
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface StepRecord {
  id: string;
  date: string;
  steps: number;
  goal: number;
  distanceKm: number;
  calories: number;
  createdAt: number;
}

interface StepsTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
}

export default function StepsTracker({ darkMode, lang = 'en' }: StepsTrackerProps) {
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
      const today = getLocalDateString(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateString(yesterdayDate);

      if (dateStr === today) return isBn ? 'আজ' : 'Today';
      if (dateStr === yesterday) return isBn ? 'গতকাল' : 'Yesterday';

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

  const [stepGoal, setStepGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ratbod_steps_goal');
    return saved ? parseInt(saved, 10) || 10000 : 10000;
  });

  const [todaySteps, setTodaySteps] = useState<number>(() => {
    const saved = localStorage.getItem('ratbod_steps_today');
    const savedDate = localStorage.getItem('ratbod_steps_today_date');
    if (savedDate === getLocalDateString()) {
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  const [customInput, setCustomInput] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [records, setRecords] = useState<StepRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_steps_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Calculate distance (~0.762m/step) and calories (~0.04 kcal/step)
  const distanceKm = Number(((todaySteps * 0.762) / 1000).toFixed(2));
  const caloriesBurned = Math.round(todaySteps * 0.04);
  const percentComplete = Math.min(100, Math.round((todaySteps / (stepGoal || 1)) * 100));

  // Load from Firestore
  useEffect(() => {
    const load = async (user = auth.currentUser) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'stepsTracker'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.stepGoal) setStepGoal(data.stepGoal);
          if (Array.isArray(data.records)) setRecords(data.records);
          if (data.todayDate === getLocalDateString() && typeof data.todaySteps === 'number') {
            setTodaySteps(data.todaySteps);
          }
        }
      } catch (e) {}
    };
    load();
    const unsub = onAuthStateChanged(auth, (u) => { if (u) load(u); });
    return () => unsub();
  }, []);

  const persistData = (steps: number, goal: number, updatedRecords: StepRecord[]) => {
    try {
      const today = getLocalDateString();
      localStorage.setItem('ratbod_steps_today', String(steps));
      localStorage.setItem('ratbod_steps_today_date', today);
      localStorage.setItem('ratbod_steps_goal', String(goal));
      localStorage.setItem('ratbod_steps_records', JSON.stringify(updatedRecords));

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'stepsTracker'), {
          todaySteps: steps,
          todayDate: today,
          stepGoal: goal,
          records: updatedRecords,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleAddSteps = (amount: number) => {
    const newSteps = Math.max(0, todaySteps + amount);
    setTodaySteps(newSteps);
    persistData(newSteps, stepGoal, records);
  };

  const handleCustomAdd = () => {
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAddSteps(val);
      setCustomInput('');
    }
  };

  const handleSaveDayLog = () => {
    const targetDate = selectedDate || getLocalDateString();
    const dist = Number(((todaySteps * 0.762) / 1000).toFixed(2));
    const cal = Math.round(todaySteps * 0.04);
    
    const newRec: StepRecord = {
      id: String(Date.now()),
      date: targetDate,
      steps: todaySteps,
      goal: stepGoal,
      distanceKm: dist,
      calories: cal,
      createdAt: Date.now()
    };

    const filtered = records.filter(r => r.date !== targetDate);
    const updated = [newRec, ...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    setRecords(updated);
    persistData(todaySteps, stepGoal, updated);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    persistData(todaySteps, stepGoal, updated);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full pb-0">
      {/* Main Steps Dashboard Card */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-xs",
        darkMode 
          ? "bg-[#0f1712] border-emerald-500/25 shadow-emerald-950/20 text-white" 
          : "bg-white border-emerald-100 shadow-emerald-500/5 text-gray-900"
      )}>
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
              <Footprints size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isBn ? 'পদক্ষেপ ট্র্যাকার' : 'Steps Logger'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isBn ? 'দৈনিক হাঁটা ও সক্রিয়তা পরিমাপ' : 'Daily walking activity and calorie tracking'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {isBn ? 'লক্ষ্য:' : 'Goal:'}
            </span>
            <input 
              type="number"
              value={stepGoal}
              onChange={(e) => {
                const g = parseInt(e.target.value, 10) || 1000;
                setStepGoal(g);
                persistData(todaySteps, g, records);
              }}
              className={cn(
                "w-20 px-2 py-1 rounded-lg text-xs font-black border text-center font-mono",
                darkMode ? "bg-white/5 border-white/10 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
              )}
              title={isBn ? 'দৈনিক পদক্ষেপ লক্ষ্য' : 'Daily step goal'}
            />
          </div>
        </div>

        {/* Big Counter & Progress */}
        <div className="py-4 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {isBn ? 'আজকের পদক্ষেপ' : "Today's Steps"}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatNum(todaySteps.toLocaleString())}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-400">
              / {formatNum(stepGoal.toLocaleString())}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mt-3 space-y-1">
            <div className="w-full h-2.5 rounded-full bg-gray-200/70 dark:bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <div className="flex justify-between text-[10.5px] font-bold text-gray-500 dark:text-gray-400">
              <span>{formatNum(percentComplete)}% {isBn ? 'সম্পন্ন' : 'completed'}</span>
              <span>{todaySteps >= stepGoal ? (isBn ? 'লক্ষ্য অর্জিত! 🎉' : 'Goal reached! 🎉') : ''}</span>
            </div>
          </div>

          {/* Metric Stats Pill: Distance & Calories */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-center gap-2",
              darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
            )}>
              <MapPin size={15} className="text-blue-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-gray-400 font-bold block">{isBn ? 'দূরত্ব' : 'Distance'}</span>
                <span className="text-xs font-black font-mono text-gray-900 dark:text-white">
                  {formatNum(distanceKm)} km
                </span>
              </div>
            </div>

            <div className={cn(
              "p-2.5 rounded-xl border flex items-center justify-center gap-2",
              darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
            )}>
              <Flame size={15} className="text-amber-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-gray-400 font-bold block">{isBn ? 'ক্যালোরি' : 'Burned'}</span>
                <span className="text-xs font-black font-mono text-gray-900 dark:text-white">
                  {formatNum(caloriesBurned)} kcal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="pt-2 border-t border-gray-200/20 dark:border-white/5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {[500, 1000, 2000, 5000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleAddSteps(num)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1",
                  darkMode 
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25" 
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                <Plus size={12} />
                <span>+{formatNum(num)}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setTodaySteps(0);
                persistData(0, stepGoal, records);
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 text-gray-400 hover:text-red-500",
                darkMode ? "border-white/5 hover:bg-white/5" : "border-gray-200 hover:bg-gray-100"
              )}
              title={isBn ? 'রিসেট করুন' : 'Reset today'}
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Custom Input + Save Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-2">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input
                type="number"
                placeholder={isBn ? 'কাস্টম সংখ্যা...' : 'Custom steps...'}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border flex-1 sm:w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
              />
              <button
                type="button"
                onClick={handleCustomAdd}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shrink-0"
              >
                {isBn ? 'যোগ করুন' : 'Add'}
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold border text-center font-mono",
                  darkMode ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]" : "bg-white text-gray-900 border-gray-300"
                )}
              />
              <button
                type="button"
                onClick={handleSaveDayLog}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0 text-white",
                  savedToast ? "bg-emerald-600" : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {savedToast ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
                <span>{savedToast ? (isBn ? 'সংরক্ষিত!' : 'Saved!') : (isBn ? 'দিনটি সেভ করুন' : 'Log Day')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Steps History List */}
      <div className={cn(
        "p-4 rounded-2xl border space-y-3",
        darkMode ? "bg-[#0f1712] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={14} className="text-emerald-500" />
            <span>{isBn ? 'সংরক্ষিত পদক্ষেপের ইতিহাস' : 'Recent Step Logs'}</span>
          </h3>
          {records.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {isBn ? `মোট ${formatNum(records.length)}টি লগ` : `${records.length} logs`}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className={cn(
            "p-6 rounded-xl border text-center space-y-1",
            darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
          )}>
            <p className="text-xs font-medium">
              {isBn ? 'এখনো কোনো পদক্ষেপ রেকর্ড সংরক্ষণ করা হয়নি।' : 'No step records saved yet.'}
            </p>
            <p className="text-[11px] opacity-75">
              {isBn ? 'আজকের পদক্ষেপ সংখ্যা যোগ করে "দিনটি সেভ করুন" বাটনে চাপ দিন।' : 'Add your daily steps above and click "Log Day" to save.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 5).map((rec) => {
              const metGoal = rec.steps >= rec.goal;
              return (
                <div
                  key={rec.id}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between gap-2 shadow-2xs",
                    darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs",
                      metGoal ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                    )}>
                      <Footprints size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                        {formatHistoryDate(rec.date)}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        {formatNum(rec.distanceKm)} km • {formatNum(rec.calories)} kcal
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "font-black text-xs px-2.5 py-1 rounded-lg border font-mono",
                      metGoal 
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" 
                        : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-400/30"
                    )}>
                      {formatNum(rec.steps.toLocaleString())} {isBn ? 'কদম' : 'steps'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
