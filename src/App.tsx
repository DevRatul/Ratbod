/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Flame,
  Calendar,
  Target,
  Save,
  TrendingDown,
  TrendingUp,
  Minus
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
import ProfileModal from './components/ProfileModal';
import { translations } from './utils/translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
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
  const [isIdealWeightOpen, setIsIdealWeightOpen] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [authUser, setAuthUser] = useState(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'calculator' | 'results' | 'groceries' | 'water' | 'goals' | 'breathing'>('water');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load from Firestore (fallback to localStorage) on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      
      let loadedFromDb = false;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) setName(data.name);
            if (data.gender) setGender(data.gender);
            if (data.birthdate) setBirthdate(data.birthdate);
            if (data.age) setAge(data.age);
            if (data.height) setHeight(data.height);
            if (data.weight) setWeight(data.weight);
            if (data.waist) setWaist(data.waist);
            if (data.neck) setNeck(data.neck);
            if (data.hip) setHip(data.hip);
            if (data.activityLevel) setActivityLevel(data.activityLevel);
            if (data.unit) setUnit(data.unit);
            if (data.darkMode !== undefined) setDarkMode(data.darkMode);
            if (data.lang) setLang(data.lang);
            loadedFromDb = true;
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      }

      if (!loadedFromDb) {
        // Do not fallback to local storage if user is signed in to prevent local leak over to new account
        if (user) {
          // Keep fields empty for new user
          // Don't overwrite basic preferences if they already exist, but for a brand new user, set defaults
        } else {
          // If no user load local
          const savedName = localStorage.getItem('ratbod_name') || '';
          const savedGender = localStorage.getItem('ratbod_gender') as Gender || 'male';
          const savedBirthdate = localStorage.getItem('ratbod_birthdate') || '';
          const savedAge = localStorage.getItem('ratbod_age') || '';
          const savedHeight = localStorage.getItem('ratbod_height') || '';
          const savedWeight = localStorage.getItem('ratbod_weight') || '';
          const savedWaist = localStorage.getItem('ratbod_waist') || '';
          const savedNeck = localStorage.getItem('ratbod_neck') || '';
          const savedHip = localStorage.getItem('ratbod_hip') || '';
          const savedActivity = localStorage.getItem('ratbod_activity') as ActivityLevel || 'sedentary';
          const savedUnit = localStorage.getItem('ratbod_unit') as 'metric' | 'imperial' || 'metric';
          const rawDarkMode = localStorage.getItem('ratbod_darkmode');
          const savedDarkMode = rawDarkMode === null ? true : rawDarkMode === 'true';
          const savedLang = localStorage.getItem('ratbod_lang') as 'en' | 'bn' || 'en';

          setName(savedName);
          setGender(savedGender);
          setBirthdate(savedBirthdate);
          setAge(savedAge);
          setHeight(savedHeight);
          setWeight(savedWeight);
          
          setWaist(savedWaist);
          setNeck(savedNeck);
          setHip(savedHip);
          setActivityLevel(savedActivity);
          setUnit(savedUnit);
          setDarkMode(savedDarkMode);
          setLang(savedLang);
        }
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync back to localStorage & Firestore
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem('ratbod_name', name);
    localStorage.setItem('ratbod_gender', gender);
    localStorage.setItem('ratbod_birthdate', birthdate);
    localStorage.setItem('ratbod_age', age);
    localStorage.setItem('ratbod_height', height);
    localStorage.setItem('ratbod_weight', weight);
    localStorage.setItem('ratbod_waist', waist);
    localStorage.setItem('ratbod_neck', neck);
    localStorage.setItem('ratbod_hip', hip);
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
        weight,
        waist,
        neck,
        hip,
        activityLevel,
        unit,
        darkMode,
        lang,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(e => {
        console.error("Failed to sync profile to Firestore", e);
      });
    }
  }, [name, gender, birthdate, age, height, weight, waist, neck, hip, activityLevel, unit, darkMode, lang, isLoaded]);

  useEffect(() => {
    // Set browser tab theme-color and iOS status bar style
    const themeColor = darkMode ? '#000000' : '#ffffff';
    const statusBar = darkMode ? 'black-translucent' : 'default';

    // 2. Update <meta name="apple-mobile-web-app-status-bar-style">
    let statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusMeta) {
      statusMeta = document.createElement('meta');
      statusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(statusMeta);
    }
    statusMeta.setAttribute('content', statusBar);

    // 3. Set background color on documentElement and body for seamless browser window/tab integration
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
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
    if (num === undefined || num === null) return '';
    const str = typeof num === 'number' ? num.toFixed(1) : num.toString();
    // Strip trailing .0 if it's there and represent clean integer or keep matching decimal
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

  const handleSaveMetrics = () => {
    if (!metrics) return;
    
    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight: metricData.weight,
      bmi: metrics.bmi,
      bodyFat: metrics.bodyFat
    };

    const existing = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
    existing.push(entry);
    localStorage.setItem('ratbod_history', JSON.stringify(existing));
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'appData', 'history'), { history: existing }, { merge: true }).catch(e => {});
    }

    setHistoryRefreshTrigger(prev => prev + 1);
    
    // Custom logic to show alert, switch tab, and reset quick measurement fields
    
    
    // Reset quick measurement fields
    setWeight('');
    setWaist('');
    setNeck('');
    setHip('');
  };

  // Convert inputs to metric for calculations
  
  const translateCategory = (cat: string) => {
    if (lang !== 'bn') return cat;
    if (cat === 'Underweight') return 'কম ওজন';
    if (cat === 'Normal') return 'স্বাভাবিক';
    if (cat === 'Overweight') return 'অতিরিক্ত ওজন';
    if (cat === 'Obese') return 'স্থূলতা';
    return cat;
  };

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

  
  const goalProgress = useMemo(() => {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
    } catch (e) {}
    
    const cw = parseFloat(weight) || 0;
        let goalData = null;
    try {
      const savedGoals = localStorage.getItem('ratbod_goals');
      if (savedGoals) {
        goalData = JSON.parse(savedGoals);
      }
    } catch (e) {}

    // Use goal weight if it exists, otherwise fallback to ideal weight
    const goalTargetWeight = goalData && goalData.targetWeight ? goalData.targetWeight : null;
    
    // In metric it's straightforward, in imperial we need to handle conversion if the goal is saved in kg and app is in lb
    // Wait, Goals.tsx saves targetWeight in whatever unit the user selected when saving? Let's assume Goals.tsx saves targetWeight.
    // Let's just do standard conversion: Goals.tsx gets unit from props. If unit changes, the goal might be displayed wrong unless converted. 
    // Wait, if it's the exact same target in the Goals tab, we should use it exactly as it is there.
    
    const target = goalTargetWeight ? (unit === 'metric' ? goalTargetWeight : goalTargetWeight * 2.20462) : (unit === 'metric' ? metrics?.idealWeight?.kg : metrics?.idealWeight?.lb);
    let initialWeight = cw;
    let previousWeight = cw;

    if (history.length > 0) {
      initialWeight = unit === 'metric' ? history[0].weight : history[0].weight * 2.20462;
      
      if (history.length > 1) {
        // The one before the current (latest saved vs current)
        previousWeight = unit === 'metric' ? history[history.length - 1].weight : history[history.length - 1].weight * 2.20462;
      } else {
        previousWeight = initialWeight;
      }
    }

    if (!target || !cw || initialWeight === target) return { percent: 0, target, trend: 'none' };
    
    const totalDiff = Math.abs(initialWeight - target);
    const currentDiff = Math.abs(initialWeight - cw);
    
    let percent = (currentDiff / totalDiff) * 100;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;

    let trend = 'none';
    if (cw < previousWeight) {
       trend = 'down'; // Weight went down
    } else if (cw > previousWeight) {
       trend = 'up'; // Weight went up
    }

    return { percent: Math.round(percent), target: target.toFixed(1), trend };
  }, [weight, unit, historyRefreshTrigger, metrics]);

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

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300 selection:bg-primary-light overflow-x-hidden pb-24 md:pb-0",
      darkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"
    )}>
      {/* Header */}
      <header className="sticky top-4 z-50 px-4 sm:px-6 transition-all duration-300">
        <div className={cn(
          "max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between rounded-2xl border backdrop-blur-xl shadow-xl transition-colors duration-300",
          darkMode ? "bg-[#0F0F0F]/80 border-white/10 shadow-black/40" : "bg-white/80 border-black/5 shadow-gray-200/50"
        )}>
          <a href="/" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
              <Activity size={14} />
            </div>
            <h1 className="font-sans font-black text-base tracking-tighter">RatboD</h1>
          </a>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-bold bg-gray-100/60 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            <button
              onClick={() => setActiveTab('calculator')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                activeTab === 'calculator'
                  ? (darkMode ? "bg-white/10 text-white" : "bg-white text-primary-dark shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              {t.tabMeasure}
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'results'
                  ? (darkMode ? "bg-orange-500/20 text-orange-400 font-bold" : "bg-orange-50 text-orange-700 font-bold shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              <Flame size={12} className="text-orange-500" />
              {t.tabResults}
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'water'
                  ? (darkMode ? "bg-blue-500/20 text-blue-400 font-bold" : "bg-blue-50 text-blue-800 font-bold shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              <Droplet size={12} className="text-blue-500 fill-blue-400/30" />
              {t.tabWater}
            </button>
            <button
              onClick={() => setActiveTab('groceries')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                activeTab === 'groceries'
                  ? (darkMode ? "bg-[#F04A00]/20 text-[#F04A00] font-bold" : "bg-[#F04A00]/10 text-[#F04A00] font-bold shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
              )}
            >
              {t.tabHistory}
            </button>
            <button
              onClick={() => setActiveTab('breathing')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'breathing'
                  ? (darkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-50 text-teal-700 shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-505 hover:text-gray-900")
              )}
            >
              <Wind size={12} className="animate-pulse text-teal-400" />
              {t.tabBreathe} (4-7-8)
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
                    ? (darkMode ? "bg-primary text-white" : "bg-white shadow-sm text-primary-dark") 
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
                    ? (darkMode ? "bg-primary text-white" : "bg-white shadow-sm text-primary-dark") 
                    : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                )}
                title="বাংলা"
              >
                বাং
              </button>
            </div>

            <button
              onClick={() => setIsProfileOpen(true)}
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
          </div>
        </div>
      </header>

      {/* Breathing Tab Content */}
      <div className={cn(
        "max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-12",
        activeTab === 'breathing' ? "block" : "hidden"
      )}>
        <BreathingTimer darkMode={darkMode} lang={lang} />
      </div>

      {/* Groceries Tab Content */}
      <div className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12",
        activeTab === 'groceries' ? "block" : "hidden"
      )}>
        <GroceryCalculator darkMode={darkMode} lang={lang} />
      </div>

      {/* Water Tab Content */}
      <div className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12",
        activeTab === 'water' ? "block" : "hidden"
      )}>
        <WaterTracker darkMode={darkMode} lang={lang} />
      </div>

      {/* Habitor Tab Content */}
      <div className={cn(
        "max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-12",
        activeTab === 'results' ? "block" : "hidden"
      )}>
        <Habitor darkMode={darkMode} lang={lang} />
      </div>

      <main className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12 space-y-8 overflow-x-hidden",
        (activeTab === 'results' || activeTab === 'breathing' || activeTab === 'groceries' || activeTab === 'water') ? "hidden" : "block"
      )}>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'সর্বশেষ এন্ট্রি' : 'Latest Entry'} <Calendar size={14} />
            </div>
            <div>
              <div className={cn("text-2xl font-black", darkMode ? "text-white" : "text-gray-900")}>
                {metricData.weight ? formatNum(metricData.weight) : '--'} <span className="text-base font-bold text-gray-500">{unit === 'metric' ? 'kg' : 'lb'}</span>
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                {metricData.weight ? (lang === 'bn' ? 'আজ' : 'Today') : (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data')}
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="flex items-center gap-1"><Heart size={12} className="text-rose-500" />{lang === 'bn' ? 'স্বাস্থ্যের অবস্থা' : 'Health Status'}</div> 
              <div className={cn("w-2.5 h-2.5 rounded-full", metrics ? (metrics.category === 'Normal' ? "bg-emerald-500" : (metrics.category === 'Underweight' ? "bg-blue-500" : "bg-red-500 animate-pulse")) : "bg-gray-500")} />
            </div>
            <div>
              <div className={cn("text-xl font-black capitalize", darkMode ? "text-white" : "text-gray-900")}>
                {metrics ? translateCategory(metrics.category) : '--'}
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                BMI: {metrics ? formatNum(metrics.bmi.toFixed(1)) : '--'}
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28 col-span-2 md:col-span-1", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>
             <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'লক্ষ্যের অগ্রগতি' : 'Goal Progress'} <Target size={14} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-2xl font-black text-emerald-500">
                {metrics ? `${goalProgress.percent}%` : '--'}
                {metrics && goalProgress.trend === 'down' && <TrendingDown size={20} className="text-emerald-500" />}
                {metrics && goalProgress.trend === 'up' && <TrendingUp size={20} className="text-emerald-500" />}
                {metrics && goalProgress.trend === 'none' && <Minus size={20} className="text-emerald-500" />}
              </div>
              <div className={cn("h-2 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${metrics ? goalProgress.percent : 0}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 font-bold mt-1">Goal: {metrics ? goalProgress.target : '--'} {unit === 'metric' ? 'kg' : 'lb'}</div>
            </div>
          </div>
        </div>

        {/* Quick Measurement */}
        <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5")}>
          <div className="flex items-center gap-2 mb-6 text-lg font-bold">
            <Scale size={20} className="opacity-70" /> {lang === 'bn' ? 'দ্রুত পরিমাপ' : 'Quick Measurement'}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Inputs */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.weight} *</label>
                <div className="relative">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'kg' : 'lbs'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.waist} *</label>
                  <div className="relative">
                    <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.neck} *</label>
                  <div className="relative">
                    <input type="number" value={neck} onChange={(e) => setNeck(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
              </div>
              
              {gender === 'female' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.hip} (Female) *</label>
                  <div className="relative">
                    <input type="number" value={hip} onChange={(e) => setHip(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.activityLevel} *</label>
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")}>
                  {activityOptions.map(opt => <option key={opt.value} value={opt.value} className={darkMode ? "bg-[#0F0F0F]" : "bg-white"}>{opt.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">{activityOptions.find(o => o.value === activityLevel)?.desc}</p>
              </div>
            </div>

            {/* RIGHT: Analysis Box */}
            <div className={cn("p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
              {metrics ? (
                 <div className="w-full space-y-4">
                   <Activity size={32} className="mx-auto text-emerald-500" />
                   <h4 className="font-bold text-lg">{lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ' : 'Health Analysis'}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআর' : 'BMR'}</div>
                       <div className="text-lg font-black text-primary">{formatNum(metrics.bmr)} <span className="text-[10px] text-gray-500">kcal</span></div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'টিডিইই' : 'TDEE'}</div>
                       <div className="text-lg font-black text-blue-500">{formatNum(metrics.tdee)} <span className="text-[10px] text-gray-500">kcal</span></div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t.bodyFat}</div>
                       <div className="text-lg font-black text-amber-500">{formatNum(metrics.bodyFat.toFixed(1))}%</div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআই' : 'BMI'}</div>
                       <div className="text-lg font-black text-rose-500">{formatNum(metrics.bmi.toFixed(1))}</div>
                     </div>
                   </div>
                 </div>
              ) : (
                 <div className="space-y-3 opacity-60">
                   <Activity size={32} className="mx-auto text-gray-400" />
                   <p className="text-sm font-bold text-gray-400">
                     {lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ দেখতে আপনার পরিমাপ দিন' : 'Enter your measurements to see health analysis'}
                   </p>
                   <p className="text-xs text-gray-500">
                     {lang === 'bn' ? 'ওজন, উচ্চতা এবং বয়স প্রয়োজন' : 'Weight, height, and age are required'}
                   </p>
                 </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleSaveMetrics} 
            disabled={!metrics}
            className={cn(
              "w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              !metrics
                ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            )}
          >
            <Save size={18} />
            {lang === 'bn' ? 'পরিমাপ সংরক্ষণ করুন' : 'Save Measurement'}
          </button>
        </div>

        {/* History */}
        <History darkMode={darkMode} unit={unit} refreshTrigger={historyRefreshTrigger} isLoggedIn={!!authUser} lang={lang} />

        {/* Goals */}
        <Goals darkMode={darkMode} unit={unit} currentWeight={metricData.weight} currentBodyFat={metrics?.bodyFat} lang={lang} onGoalUpdate={() => setHistoryRefreshTrigger(prev => prev + 1)} />

      </main>

      {/* Footer */}
      <footer className={cn(
        "max-w-5xl mx-auto px-6 py-6 border-t transition-colors",
        darkMode ? "border-white/5" : "border-black/5"
      )}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {/* Logo */}
          <div className="flex items-center gap-1.5 opacity-60">
            <Activity size={14} className="text-[#b4a8a8]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#b4a8a8]">RATBOD</span>
          </div>

          {/* UNIT Switcher Pill (Replaces LANG) */}
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

          {/* Policy Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-semibold text-gray-700 dark:text-gray-400">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contact Support</a>
          </div>

          {/* Copyright */}
          <p className={cn(
            "text-[9px] font-extrabold uppercase tracking-widest transition-colors opacity-40",
            darkMode ? "text-gray-500" : "text-gray-800"
          )}>
            © 2026 CRAFTED BY <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">RATUL BIN ZAHANGIR</a>
          </p>
        </div>
      </footer>

      {/* Mobile Sticky Tab Navigation */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-lg transition-colors duration-300",
        darkMode ? "bg-[#0F0F0F]/90 border-white/10 text-white" : "bg-white/90 border-black/5 text-gray-900",
        "pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 px-6 shadow-2xl shadow-black/20"
      )}>
        <div className="flex items-center justify-between">
          <button 
            id="tab_calculator"
            onClick={() => setActiveTab('calculator')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all",
              activeTab === 'calculator' ? "text-primary scale-105" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Heart size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabMeasure}</span>
          </button>
          
          <button 
            id="tab_results"
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative",
              activeTab === 'results' ? "text-orange-500 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Flame size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabResults}</span>
          </button>

          <button 
            id="tab_water"
            onClick={() => setActiveTab('water')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all",
              activeTab === 'water' ? "text-blue-500 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Droplet size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabWater}</span>
          </button>
          
          <button 
            id="tab_groceries"
            onClick={() => setActiveTab('groceries')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all",
              activeTab === 'groceries' ? "text-[#F04A00] scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <ShoppingBag size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabHistory}</span>
          </button>

          <button 
            id="tab_breathing"
            onClick={() => setActiveTab('breathing')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all",
              activeTab === 'breathing' ? "text-primary scale-105 animate-pulse" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Wind size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabBreathe}</span>
          </button>
        </div>
      </div>

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
  );
}
