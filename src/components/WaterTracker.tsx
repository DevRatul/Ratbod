import React, { useState, useEffect } from 'react';
import { Droplet, GlassWater, Plus, Minus, RotateCcw, Target, Award, Bell, Check, Sparkles, Trash2, Calendar, Info, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  // Goal state in glasses and glass size (default 10 glasses = 4000 ml = 4.0 Liters)
  const [goalGlasses, setGoalGlasses] = useState<number>(16);
  const [glassVolumeMl, setGlassVolumeMl] = useState<number>(250); // 10 glasses * 400ml = 4000ml (4.0 Liters)
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [reminderActive, setReminderActive] = useState<boolean>(false);
  const [customMlInput, setCustomMlInput] = useState<string>('');
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);

  // Modal custom goal state
  const [modalGlasses, setModalGlasses] = useState<string>('16');
  const [modalTotalMl, setModalTotalMl] = useState<string>('4000');
  const [modalGlassVolume, setModalGlassVolume] = useState<string>('250');

  // Manual Hydration Timer state (30 min, 45 min, 50 min, 90 min presets)
  const [timerMinutes, setTimerMinutes] = useState<number>(30);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [customTimerInput, setCustomTimerInput] = useState<string>('');

  const goalMl = goalGlasses * glassVolumeMl;
  const totalConsumedMl = entries.reduce((acc, curr) => acc + curr.amountMl, 0);
  const totalGlasses = totalConsumedMl / (glassVolumeMl || 250);
  const progressPercent = Math.min(100, Math.round((totalConsumedMl / (goalMl || 1)) * 100));

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Firestore & LocalStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        let parsed = null;
        const user = auth.currentUser;
        
        if (user) {
          try {
            const docRef = doc(db, 'users', user.uid, 'appData', 'waterTracker');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              parsed = docSnap.data();
            }
          } catch (e) {}
        }

        if (!parsed) {
          const savedData = localStorage.getItem('ratbod_water_tracker_data');
          if (savedData) parsed = JSON.parse(savedData);
        }

        if (parsed) {
          if (parsed.goalGlasses === 10 && parsed.glassVolumeMl === 400) {
            setGoalGlasses(16);
            setGlassVolumeMl(250);
          } else {
            if (parsed.goalGlasses) setGoalGlasses(parsed.goalGlasses);
            if (parsed.glassVolumeMl) setGlassVolumeMl(parsed.glassVolumeMl);
          }
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
      setIsLoaded(true);
    };
    loadData();
  }, []);

  // Save to Firestore & LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
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
      
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'waterTracker'), dataToSave, { merge: true }).catch(e => {});
      }
    } catch (e) {
      console.error("Failed to save water tracker data", e);
    }
  }, [goalGlasses, glassVolumeMl, entries, history, reminderActive]);

  // Audio Alarm chime synthesizer
  const playHydrationAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(delay % 0.5 === 0 ? 880 : 1046.5, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch (e) {
      console.error("Failed to play alarm chime", e);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev === null || prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (isTimerRunning && timerSecondsLeft === 0) {
      setIsTimerRunning(false);
      setShowAlarmModal(true);
      playHydrationAlarmSound();
    }
  }, [isTimerRunning, timerSecondsLeft]);

  const handleStartTimer = (mins: number) => {
    setTimerMinutes(mins);
    setTimerSecondsLeft(mins * 60);
    setIsTimerRunning(true);
    setReminderActive(true);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(null);
  };

  const formatTimerDisplay = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Continuous alarm chime effect while alarm modal is open
  useEffect(() => {
    let soundInterval: any = null;
    if (showAlarmModal) {
      playHydrationAlarmSound();
      soundInterval = setInterval(() => {
        playHydrationAlarmSound();
      }, 2000);
    }
    return () => {
      if (soundInterval) clearInterval(soundInterval);
    };
  }, [showAlarmModal]);

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

  // Play sound when water is consumed (crisp water drop swoop & pop)
  const playWaterDropSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Primary liquid drop sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1300, now + 0.08);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);

      // Secondary drop bubble pop resonance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1150, now + 0.035);
      osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.09);

      gain2.gain.setValueAtTime(0.001, now + 0.035);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.035);
      osc2.stop(now + 0.16);
    } catch {
      // Audio context fallback
    }
  };

  // Play pleasant celebratory audio chime on target completion
  const playVictorySound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Celebratory cheerful fanfare arpeggio: C5, E5, G5, B5, C6 + shimmer
      const notes = [
        { freq: 523.25, time: 0, duration: 0.22 },     // C5
        { freq: 659.25, time: 0.10, duration: 0.22 },  // E5
        { freq: 783.99, time: 0.20, duration: 0.25 },  // G5
        { freq: 987.77, time: 0.30, duration: 0.30 },  // B5
        { freq: 1046.50, time: 0.42, duration: 0.65 }, // C6
        { freq: 1318.51, time: 0.46, duration: 0.60 }  // E6
      ];

      const now = ctx.currentTime;

      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Warm bell tone
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.28, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration + 0.05);
      });
    } catch {
      // AudioContext fallback handling
    }
  };

  const handleAddWater = (amountMl: number) => {
    const previousConsumed = totalConsumedMl;
    const newTotal = previousConsumed + amountMl;

    // Play target completion victory sound when user hits or exceeds goal from below
    if (previousConsumed < goalMl && newTotal >= goalMl) {
      playVictorySound();
    } else {
      playWaterDropSound();
    }

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
    <div className="space-y-4 max-w-5xl mx-auto pb-6">

      {/* Main Grid: Card 1 (Progress Display & Cup), Card 2 (Quick Actions & Input) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Progress & Interactive Radial Hydration Ring Card */}
        <div className={cn(
          "lg:col-span-5 p-4 sm:p-5 rounded-2xl border flex flex-col items-center justify-between gap-3 relative overflow-hidden transition-all",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xs"
        )}>
          {/* Header: Consumed Label + Percentage Badge */}
          <div className="w-full flex items-center justify-between border-b pb-2.5 border-gray-200/20 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
              <Droplet size={15} className="text-blue-500 fill-blue-500/20" />
              {labels.consumed}
            </span>
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {formatNum(progressPercent)}% {labels.percentDone}
            </span>
          </div>

          {/* Glass Cup with Liquid Fill, Left (250ml) & Right (400ml) Quick Glass Buttons */}
          <div className="relative my-1 flex flex-col items-center justify-center w-full">
            <div className="flex items-center justify-center gap-2.5 sm:gap-4 w-full">
              {/* Left Side: 400 ml Glass Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handleAddWater(400)}
                title={lang === 'bn' ? '৪০০ মিলি যোগ করুন' : 'Add 400 ml'}
                className={cn(
                  "flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer group shadow-2xs shrink-0",
                  darkMode
                    ? "bg-blue-600/10 border-blue-600/30 text-blue-300 hover:bg-blue-600/20"
                    : "bg-blue-100/90 border-blue-300 text-blue-900 hover:bg-blue-200"
                )}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-600/30 group-hover:scale-110 transition-transform">
                  <Droplet size={16} className="fill-current" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-extrabold mt-1 text-center whitespace-nowrap">
                  400 {labels.mlUnit}
                </span>
              </motion.button>

              {/* Glass Tumbler Container with Liquid Water Fill (Display Only) */}
              <div className={cn(
                "relative w-28 h-36 sm:w-32 sm:h-40 rounded-b-[2.2rem] rounded-t-md border-x-4 border-b-4 border-t-2 border-blue-400/80 dark:border-blue-500/70 flex items-center justify-center shadow-xl shadow-blue-500/20 overflow-hidden transition-all shrink-0",
                darkMode ? "bg-slate-950/90" : "bg-blue-50/90"
              )}>
                {/* Vertical Glass Shine Reflection */}
                <div className="absolute left-2 top-2 bottom-4 w-1.5 bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-full z-20 pointer-events-none" />

                {/* Measurement Notch Lines on Right Side */}
                <div className="absolute right-1.5 top-4 bottom-4 flex flex-col justify-between z-20 pointer-events-none opacity-50">
                  <div className="w-1.5 h-0.5 bg-blue-500 dark:bg-blue-300" />
                  <div className="w-2.5 h-0.5 bg-blue-500 dark:bg-blue-300" />
                  <div className="w-1.5 h-0.5 bg-blue-500 dark:bg-blue-300" />
                  <div className="w-3 h-0.5 bg-blue-500 dark:bg-blue-300" />
                </div>

                {/* Liquid Water Level Fill (Sea Water Gradient) */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-blue-800 via-blue-600 to-sky-400 pointer-events-none"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.min(100, progressPercent)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {/* Wave effect at top of water surface */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/50 animate-pulse" />
                </motion.div>

                {/* Center Display Overlay */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-1.5 select-none pointer-events-none backdrop-blur-[1px]">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-md text-blue-600 dark:text-blue-200 flex items-center justify-center mb-0.5 shadow-2xs">
                    <Droplet size={13} className="fill-current animate-pulse" />
                  </div>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-sm">
                    {formatNum(totalGlasses, 1)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-blue-100 mt-0.5 drop-shadow-2xs">
                    / {formatNum(goalGlasses)} {labels.glassesUnit}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-700 dark:text-blue-100 mt-0.5 drop-shadow-2xs">
                    {formatNum(totalConsumedMl)} {labels.mlUnit}
                  </span>
                </div>
              </div>

              {/* Right Side: 250 ml Glass Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handleAddWater(250)}
                title={lang === 'bn' ? '২৫০ মিলি যোগ করুন' : 'Add 250 ml'}
                className={cn(
                  "flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer group shadow-2xs shrink-0",
                  darkMode
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                    : "bg-blue-50/90 border-blue-200 text-blue-800 hover:bg-blue-100"
                )}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Droplet size={15} className="fill-current" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-extrabold mt-1 text-center whitespace-nowrap">
                  250 {labels.mlUnit}
                </span>
              </motion.button>
            </div>

            {/* Hydration Status Label */}
            <span className="text-[10px] text-gray-700 dark:text-gray-400 mt-2 font-medium flex items-center gap-1">
              <Sparkles size={11} className="text-blue-400 animate-pulse" />
              {lang === 'bn' ? 'দৈনিক হাইড্রেশন গ্লাস' : 'Daily Hydration Glass'}
            </span>
          </div>

          {/* Consumed & Remaining Stats Bar */}
          <div className="w-full grid grid-cols-2 gap-2 text-center">
            <div className={cn(
              "p-2 rounded-xl border flex flex-col items-center justify-center",
              darkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50/70 border-blue-100"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-400">
                {lang === 'bn' ? 'পান করা হয়েছে' : 'Consumed'}
              </span>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                {formatNum(totalConsumedMl)} {labels.mlUnit}
              </span>
            </div>

            <div className={cn(
              "p-2 rounded-xl border flex flex-col items-center justify-center",
              darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-400">
                {lang === 'bn' ? 'বাকি আছে' : 'Remaining'}
              </span>
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mt-0.5">
                {formatNum(Math.max(0, goalMl - totalConsumedMl))} {labels.mlUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Add Buttons & Controls - Compressed Card */}
        <div className={cn(
          "lg:col-span-7 p-4 sm:p-5 rounded-2xl border space-y-4 flex flex-col justify-between",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xs"
        )}>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Plus size={16} className="text-blue-500" />
              {lang === 'bn' ? 'পানি পান ট্র্যাকিং বাটন' : 'Quick Water Logging'}
            </h3>
            <p className="text-[11px] text-gray-700 mt-0.5">
              {lang === 'bn' ? 'প্রতিবার পানি পান করার পর নিচের যেকোনো বাটনে ট্যাপ করুন' : 'Tap any button whenever you drink water'}
            </p>
          </div>

          {/* Quick Presets Grid - Sea Water Blue Theme */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAddWater(100)}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                  : "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs shadow-blue-500/20 group-hover:rotate-12 transition-transform shrink-0">
                <Droplet size={14} />
              </div>
              <span className="text-[11px] font-bold text-center sm:text-left">
                100 {labels.mlUnit}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAddWater(300)}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-blue-600/10 border-blue-600/30 text-blue-300 hover:bg-blue-600/20"
                  : "bg-blue-100/80 border-blue-300 text-blue-900 hover:bg-blue-200"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20 group-hover:rotate-12 transition-transform shrink-0">
                <Droplet size={15} className="fill-current" />
              </div>
              <span className="text-[11px] font-bold text-center sm:text-left">
                300 {labels.mlUnit}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAddWater(500)}
              className={cn(
                "p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                darkMode
                  ? "bg-blue-700/10 border-blue-700/30 text-blue-300 hover:bg-blue-700/20"
                  : "bg-blue-100/90 border-blue-300 text-blue-900 hover:bg-blue-200"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs shadow-blue-600/20 group-hover:rotate-12 transition-transform shrink-0">
                <Droplet size={15} className="fill-current" />
              </div>
              <span className="text-[11px] font-bold text-center sm:text-left">
                500 {labels.mlUnit} ({lang === 'bn' ? 'বোতল' : 'bottle'})
              </span>
            </button>
          </div>

          {/* Custom Amount Form - Sea Water Blue */}
          <form onSubmit={handleCustomAdd} className="space-y-1.5 pt-2 border-t border-gray-200/20 dark:border-white/5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
              {labels.addCustom} ({labels.mlUnit})
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 150"
                  value={customMlInput}
                  onChange={(e) => setCustomMlInput(e.target.value)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-base sm:text-xs focus:outline-none focus:border-blue-500 transition-all border",
                    darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-700 dark:text-gray-400">
                  {labels.mlUnit}
                </span>
              </div>
              <button
                type="submit"
                disabled={!customMlInput || parseFloat(customMlInput) <= 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0 shadow-xs shadow-blue-500/30"
              >
                <Plus size={14} />
                {labels.addBtn}
              </button>
            </div>
          </form>

          {/* Control Actions Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                if (entries.length > 0) {
                  handleDeleteEntry(entries[0].id);
                }
              }}
              disabled={entries.length === 0}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                darkMode ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <RotateCcw size={13} />
              <span>{labels.undo}</span>
            </button>

            <button
              onClick={handleResetToday}
              disabled={entries.length === 0}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
              )}
            >
              <Trash2 size={13} />
              <span>{labels.resetToday}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reminder & Timer Card placed at TOP */}
      <div className={cn(
        "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3",
        darkMode ? "bg-blue-950/30 border-blue-500/20" : "bg-blue-50/80 border-blue-200"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
              <Bell size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                {labels.reminderTitle}
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  {lang === 'bn' ? 'টাইমার' : 'Timer'}
                </span>
              </h4>
              <p className="text-[10px] text-gray-700 dark:text-gray-400 mt-0.5">
                {reminderActive 
                  ? (isTimerRunning 
                      ? (lang === 'bn' ? 'টাইমার চালূ আছে - এলার্ম বাজবে' : 'Countdown active - Alarm on') 
                      : labels.reminderActiveMsg) 
                  : labels.reminderOffMsg}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const nextState = !reminderActive;
              setReminderActive(nextState);
              if (!nextState) handleStopTimer();
            }}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0",
              reminderActive ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
              reminderActive ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>

        {/* Manual Water Intake Timer Controls (When Reminder Active) */}
        {reminderActive && (
          <div className="pt-2 border-t border-blue-500/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                {lang === 'bn' ? 'পরবর্তী পানির সময় টাইমার:' : 'Set Upcoming Intake Timer:'}
              </span>
              {isTimerRunning && timerSecondsLeft !== null && (
                <span className="text-xs font-black text-rose-500 dark:text-rose-400 animate-pulse font-mono bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  ⏱️ {formatTimerDisplay(timerSecondsLeft)}
                </span>
              )}
            </div>

            {/* Preset Timer Buttons: 30 min, 45 min, 50 min, 90 min */}
            <div className="grid grid-cols-4 gap-1.5">
              {[30, 45, 50, 90].map((mins) => {
                const isSelected = timerMinutes === mins && isTimerRunning;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleStartTimer(mins)}
                    className={cn(
                      "py-1.5 px-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border text-center flex flex-col items-center justify-center",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30 scale-105"
                        : (darkMode ? "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300" : "bg-white border-blue-200 hover:bg-blue-100 text-gray-800")
                    )}
                    title={`Set alarm in ${mins} minutes`}
                  >
                    <span>{mins}m</span>
                    <span className="text-[8px] font-medium opacity-80">{lang === 'bn' ? 'মিনিট' : 'min'}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Controls: Custom input or Reset Timer */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="300"
                  placeholder={lang === 'bn' ? 'পছন্দমতো মিনিট' : 'Custom mins'}
                  value={customTimerInput}
                  onChange={(e) => setCustomTimerInput(e.target.value)}
                  className={cn(
                    "w-full rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 border font-bold",
                    darkMode ? "bg-black/30 border-white/10 text-white" : "bg-white border-blue-200 text-gray-900"
                  )}
                />
              </div>

              <button
                type="button"
                disabled={!customTimerInput || parseInt(customTimerInput) <= 0}
                onClick={() => {
                  const val = parseInt(customTimerInput);
                  if (val > 0) {
                    handleStartTimer(val);
                    setCustomTimerInput('');
                  }
                }}
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {lang === 'bn' ? 'শুরু' : 'Start'}
              </button>

              {isTimerRunning && (
                <button
                  type="button"
                  onClick={handleStopTimer}
                  className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 text-xs font-bold transition-all cursor-pointer shrink-0 border border-red-500/30"
                >
                  {lang === 'bn' ? 'থামুন' : 'Stop'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Intake Logs & Reminder Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Today's Log List */}
        <div className={cn(
          "lg:col-span-7 p-4 sm:p-5 rounded-2xl border space-y-3",
          darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xs"
        )}>
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/20 dark:border-white/5">
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Calendar size={15} className="text-blue-500" />
              {labels.todayLogs} ({formatNum(entries.length)})
            </h3>
            <span className="text-xs font-extrabold text-blue-500">
              {formatNum(totalConsumedMl)} / {formatNum(goalMl)} {labels.mlUnit}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-700 font-medium">
              {labels.emptyLogs}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {entries.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between transition-colors",
                      darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Droplet size={14} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                          +{formatNum(item.amountMl)} {labels.mlUnit} ({formatNum(item.glasses, 1)} {labels.glassesUnit})
                        </span>
                        <span className="text-[10px] text-gray-700 dark:text-gray-400 font-medium">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-1.5 rounded-lg text-gray-700 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Reminder & Health Tips Column */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Compressed Goal Setting Card - Slim Single Line */}
          <div className={cn(
            "px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all",
            darkMode
              ? "bg-gradient-to-r from-blue-950/70 to-indigo-950/50 border-blue-500/20 shadow-xs"
              : "bg-gradient-to-r from-blue-50 to-sky-50/60 border-blue-200/80 shadow-xs"
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
                <Target size={14} />
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold leading-tight">
                <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {labels.goalLabel}:
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold whitespace-nowrap">
                  {formatNum(goalGlasses)} {labels.glassesUnit} ({formatNum(goalMl / 1000, 1)} {labels.litersUnit})
                </span>
              </div>
            </div>

            <button
              onClick={handleOpenGoalModal}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-2xs whitespace-nowrap",
                darkMode
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                  : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
              )}
            >
              <Target size={12} />
              <span>{lang === 'bn' ? 'লক্ষ্য নির্ধারণ' : 'Set Goal'}</span>
            </button>
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
                darkMode ? "bg-[#081826] border-blue-500/30 text-white" : "bg-white border-gray-200 text-gray-900"
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
                  className="p-1 rounded-lg text-gray-700 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto space-y-4 pr-1 py-2 my-1 shrink text-xs">
                <p className="text-xs text-gray-700 dark:text-gray-400">
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
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-400">
                        {labels.customGlassesLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="any"
                          value={modalGlasses}
                          onChange={(e) => handleModalGlassesChange(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-base sm:text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                            darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700 dark:text-gray-400">
                          {labels.glassesUnit}
                        </span>
                      </div>
                    </div>

                    {/* Total Water Target (ml) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-400">
                        {labels.customTotalMlLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={modalTotalMl}
                          onChange={(e) => handleModalTotalMlChange(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-3 py-2 text-base sm:text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                            darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700 dark:text-gray-400">
                          {labels.mlUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Glass Size / Volume */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-400">
                      {labels.customGlassSizeLabel}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={modalGlassVolume}
                        onChange={(e) => handleModalGlassVolumeChange(e.target.value)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-base sm:text-sm font-semibold focus:outline-none focus:border-blue-500 border",
                          darkMode ? "bg-transparent border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700 dark:text-gray-400">
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
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

      {/* Hydration Alarm Popup Modal when countdown hits 0 */}
      <AnimatePresence>
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={cn(
                "w-full max-w-sm p-6 rounded-3xl border shadow-2xl text-center space-y-4 relative overflow-hidden",
                darkMode ? "bg-[#0a1828] border-blue-500/40 text-white" : "bg-white border-blue-300 text-gray-900"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/40 animate-bounce">
                <Bell size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-blue-500 dark:text-blue-400 tracking-tight">
                  {lang === 'bn' ? '⏰ পানি পানের সময় হয়েছে!' : '⏰ Time to Drink Water!'}
                </h3>
                <p className="text-xs text-gray-700 dark:text-gray-400 font-medium">
                  {lang === 'bn'
                    ? 'আপনার হাইড্রেশন টাইমার শেষ হয়েছে। এখনই এক গ্লাস পানি পান করুন ও সতেজ থাকুন!'
                    : 'Your hydration timer ended! Drink a glass of water now to stay hydrated and energized.'
                  }
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddWater(250);
                      setShowAlarmModal(false);
                    }}
                    className="py-2.5 px-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Droplet size={14} className="fill-current shrink-0" />
                    <span>{lang === 'bn' ? '+২৫০ মিলি' : '+250 ml'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleAddWater(400);
                      setShowAlarmModal(false);
                    }}
                    className="py-2.5 px-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Droplet size={14} className="fill-current shrink-0" />
                    <span>{lang === 'bn' ? '+৪০০ মিলি' : '+400 ml'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAlarmModal(false)}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border mt-1",
                    darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {lang === 'bn' ? 'এলার্ম বন্ধ করুন (Dismiss)' : 'Dismiss Alarm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
