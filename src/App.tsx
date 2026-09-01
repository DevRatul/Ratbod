/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  Download, 
  User as UserIcon, 
  Scale, 
  Ruler, 
  Activity, 
  Info,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Sun,
  Moon,
  ArrowRightLeft,
  Camera,
  ShoppingBag,
  UserCircle,
  Wind,
  Droplet,
  HeartPulse,
  Heart, 
  Zap, 
  Flame,
  Calendar,
  Target,
  Save,
  TrendingDown,
  TrendingUp,
  Minus,
  LogOut,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { 
  calculateBMI, 
  calculateBMR, 
  calculateTDEE, 
  calculateBodyFat, 
  calculateIdealWeight, 
  getBMICategory,
  getIdealBodyFatRange,
  type Gender,
  type ActivityLevel,
  type BodyData
} from './utils/calculations';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import GroceryCalculator from './components/GroceryCalculator';
import WaterTracker from './components/WaterTracker';
import BreathingTimer from './components/BreathingTimer';
import Habitor from './components/Habitor';
import Goals from './components/Goals';
import History from './components/History';
import QuickSteps from './components/QuickSteps';
import ProfileModal from './components/ProfileModal';
import LandingPage from './components/LandingPage';
import { translations } from './utils/translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const currentHour = new Date().getHours();
    const isDaytime = currentHour >= 6 && currentHour < 18;
    return !isDaytime;
  });
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const t = translations[lang];
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [gender, setGender] = useState<Gender>('male');
  const [name, setName] = useState<string>('');
  const [birthdate, setBirthdate] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [height, setHeight] = useState<string>(''); // cm or inches
  const [weight, setWeight] = useState<string>(''); // kg or lbs
  const [waist, setWaist] = useState<string>(''); // cm or inches
  const [neck, setNeck] = useState<string>(''); // cm or inches
  const [hip, setHip] = useState<string>(''); // cm or inches (for female)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isIdealWeightOpen, setIsIdealWeightOpen] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [historyList, setHistoryList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ratbod_history') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [savedGoal, setSavedGoal] = useState<any>(() => {
    try {
      const g = localStorage.getItem('ratbod_goals');
      return g ? JSON.parse(g) : null;
    } catch (e) {
      return null;
    }
  });
  const [authUser, setAuthUser] = useState(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'home' | 'calculator' | 'results' | 'groceries' | 'water' | 'goals' | 'breathing'>(() => {
    try {
      const saved = localStorage.getItem('ratbod_active_tab');
      if (saved && ['home', 'calculator', 'results', 'groceries', 'water', 'goals', 'breathing'].includes(saved)) {
        return saved as any;
      }
      return 'calculator';
    } catch (e) {
      return 'calculator';
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Monitor scroll position for floating action button in mobile view
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToggle = () => {
    if (isScrolledDown) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  // Global trigger for Successfully Saved toast notification
  const triggerSavedToast = useCallback(() => {
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 2500);
  }, []);

  // Listen for global save events
  useEffect(() => {
    const handleToastEvent = () => {
      triggerSavedToast();
    };
    window.addEventListener('ratbod_saved_toast', handleToastEvent);
    return () => window.removeEventListener('ratbod_saved_toast', handleToastEvent);
  }, [triggerSavedToast]);

  // Persist activeTab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ratbod_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // Load from Firestore (fallback to localStorage) on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      
      let loadedFromDb = false;
      let readFailed = false;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name !== undefined) setName(data.name || '');
            if (data.gender !== undefined) setGender(data.gender || 'male');
            if (data.birthdate !== undefined) setBirthdate(data.birthdate || '');
            if (data.age !== undefined) setAge(data.age || '');
            if (data.height !== undefined) setHeight(data.height || '');
            // Quick measurement fields (weight, waist, neck, hip) intentionally start empty on reload
            if (data.activityLevel !== undefined) setActivityLevel(data.activityLevel || 'sedentary');
            if (data.unit !== undefined) setUnit(data.unit || 'metric');
            if (data.darkMode !== undefined) setDarkMode(data.darkMode);
            if (data.lang !== undefined) setLang(data.lang || 'en');
            loadedFromDb = true;

            // Load history & goals from Firestore
            try {
              const histSnap = await getDoc(doc(db, 'users', user.uid, 'appData', 'history'));
              if (histSnap.exists() && Array.isArray(histSnap.data().history)) {
                setHistoryList(histSnap.data().history);
                localStorage.setItem('ratbod_history', JSON.stringify(histSnap.data().history));
              }
              const goalSnap = await getDoc(doc(db, 'users', user.uid, 'appData', 'goals'));
              if (goalSnap.exists() && goalSnap.data().goal) {
                setSavedGoal(goalSnap.data().goal);
                localStorage.setItem('ratbod_goals', JSON.stringify(goalSnap.data().goal));
              }
            } catch (err) {
              console.error('Error loading history/goals from db:', err);
            }
          }
        } catch (e) {
          console.error('Error loading profile:', e);
          readFailed = true;
        }
      }

      if (readFailed) {
        // Stop here to prevent overwriting db with empty states
        return;
      }

      if (!loadedFromDb) {
        // Do not fallback to local storage if user is signed in to prevent local leak over to new account
        if (user) {
          // Keep fields empty for new user
        } else {
          // If no user load local
          const savedName = localStorage.getItem('ratbod_name') || '';
          const savedGender = localStorage.getItem('ratbod_gender') as Gender || 'male';
          const savedBirthdate = localStorage.getItem('ratbod_birthdate') || '';
          const savedAge = localStorage.getItem('ratbod_age') || '';
          const savedHeight = localStorage.getItem('ratbod_height') || '';
          // Quick measurement fields reset on reload
          const savedActivity = localStorage.getItem('ratbod_activity') as ActivityLevel || 'sedentary';
          const savedUnit = localStorage.getItem('ratbod_unit') as 'metric' | 'imperial' || 'metric';
          const rawDarkMode = localStorage.getItem('ratbod_darkmode');
          const currentHour = new Date().getHours();
          const isDaytime = currentHour >= 6 && currentHour < 18;
          const savedDarkMode = rawDarkMode === null ? !isDaytime : rawDarkMode === 'true';
          const savedLang = localStorage.getItem('ratbod_lang') as 'en' | 'bn' || 'en';

          setName(savedName);
          setGender(savedGender);
          setBirthdate(savedBirthdate);
          setAge(savedAge);
          setHeight(savedHeight);
          // weight, waist, neck, hip remain empty
          setActivityLevel(savedActivity);
          setUnit(savedUnit);
          setDarkMode(savedDarkMode);
          setLang(savedLang);

          try {
            const h = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
            setHistoryList(h);
            const g = localStorage.getItem('ratbod_goals');
            setSavedGoal(g ? JSON.parse(g) : null);
          } catch (e) {}
        }
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync state with localStorage on refresh trigger
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      setHistoryList(h);
    } catch (e) {}
    try {
      const g = localStorage.getItem('ratbod_goals');
      setSavedGoal(g ? JSON.parse(g) : null);
    } catch (e) {}
  }, [historyRefreshTrigger]);

  // Sync back to localStorage & Firestore
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem('ratbod_name', name);
    localStorage.setItem('ratbod_gender', gender);
    localStorage.setItem('ratbod_birthdate', birthdate);
    localStorage.setItem('ratbod_age', age);
    localStorage.setItem('ratbod_height', height);
    localStorage.setItem('ratbod_activity', activityLevel);
    localStorage.setItem('ratbod_unit', unit);
    localStorage.setItem('ratbod_darkmode', darkMode.toString());
    localStorage.setItem('ratbod_lang', lang);

    // Toggle dark class on <html> element
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set browser tab theme-color and iOS status bar style
    const themeColor = darkMode ? '#000000' : '#ffffff';
    const statusBar = darkMode ? 'black-translucent' : 'default';

    // 1. Update <meta name="theme-color">
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', themeColor);

    // Sync to Firestore
    const user = authUser || auth.currentUser;
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, {
        name,
        gender,
        birthdate,
        age,
        height,
        activityLevel,
        unit,
        darkMode,
        lang,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(e => {
        console.error("Failed to sync profile to Firestore", e);
      });
    }
  }, [name, gender, birthdate, age, height, activityLevel, unit, darkMode, lang, isLoaded]);

  useEffect(() => {
    // Set browser tab theme-color and iOS status bar style
    const themeColor = darkMode ? '#0A0A0A' : '#F5F5F5';
    const statusBar = darkMode ? 'black-translucent' : 'default';

    // 1. Update <meta name="theme-color">
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', themeColor);

    // 2. Update <meta name="apple-mobile-web-app-status-bar-style">
    let statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusMeta) {
      statusMeta = document.createElement('meta');
      statusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(statusMeta);
    }
    statusMeta.setAttribute('content', statusBar);

    // 3. Set background color and class on documentElement and body for seamless browser window/tab/status-bar integration
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Calculate age when birthdate changes
  useEffect(() => {
    if (birthdate) {
      const birthDate = new Date(birthdate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    }
  }, [birthdate]);

  const formatNum = (num: number | string | undefined | null) => {
    if (num === undefined || num === null || num === '') return '';
    const str = typeof num === 'number' ? (Number.isInteger(num) ? num.toString() : num.toFixed(1)) : num.toString();
    let finalStr = str;
    if (finalStr.endsWith('.0')) {
      finalStr = finalStr.substring(0, finalStr.length - 2);
    }
    if (lang !== 'bn') return finalStr;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return finalStr.replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit)]);
  };

  const getCategoryTranslation = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes('underweight')) return t.underweight;
    if (norm.includes('normal')) return t.normal;
    if (norm.includes('overweight')) return t.overweight;
    if (norm.includes('obese')) return t.obese;
    return cat;
  };

  const translateCategory = (cat: string) => {
    if (lang !== 'bn') return cat;
    if (cat === 'Underweight') return 'কম ওজন';
    if (cat === 'Normal') return 'স্বাভাবিক';
    if (cat === 'Overweight') return 'অতিরিক্ত ওজন';
    if (cat === 'Obese') return 'স্থূলতা';
    return cat;
  };

  // Relative date calculation for latest entry card
  const formatRelativeDate = (dateStr?: string | null) => {
    if (!dateStr) return lang === 'bn' ? 'কোনো তথ্য নেই' : 'No data';
    
    const entryDate = new Date(dateStr);
    if (isNaN(entryDate.getTime())) return lang === 'bn' ? 'কোনো তথ্য নেই' : 'No data';
    
    const now = new Date();
    
    // Day difference by calendar date (midnight to midnight)
    const entryMidnight = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((nowMidnight - entryMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return lang === 'bn' ? 'আজ' : 'Today';
    } else if (diffDays === 1) {
      return lang === 'bn' ? '১ দিন আগে' : '1 day ago';
    } else if (diffDays < 30) {
      return lang === 'bn' ? `${formatNum(diffDays)} দিন আগে` : `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return lang === 'bn' ? `${formatNum(months)} মাস আগে` : `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return lang === 'bn' ? `${formatNum(years)} বছর আগে` : `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  const handleSaveMetrics = () => {
    const inputWeight = parseFloat(weight);
    if (isNaN(inputWeight) || inputWeight <= 0) return;
    
    const weightInKg = unit === 'metric' ? inputWeight : inputWeight / 2.20462;
    const heightInCm = metricData.height || 0;
    
    // Calculate BMI if height is available
    const computedBmi = heightInCm > 0 ? calculateBMI(weightInKg, heightInCm) : 0;
    
    // Calculate Body Fat if waist/neck provided
    const computedBodyFat = metrics?.bodyFat || 0;

    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight: weightInKg,
      bmi: computedBmi,
      bodyFat: computedBodyFat
    };

    const existing = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
    const updated = [...existing, newEntry];
    localStorage.setItem('ratbod_history', JSON.stringify(updated));
    setHistoryList(updated);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'appData', 'history'), { history: updated }, { merge: true }).catch(e => {
        console.error('Error saving history entry:', e);
      });
    }

    setHistoryRefreshTrigger(prev => prev + 1);
    
    // Show Successfully Saved notification popup
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 3000);

    // Reset quick measurement fields after saving
    setWeight('');
    setWaist('');
    setNeck('');
    setHip('');
  };

  // Convert inputs to metric for calculations
  const metricData = useMemo(() => {
    const h = parseFloat(height) || 0;
    const w = parseFloat(weight) || 0;
    const wa = parseFloat(waist) || 0;
    const n = parseFloat(neck) || 0;
    const hi = parseFloat(hip) || 0;

    const finalHeight = unit === 'metric' ? h : h * 2.54;
    const finalWeight = unit === 'metric' ? w : w / 2.20462;
    const finalWaist = unit === 'metric' ? wa : wa * 2.54;
    const finalNeck = unit === 'metric' ? n : n * 2.54;
    const finalHip = unit === 'metric' ? hi : hi * 2.54;

    return {
      gender,
      age: parseInt(age) || 0,
      height: finalHeight,
      weight: finalWeight,
      waist: finalWaist,
      neck: finalNeck,
      hip: finalHip,
      activityLevel
    } as BodyData;
  }, [unit, gender, age, height, weight, waist, neck, hip, activityLevel]);

  const metrics = useMemo(() => {
    if (!metricData.height || !metricData.weight || !metricData.age) return null;

    const bmi = calculateBMI(metricData.weight, metricData.height);
    const bmr = calculateBMR(metricData);
    const tdee = calculateTDEE(bmr, metricData.activityLevel);
    const bodyFat = calculateBodyFat(metricData);
    const idealWeight = calculateIdealWeight(metricData.height, metricData.gender);
    const idealFatRange = getIdealBodyFatRange(metricData.gender, metricData.age);

    const kgDiff = metricData.weight - idealWeight.kg;
    const lbDiff = (metricData.weight * 2.20462) - idealWeight.lb;
    
    let type: 'lose' | 'gain' | 'maintain' = 'maintain';
    if (Math.abs(kgDiff) < 0.1) type = 'maintain';
    else if (kgDiff > 0) type = 'lose';
    else type = 'gain';

    return {
      bmi,
      bmr,
      tdee,
      bodyFat,
      idealWeight,
      idealFatRange,
      weightDiff: {
        kg: Math.abs(kgDiff),
        lb: Math.abs(lbDiff),
        type
      },
      category: getBMICategory(bmi)
    };
  }, [metricData]);

  // Chronologically sorted history entries (earliest [0] to latest [length - 1])
  const sortedHistoryAsc = useMemo(() => {
    if (!Array.isArray(historyList) || historyList.length === 0) return [];
    return [...historyList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [historyList]);

  // First saved weight measurement (Base data for goal progress)
  const baseHistoryEntry = useMemo(() => {
    if (sortedHistoryAsc.length === 0) return null;
    return sortedHistoryAsc[0];
  }, [sortedHistoryAsc]);

  // Latest saved weight measurement
  const latestHistoryEntry = useMemo(() => {
    if (sortedHistoryAsc.length === 0) return null;
    return sortedHistoryAsc[sortedHistoryAsc.length - 1];
  }, [sortedHistoryAsc]);

  // Goal target weight in kg
  const goalTargetWeightKg = useMemo(() => {
    if (savedGoal && typeof savedGoal.targetWeight === 'number' && savedGoal.targetWeight > 0) {
      return savedGoal.targetWeight; // always stored in kg
    }
    const h = metricData.height || 0;
    if (h > 0) {
      const ideal = calculateIdealWeight(h, gender);
      if (ideal.kg > 0) return ideal.kg;
    }
    return null;
  }, [savedGoal, metricData.height, gender]);

  // Goal Progression percentage calculation based on:
  // - First saved weight data as base data
  // - Latest saved weight measurement
  // - Targeted goal weight data
  // Also calculates remaining weight to final target (e.g. 100kg target & 90kg latest = 10kg more to go)
  const goalProgress = useMemo(() => {
    const targetDate = savedGoal && savedGoal.targetDate ? savedGoal.targetDate : null;
    let daysRemaining: number | null = null;
    if (targetDate) {
      daysRemaining = Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    }

    if (sortedHistoryAsc.length === 0 || !goalTargetWeightKg) {
      const targetVal = goalTargetWeightKg ? (unit === 'metric' ? goalTargetWeightKg : goalTargetWeightKg * 2.20462) : null;
      return {
        percent: 0,
        target: targetVal ? targetVal.toFixed(1) : '--',
        trend: 'none' as 'up' | 'down' | 'none',
        daysRemaining,
        remainingWeight: null as number | null,
        isAchieved: false,
        baseWeight: null as string | null,
        currentWeight: null as string | null
      };
    }

    // Base weight (first saved weight) and Current weight (latest saved weight)
    const baseEntry = sortedHistoryAsc[0];
    const currentEntry = sortedHistoryAsc[sortedHistoryAsc.length - 1];

    const baseKg = baseEntry.weight;
    const currentKg = currentEntry.weight;
    const targetKg = goalTargetWeightKg;

    // Convert for current unit display
    const baseVal = unit === 'metric' ? baseKg : baseKg * 2.20462;
    const currentVal = unit === 'metric' ? currentKg : currentKg * 2.20462;
    const targetVal = unit === 'metric' ? targetKg : targetKg * 2.20462;

    // Remaining weight to final target (e.g. target 100kg and current 90kg => 10kg more to go)
    const remainingVal = Math.abs(targetVal - currentVal);

    // Determine trend relative to previous saved measurement
    let trend: 'up' | 'down' | 'none' = 'none';
    if (sortedHistoryAsc.length > 1) {
      const prevKg = sortedHistoryAsc[sortedHistoryAsc.length - 2].weight;
      if (currentKg < prevKg) trend = 'down';
      else if (currentKg > prevKg) trend = 'up';
    }

    // Goal Progression Percentage Calculation:
    // Base data: first saved weight data (baseKg)
    // Target data: goal weight data (targetKg)
    let percent = 0;
    let isAchieved = false;

    const totalDistance = Math.abs(targetKg - baseKg);

    if (totalDistance < 0.05) {
      // Base weight already equals target weight
      const diff = Math.abs(currentKg - targetKg);
      if (diff <= 0.2) {
        percent = 100;
        isAchieved = true;
      } else {
        percent = 0;
      }
    } else if (targetKg < baseKg) {
      // Weight Loss Goal
      if (currentKg <= targetKg) {
        percent = 100;
        isAchieved = true;
      } else {
        const progressMade = baseKg - currentKg;
        // Allows negative percentage if current weight increased above base weight
        percent = Math.round((progressMade / totalDistance) * 100);
      }
    } else {
      // Weight Gain Goal
      if (currentKg >= targetKg) {
        percent = 100;
        isAchieved = true;
      } else {
        const progressMade = currentKg - baseKg;
        // Allows negative percentage if current weight dropped below base weight
        percent = Math.round((progressMade / totalDistance) * 100);
      }
    }

    return {
      percent,
      target: targetVal,
      trend,
      daysRemaining,
      remainingWeight: remainingVal,
      isAchieved,
      baseWeight: baseVal,
      currentWeight: currentVal
    };
  }, [sortedHistoryAsc, goalTargetWeightKg, savedGoal, unit]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const reportName = name || 'Guest';
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${reportName}-${dateStr}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const activityOptions = useMemo<{ value: ActivityLevel; label: string; desc: string }[]>(() => [
    { value: 'sedentary', label: t.sedentary, desc: t.sedentaryDesc },
    { value: 'lightly_active', label: t.lightly_active, desc: t.lightly_activeDesc },
    { value: 'moderately_active', label: t.moderately_active, desc: t.moderately_activeDesc },
    { value: 'very_active', label: t.very_active, desc: t.very_activeDesc },
    { value: 'extra_active', label: t.extra_active, desc: t.extra_activeDesc },
  ], [t]);

  const dashboardMetrics = useMemo(() => {
    const parsedWeight = parseFloat(weight);
    if (!parsedWeight || parsedWeight <= 0) return null;

    const effectiveHeight = metricData.height || 170;
    const effectiveAge = metricData.age || 25;

    const currentMetricData = {
      ...metricData,
      height: effectiveHeight,
      age: effectiveAge
    };

    const bmr = calculateBMR(currentMetricData);
    const tdee = calculateTDEE(bmr, currentMetricData.activityLevel);
    const idealWeight = calculateIdealWeight(effectiveHeight, currentMetricData.gender);
    const idealFatRange = getIdealBodyFatRange(currentMetricData.gender, effectiveAge);

    const kgDiff = currentMetricData.weight - idealWeight.kg;
    const lbDiff = (currentMetricData.weight * 2.20462) - idealWeight.lb;
    
    let type: 'lose' | 'gain' | 'maintain' = 'maintain';
    if (Math.abs(kgDiff) < 0.1) type = 'maintain';
    else if (kgDiff > 0) type = 'lose';
    else type = 'gain';

    const bmiVal = calculateBMI(currentMetricData.weight, effectiveHeight);
    const bodyFatVal = calculateBodyFat(currentMetricData) || 0;

    return {
      bmi: bmiVal,
      bmr,
      tdee,
      bodyFat: bodyFatVal,
      idealWeight,
      idealFatRange,
      weightDiff: {
        kg: Math.abs(kgDiff),
        lb: Math.abs(lbDiff),
        type
      },
      category: getBMICategory(bmiVal)
    };
  }, [metricData, weight]);

  const displayWeight = latestHistoryEntry 
    ? (unit === 'metric' ? latestHistoryEntry.weight : latestHistoryEntry.weight * 2.20462) 
    : null;

  const displayBmi = useMemo(() => {
    if (latestHistoryEntry && typeof latestHistoryEntry.bmi === 'number' && latestHistoryEntry.bmi > 0) {
      return latestHistoryEntry.bmi;
    }
    const h = metricData.height || 0;
    const w = latestHistoryEntry ? latestHistoryEntry.weight : (metricData.weight || 0);
    if (w > 0 && h > 0) {
      return calculateBMI(w, h);
    }
    return null;
  }, [latestHistoryEntry, metricData]);

  const displayCategory = useMemo(() => {
    if (displayBmi && displayBmi > 0) {
      return getBMICategory(displayBmi);
    }
    return null;
  }, [displayBmi]);

  // Handler to refresh and remain in the health tab
  const handleHealthMenuClick = async () => {
    setActiveTab('calculator');
    try {
      localStorage.setItem('ratbod_active_tab', 'calculator');
    } catch (e) {}

    // Trigger local state and metric re-calculations
    setHistoryRefreshTrigger(prev => prev + 1);

    try {
      const h = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      setHistoryList(h);
      const g = localStorage.getItem('ratbod_goals');
      setSavedGoal(g ? JSON.parse(g) : null);

      const savedHeight = localStorage.getItem('ratbod_height');
      const savedAge = localStorage.getItem('ratbod_age');
      const savedGender = localStorage.getItem('ratbod_gender') as Gender;
      const savedActivity = localStorage.getItem('ratbod_activity') as ActivityLevel;
      const savedUnit = localStorage.getItem('ratbod_unit') as 'metric' | 'imperial';

      if (savedHeight !== null) setHeight(savedHeight);
      if (savedAge !== null) setAge(savedAge);
      if (savedGender) setGender(savedGender);
      if (savedActivity) setActivityLevel(savedActivity);
      if (savedUnit) setUnit(savedUnit);
    } catch (e) {}

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.height !== undefined) setHeight(data.height || '');
          if (data.age !== undefined) setAge(data.age || '');
          if (data.gender !== undefined) setGender(data.gender || 'male');
          if (data.activityLevel !== undefined) setActivityLevel(data.activityLevel || 'sedentary');
          if (data.unit !== undefined) setUnit(data.unit || 'metric');
        }

        const histSnap = await getDoc(doc(db, 'users', currentUser.uid, 'appData', 'history'));
        if (histSnap.exists() && Array.isArray(histSnap.data().history)) {
          setHistoryList(histSnap.data().history);
          localStorage.setItem('ratbod_history', JSON.stringify(histSnap.data().history));
        }
        const goalSnap = await getDoc(doc(db, 'users', currentUser.uid, 'appData', 'goals'));
        if (goalSnap.exists() && goalSnap.data().goal) {
          setSavedGoal(goalSnap.data().goal);
          localStorage.setItem('ratbod_goals', JSON.stringify(goalSnap.data().goal));
        }
      } catch (err) {
        console.error('Error refreshing health data from db:', err);
      }
    }

    // Scroll smoothly to top for instant view of refreshed data
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleHealthMenuClick();
  };

  if (activeTab === 'home') {
    return (
      <LandingPage
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  return (
    <>
    {/* Notification Toast */}
    <AnimatePresence>
      {showSavedNotification && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[74px] sm:bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-emerald-600/40 flex items-center gap-2 border border-emerald-400 select-none pointer-events-none whitespace-nowrap"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{lang === 'bn' ? 'সফলভাবে সংরক্ষিত হয়েছে' : 'Successfully Saved'}</span>
        </motion.div>
      )}
    </AnimatePresence>

    <div 
      style={{ colorScheme: darkMode ? 'dark' : 'light' }}
      className={cn(
      "min-h-screen font-sans transition-colors duration-300 selection:bg-primary-light overflow-x-clip pb-24 md:pb-0",
      darkMode ? "dark bg-[#0A0A0A] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"
    )}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[8px] transition-all duration-300">
        <div className={cn(
          "max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between rounded-2xl border backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300",
          darkMode 
            ? "bg-[#0F0F0F]/45 border-white/10 shadow-2xl shadow-black/40" 
            : "bg-white/45 border-black/5 shadow-xl shadow-gray-300/40"
        )}>
          <button 
            type="button"
            id="ratbod_logo_btn"
            onClick={handleLogoClick} 
            className="flex items-center gap-2 shrink-0 hover:opacity-80 active:scale-95 transition-all cursor-pointer text-left bg-transparent border-0 py-2 px-1 -ml-1 rounded-xl touch-manipulation relative z-10 select-none"
            title="Reload RatboD"
            aria-label="Reload RatboD"
          >
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white shadow-sm shadow-primary/30 shrink-0">
              <Activity size={14} />
            </div>
            <h1 className="font-sans font-black text-base tracking-tighter select-none">RatboD</h1>
          </button>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-bold bg-gray-100/60 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            <button
              onClick={handleHealthMenuClick}
              className={cn(
                "px-3 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer",
                activeTab === 'calculator'
                  ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              {t.tabMeasure}
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={cn(
                "px-3 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'results'
                  ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              <Flame size={12} className="text-orange-500" />
              {t.tabResults}
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={cn(
                "px-3 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'water'
                  ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              <Droplet size={12} className="text-blue-500 fill-blue-400/30" />
              {t.tabWater}
            </button>
            <button
              onClick={() => setActiveTab('breathing')}
              className={cn(
                "px-3 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'breathing'
                  ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              <Wind size={12} className="animate-pulse text-teal-400" />
              {t.tabBreathe}
            </button>
            <button
              onClick={() => setActiveTab('groceries')}
              className={cn(
                "px-3 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer",
                activeTab === 'groceries'
                  ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              {t.tabHistory}
            </button>
          </nav>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-1.5 rounded-full transition-all cursor-pointer",
                darkMode ? "bg-white/5 text-primary hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <div className={cn(
              "flex p-0.5 rounded-full transition-colors",
              darkMode ? "bg-white/5" : "bg-gray-100"
            )}>
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-black transition-all cursor-pointer",
                  lang === 'en' 
                    ? (darkMode ? "bg-white/15 text-white" : "bg-white shadow-sm text-gray-900") 
                    : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                )}
                title="English"
              >
                EN
              </button>
              <button 
                onClick={() => setLang('bn')}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-black transition-all cursor-pointer",
                  lang === 'bn' 
                    ? (darkMode ? "bg-white/15 text-white" : "bg-white shadow-sm text-gray-900") 
                    : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                )}
                title="বাংলা"
              >
                বাং
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all cursor-pointer overflow-hidden",
                  darkMode ? "border-white/10 hover:border-white/30 bg-white/5" : "border-black/5 hover:border-black/20 bg-black/5"
                )}
                title="Profile"
              >
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={14} className={darkMode ? "text-white/70" : "text-black/50"} />
                )}
              </button>
              
              {showProfileMenu && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                />
              )}
              <AnimatePresence>
                {showProfileMenu && (
                    <motion.div
                      key="profile-menu"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "absolute right-0 top-12 w-48 rounded-2xl shadow-xl border overflow-hidden z-50",
                        darkMode ? "bg-[#111111] border-white/10" : "bg-white border-black/5"
                      )}
                    >
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setActiveTab('home');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                          "hidden md:flex w-full text-left px-4 py-3 text-sm font-bold items-center gap-3 transition-colors",
                          darkMode ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                        )}
                      >
                        <Activity size={16} className="text-primary" />
                        {lang === 'bn' ? 'হোম' : 'Home'}
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setIsProfileOpen(true);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors",
                          darkMode ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                        )}
                      >
                        <UserIcon size={16} />
                        Profile
                      </button>
                      <div className={cn("h-px w-full", darkMode ? "bg-white/10" : "bg-black/5")} />
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          auth.signOut();
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors",
                          darkMode ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
                        )}
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Breathing Tab Content */}
      <div className={cn(
        "max-w-4xl mx-auto px-4 sm:px-6 pt-2 sm:pt-2.5 pb-[11px] sm:pb-12",
        activeTab === 'breathing' ? "block" : "hidden"
      )}>
        <BreathingTimer darkMode={darkMode} lang={lang} />
      </div>

      {/* Groceries Tab Content */}
      <div className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-2 sm:pt-2.5 pb-[11px] sm:pb-12",
        activeTab === 'groceries' ? "block" : "hidden"
      )}>
        <GroceryCalculator darkMode={darkMode} lang={lang} />
      </div>

      {/* Water Tab Content */}
      <div className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-2 sm:pt-2.5 pb-[11px] sm:pb-12",
        activeTab === 'water' ? "block" : "hidden"
      )}>
        <WaterTracker darkMode={darkMode} lang={lang} />
      </div>

      {/* Habitor Tab Content */}
      <div className={cn(
        "max-w-4xl mx-auto px-4 sm:px-6 pt-2 sm:pt-2.5 pb-[11px] sm:pb-12",
        activeTab === 'results' ? "block" : "hidden"
      )}>
        <Habitor darkMode={darkMode} lang={lang} />
      </div>

      <main className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-2 sm:pt-2.5 pb-[11px] sm:pb-12 space-y-8 overflow-x-hidden",
        (activeTab === 'results' || activeTab === 'breathing' || activeTab === 'groceries' || activeTab === 'water') ? "hidden" : "block"
      )}>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 !mb-[16px]">
          {/* Latest Entry Card - Height 99px */}
          <div className={cn("relative p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border flex flex-col justify-between h-[99px] overflow-hidden", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50")}>
            {/* Iconic Watermark */}
            <div className="absolute -right-2 -top-2 opacity-15 pointer-events-none text-gray-400/80 dark:text-gray-600/80">
              <Scale size={70} />
            </div>

            <div className="relative z-10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
              <span className="truncate">{lang === 'bn' ? 'সর্বশেষ এন্ট্রি' : 'Latest Entry'}</span>
            </div>
            <div className="relative z-10">
              <div className={cn("text-lg sm:text-xl font-black leading-tight", darkMode ? "text-white" : "text-gray-900")}>
                {displayWeight !== null ? formatNum(displayWeight) : '--'} <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-gray-900 dark:text-gray-100 mt-0.5 flex items-center gap-1.5 truncate">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{latestHistoryEntry ? formatRelativeDate(latestHistoryEntry.date) : (lang === 'bn' ? 'কোনো তথ্য নেই' : 'No data')}</span>
              </div>
            </div>
          </div>

          {/* Health Status Card - Height 99px */}
          <div className={cn("relative p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border flex flex-col justify-between h-[99px] overflow-hidden", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50")}>
            {/* Iconic Watermark */}
            <div className="absolute -right-2 -top-2 opacity-15 pointer-events-none text-gray-400/80 dark:text-gray-600/80">
              <Heart size={70} />
            </div>

            <div className="relative z-10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
              <span className="truncate">{lang === 'bn' ? 'স্বাস্থ্যের অবস্থা' : 'Health Status'}</span>
            </div>
            <div className="relative z-10">
              <div className={cn("text-sm sm:text-base font-black capitalize truncate leading-tight", darkMode ? "text-white" : "text-gray-900")}>
                {displayCategory ? translateCategory(displayCategory) : (latestHistoryEntry ? (lang === 'bn' ? 'স্বাভাবিক' : 'Normal') : '--')}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                BMI: {displayBmi ? formatNum(displayBmi.toFixed(1)) : '--'}
              </div>
            </div>
          </div>

          {/* Goal Progress Card - Height 99px */}
          <div className={cn("relative p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border flex flex-col justify-between h-[99px] col-span-2 md:col-span-1 overflow-hidden", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border border-emerald-500/30 shadow-md shadow-emerald-500/10")}>
             {/* Iconic Watermark */}
             <div className="absolute -right-2 -top-2 opacity-15 pointer-events-none text-gray-400/80 dark:text-gray-600/80">
               <Target size={70} />
             </div>

             <div className="relative z-10 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
              <span>{lang === 'bn' ? 'লক্ষ্যের অগ্রগতি' : 'Goal Progress'}</span>
            </div>
            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-lg sm:text-xl font-black tracking-tight leading-none",
                    !latestHistoryEntry 
                      ? "text-gray-400" 
                      : (goalProgress.percent < 0 ? "text-red-500" : "text-emerald-500")
                  )}>
                    {latestHistoryEntry 
                      ? `${formatNum(goalProgress.percent)}%` 
                      : '--'}
                  </span>
                </div>
                
                {/* Amount of kg/lb more to go - Font size 22px */}
                {latestHistoryEntry && goalProgress.remainingWeight !== null && (
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {goalProgress.trend === 'down' ? <TrendingDown className="text-primary" size={13} /> : 
                       goalProgress.trend === 'up' ? <TrendingUp className="text-red-500" size={13} /> : 
                       <Minus className="text-gray-400" size={13} />}
                      <span className={cn(
                        "text-[22px] font-black tracking-tight leading-none",
                        goalProgress.isAchieved || goalProgress.remainingWeight <= 0.05
                          ? "text-emerald-500"
                          : (goalProgress.trend === 'down' ? "text-primary" : goalProgress.trend === 'up' ? "text-red-500" : (darkMode ? "text-white" : "text-gray-900"))
                      )}>
                        {goalProgress.isAchieved || goalProgress.remainingWeight <= 0.05
                          ? (lang === 'bn' ? '🎉 লক্ষ্য অর্জিত' : '🎉 Reached')
                          : (
                            <>
                              {formatNum(goalProgress.remainingWeight)} <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                            </>
                          )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className={cn("h-1.5 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div 
                   className={cn(
                     "h-full transition-all duration-1000",
                     goalProgress.percent < 0 ? "bg-red-500" : "bg-emerald-500"
                   )} 
                   style={{ width: `${latestHistoryEntry ? Math.max(0, Math.min(100, goalProgress.percent)) : 0}%` }} 
                 />
              </div>
              {/* Days remaining and goal amount font size 11px */}
              <div className="flex items-center justify-between text-[11px] text-gray-900 dark:text-gray-100 font-bold leading-tight">
                <span className="truncate">{lang === 'bn' ? 'লক্ষ্য:' : 'Goal:'} {latestHistoryEntry ? formatNum(goalProgress.target) : '--'} {unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                {latestHistoryEntry && goalProgress.daysRemaining !== null && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-extrabold tracking-tight text-[11px] shrink-0">
                    {goalProgress.daysRemaining > 0 ? (lang === 'bn' ? `${formatNum(goalProgress.daysRemaining)} দিন` : `${goalProgress.daysRemaining} days`) : (lang === 'bn' ? 'শেষ' : 'Ended')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Check & Health Analytics */}
        <div className={cn("p-4 sm:p-6 rounded-3xl border !mt-[16px]", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50")}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Side: Quick Check Form */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-5 text-base sm:text-lg font-bold">
                  <Scale size={20} className="opacity-70" /> {lang === 'bn' ? 'দ্রুত চেক' : 'Quick Check'}
                </div>
                
                {/* Inputs */}
                <div className="space-y-4 sm:space-y-5">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">{t.weight} *</label>
                    <div className="relative">
                      <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white")} placeholder="0.0" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'kg' : 'lbs'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">{t.waist} *</label>
                      <div className="relative">
                        <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white")} placeholder="0.0" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'cm' : 'in'}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">{t.neck} *</label>
                      <div className="relative">
                        <input type="number" value={neck} onChange={(e) => setNeck(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white")} placeholder="0.0" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'cm' : 'in'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {gender === 'female' && (
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">{t.hip} (Female) *</label>
                      <div className="relative">
                        <input type="number" value={hip} onChange={(e) => setHip(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white")} placeholder="0.0" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'cm' : 'in'}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">{t.activityLevel} *</label>
                    <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white")}>
                      {activityOptions.map(opt => <option key={opt.value} value={opt.value} className={darkMode ? "bg-[#0F0F0F]" : "bg-white"}>{opt.label}</option>)}
                    </select>
                    <p className="text-[10px] text-gray-900 dark:text-gray-100 mt-1">{activityOptions.find(o => o.value === activityLevel)?.desc}</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSaveMetrics} 
                disabled={!weight || parseFloat(weight) <= 0}
                className={cn(
                  "w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                  !weight || parseFloat(weight) <= 0
                    ? "bg-gray-500/20 text-gray-400 cursor-not-allowed" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-[0.99]"
                )}
              >
                <Save size={18} />
                {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
              </button>
            </div>

            {/* Right Side: Health Analytics */}
            <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l pt-5 lg:pt-0 lg:pl-8 border-gray-200 dark:border-white/5 flex flex-col justify-start">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                    <Activity size={20} className="text-emerald-500" />
                    {lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ' : 'Health Analytics'}
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">
                    {dashboardMetrics 
                      ? (lang === 'bn' ? 'রিয়েল-টাইম হিসাব' : 'Live Calculated') 
                      : (lang === 'bn' ? 'ইনপুটের অপেক্ষায়' : 'Waiting for input')}
                  </span>
                </div>

                {dashboardMetrics && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 mt-2"
                  >
                    <div className={cn("relative p-4 rounded-2xl overflow-hidden shadow-sm transition-all", darkMode ? "bg-gradient-to-br from-[#1A1A1A] to-[#111] border border-white/10" : "bg-white border border-gray-200 shadow-sm shadow-gray-200/50")}>
                      <div className="absolute -right-3 -top-3 opacity-10 text-emerald-500 pointer-events-none">
                        <Activity size={64} />
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1 flex items-center gap-1"><Activity size={12}/> {lang === 'bn' ? 'বিএমআর' : 'BMR'}</div>
                      <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{formatNum(dashboardMetrics.bmr)} <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">kcal</span></div>
                    </div>

                    <div className={cn("relative p-4 rounded-2xl overflow-hidden shadow-sm transition-all", darkMode ? "bg-gradient-to-br from-[#1A1A1A] to-[#111] border border-white/10" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm shadow-gray-200/50")}>
                      <div className="absolute -right-3 -top-3 opacity-10 text-blue-500 pointer-events-none">
                        <Zap size={64} />
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1"><Zap size={12}/> {lang === 'bn' ? 'টিডিইই' : 'TDEE'}</div>
                      <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{formatNum(dashboardMetrics.tdee)} <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">kcal</span></div>
                    </div>

                    <div className={cn("relative p-4 rounded-2xl overflow-hidden shadow-sm transition-all", darkMode ? "bg-gradient-to-br from-[#1A1A1A] to-[#111] border border-white/10" : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm shadow-gray-200/50")}>
                      <div className="absolute -right-3 -top-3 opacity-10 text-amber-500 pointer-events-none">
                        <Flame size={64} />
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1"><Flame size={12}/> {t.bodyFat}</div>
                      <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{dashboardMetrics.bodyFat > 0 ? `${formatNum(dashboardMetrics.bodyFat.toFixed(1))}` : '--'} <span className="text-xs font-bold text-gray-500 dark:text-gray-400">%</span></div>
                    </div>

                    <div className={cn("relative p-4 rounded-2xl overflow-hidden shadow-sm transition-all", darkMode ? "bg-gradient-to-br from-[#1A1A1A] to-[#111] border border-white/10" : "bg-white border border-gray-200 shadow-sm shadow-gray-200/50")}>
                      <div className="absolute -right-3 -top-3 opacity-10 text-rose-500 pointer-events-none">
                        <Heart size={64} />
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1 flex items-center gap-1"><Heart size={12}/> {lang === 'bn' ? 'বিএমআই' : 'BMI'}</div>
                      <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{formatNum(dashboardMetrics.bmi.toFixed(1))}</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <History darkMode={darkMode} unit={unit} refreshTrigger={historyRefreshTrigger} isLoggedIn={!!authUser} lang={lang} onUpdate={() => setHistoryRefreshTrigger(prev => prev + 1)} />

        {/* Goals */}
        <Goals darkMode={darkMode} unit={unit} currentWeight={latestHistoryEntry?.weight || metricData.weight} currentBodyFat={dashboardMetrics?.bodyFat || metrics?.bodyFat} lang={lang} onGoalUpdate={() => setHistoryRefreshTrigger(prev => prev + 1)} />

        {/* Quick Steps - Available only on Fridays */}
        {new Date().getDay() === 5 && (
          <QuickSteps darkMode={darkMode} lang={lang} onSave={() => setHistoryRefreshTrigger(prev => prev + 1)} />
        )}
        
      </main>

      {/* Footer */}
      <footer className={cn(
        "max-w-5xl mx-auto px-6 py-[10px] sm:py-6 border-t transition-colors",
        darkMode ? "border-white/5" : "border-black/5"
      )}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {/* Logo - Displayed across all tabs and views */}
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-gray-700 dark:text-gray-300" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">RATBOD</span>
          </div>

          {/* Unit Toggle, Policies, & Copyright: always shown on desktop, on mobile only in Health tab */}
          <div className={cn(
            "flex flex-col items-center justify-center gap-3 text-center w-full",
            activeTab !== 'calculator' ? "hidden md:flex" : "flex"
          )}>
            {/* UNIT Switcher Pill (Only in Health / Calculator view) */}
            {activeTab === 'calculator' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-400">UNIT:</span>
                <div className={cn(
                  "flex p-0.5 rounded-full border transition-colors bg-[#18181c] border-white/10"
                )}>
                  <button 
                    onClick={() => setUnit('metric')}
                    className={cn(
                      "px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer",
                      unit === 'metric' 
                        ? "bg-[#00A3FF] text-white shadow-xs shadow-cyan-500/30" 
                        : "text-gray-400 hover:text-gray-200"
                    )}
                    title="Metric System"
                  >
                    M
                  </button>
                  <button 
                    onClick={() => setUnit('imperial')}
                    className={cn(
                      "px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer",
                      unit === 'imperial' 
                        ? "bg-[#00A3FF] text-white shadow-xs shadow-cyan-500/30" 
                        : "text-gray-400 hover:text-gray-200"
                    )}
                    title="Imperial System"
                  >
                    I
                  </button>
                </div>
              </div>
            )}

            {/* Policy Links */}
            <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-semibold text-gray-700 dark:text-gray-400">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contact Support</a>
            </div>

            {/* Copyright */}
            <p className={cn(
              "text-[9px] font-extrabold uppercase tracking-widest transition-colors opacity-40",
              darkMode ? "text-gray-900 dark:text-gray-100" : "text-gray-800"
            )}>
              © 2026 CRAFTED BY <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">RATUL BIN ZAHANGIR</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Scroll Toggle Button (Down when at top, Up when scrolled) - Mobile View Only for Health (Home) Section */}
      {activeTab === 'calculator' && (
        <button
          type="button"
          id="health_scroll_toggle_btn"
          onClick={handleScrollToggle}
          className={cn(
            "fixed bottom-20 right-4 z-40 md:hidden w-10 h-10 rounded-full shadow-xl border backdrop-blur-md transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none",
            darkMode
              ? "bg-[#161616]/90 border-white/20 text-white shadow-black/70 hover:bg-[#222]"
              : "bg-white/95 border-gray-200 text-gray-800 shadow-gray-400/40 hover:bg-gray-50"
          )}
          aria-label={isScrolledDown ? (lang === 'bn' ? 'উপরে যান' : 'Go to top') : (lang === 'bn' ? 'নিচে যান' : 'Go to bottom')}
          title={isScrolledDown ? (lang === 'bn' ? 'উপরে যান' : 'Go to top') : (lang === 'bn' ? 'নিচে যান' : 'Go to bottom')}
        >
          {isScrolledDown ? (
            <ArrowUp size={18} className="text-primary shrink-0 transition-transform duration-200" />
          ) : (
            <ArrowDown size={18} className="text-primary shrink-0 transition-transform duration-200" />
          )}
        </button>
      )}

      
    <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        darkMode={darkMode}
        name={name}
        setName={setName}
        gender={gender}
        setGender={setGender}
        birthdate={birthdate}
        setBirthdate={setBirthdate}
        height={height}
        setHeight={setHeight}
                unit={unit}
      />
    </div>
      {/* Mobile Sticky Tab Navigation: 1. Groceries, 2. Breathing, 3. Water, 4. Habitor, 5. Health (Home) */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300",
          darkMode 
            ? "bg-[#0F0F0F]/50 border-white/10 text-white shadow-2xl shadow-black/60" 
            : "bg-white/55 border-black/5 text-gray-900 shadow-2xl shadow-gray-400/30",
          "py-2 px-1.5"
        )}
      >
        <div className="flex items-center justify-around w-full max-w-lg mx-auto">
          {/* 1. Groceries (First left side) */}
          <button 
            id="tab_groceries"
            onClick={() => setActiveTab('groceries')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all select-none min-w-0",
              activeTab === 'groceries' ? "text-[#F04A00] scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <ShoppingBag size={18} />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">{t.tabHistory}</span>
          </button>

          {/* 2. Breathing */}
          <button 
            id="tab_breathing"
            onClick={() => setActiveTab('breathing')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all select-none min-w-0",
              activeTab === 'breathing' ? "text-teal-400 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Wind size={18} />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">{t.tabBreathe}</span>
          </button>

          {/* 3. Water */}
          <button 
            id="tab_water"
            onClick={() => setActiveTab('water')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all select-none min-w-0",
              activeTab === 'water' ? "text-blue-500 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Droplet size={18} />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">{t.tabWater}</span>
          </button>

          {/* 4. Habitor */}
          <button 
            id="tab_results"
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all relative select-none min-w-0",
              activeTab === 'results' ? "text-orange-500 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Flame size={18} />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">{t.tabResults}</span>
          </button>

          {/* 5. Health (Right last bottom, Home menu) */}
          <button 
            id="tab_calculator"
            onClick={handleHealthMenuClick}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all cursor-pointer select-none min-w-0",
              activeTab === 'calculator' ? "text-primary scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Heart size={18} />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">{t.tabMeasure}</span>
          </button>
        </div>
      </div>
    </>
  );
}
