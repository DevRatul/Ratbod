import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Minus, RotateCcw, Target, Award, Bell, Check, Sparkles, Trash2, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WaterEntry {
  id: string;
  amountMl: number;
  glasses: number;
  timestamp: string;
}

interface DayHistory {
  date: string;
  consumedMl: number;
  goalMl: number;
}

interface WaterTrackerProps {
  darkMode: boolean;
  lang: 'en' | 'bn';
}

export default function WaterTracker({ darkMode, lang }: WaterTrackerProps) {
  // Goal state in glasses and glass size (default 12 glasses = 3900 ml = 3.9 Liters)
  const [goalGlasses, setGoalGlasses] = useState<number>(12);
  const [glassVolumeMl, setGlassVolumeMl] = useState<number>(325); // 12 glasses * 325ml = 3900ml (3.9 Liters)
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [reminderActive, setReminderActive] = useState<boolean>(false);
  const [customMlInput, setCustomMlInput] = useState<string>('');
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);

  // Modal custom goal state
  const [modalGlasses, setModalGlasses] = useState<string>('12');
  const [modalTotalMl, setModalTotalMl] = useState<string>('3900');
  const [modalGlassVolume, setModalGlassVolume] = useState<string>('325');

  const goalMl = goalGlasses * glassVolumeMl;

  // Calculate total consumed today
  const totalConsumedMl = entries.reduce((acc, curr) => acc + curr.amountMl, 0);
  const totalGlasses = totalConsumedMl / (glassVolumeMl || 250);
  const progressPercent = Math.min(100, Math.round((totalConsumedMl / (goalMl || 1)) * 100));

  // Load from LocalStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('ratbod_water_tracker_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.goalGlasses) setGoalGlasses(parsed.goalGlasses);
        if (parsed.glassVolumeMl) setGlassVolumeMl(parsed.glassVolumeMl);
        if (parsed.todayEntries && parsed.todayDate === new Date().toISOString().split('T')[0]) {
          setEntries(parsed.todayEntries);
        } else if (parsed.todayEntries && parsed.todayDate) {
          // Store yesterday into history before resetting
          const oldTotal = parsed.todayEntries.reduce((acc: number, c: WaterEntry) => acc + c.amountMl, 0);
          setHistory(prev => [{
            date: parsed.todayDate,
            consumedMl: oldTotal,
            goalMl: (parsed.goalGlasses || 12) * (parsed.glassVolumeMl || 250)
          }, ...prev].slice(0, 7));
          setEntries([]);
        }
        if (parsed.history) setHistory(parsed.history);
        if (parsed.reminderActive !== undefined) setReminderActive(parsed.reminderActive);
      }
    } catch (e) {
      console.error("Failed to load water tracker data", e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const dataToSave = {
        goalGlasses,
        glassVolumeMl,
        todayEntries: entries,
        todayDate,
        history,
        reminderActive
      };
      localStorage.setItem('ratbod_water_tracker_data', JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed to save water tracker data", e);
    }
  }, [goalGlasses, glassVolumeMl, entries, history, reminderActive]);

  // Labels for EN/BN
  const labels = {
    en: {
      title: "Daily Water Tracker",
      subtitle: "Track your hydration & stay energized all day",
      goalLabel: "Daily Target",
      glassesUnit: "glasses",
      mlUnit: "ml",
      litersUnit: "L",
      consumed: "Consumed Today",
      remaining: "Remaining",
      percentDone: "Completed",
      addGlass: "+1 Glass (250 ml)",
      addGlass400: "+1 Glass (400 ml)",
      addDoubleGlass: "+2 Glasses (500 ml)",
      addBottle: "+1 Bottle (750 ml)",
      addCustom: "Custom Amount",
      addBtn: "Add Water",
      undo: "Undo Last",
      resetToday: "Reset Today",
      setGoalTitle: "Set Daily Water Goal",
      selectGoalTip: "Target: 12 glasses = 3.9 L (3,900 ml) or 16 glasses = 4.0 L. Choose a preset or customize below.",
      preset8: "8 Glasses (2.0 L)",
      preset10: "10 Glasses (2.5 L)",
      preset12_39: "12 Glasses (3.9 L) ⭐ Target Goal",
      preset16: "16 Glasses (4.0 L) ⭐ 4 Liters",
      orManualHeading: "Or Set Custom Goal Manually",
      customGlassesLabel: "Number of Glasses",
      customTotalMlLabel: "Total Water Target (ml)",
      customGlassSizeLabel: "Glass Size (ml/glass)",
      customTotalLitersLabel: "Total Target in Liters",
      saveGoalBtn: "Save Goal",
      cancelBtn: "Cancel",
      todayLogs: "Today's Intake Log",
      emptyLogs: "No water logged today yet. Tap a button above to start!",
      hydrationStatusGoalReached: "Hydration Target Achieved! Great job keeping your body refreshed! 🎉",
      hydrationStatusAlmost: "Almost there! Keep sipping to reach your daily goal.",
      hydrationStatusStart: "Good start! Keep drinking water regularly today.",
      hydrationTipsTitle: "Hydration Tips",
      tip1: "💧 Drink a glass of water right after waking up to kickstart metabolism.",
      tip2: "🧠 Staying hydrated improves concentration, memory, and energy levels.",
      tip3: "🏋️ Drink extra water during exercise or warm weather to stay balanced.",
      reminderTitle: "Hydration Reminder",
      reminderSub: "Receive gentle hourly reminders to stay hydrated",
      reminderActiveMsg: "Hourly reminder enabled",
      reminderOffMsg: "Reminders muted",
      history7Days: "7-Day History",
    },
    bn: {
      title: "দৈনিক পানি ট্র্যাকার",
      subtitle: "আপনার পানিশূন্যতা রোধ করুন ও সতেজ থাকুন",
      goalLabel: "দৈনিক লক্ষ্য",
      glassesUnit: "গ্লাস",
      mlUnit: "মিলি",
      litersUnit: "লিটার",
      consumed: "আজ পান করেছেন",
      remaining: "অবশিষ্ট",
      percentDone: "সম্পন্ন",
      addGlass: "+১ গ্লাস (২৫০ মিলি)",
      addGlass400: "+১ গ্লাস (৪০০ মিলি)",
      addDoubleGlass: "+২ গ্লাস (৫০০ মিলি)",
      addBottle: "+১ বোতল (৭৫০ মিলি)",
      addCustom: "পছন্দমতো পরিমাণ",
      addBtn: "পানি যোগ করুন",
      undo: "আগেরটি মুছুন",
      resetToday: "আজকের হিসাব রিসেট",
      setGoalTitle: "দৈনিক পানির লক্ষ্য নির্ধারণ",
      selectGoalTip: "মূল লক্ষ্য: ১২ গ্লাস = ৩.৯ লিটার অথবা ১৬ গ্লাস = ৪.০ লিটার। প্রিসেট বা নিচে সেট করুন।",
      preset8: "৮ গ্লাস (২.০ লিটার)",
      preset10: "১০ গ্লাস (২.৫ লিটার)",
      preset12_39: "১২ গ্লাস (৩.৯ লিটার) ⭐ মূল লক্ষ্য",
      preset16: "১৬ গ্লাস (৪.০ লিটার) ⭐ ৪ লিটার",
      orManualHeading: "অথবা ম্যানুয়ালি পছন্দসই লক্ষ্য সেট করুন",
      customGlassesLabel: "গ্লাসের সংখ্যা",
      customTotalMlLabel: "মোট পানির লক্ষ্য (মিলি)",
      customGlassSizeLabel: "প্রতি গ্লাসের পরিমাণ (মিলি)",
      customTotalLitersLabel: "লিটারে মোট লক্ষ্য",
      saveGoalBtn: "লক্ষ্য সংরক্ষণ করুন",
      cancelBtn: "বাতিল",
      todayLogs: "আজকের পানির তালিকা",
      emptyLogs: "আজ এখনো কোনো পানি ট্র্যাকিং করা হয়নি। ওপরের বোতামে চাপ দিয়ে শুরু করুন!",
      hydrationStatusGoalReached: "অভিনন্দন! আজকের দৈনিক পানির লক্ষ্য পূর্ণ হয়েছে! 🎉",
      hydrationStatusAlmost: "খুব কাছাকাছি! লক্ষ্য পূরণে আর কিছুটা পানি পান করুন।",
      hydrationStatusStart: "চমৎকার শুরু! নিয়মিত পানি পান করে শরীর সতেজ রাখুন।",
      hydrationTipsTitle: "স্বাস্থ্য পরামর্শ",
      tip1: "💧 সকালে ঘুম থেকে উঠেই এক গ্লাস পানি পান করলে মেটাবলিজম বাড়ে।",
      tip2: "🧠 পর্যাপ্ত পানি পান মনোযোগ, স্মৃতিশক্তি ও শক্তি বৃদ্ধি করে।",
      tip3: "🏋️ ব্যায়াম বা গরম আবহাওয়ায় অতিরিক্ত পানি পান করে ভারসাম্য বজায় রাখুন।",
      reminderTitle: "পানি পানের রিমাইন্ডার",
      reminderSub: "সতেজ থাকতে নিয়মিত বিরতিতে তাগিদ পান",
      reminderActiveMsg: "প্রতি ঘণ্টার রিমাইন্ডার চালু আছে",
      reminderOffMsg: "রিমাইন্ডার বন্ধ",
      history7Days: "গত ৭ দিনের রেকর্ড",
    }
  }[lang];

  // Helper formatting for numbers in Bangla / English
  const formatNum = (num: number, decimals: number = 0): string => {
    const val = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    if (lang === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return val.replace(/\d/g, (d) => bnDigits[parseInt(d)]);
    }
    return val;
  };

  const handleAddWater = (amountMl: number) => {
    const newEntry: WaterEntry = {
      id: Date.now().toString(),
      amountMl,
      glasses: amountMl / (glassVolumeMl || 250),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setEntries(prev => [newEntry, ...prev]);
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customMlInput);
    if (!isNaN(val) && val > 0) {
      handleAddWater(val);
      setCustomMlInput('');
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(item => item.id !== id));
  };

  const handleResetToday = () => {
    if (entries.length === 0) return;
    setEntries([]);
  };

  const handleOpenGoalModal = () => {
    setModalGlasses(goalGlasses.toString());
    setModalGlassVolume(glassVolumeMl.toString());
    setModalTotalMl((goalGlasses * glassVolumeMl).toString());
    setShowGoalModal(true);
  };

  const handleModalGlassesChange = (val: string) => {
    setModalGlasses(val);
    const numG = parseFloat(val);
    const numV = parseFloat(modalGlassVolume);
    if (!isNaN(numG) && numG >= 0 && !isNaN(numV) && numV > 0) {
      setModalTotalMl(Math.round(numG * numV).toString());
    }
  };

  const handleModalTotalMlChange = (val: string) => {
    setModalTotalMl(val);
    const numMl = parseFloat(val);
    const numV = parseFloat(modalGlassVolume);
    if (!isNaN(numMl) && numMl >= 0 && !isNaN(numV) && numV > 0) {
      setModalGlasses((Math.round((numMl / numV) * 10) / 10).toString());
    }
  };

  const handleModalGlassVolumeChange = (val: string) => {
    setModalGlassVolume(val);
    const numV = parseFloat(val);
    const numG = parseFloat(modalGlasses);
    if (!isNaN(numG) && numG >= 0 && !isNaN(numV) && numV > 0) {
      setModalTotalMl(Math.round(numG * numV).toString());
    }
  };

  const handleSaveGoal = () => {
    const g = parseFloat(modalGlasses);
    const v = parseFloat(modalGlassVolume) || 250;
    const total = parseFloat(modalTotalMl);

    if (!isNaN(g) && g > 0 && !isNaN(v) && v > 0) {
      setGoalGlasses(g);
      setGlassVolumeMl(v);
      setShowGoalModal(false);
    } else if (!isNaN(total) && total > 0 && !isNaN(v) && v > 0) {
      setGoalGlasses(Math.round((total / v) * 10) / 10);
      setGlassVolumeMl(v);
      setShowGoalModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header Banner - Bluish styling */}
      <div className={cn(
        "p-6 rounded-3xl border transition-all relative overflow-hidden",
        darkMode
          ? "bg-gradient-to-r from-blue-950/80 via-sky-950/50 to-blue-900/60 border-blue-500/20 shadow-lg shadow-blue-950/30"
          : "bg-gradient-to-r from-blue-500/10 via-sky-400/10 to-blue-600/10 border-blue-200/80 shadow-sm"
      )}>
        {/* Background glow circle */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between text-center sm:text-left gap-4 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0 mx-auto sm:mx-0">
              <Droplet size={26} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-blue-500 dark:text-blue-400 flex items-center justify-center sm:justify-start gap-2">
                {labels.title}
              </h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                {labels.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenGoalModal}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0 border",
              darkMode
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            )}
          >
            <Target size={16} />
            <span>{labels.goalLabel}: {formatNum(goalGlasses)} {labels.glassesUnit} ({formatNum(goalMl / 1000, 1)} {labels.litersUnit})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Card 1 (Progress Display & Cup), Card 2 (Quick Actions & Input) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Progress & Cup Visualization */}
        <div className={cn(
          "lg:col-span-5 p-6 rounded-3xl border flex flex-col items-center justify-between gap-6 relative overflow-hidden",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
        )}>
          <div className="w-full flex items-center justify-between border-b pb-3 border-gray-200/20 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {labels.consumed}
            </span>
            <span className="text-xs font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">
              {formatNum(progressPercent)}% {labels.percentDone}
            </span>
          </div>

          {/* Cup Animation Wrapper */}
          <div className="relative my-2 flex flex-col items-center justify-center">
            {/* Liquid Cup Container */}
            <div className="w-36 h-48 rounded-b-3xl rounded-t-lg border-4 border-blue-400/50 dark:border-blue-500/40 relative overflow-hidden bg-blue-900/10 backdrop-blur-xs flex flex-col justify-end shadow-inner">
              {/* Fill level animation */}
              <motion.div
                className="w-full bg-gradient-to-t from-blue-600 via-cyan-500 to-sky-400 relative"
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Wave effect overlay */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 animate-pulse" />
              </motion.div>

              {/* Cup inner text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-10 pointer-events-none drop-shadow-md">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatNum(totalGlasses, 1)}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-blue-200">
                  / {formatNum(goalGlasses)} {labels.glassesUnit}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-cyan-200 mt-1">
                  ({formatNum(totalConsumedMl)} {labels.mlUnit})
                </span>
              </div>
            </div>
          </div>

          {/* Message Banner */}
          <div className={cn(
            "w-full text-center p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border",
            progressPercent >= 100
              ? (darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
              : progressPercent >= 50
              ? (darkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200")
              : (darkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")
          )}>
            {progressPercent >= 100 ? (
              <>
                <Award size={16} className="text-emerald-500 shrink-0" />
                <span>{labels.hydrationStatusGoalReached}</span>
              </>
            ) : progressPercent >= 50 ? (
              <>
                <Sparkles size={16} className="text-blue-500 shrink-0" />
                <span>{labels.hydrationStatusAlmost}</span>
              </>
            ) : (
              <>
                <Droplet size={16} className="text-amber-500 shrink-0" />
                <span>{labels.hydrationStatusStart}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Add Buttons & Controls */}
        <div className={cn(
          "lg:col-span-7 p-6 rounded-3xl border space-y-6",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
        )}>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              {lang === 'bn' ? 'পানি পান ট্র্যাকিং বাটন' : 'Quick Water Logging'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'bn' ? 'প্রতিবার পানি পান করার পর নিচের যেকোনো বাটনে ট্যাপ করুন' : 'Tap any button whenever you drink water'}
            </p>
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleAddWater(250)}
              className={cn(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                  : "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:rotate-12 transition-transform">
                <Droplet size={18} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-center">{labels.addGlass}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddWater(400)}
              className={cn(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                  : "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
                <Droplet size={20} className="fill-current" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-center">{labels.addGlass400}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddWater(500)}
              className={cn(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                  : "bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:rotate-12 transition-transform">
                <div className="flex -space-x-1">
                  <Droplet size={14} />
                  <Droplet size={14} />
                </div>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-center">{labels.addDoubleGlass}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddWater(750)}
              className={cn(
                "p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
                  : "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:rotate-12 transition-transform">
                <Droplet size={20} className="fill-current" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-center">{labels.addBottle}</span>
            </button>
          </div>

          {/* Custom Amount Form */}
          <form onSubmit={handleCustomAdd} className="space-y-2 pt-2 border-t border-gray-200/20 dark:border-white/5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {labels.addCustom} ({labels.mlUnit})
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="10"
                  placeholder="e.g. 350"
                  value={customMlInput}
                  onChange={(e) => setCustomMlInput(e.target.value)}
                  className={cn(
                    "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all border",
                    darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  {labels.mlUnit}
                </span>
              </div>
              <button
                type="submit"
                disabled={!customMlInput || parseFloat(customMlInput) <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus size={16} />
                {labels.addBtn}
              </button>
            </div>
          </form>

          {/* Control Actions Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                if (entries.length > 0) {
                  handleDeleteEntry(entries[0].id);
                }
              }}
              disabled={entries.length === 0}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                darkMode ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <RotateCcw size={14} />
              <span>{labels.undo}</span>
            </button>

            <button
              onClick={handleResetToday}
              disabled={entries.length === 0}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
              )}
            >
              <Trash2 size={14} />
              <span>{labels.resetToday}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Intake Logs & Reminder Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Today's Log List */}
        <div className={cn(
          "lg:col-span-7 p-6 rounded-3xl border space-y-4",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
        )}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-200/20 dark:border-white/5">
            <h3 className="text-sm font-bold tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              {labels.todayLogs} ({formatNum(entries.length)})
            </h3>
            <span className="text-xs font-extrabold text-blue-500">
              {formatNum(totalConsumedMl)} / {formatNum(goalMl)} {labels.mlUnit}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 font-medium">
              {labels.emptyLogs}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              <AnimatePresence>
                {entries.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between transition-colors",
                      darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Droplet size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                          +{formatNum(item.amountMl)} {labels.mlUnit} ({formatNum(item.glasses, 1)} {labels.glassesUnit})
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Reminder & Health Tips Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Reminder Card */}
          <div className={cn(
            "p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all",
            darkMode ? "bg-blue-950/30 border-blue-500/20" : "bg-blue-50/80 border-blue-200"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {labels.reminderTitle}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {reminderActive ? labels.reminderActiveMsg : labels.reminderOffMsg}
                </p>
              </div>
            </div>

            <button
              onClick={() => setReminderActive(!reminderActive)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer shrink-0",
                reminderActive ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform shadow-xs",
                reminderActive ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Hydration Tips Card */}
          <div className={cn(
            "p-5 rounded-3xl border space-y-3",
            darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
          )}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
              <Info size={14} />
              {labels.hydrationTipsTitle}
            </h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                {labels.tip1}
              </p>
              <p className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                {labels.tip2}
              </p>
              <p className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                {labels.tip3}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Selector Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-3xl border shadow-2xl my-auto",
                darkMode ? "bg-[#121824] border-blue-500/30 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/20 dark:border-white/10 shrink-0">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-blue-500">
                  <Target size={20} />
                  {labels.setGoalTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto space-y-4 pr-1 py-2 my-1 shrink text-xs">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {labels.selectGoalTip}
                </p>

                {/* Goal Presets (4 Clean Options) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { glasses: 8, vol: 250, totalMl: 2000, label: labels.preset8 },
                    { glasses: 10, vol: 250, totalMl: 2500, label: labels.preset10 },
                    { glasses: 12, vol: 325, totalMl: 3900, label: labels.preset12_39 },
                    { glasses: 16, vol: 250, totalMl: 4000, label: labels.preset16 },
                  ].map((opt, idx) => {
                    const isSelected = (parseFloat(modalGlasses) === opt.glasses && Math.abs(parseFloat(modalTotalMl) - opt.totalMl) < 10);
                    return (
                      <button
                        key={`${opt.glasses}-${idx}`}
                        type="button"
                        onClick={() => {
                          handleModalGlassesChange(opt.glasses.toString());
                          handleModalTotalMlChange(opt.totalMl.toString());
                        }}
                        className={cn(
                          "p-2.5 sm:p-3 rounded-2xl text-left text-xs font-bold transition-all border flex items-center justify-between cursor-pointer",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30 scale-[1.01]"
                            : (darkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-200 hover:bg-gray-100")
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Goal Manual Inputs */}
                <div className="space-y-3 pt-3 border-t border-gray-200/20 dark:border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    {labels.orManualHeading}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Number of Glasses */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        {labels.customGlassesLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="0.5"
                          value={modalGlasses}
                          onChange={(e) => handleModalGlassesChange(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                            darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {labels.glassesUnit}
                        </span>
                      </div>
                    </div>

                    {/* Total Water Target (ml) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        {labels.customTotalMlLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="100"
                          step="50"
                          value={modalTotalMl}
                          onChange={(e) => handleModalTotalMlChange(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                            darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {labels.mlUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Glass Size / Volume */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      {labels.customGlassSizeLabel}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="50"
                        step="10"
                        value={modalGlassVolume}
                        onChange={(e) => handleModalGlassVolumeChange(e.target.value)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                          darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {labels.mlUnit} / glass
                      </span>
                    </div>
                  </div>

                  {/* Real-time calculated summary */}
                  <div className={cn(
                    "p-3 rounded-xl border flex items-center justify-between text-xs font-bold",
                    darkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                  )}>
                    <span>{labels.customTotalLitersLabel}:</span>
                    <span className="text-sm font-black text-blue-500 dark:text-blue-400">
                      {formatNum((parseFloat(modalTotalMl) || 0) / 1000, 2)} {labels.litersUnit} ({formatNum(parseFloat(modalTotalMl) || 0)} {labels.mlUnit})
                    </span>
                  </div>
                </div>
              </div>

              {/* Fixed Action Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200/20 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  {labels.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  {labels.saveGoalBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
