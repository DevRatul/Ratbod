import React, { useState, useEffect } from 'react';
import { Droplet, GlassWater, Plus, Minus, RotateCcw, Target, Award, Bell, Check, Sparkles, Trash2, Calendar, Info, Volume2, VolumeX, Clock, History as HistoryIcon, ArrowLeft, Moon, ChevronDown, ChevronUp, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WaterEntry {
  id: string;
  amountMl: number;
  glasses: number;
  timestamp: string;
  createdAt?: number;
}

interface DayHistory {
  date: string;
  consumedMl: number;
  goalMl: number;
}

interface SleepRecord {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  totalMinutes: number;
  durationDisplay: string;
  createdAt: number;
}

interface WaterTrackerProps {
  darkMode: boolean;
  lang: 'en' | 'bn';
}

export default function WaterTracker({ darkMode, lang }: WaterTrackerProps) {
  // Goal state in glasses and glass size (reads user-selected target from localStorage immediately on boot)
  const [goalGlasses, setGoalGlasses] = useState<number>(() => {
    try {
      const savedData = localStorage.getItem('ratbod_water_tracker_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (typeof parsed.goalGlasses === 'number' && parsed.goalGlasses > 0) {
          return parsed.goalGlasses;
        }
      }
    } catch (e) {}
    return 12;
  });
  const [glassVolumeMl, setGlassVolumeMl] = useState<number>(() => {
    try {
      const savedData = localStorage.getItem('ratbod_water_tracker_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (typeof parsed.glassVolumeMl === 'number' && parsed.glassVolumeMl > 0) {
          return parsed.glassVolumeMl;
        }
      }
    } catch (e) {}
    return 250;
  });
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [reminderActive, setReminderActive] = useState<boolean>(false);
  const [customMlInput, setCustomMlInput] = useState<string>('');
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Modal custom goal state
  const [modalGlasses, setModalGlasses] = useState<string>(() => goalGlasses.toString());
  const [modalTotalMl, setModalTotalMl] = useState<string>(() => (goalGlasses * glassVolumeMl).toString());
  const [modalGlassVolume, setModalGlassVolume] = useState<string>(() => glassVolumeMl.toString());

  // Manual Hydration Timer state (30 min, 45 min, 50 min, 90 min presets)
  const [timerMinutes, setTimerMinutes] = useState<number>(30);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [customTimerInput, setCustomTimerInput] = useState<string>('');

  // Sleep Calculator & History State
  const [sleepBedTime, setSleepBedTime] = useState<string>(() => {
    return localStorage.getItem('ratbod_sleep_bed') || '23:00';
  });
  const [sleepWakeTime, setSleepWakeTime] = useState<string>(() => {
    return localStorage.getItem('ratbod_sleep_wake') || '07:00';
  });
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_sleep_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showSleepHistoryModal, setShowSleepHistoryModal] = useState<boolean>(false);
  const [sleepSavedToast, setSleepSavedToast] = useState<boolean>(false);
  const [isSleepDropdownOpen, setIsSleepDropdownOpen] = useState<boolean>(false);
  const [selectedSleepDate, setSelectedSleepDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const goalMl = goalGlasses * glassVolumeMl;
  const totalConsumedMl = entries.reduce((acc, curr) => acc + curr.amountMl, 0);
  const totalGlasses = totalConsumedMl / (glassVolumeMl || 250);
  const progressPercent = Math.min(100, Math.round((totalConsumedMl / (goalMl || 1)) * 100));

  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to get local YYYY-MM-DD date string (respects user's actual timezone)
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load from Firestore & LocalStorage (persists user-chosen goal strictly)
  useEffect(() => {
    const loadData = async (userObj = auth.currentUser) => {
      try {
        let parsed: any = null;
        
        if (userObj) {
          try {
            const docRef = doc(db, 'users', userObj.uid, 'appData', 'waterTracker');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              parsed = docSnap.data();
            }
          } catch (e) {
            console.error("Firestore read error:", e);
          }
        }

        if (!parsed) {
          const savedData = localStorage.getItem('ratbod_water_tracker_data');
          if (savedData) parsed = JSON.parse(savedData);
        }

        if (parsed) {
          // Strictly respect user-configured target goal values
          if (typeof parsed.goalGlasses === 'number' && parsed.goalGlasses > 0) {
            setGoalGlasses(parsed.goalGlasses);
          }
          if (typeof parsed.glassVolumeMl === 'number' && parsed.glassVolumeMl > 0) {
            setGlassVolumeMl(parsed.glassVolumeMl);
          }

          const currentToday = getLocalDateString(new Date());
          let loadedHistory: DayHistory[] = Array.isArray(parsed.history) ? [...parsed.history] : [];

          if (parsed.todayDate === currentToday) {
            // Same day: restore today's entries
            if (Array.isArray(parsed.todayEntries)) {
              setEntries(parsed.todayEntries);
            }
          } else {
            // Date changed since last session: archive the previous day's intake into history
            if (parsed.todayDate && Array.isArray(parsed.todayEntries) && parsed.todayEntries.length > 0) {
              const oldTotal = parsed.todayEntries.reduce((acc: number, c: WaterEntry) => acc + (c.amountMl || 0), 0);
              const oldGoal = (parsed.goalGlasses || goalGlasses) * (parsed.glassVolumeMl || glassVolumeMl);
              
              const existingIdx = loadedHistory.findIndex(h => h.date === parsed.todayDate);
              if (existingIdx >= 0) {
                loadedHistory[existingIdx] = { date: parsed.todayDate, consumedMl: oldTotal, goalMl: oldGoal };
              } else if (oldTotal > 0) {
                loadedHistory.unshift({ date: parsed.todayDate, consumedMl: oldTotal, goalMl: oldGoal });
              }
            }
            setEntries([]);
          }

          // Clean, deduplicate, and sort history chronologically descending (newest first)
          const uniqueHistoryMap = new Map<string, DayHistory>();
          loadedHistory.forEach(item => {
            if (item && item.date && item.date !== currentToday) {
              uniqueHistoryMap.set(item.date, item);
            }
          });
          const sortedHistory = Array.from(uniqueHistoryMap.values()).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

          setHistory(sortedHistory.slice(0, 60));
          if (parsed.reminderActive !== undefined) setReminderActive(parsed.reminderActive);
          if (parsed.sleepBedTime) setSleepBedTime(parsed.sleepBedTime);
          if (parsed.sleepWakeTime) setSleepWakeTime(parsed.sleepWakeTime);
          if (Array.isArray(parsed.sleepRecords)) setSleepRecords(parsed.sleepRecords);
        }
      } catch (e) {
        console.error("Failed to load water tracker data", e);
      }
      setIsLoaded(true);
    };

    // Initial load
    loadData();

    // Listen to Firebase Auth state updates
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadData(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time day rollover checker (archives previous day if midnight passes while app is open)
  useEffect(() => {
    if (!isLoaded) return;
    
    const checkDayRollover = () => {
      const currentToday = getLocalDateString(new Date());
      const savedDataStr = localStorage.getItem('ratbod_water_tracker_data');
      if (savedDataStr) {
        try {
          const saved = JSON.parse(savedDataStr);
          if (saved.todayDate && saved.todayDate !== currentToday) {
            const oldEntries: WaterEntry[] = saved.todayEntries || [];
            const oldTotal = oldEntries.reduce((acc, c) => acc + (c.amountMl || 0), 0);
            const oldGoal = (saved.goalGlasses || goalGlasses) * (saved.glassVolumeMl || glassVolumeMl);
            
            if (oldTotal > 0) {
              setHistory(prev => {
                const uniqueMap = new Map<string, DayHistory>();
                prev.forEach(h => uniqueMap.set(h.date, h));
                uniqueMap.set(saved.todayDate, { date: saved.todayDate, consumedMl: oldTotal, goalMl: oldGoal });
                const updated = Array.from(uniqueMap.values()).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
                return updated.slice(0, 60);
              });
            }
            
            setEntries([]);
          }
        } catch (e) {}
      }
    };

    const interval = setInterval(checkDayRollover, 10000);
    window.addEventListener('focus', checkDayRollover);
    document.addEventListener('visibilitychange', checkDayRollover);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDayRollover);
      document.removeEventListener('visibilitychange', checkDayRollover);
    };
  }, [isLoaded, goalGlasses, glassVolumeMl]);

  // Save to Firestore & LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const todayDate = getLocalDateString(new Date());
      const dataToSave = {
        goalGlasses,
        glassVolumeMl,
        todayEntries: entries,
        todayDate,
        history,
        reminderActive,
        sleepBedTime,
        sleepWakeTime,
        sleepRecords
      };
      
      localStorage.setItem('ratbod_water_tracker_data', JSON.stringify(dataToSave));
      localStorage.setItem('ratbod_sleep_records', JSON.stringify(sleepRecords));
      
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'waterTracker'), dataToSave, { merge: true }).catch(e => {});
      }
    } catch (e) {
      console.error("Failed to save water tracker data", e);
    }
  }, [isLoaded, goalGlasses, glassVolumeMl, entries, history, reminderActive, sleepBedTime, sleepWakeTime, sleepRecords]);

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

  // Live ticker to refresh elapsed time (e.g. "X min ago")
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
      lastIntake: "Last Intake",
      noneToday: "None today",
      justNow: "Just now",
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
      selectGoalTip: "Target: 12 glasses = 3.0 L (3,000 ml) or 16 glasses = 4.0 L. Choose a preset or customize below.",
      preset8: "8 Glasses (2.0 L)",
      preset10: "10 Glasses (2.5 L)",
      preset12_30: "12 Glasses (3.0 L)",
      preset16: "16 Glasses (4.0 L)",
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
      lastIntake: "শেষ গ্রহণ",
      noneToday: "আজকে এখনও নেই",
      justNow: "এইমাত্র",
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
      selectGoalTip: "মূল লক্ষ্য: ১২ গ্লাস = ৩.০ লিটার অথবা ১৬ গ্লাস = ৪.০ লিটার। প্রিসেট বা নিচে সেট করুন।",
      preset8: "৮ গ্লাস (২.০ লিটার)",
      preset10: "১০ গ্লাস (২.৫ লিটার)",
      preset12_30: "১২ গ্লাস (৩.০ লিটার)",
      preset16: "১৬ গ্লাস (৪.০ লিটার)",
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

  // Helper formatting for past history dates
  const formatHistoryDate = (dateStr: string) => {
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateStr === todayStr) {
      return lang === 'bn' ? 'আজ (Today)' : 'Today';
    }
    if (dateStr === yesterdayStr) {
      return lang === 'bn' ? 'গতকাল (Yesterday)' : 'Yesterday';
    }

    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (lang === 'bn') {
          return d.toLocaleDateString('bn-BD', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        } else {
          return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
      }
    } catch (e) {}

    return dateStr;
  };

  // Helper to format last water intake time & elapsed duration (time ago)
  const formatLastIntakeTimeAgo = () => {
    if (entries.length === 0) {
      return labels.noneToday;
    }
    const lastEntry = entries[0];
    let entryTimeMs = lastEntry.createdAt;
    if (!entryTimeMs) {
      const parsedId = Number(lastEntry.id);
      if (!isNaN(parsedId) && parsedId > 1600000000000) {
        entryTimeMs = parsedId;
      }
    }

    if (entryTimeMs) {
      const diffMs = Math.max(0, nowTime - entryTimeMs);
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        return labels.justNow;
      } else if (diffMins < 60) {
        return lang === 'bn' ? `${formatNum(diffMins)} মি. আগে` : `${diffMins}m ago`;
      } else {
        const remainingMins = diffMins % 60;
        if (lang === 'bn') {
          return remainingMins > 0 
            ? `${formatNum(diffHours)}ঘ ${formatNum(remainingMins)}মি আগে` 
            : `${formatNum(diffHours)}ঘ আগে`;
        } else {
          return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
        }
      }
    }

    return lastEntry.timestamp;
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
      durationDisplay: lang === 'bn' ? sleepDuration.displayBn : sleepDuration.display,
      createdAt: Date.now()
    };

    setSleepRecords(prev => {
      const filtered = prev.filter(r => r.date !== targetDate);
      const updated = [newRecord, ...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
      localStorage.setItem('ratbod_sleep_records', JSON.stringify(updated));
      return updated;
    });

    setSleepSavedToast(true);
    setTimeout(() => setSleepSavedToast(false), 2500);
    window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
  };

  const handleDeleteSleepRecord = (id: string) => {
    setSleepRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('ratbod_sleep_records', JSON.stringify(updated));
      return updated;
    });
  };

  // Play sound when water is consumed (crisp water drop swoop & pop)
  const playWaterDropSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const play = () => {
        const now = ctx.currentTime;

        // Primary liquid drop sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.08);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

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
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.035);
        osc2.stop(now + 0.16);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(play);
      } else {
        play();
      }
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

      const play = () => {
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

          gain.gain.setValueAtTime(0.0001, now + time);
          gain.gain.linearRampToValueAtTime(0.28, now + time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + duration + 0.05);
        });
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(play);
      } else {
        play();
      }
    } catch {
      // AudioContext fallback handling
    }
  };

  // Play distinct "undo" rewind/swoop sound
  const playUndoSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const play = () => {
        const now = ctx.currentTime;

        // 1. Primary descending swoop tone (sine 850Hz -> 200Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.16);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);

        // 2. Sub-harmonic resonant tone (triangle 480Hz -> 120Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.13);

        gain2.gain.setValueAtTime(0.28, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now);
        osc2.stop(now + 0.15);

        // 3. Tactile click transient pop (square 320Hz -> 60Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(320, now);
        osc3.frequency.exponentialRampToValueAtTime(60, now + 0.04);

        gain3.gain.setValueAtTime(0.18, now);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc3.connect(gain3);
        gain3.connect(ctx.destination);

        osc3.start(now);
        osc3.stop(now + 0.05);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(play).catch(play);
      } else {
        play();
      }
    } catch {
      // Audio context fallback
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

    const now = Date.now();
    const newEntry: WaterEntry = {
      id: now.toString(),
      amountMl,
      glasses: amountMl / (glassVolumeMl || 250),
      timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now
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

  const handleDeleteEntry = (id: string, playSound: boolean = true) => {
    if (playSound) {
      playUndoSound();
    }
    setEntries(prev => prev.filter(item => item.id !== id));
  };

  const handleUndoLast = () => {
    if (entries.length > 0) {
      playUndoSound();
      setEntries(prev => prev.slice(1));
    }
  };

  const handleResetToday = () => {
    if (entries.length === 0) return;
    playUndoSound();
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

    let finalG = goalGlasses;
    let finalV = v;

    if (!isNaN(g) && g > 0 && !isNaN(v) && v > 0) {
      finalG = g;
      finalV = v;
    } else if (!isNaN(total) && total > 0 && !isNaN(v) && v > 0) {
      finalG = Math.round((total / v) * 10) / 10;
      finalV = v;
    }

    setGoalGlasses(finalG);
    setGlassVolumeMl(finalV);
    setShowGoalModal(false);

    try {
      const todayDate = getLocalDateString(new Date());
      const currentSaved = localStorage.getItem('ratbod_water_tracker_data');
      let baseObj: any = {};
      if (currentSaved) {
        try { baseObj = JSON.parse(currentSaved); } catch (e) {}
      }
      const dataToSave = {
        ...baseObj,
        goalGlasses: finalG,
        glassVolumeMl: finalV,
        todayEntries: entries,
        todayDate,
        history,
        reminderActive,
        sleepBedTime,
        sleepWakeTime,
        sleepRecords
      };
      localStorage.setItem('ratbod_water_tracker_data', JSON.stringify(dataToSave));
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'waterTracker'), dataToSave, { merge: true }).catch(e => {});
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto pb-6 w-full overflow-x-hidden">

      {/* Compact Single-Row Set Goal Section (Positioned Directly Above 'Consume Today') */}
      <div className={cn(
        "p-2 sm:p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all shadow-xs w-full flex-nowrap",
        darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5"
      )}>
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-nowrap">
          <div className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
            darkMode
              ? "bg-[#181a20] text-white border-gray-700/80"
              : "bg-gray-100 text-black border-gray-300"
          )}>
            <Target size={15} />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
            <span className="text-xs font-bold text-gray-900 dark:text-white shrink-0 whitespace-nowrap">
              {labels.goalLabel}:
            </span>
            <span className={cn(
              "text-xs font-extrabold px-2 py-0.5 rounded-lg border whitespace-nowrap shrink-0",
              darkMode 
                ? "text-blue-400 bg-blue-500/15 border-blue-500/25" 
                : "text-blue-600 bg-blue-50 border-blue-200"
            )}>
              {formatNum(goalMl / 1000, goalMl % 1000 === 0 ? 0 : 1)}L ({formatNum(goalMl)} {lang === 'bn' ? 'মিলি' : 'ml'})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenGoalModal}
          className={cn(
            "px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0 border shadow-2xs whitespace-nowrap active:scale-95",
            darkMode
              ? "bg-[#181a20] text-gray-300 border-gray-700/80 hover:bg-[#22252d] hover:text-gray-200"
              : "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200"
          )}
        >
          <span>{lang === 'bn' ? 'লক্ষ্য পরিবর্তন' : 'Edit Goal'}</span>
        </button>
      </div>

      {/* Single Consolidated Card: Consumed Today, Quick Glass Buttons, Progress Stats, Custom Amount & Actions */}
      <div className={cn(
        "p-3 sm:p-6 rounded-2xl border space-y-3 sm:space-y-4 relative overflow-hidden transition-all shadow-xs w-full",
        darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5"
      )}>
        {/* Header: Consumed Label (Left) + Last Water Intake with Clock Icon (Right - Bigger and More Highlighted) */}
        <div className="w-full flex items-center justify-between border-b pb-2.5 sm:pb-3 border-gray-200/20 dark:border-white/5 gap-2 flex-wrap sm:flex-nowrap">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5 shrink-0">
            <Droplet size={16} className="text-blue-500 fill-blue-500/20" />
            {labels.consumed}
          </span>

          {/* Last Water Intake with Clock Icon showing Time Ago (Black border in dark mode, relative clean border in light mode) */}
          <div 
            className={cn(
              "inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-extrabold border transition-all shrink-0 max-w-full truncate shadow-2xs",
              entries.length > 0
                ? (darkMode 
                    ? "bg-[#181a20] border-black text-white" 
                    : "bg-gray-100 border-gray-300 text-gray-900")
                : (darkMode 
                    ? "bg-[#181a20] border-black text-white" 
                    : "bg-gray-100 border-gray-300 text-gray-900")
            )}
            title={entries.length > 0 ? `${labels.lastIntake}: ${entries[0].timestamp}` : undefined}
          >
            <Clock size={15} className={entries.length > 0 ? (darkMode ? "text-blue-400 shrink-0 animate-pulse" : "text-blue-600 shrink-0 animate-pulse") : (darkMode ? "text-gray-400 shrink-0" : "text-gray-600 shrink-0")} />
            <span className="truncate tracking-tight font-black">{formatLastIntakeTimeAgo()}</span>
          </div>
        </div>

        {/* Glass Cup with Liquid Fill: Left [300ml] [400ml] - Center [Cup] - Right [250ml] [100ml] - Zero horizontal scroll on mobile */}
        <div className="relative my-0.5 sm:my-1 flex flex-col items-center justify-center w-full">
          <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] sm:flex sm:items-center sm:justify-center items-center justify-items-center gap-1 sm:gap-2.5 w-full max-w-full py-1">
            
            {/* Left Outer: 300 ml Glass Button (Unified Blue Theme with pure White text & icon) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAddWater(300)}
              title={lang === 'bn' ? '৩০০ মিলি যোগ করুন' : 'Add 300 ml'}
              className="flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-blue-500 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all cursor-pointer group shadow-xs w-full max-w-[66px] sm:max-w-[80px] min-w-0 active:scale-95"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/20 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Droplet size={10} className="fill-current sm:scale-110 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-black mt-1 text-center truncate w-full tracking-tight text-white drop-shadow-xs">
                300 {labels.mlUnit}
              </span>
            </motion.button>

            {/* Left Inner: 400 ml Glass Button (Unified Blue Theme with pure White text & icon) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAddWater(400)}
              title={lang === 'bn' ? '৪০০ মিলি যোগ করুন' : 'Add 400 ml'}
              className="flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-blue-500 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all cursor-pointer group shadow-xs w-full max-w-[66px] sm:max-w-[80px] min-w-0 active:scale-95"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/20 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Droplet size={10} className="fill-current sm:scale-110 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-black mt-1 text-center truncate w-full tracking-tight text-white drop-shadow-xs">
                400 {labels.mlUnit}
              </span>
            </motion.button>

            {/* Glass Tumbler Container with Liquid Water Fill (Display Only) */}
            <div className={cn(
              "relative w-[76px] h-[116px] sm:w-28 sm:h-40 rounded-b-[1.75rem] sm:rounded-b-[2rem] rounded-t-sm sm:rounded-t-md border-x-[3px] sm:border-x-4 border-b-[3px] sm:border-b-4 border-t-2 flex items-center justify-center shadow-lg sm:shadow-xl overflow-hidden transition-all shrink-0 mx-0.5 sm:mx-1",
              totalConsumedMl >= goalMl 
                ? "border-[#32CD32]/80 shadow-[#32CD32]/20 " + (darkMode ? "bg-slate-950/90" : "bg-emerald-50/90")
                : "border-blue-400/80 dark:border-blue-500/70 shadow-blue-500/20 " + (darkMode ? "bg-slate-950/90" : "bg-blue-50/90")
            )}>
              {/* Vertical Glass Shine Reflection */}
              <div className="absolute left-1 top-1.5 bottom-3 w-1 bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-full z-20 pointer-events-none" />

              {/* Measurement Notch Lines on Right Side */}
              <div className={cn("absolute right-1 top-3 bottom-3 flex flex-col justify-between z-20 pointer-events-none opacity-50", totalConsumedMl >= goalMl ? "hidden" : "")}>
                <div className="w-1 h-0.5 bg-blue-500 dark:bg-blue-300" />
                <div className="w-2 h-0.5 bg-blue-500 dark:bg-blue-300" />
                <div className="w-1 h-0.5 bg-blue-500 dark:bg-blue-300" />
                <div className="w-2.5 h-0.5 bg-blue-500 dark:bg-blue-300" />
              </div>

              {/* Liquid Water Level Fill (Sea Water Gradient) */}
              <motion.div
                className={cn("absolute bottom-0 left-0 right-0 w-full pointer-events-none",
                  totalConsumedMl >= goalMl
                    ? "bg-gradient-to-t from-emerald-800 via-[#32CD32] to-emerald-400"
                    : "bg-gradient-to-t from-blue-800 via-blue-600 to-sky-400"
                )}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, progressPercent)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Wave effect at top of water surface */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/50 animate-pulse" />
              </motion.div>

              {/* Center Display Overlay: Target glasses removed, Consumed amount in center, Percentage at bottom */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-between text-center p-1 sm:p-1.5 select-none pointer-events-none backdrop-blur-[1px]">
                {/* Top status indicator icon */}
                <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xs mt-0.5", totalConsumedMl >= goalMl ? "text-emerald-700 dark:text-emerald-200" : "text-blue-600 dark:text-blue-200")}>
                  {totalConsumedMl >= goalMl ? <Check size={11} className="animate-in zoom-in-50" strokeWidth={3} /> : <Droplet size={11} className="fill-current animate-pulse" />}
                </div>

                {/* Middle: Number of glasses only (ML removed as requested) */}
                <div className="flex flex-col items-center my-auto">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-sm">
                    {formatNum(totalGlasses, 1)}
                  </span>
                  <span className="text-[9.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-blue-100 mt-0.5 drop-shadow-2xs truncate max-w-full px-0.5">
                    {labels.glassesUnit}
                  </span>
                </div>

                {/* Bottom of Tumbler: Increased Percentage Badge */}
                <div className="w-full flex items-center justify-center pb-1 sm:pb-1.5">
                  <span className={cn(
                    "text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 rounded-full border shadow-xs leading-tight tracking-tight",
                    totalConsumedMl >= goalMl
                      ? "bg-emerald-600 text-white border-emerald-400/60"
                      : "bg-blue-600 text-white border-blue-400/60"
                  )}>
                    {formatNum(progressPercent)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Inner: 250 ml Glass Button (Unified Blue Theme with pure White text & icon) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAddWater(250)}
              title={lang === 'bn' ? '২৫০ মিলি যোগ করুন' : 'Add 250 ml'}
              className="flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-blue-500 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all cursor-pointer group shadow-xs w-full max-w-[66px] sm:max-w-[80px] min-w-0 active:scale-95"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/20 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Droplet size={10} className="fill-current sm:scale-110 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-black mt-1 text-center truncate w-full tracking-tight text-white drop-shadow-xs">
                250 {labels.mlUnit}
              </span>
            </motion.button>

            {/* Right Outer: 100 ml Glass Button (Unified Blue Theme with pure White text & icon) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleAddWater(100)}
              title={lang === 'bn' ? '১০০ মিলি যোগ করুন' : 'Add 100 ml'}
              className="flex flex-col items-center justify-center p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-blue-500 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all cursor-pointer group shadow-xs w-full max-w-[66px] sm:max-w-[80px] min-w-0 active:scale-95"
            >
              <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/20 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Droplet size={10} className="fill-current sm:scale-110 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-black mt-1 text-center truncate w-full tracking-tight text-white drop-shadow-xs">
                100 {labels.mlUnit}
              </span>
            </motion.button>
          </div>

          {/* Hydration Status Label with padding bottom */}
          <span className="text-[10.5px] sm:text-xs text-gray-900 dark:text-white mt-1.5 pb-2.5 font-semibold flex items-center gap-1">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:text-white">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              {lang === 'bn' ? 'বাকি আছে' : 'Remaining'}
            </span>
            <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mt-0.5">
              {formatNum(Math.max(0, goalMl - totalConsumedMl))} {labels.mlUnit}
            </span>
          </div>
        </div>

        {/* Custom Amount Section & Undo/Reset Controls Integrated inside the same card */}
        <div className="pt-3 border-t border-gray-200/20 dark:border-white/5 space-y-3">
          <form onSubmit={handleCustomAdd} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-900 dark:text-white">
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

          {/* Control Actions Row (Undo & Reset) */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleUndoLast}
              disabled={entries.length === 0}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
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
                "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
              )}
            >
              <Trash2 size={13} />
              <span>{labels.resetToday}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Intake Logs & Goal Card Section */}
      <div className="w-full space-y-3">
        {/* Today's Log List */}
        <div className={cn(
          "w-full p-4 sm:p-5 rounded-2xl border space-y-3",
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
                        <span className="text-[10px] text-gray-900 dark:text-white font-medium">
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-1.5 rounded-lg text-gray-900 dark:text-white hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* History Small-Sized Card below Today's Water Intake Log */}
          <div className={cn(
            "mt-3 pt-3 border-t border-gray-200/20 dark:border-white/5",
          )}>
            <div className={cn(
              "px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all shadow-xs",
              darkMode
                ? "bg-emerald-950/30 border-emerald-500/20 hover:border-emerald-500/30"
                : "bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60"
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/20">
                  <HistoryIcon size={14} />
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold leading-tight">
                  <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {lang === 'bn' ? 'পানি পানের ইতিহাস' : 'Water Intake History'}:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold whitespace-nowrap">
                    {formatNum(totalConsumedMl)} {labels.mlUnit} {lang === 'bn' ? '(আজ)' : '(Today)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-2xs whitespace-nowrap active:scale-95",
                  darkMode
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                )}
              >
                <HistoryIcon size={12} />
                <span>{lang === 'bn' ? 'ইতিহাস (History)' : 'History'}</span>
              </button>
            </div>
          </div>

          {/* Sleep Calculation & History Section - Dropdown Style directly after Water Intake History */}
          <div className="mt-3 pt-3 border-t border-gray-200/20 dark:border-white/5">
            <div 
              id="sleep-calculator-section"
              className={cn(
                "rounded-2xl border transition-all shadow-xs overflow-hidden",
                darkMode 
                  ? "bg-indigo-950/20 border-indigo-500/25 shadow-indigo-950/20" 
                  : "bg-indigo-50/50 border-indigo-200/80 shadow-indigo-500/5"
              )}
            >
              {/* Dropdown Header Bar (Clickable Accordion Trigger) */}
              <button
                type="button"
                onClick={() => setIsSleepDropdownOpen(prev => !prev)}
                className={cn(
                  "w-full px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all cursor-pointer text-left select-none",
                  isSleepDropdownOpen 
                    ? (darkMode ? "border-b border-indigo-500/20 bg-indigo-950/40" : "border-b border-indigo-200/80 bg-indigo-100/50") 
                    : "hover:bg-indigo-500/10"
                )}
                aria-expanded={isSleepDropdownOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-indigo-500/20">
                    <Moon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold leading-tight">
                      <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {lang === 'bn' ? 'স্লিপ অ্যানালিটিক্স (Sleep Analytics)' : 'Sleep Analytics'}:
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold whitespace-nowrap">
                        {lang === 'bn' ? sleepDuration.displayBn : sleepDuration.display}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1",
                    sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                      ? (darkMode ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                      : (darkMode ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200")
                  )}>
                    <Sparkles size={10} />
                    {sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                      ? (lang === 'bn' ? 'উপযুক্ত ঘুম' : 'Optimal')
                      : (sleepDuration.hours < 7 ? (lang === 'bn' ? 'স্বল্প ঘুম' : 'Short') : (lang === 'bn' ? 'দীর্ঘ ঘুম' : 'Extended'))}
                  </span>
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200",
                    isSleepDropdownOpen ? "rotate-180" : ""
                  )}>
                    <ChevronDown size={16} />
                  </div>
                </div>
              </button>

              {/* Dropdown Content Area */}
              <AnimatePresence>
                {isSleepDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 sm:p-4 space-y-3"
                  >
                    {/* Inputs in One Row: Field 1 (Go to Bed) & Field 2 (Wake Up) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Field 1: Go to Bed */}
                      <div className={cn(
                        "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between gap-1.5",
                        darkMode ? "bg-white/5 border-white/5" : "bg-white border-indigo-100"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Moon size={13} className="text-indigo-400 shrink-0" />
                            <span className="truncate">{lang === 'bn' ? 'ঘুমানোর সময়' : 'Go to Bed'}</span>
                          </span>
                        </div>
                        <input
                          type="time"
                          value={sleepBedTime}
                          onChange={(e) => {
                            setSleepBedTime(e.target.value);
                            localStorage.setItem('ratbod_sleep_bed', e.target.value);
                          }}
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs text-center font-mono",
                            darkMode
                              ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                              : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
                          )}
                          title={lang === 'bn' ? 'ঘুমাতে যাওয়ার সময়' : 'Go to bed time'}
                        />
                      </div>

                      {/* Field 2: Wake Up */}
                      <div className={cn(
                        "p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between gap-1.5",
                        darkMode ? "bg-white/5 border-white/5" : "bg-white border-indigo-100"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Clock size={13} className="text-amber-400 shrink-0" />
                            <span className="truncate">{lang === 'bn' ? 'ওঠার সময়' : 'Wake Up'}</span>
                          </span>
                        </div>
                        <input
                          type="time"
                          value={sleepWakeTime}
                          onChange={(e) => {
                            setSleepWakeTime(e.target.value);
                            localStorage.setItem('ratbod_sleep_wake', e.target.value);
                          }}
                          className={cn(
                            "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs text-center font-mono",
                            darkMode
                              ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                              : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
                          )}
                          title={lang === 'bn' ? 'ঘুম থেকে ওঠার সময়' : 'Wake up time'}
                        />
                      </div>
                    </div>

                    {/* Stat Box & Save Action Row (Date + Total Duration + Save button) */}
                    <div className={cn(
                      "p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5",
                      darkMode ? "bg-indigo-950/40 border-indigo-500/30" : "bg-indigo-100/70 border-indigo-200"
                    )}>
                      {/* Date Selector */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar size={13} className="text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 shrink-0">
                          {lang === 'bn' ? 'তারিখ:' : 'Date:'}
                        </span>
                        <input
                          type="date"
                          value={selectedSleepDate}
                          onChange={(e) => setSelectedSleepDate(e.target.value)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs text-center font-mono",
                            darkMode
                              ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]"
                              : "bg-white text-gray-900 border-gray-300 [color-scheme:light]"
                          )}
                          title={lang === 'bn' ? 'রেকর্ড সংরক্ষণের তারিখ' : 'Record date'}
                        />
                      </div>

                      {/* Total Duration stat */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                          {lang === 'bn' ? 'মোট:' : 'Total:'}
                        </span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {lang === 'bn' ? sleepDuration.displayBn : sleepDuration.display}
                        </span>
                      </div>

                      {/* Save Button */}
                      <button
                        type="button"
                        onClick={handleLogSleepRecord}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0 ml-auto sm:ml-0",
                          sleepSavedToast
                            ? "bg-emerald-600 text-white"
                            : (darkMode 
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30" 
                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20")
                        )}
                        title={lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save record'}
                      >
                        {sleepSavedToast ? (
                          <>
                            <Check size={13} strokeWidth={3} />
                            <span>{lang === 'bn' ? 'সংরক্ষিত!' : 'Saved!'}</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>{lang === 'bn' ? 'Save' : 'Save'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Sleep History Row */}
                    <div className={cn(
                      "px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all shadow-xs",
                      darkMode
                        ? "bg-indigo-950/40 border-indigo-500/20 hover:border-indigo-500/30"
                        : "bg-white border-indigo-200 hover:bg-indigo-50/50"
                    )}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-indigo-500/20">
                          <HistoryIcon size={14} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold leading-tight">
                          <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {lang === 'bn' ? 'ঘুমের ইতিহাস' : 'Sleep History'}:
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold whitespace-nowrap">
                            {lang === 'bn' ? sleepDuration.displayBn : sleepDuration.display} {lang === 'bn' ? '(আজ)' : '(Today)'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSleepHistoryModal(true)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-2xs whitespace-nowrap active:scale-95",
                          darkMode
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                            : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                        )}
                      >
                        <HistoryIcon size={12} />
                        <span>{lang === 'bn' ? 'ইতিহাস (History)' : 'History'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Selector Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              key="goal-modal"
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
                  className="p-1 rounded-lg text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto space-y-4 pr-1 py-2 my-1 shrink text-xs">
                <p className="text-xs text-gray-900 dark:text-white">
                  {labels.selectGoalTip}
                </p>

                {/* Goal Presets (4 Clean Options) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { glasses: 8, vol: 250, totalMl: 2000, label: labels.preset8 },
                    { glasses: 10, vol: 250, totalMl: 2500, label: labels.preset10 },
                    { glasses: 12, vol: 250, totalMl: 3000, label: labels.preset12_30 },
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
                      <label className="text-[11px] font-bold text-gray-900 dark:text-white">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-900 dark:text-white">
                          {labels.glassesUnit}
                        </span>
                      </div>
                    </div>

                    {/* Total Water Target (ml) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-900 dark:text-white">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-900 dark:text-white">
                          {labels.mlUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Glass Size / Volume */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-900 dark:text-white">
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-900 dark:text-white">
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
              key="alarm-modal"
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
                <p className="text-xs text-gray-900 dark:text-white font-medium">
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

      {/* Daily Water Intake History Modal with Top Corner Back Button */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              key="water-history-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-3xl border shadow-2xl my-auto",
                darkMode ? "bg-[#091522] border-emerald-500/30 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              {/* Sticky Header with Back Button in top corner */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/20 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30">
                    <HistoryIcon size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                      {lang === 'bn' ? 'দৈনিক পানি পানের ইতিহাস' : 'Daily Water Intake History'}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {lang === 'bn' ? 'দৈনিক মোট পানি পানের হিসাব' : 'Daily hydration intake overview'}
                    </p>
                  </div>
                </div>

                {/* Back button in top corner as requested */}
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95",
                    darkMode
                      ? "bg-white/10 border-white/15 text-white hover:bg-white/20"
                      : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
                  title={lang === 'bn' ? 'ফিরে যান' : 'Back'}
                >
                  <ArrowLeft size={14} />
                  <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto space-y-3.5 pr-1 py-3 text-xs">
                {/* Today's Total Intake Hero Card */}
                <div className={cn(
                  "p-3.5 rounded-2xl border flex flex-col gap-2 shadow-xs",
                  darkMode
                    ? "bg-gradient-to-br from-blue-950/60 to-emerald-950/40 border-blue-500/30"
                    : "bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {lang === 'bn' ? 'আজকের মোট পানি গ্রহণ' : "Today's Total Water Intake"}
                    </span>
                    <span className="text-[10.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {formatNum(progressPercent)}% {labels.percentDone}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                      {formatNum(totalConsumedMl)} <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{labels.mlUnit}</span>
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {lang === 'bn' ? 'দৈনিক লক্ষ্য:' : 'Goal:'} {formatNum(goalMl)} {labels.mlUnit} ({formatNum(goalMl / 1000, 1)}L)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 pt-0.5">
                    <span>{lang === 'bn' ? `মোট গ্লাস: ${formatNum(totalGlasses, 1)}` : `Total Glasses: ${formatNum(totalGlasses, 1)}`}</span>
                    <span>{lang === 'bn' ? `লগ সংখ্যা: ${formatNum(entries.length)} টি` : `Total Logs: ${formatNum(entries.length)}`}</span>
                  </div>
                </div>

                {/* Past Daily History Records */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-500" />
                    {lang === 'bn' ? 'পূর্ববর্তী দিনগুলোর দৈনিক রেকর্ড' : 'Past Daily Intake History'}
                  </h4>

                  {history.length === 0 ? (
                    <div className={cn(
                      "p-4 rounded-xl border text-center space-y-1",
                      darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
                    )}>
                      <p className="text-xs font-medium">
                        {lang === 'bn' ? 'পূর্ববর্তী কোনো দিনের রেকর্ড সংরক্ষিত নেই।' : 'No past daily history recorded yet.'}
                      </p>
                      <p className="text-[10.5px] opacity-75">
                        {lang === 'bn' ? 'প্রতিদিন দিন শেষে স্বয়ংক্রিয়ভাবে মোট পানির পরিমাণ এখানে যুক্ত হবে।' : 'Daily water intake totals are recorded and saved here every day.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((record, index) => {
                        const recPercent = Math.min(100, Math.round((record.consumedMl / (record.goalMl || 1)) * 100));
                        const isAchieved = record.consumedMl >= (record.goalMl || 1);
                        return (
                          <div 
                            key={`${record.date}-${index}`}
                            className={cn(
                              "p-3 rounded-xl border flex flex-col gap-1.5 transition-all shadow-2xs",
                              darkMode 
                                ? (isAchieved ? "bg-emerald-950/20 border-emerald-500/25" : "bg-white/5 border-white/10") 
                                : (isAchieved ? "bg-emerald-50/70 border-emerald-200" : "bg-gray-50 border-gray-200")
                            )}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px]",
                                  isAchieved ? "bg-emerald-500 text-white" : "bg-blue-500/20 text-blue-500"
                                )}>
                                  {isAchieved ? <Check size={12} strokeWidth={3} /> : <Droplet size={11} className="fill-current" />}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                  {formatHistoryDate(record.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn(
                                  "font-extrabold text-xs",
                                  isAchieved ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {formatNum(record.consumedMl)} / {formatNum(record.goalMl)} {labels.mlUnit}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-black px-1.5 py-0.5 rounded-md border",
                                  isAchieved 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" 
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30"
                                )}>
                                  {formatNum(recPercent)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all", isAchieved ? "bg-emerald-500" : "bg-blue-500")}
                                style={{ width: `${recPercent}%` }}
                              />
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
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-xs shadow-blue-500/20 active:scale-95"
                >
                  {lang === 'bn' ? 'ঠিক আছে (Close)' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Sleep History Modal with Top Corner Back Button (Exact Water History style) */}
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
                      {lang === 'bn' ? 'দৈনিক ঘুমের ইতিহাস' : 'Daily Sleep History'}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {lang === 'bn' ? 'দৈনিক ঘুমের সময় ও রেকর্ডের বিবরণ' : 'Daily sleep schedule and duration logs'}
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
                  <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
                {/* Today's Active Sleep Schedule Summary Card */}
                <div className={cn(
                  "p-3.5 rounded-2xl border space-y-2.5",
                  darkMode ? "bg-indigo-950/20 border-indigo-500/30" : "bg-indigo-50/70 border-indigo-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                        {lang === 'bn' ? 'আজকের নির্ধারিত ঘুম' : "Today's Sleep Target"}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                      sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                        ? (darkMode ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                        : (darkMode ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200")
                    )}>
                      {sleepDuration.hours >= 7 && sleepDuration.hours <= 9
                        ? (lang === 'bn' ? 'উপযুক্ত ঘুম (Optimal)' : 'Optimal 7-9h')
                        : (sleepDuration.hours < 7 ? (lang === 'bn' ? 'স্বল্প ঘুম (Short)' : 'Short Sleep (<7h)') : (lang === 'bn' ? 'দীর্ঘ ঘুম (Long)' : 'Long Sleep (>9h)'))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={cn(
                      "p-2 rounded-xl border flex flex-col gap-0.5",
                      darkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-200"
                    )}>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                        {lang === 'bn' ? 'ঘুমাতে যাওয়ার সময়' : 'Bed Time'}
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
                        {lang === 'bn' ? 'ঘুম থেকে ওঠার সময়' : 'Wake Up Time'}
                      </span>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white font-mono">
                        {sleepWakeTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {lang === 'bn' ? 'মোট বিশ্রামের সময়:' : 'Total Duration:'}
                    </span>
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {lang === 'bn' ? sleepDuration.displayBn : sleepDuration.display}
                    </span>
                  </div>
                </div>

                {/* Past Daily Sleep History Records */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-500" />
                    {lang === 'bn' ? 'সংরক্ষিত দৈনিক রেকর্ডসমূহ' : 'Saved Sleep History Logs'}
                  </h4>

                  {sleepRecords.length === 0 ? (
                    <div className={cn(
                      "p-4 rounded-xl border text-center space-y-1",
                      darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
                    )}>
                      <p className="text-xs font-medium">
                        {lang === 'bn' ? 'এখনো কোনো রেকর্ড সংরক্ষণ করা হয়নি।' : 'No sleep records saved yet.'}
                      </p>
                      <p className="text-[10.5px] opacity-75">
                        {lang === 'bn' ? 'স্লিপ অ্যানালিটিক্সে "Save" বাটনে চাপ দিলে আপনার রেকর্ড এখানে যুক্ত হবে।' : 'Click "Save" on the sleep card to log your daily sleep history.'}
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
                                title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
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
                  {lang === 'bn' ? 'ঠিক আছে (Close)' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Floating Go to Top Button - Mobile View Only for Water Section */}
      <button
        type="button"
        id="water_scroll_to_top_btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "fixed bottom-20 right-4 z-40 md:hidden w-10 h-10 rounded-full shadow-xl border backdrop-blur-md transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none",
          darkMode
            ? "bg-[#161616]/90 border-white/20 text-white shadow-black/70 hover:bg-[#222]"
            : "bg-white/95 border-gray-200 text-gray-800 shadow-gray-400/40 hover:bg-gray-50"
        )}
        aria-label="Go to top"
      >
        <ArrowUp size={18} className="text-blue-500 shrink-0" />
      </button>
    </div>
  );
}
