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
  Flame
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
import GroceryCalculator from './components/GroceryCalculator';
import WaterTracker from './components/WaterTracker';
import BreathingTimer from './components/BreathingTimer';
import Habitor from './components/Habitor';
import Goals from './components/Goals';
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
  const [activeTab, setActiveTab] = useState<'calculator' | 'results' | 'groceries' | 'water' | 'goals' | 'breathing'>('water');
  const reportRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Sync back to localStorage
  useEffect(() => {
    localStorage.setItem('ratbod_name', name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem('ratbod_gender', gender);
  }, [gender]);

  useEffect(() => {
    localStorage.setItem('ratbod_birthdate', birthdate);
  }, [birthdate]);

  useEffect(() => {
    localStorage.setItem('ratbod_age', age);
  }, [age]);

  useEffect(() => {
    localStorage.setItem('ratbod_height', height);
  }, [height]);

  useEffect(() => {
    localStorage.setItem('ratbod_weight', weight);
  }, [weight]);

  useEffect(() => {
    localStorage.setItem('ratbod_waist', waist);
  }, [waist]);

  useEffect(() => {
    localStorage.setItem('ratbod_neck', neck);
  }, [neck]);

  useEffect(() => {
    localStorage.setItem('ratbod_hip', hip);
  }, [hip]);

  useEffect(() => {
    localStorage.setItem('ratbod_activity', activityLevel);
  }, [activityLevel]);

  useEffect(() => {
    localStorage.setItem('ratbod_unit', unit);
  }, [unit]);

  useEffect(() => {
    localStorage.setItem('ratbod_darkmode', darkMode.toString());
    
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

  useEffect(() => {
    localStorage.setItem('ratbod_lang', lang);
  }, [lang]);

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

    setHistoryRefreshTrigger(prev => prev + 1);
    alert(t.savedAlert);
    
    // Keep active tab on results since history tab is replaced with groceries
    setActiveTab('results');
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
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
            >
              {t.tabMeasure}
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'results'
                  ? (darkMode ? "bg-rose-500/20 text-rose-400 font-bold" : "bg-rose-50 text-rose-700 font-bold shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
            >
              <Flame size={12} className="text-rose-500" />
              {t.tabResults}
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={cn(
                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                activeTab === 'water'
                  ? (darkMode ? "bg-blue-500/20 text-blue-400 font-bold" : "bg-blue-50 text-blue-800 font-bold shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
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
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
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
        "max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-x-hidden",
        (activeTab === 'results' || activeTab === 'breathing' || activeTab === 'groceries' || activeTab === 'water') ? "hidden" : "grid"
      )}>
        {/* Input Section */}
        <section className={cn(
          "lg:col-span-5 space-y-8 no-scrollbar",
          activeTab === 'calculator' ? "block" : "hidden md:block"
        )}>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">{t.measurementsTitle}</h2>
            <p className={cn("text-sm font-medium", darkMode ? "text-gray-300" : "text-gray-600")}>{t.tagline}</p>
          </div>

          <div className="space-y-6">
            {/* Name and Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Name Input */}
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'নাম' : 'Name'}</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder={t.namePlaceholder}
                />
              </div>

              {/* Gender Selection */}
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <UserIcon size={14} /> {t.gender}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-bold transition-all capitalize",
                        gender === g 
                          ? (darkMode ? "bg-primary border-primary text-white" : "bg-primary-light border-primary/20 text-primary-dark ring-1 ring-primary/20") 
                          : (darkMode ? "bg-white/5 border-white/10 text-gray-400 hover:border-primary/50" : "bg-white border-gray-200 text-gray-700 hover:border-primary/20")
                      )}
                    >
                      {g === 'male' ? t.male : t.female}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.birthdate}</label>
                <input 
                  type="date" 
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.age}</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t.weight} ({unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')})
                </label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder={unit === 'metric' ? '70' : '154'}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t.height} ({unit === 'metric' ? (lang === 'bn' ? 'সেমি' : 'cm') : (lang === 'bn' ? 'ইঞ্চি' : 'in')})
                </label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder={unit === 'metric' ? '175' : '69'}
                />
              </div>
            </div>

            {/* Body Measurements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t.waist} ({unit === 'metric' ? (lang === 'bn' ? 'সেমি' : 'cm') : (lang === 'bn' ? 'ইঞ্চি' : 'in')})
                </label>
                <input 
                  type="number" 
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t.neck} ({unit === 'metric' ? (lang === 'bn' ? 'সেমি' : 'cm') : (lang === 'bn' ? 'ইঞ্চি' : 'in')})
                </label>
                <input 
                  type="number" 
                  value={neck}
                  onChange={(e) => setNeck(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="38"
                />
              </div>
            </div>

            {gender === 'female' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {t.hip} ({unit === 'metric' ? (lang === 'bn' ? 'সেমি' : 'cm') : (lang === 'bn' ? 'ইঞ্চি' : 'in')})
                </label>
                <input 
                  type="number" 
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="95"
                />
              </motion.div>
            )}

            {/* Activity Level */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Activity size={14} /> {t.activityLevel}
              </label>
              <div className="relative">
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className={cn(
                    "w-full appearance-none border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                >
                  {activityOptions.map((option) => (
                    <option key={option.value} value={option.value} className={darkMode ? "bg-[#0F0F0F] text-white" : "bg-white text-gray-900"}>
                      {option.label} — {option.desc}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className={cn(
          "lg:col-span-7 no-scrollbar",
          activeTab === 'calculator' ? "block" : "hidden md:block"
        )}>
          <AnimatePresence mode="wait">
            {metrics ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">{t.resultsTitle}</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSaveMetrics}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
                        darkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      <CheckCircle2 size={16} />
                      {t.saveBtn}
                    </button>
                    <button 
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shiny-button",
                        darkMode ? "bg-primary text-white hover:bg-primary-hover" : "bg-black text-white hover:bg-gray-800"
                      )}
                    >
                      {isGeneratingPdf ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {isGeneratingPdf ? t.generatingPdf : t.downloadPdf}
                    </button>
                  </div>
                </div>

                {/* Main Metrics Grid - Compressed 2x2 Layout */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  {/* BMI Card */}
                  <div className={cn(
                    "p-3 sm:p-4 rounded-2xl border shadow-2xs space-y-2 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 truncate">{lang === 'bn' ? 'বিএমআই (BMI)' : 'BMI'}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0",
                        metrics.category === 'Normal weight' 
                          ? (darkMode ? "bg-primary/20 text-primary" : "bg-primary-light text-primary-dark") 
                          : (darkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
                      )}>
                        {getCategoryTranslation(metrics.category)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">{formatNum(metrics.bmi.toFixed(1))}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-bold">{lang === 'bn' ? 'কেজি/মি²' : 'kg/m²'}</span>
                    </div>
                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", darkMode ? "bg-white/5" : "bg-gray-200")}>
                      <div 
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${Math.min(100, (metrics.bmi / 40) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Body Fat Card */}
                  <div className={cn(
                    "p-3 sm:p-4 rounded-2xl border shadow-2xs space-y-2 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t.bodyFat}</span>
                      <Info size={13} className="text-gray-400" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">{formatNum(metrics.bodyFat.toFixed(1))}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-bold">%</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary/80 truncate">
                      <span>{lang === 'bn' ? 'আদর্শ' : 'Ideal'}: {formatNum(metrics.idealFatRange.min)}-{formatNum(metrics.idealFatRange.max)}%</span>
                    </div>
                  </div>

                  {/* BMR Card */}
                  <div className={cn(
                    "p-3 sm:p-4 rounded-2xl border shadow-2xs space-y-1.5 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-[#F8F9FA] border-black/5"
                  )}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t.bmr}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">{formatNum(Math.round(metrics.bmr))}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-bold">{lang === 'bn' ? 'ক্যালোরি' : 'kcal/d'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight line-clamp-1">{lang === 'bn' ? 'সম্পূর্ণ বিশ্রামের সময়ে' : 'Resting burn'}</p>
                  </div>

                  {/* TDEE Card */}
                  <div className={cn(
                    "p-3 sm:p-4 rounded-2xl border shadow-2xs space-y-1.5 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{t.tdee}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">{formatNum(Math.round(metrics.tdee))}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-bold">{lang === 'bn' ? 'ক্যালোরি' : 'kcal/d'}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight line-clamp-1">{lang === 'bn' ? 'ওজন বজায় রাখার প্রয়োজনীয়' : 'Daily maintenance'}</p>
                  </div>
                </div>

                {/* Goal Section - Compressed */}
                <div className={cn(
                  "p-3.5 sm:p-5 rounded-2xl border shadow-md transition-all relative overflow-hidden",
                  metrics.weightDiff.type === 'lose' ? (darkMode ? "bg-red-500/5 border-red-500/20" : "bg-red-50/50 border-red-200") : 
                  metrics.weightDiff.type === 'gain' ? (darkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50/50 border-blue-200") : 
                  (darkMode ? "bg-primary/5 border-primary/20" : "bg-primary-light/50 border-primary/20")
                )}>
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        metrics.weightDiff.type === 'lose' ? "bg-red-500/10 text-red-500" : 
                        metrics.weightDiff.type === 'gain' ? "bg-blue-500/10 text-blue-500" : 
                        "bg-primary/10 text-primary"
                      )}>
                        <Activity size={16} />
                      </div>
                      <h3 className={cn("text-sm sm:text-base font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>{t.goalsTitle}</h3>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <div>
                        <span className={cn(
                          "text-xl sm:text-2xl font-black tracking-tight uppercase block",
                          metrics.weightDiff.type === 'lose' ? "text-red-500" : 
                          metrics.weightDiff.type === 'gain' ? "text-blue-500" : 
                          "text-primary"
                        )}>
                          {metrics.weightDiff.type === 'maintain' ? (lang === 'bn' ? 'ওজন বজায় রাখুন' : 'Maintain Weight') : 
                           metrics.weightDiff.type === 'lose' ? (lang === 'bn' ? 'ওজন হ্রাস করুন' : 'Lose Weight') : (lang === 'bn' ? 'ওজন বৃদ্ধি করুন' : 'Gain Weight')}
                        </span>
                      </div>

                      {metrics.weightDiff.type !== 'maintain' && (
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn("text-xl sm:text-2xl font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                            {formatNum(metrics.weightDiff.kg.toFixed(1))}
                          </span>
                          <span className="text-xs font-bold text-gray-500">{lang === 'bn' ? 'কেজি' : 'kg'}</span>
                          <span className="text-[11px] font-bold text-gray-400">({formatNum(metrics.weightDiff.lb.toFixed(1))} {lang === 'bn' ? 'পাউন্ড' : 'lb'})</span>
                        </div>
                      )}
                    </div>

                    <div className={cn(
                      "p-2.5 rounded-xl font-medium text-xs leading-snug",
                      darkMode ? "bg-white/5 text-gray-300" : "bg-white/90 text-gray-700 shadow-2xs"
                    )}>
                      {metrics.weightDiff.type === 'maintain' 
                        ? (lang === 'bn' ? 'চমৎকার! আপনি বর্তমানে আপনার আদর্শ ওজনে আছেন।' : 'Excellent! You are currently at your ideal body weight.')
                        : (lang === 'bn' 
                            ? `আদর্শ ওজন ${formatNum(metrics.idealWeight.kg.toFixed(1))} কেজিতে পৌঁছাতে আরো ${formatNum(metrics.weightDiff.kg.toFixed(1))} কেজি ${metrics.weightDiff.type === 'lose' ? 'কমানো' : 'বাড়ানো'} প্রয়োজন।`
                            : `To reach your ideal weight of ${metrics.idealWeight.kg.toFixed(1)}kg, aim to ${metrics.weightDiff.type === 'lose' ? 'lose' : 'gain'} ${metrics.weightDiff.kg.toFixed(1)}kg.`)}
                    </div>
                  </div>
                </div>

                {/* Ideal Weight Section (Accordion) - Compressed */}
                <div className={cn(
                  "rounded-2xl shadow-md relative overflow-hidden border transition-all duration-300",
                  darkMode ? "bg-[#0A0A0A] border-white/10" : "bg-[#1A2B3C] border-white/10"
                )}>
                  <button 
                    onClick={() => setIsIdealWeightOpen(!isIdealWeightOpen)}
                    className="w-full px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between group transition-colors hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-400/10 text-blue-300"
                      )}>
                        <Scale size={17} />
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className={cn("text-sm sm:text-base font-serif font-bold tracking-tight truncate", darkMode ? "text-white" : "text-blue-50")}>{t.idealWeight}</h3>
                        <p className={cn("text-[10px] font-medium opacity-60 truncate", darkMode ? "text-gray-400" : "text-blue-200")}>{lang === 'bn' ? 'ডিভাইন ফর্মুলা' : 'Devine Formula'} ({gender === 'male' ? (lang === 'bn' ? 'পুরুষ' : 'Male') : (lang === 'bn' ? 'নারী' : 'Female')})</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isIdealWeightOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(darkMode ? "text-gray-500" : "text-blue-300/50")}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isIdealWeightOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-4 pb-4 pt-1.5 sm:px-6 sm:pb-5 border-t border-white/5 space-y-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className={cn(
                              "p-3 rounded-xl border transition-colors",
                              darkMode ? "bg-white/5 border-white/10" : "bg-blue-900/30 border-blue-800/30"
                            )}>
                              <span className={cn("text-[9px] uppercase font-extrabold tracking-wider block mb-1", darkMode ? "text-white/40" : "text-blue-300/40")}>{lang === 'bn' ? 'মেট্রিক' : 'Metric'}</span>
                              <p className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-primary">
                                {formatNum(metrics.idealWeight.kg.toFixed(1))}
                                <span className={cn("text-xs opacity-60 ml-1 font-sans font-medium", darkMode ? "text-white" : "text-blue-50")}>{lang === 'bn' ? ' কেজি' : 'kg'}</span>
                              </p>
                            </div>
                            <div className={cn(
                              "p-3 rounded-xl border transition-colors",
                              darkMode ? "bg-white/5 border-white/10" : "bg-blue-900/30 border-blue-800/30"
                            )}>
                              <span className={cn("text-[9px] uppercase font-extrabold tracking-wider block mb-1", darkMode ? "text-white/40" : "text-blue-300/40")}>{lang === 'bn' ? 'ইম্পেরিয়াল' : 'Imperial'}</span>
                              <p className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-primary">
                                {formatNum(metrics.idealWeight.lb.toFixed(1))}
                                <span className={cn("text-xs opacity-60 ml-1 font-sans font-medium", darkMode ? "text-white" : "text-blue-50")}>{lang === 'bn' ? ' পাউন্ড' : 'lb'}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "p-2.5 rounded-lg text-[11px] leading-normal font-medium",
                            darkMode ? "bg-blue-500/10 text-blue-200/80 border border-blue-500/20" : "bg-blue-400/10 text-blue-100/80 border border-blue-400/20"
                          )}>
                            {lang === 'bn' 
                              ? 'ডিভাইন সূত্রটি উচ্চতা এবং লিঙ্গের ভিত্তিতে আদর্শ ওজনের আনুমানিক হিসাব বের করার জন্য প্রচলিত একটি পদ্ধতি।' 
                              : 'The Devine formula is a widely used method for estimating ideal body weight based on height and gender.'}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hidden Report for PDF Generation (Off-screen) */}
                <div className="fixed left-[-9999px] top-0 pointer-events-none">
                  <div ref={reportRef} style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }} className="p-12 w-[800px] space-y-12">
                    <div style={{ borderBottom: '1px solid #e5e7eb' }} className="flex justify-between items-start pb-8">
                      <div className="flex items-center gap-4">
                        <div>
                          <h1 style={{ color: '#32CD32' }} className="text-4xl font-black tracking-tighter">RatboD</h1>
                          <p style={{ color: '#6b7280' }}>Health Analysis for {name || 'Guest'}</p>
                        </div>
                      </div>
                      <div style={{ color: '#9ca3af' }} className="text-right text-sm">
                        <p>Generated on {new Date().toLocaleDateString()}</p>
                        <p>Report ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h2 style={{ borderBottom: '1px solid #e5e7eb', color: '#1f2937' }} className="text-xl font-semibold pb-2">User Profile</h2>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                          <span style={{ color: '#6b7280' }}>Gender:</span> <span style={{ color: '#111827' }} className="font-medium capitalize">{gender}</span>
                          <span style={{ color: '#6b7280' }}>Age:</span> <span style={{ color: '#111827' }} className="font-medium">{age} years</span>
                          <span style={{ color: '#6b7280' }}>Height:</span> <span style={{ color: '#111827' }} className="font-medium">{height} {unit === 'metric' ? 'cm' : 'in'}</span>
                          <span style={{ color: '#6b7280' }}>Weight:</span> <span style={{ color: '#111827' }} className="font-medium">{weight} {unit === 'metric' ? 'kg' : 'lb'}</span>
                          <span style={{ color: '#6b7280' }}>Activity:</span> <span style={{ color: '#111827' }} className="font-medium capitalize">{activityLevel.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h2 style={{ borderBottom: '1px solid #e5e7eb', color: '#1f2937' }} className="text-xl font-semibold pb-2">Key Metrics</h2>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                          <span style={{ color: '#6b7280' }}>BMI:</span> <span style={{ color: '#111827' }} className="font-bold">{metrics.bmi.toFixed(1)} ({metrics.category})</span>
                          <span style={{ color: '#6b7280' }}>Body Fat:</span> <span style={{ color: '#111827' }} className="font-bold">{metrics.bodyFat.toFixed(1)}% (Ideal: {metrics.idealFatRange.min}-{metrics.idealFatRange.max}%)</span>
                          <span style={{ color: '#6b7280' }}>BMR:</span> <span style={{ color: '#111827' }} className="font-bold">{Math.round(metrics.bmr)} kcal/day</span>
                          <span style={{ color: '#6b7280' }}>TDEE:</span> <span style={{ color: '#32CD32' }} className="font-bold">{Math.round(metrics.tdee)} kcal/day</span>
                          <span style={{ color: '#6b7280' }}>Ideal Weight:</span> <span style={{ color: '#111827' }} className="font-bold">{metrics.idealWeight.kg.toFixed(1)} kg / {metrics.idealWeight.lb.toFixed(1)} lb</span>
                          <span style={{ color: '#6b7280' }}>Goal:</span> <span style={{ color: metrics.weightDiff.type === 'lose' ? '#ef4444' : metrics.weightDiff.type === 'gain' ? '#3b82f6' : '#32CD32' }} className="font-bold">
                            {metrics.weightDiff.type === 'maintain' ? 'Maintain current weight' : 
                             `${metrics.weightDiff.type === 'lose' ? 'Lose' : 'Gain'} ${metrics.weightDiff.kg.toFixed(1)} kg (${metrics.weightDiff.lb.toFixed(1)} lb)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f0fdf4', borderRadius: '1rem' }} className="p-8 space-y-4">
                      <h3 style={{ color: '#111827' }} className="font-semibold">Health Recommendations</h3>
                      <p style={{ color: '#4b5563' }} className="text-sm leading-relaxed">
                        Based on your TDEE of {Math.round(metrics.tdee)} kcal, to maintain your current weight, you should consume this amount of calories daily. 
                        To lose weight safely (0.5kg/week), aim for approximately {Math.round(metrics.tdee - 500)} kcal. 
                        Your ideal body fat range for your age and gender is {metrics.idealFatRange.min}% to {metrics.idealFatRange.max}%.
                        Always consult with a healthcare professional before starting any new diet or exercise regimen.
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb', color: '#9ca3af' }} className="pt-12 text-center text-[10px]">
                      <p>This report is for informational purposes only and does not constitute medical advice.</p>
                      <p>© {new Date().getFullYear()} RatboD. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                  <Calculator size={40} />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-lg font-medium text-gray-700">
                    {lang === 'bn' ? 'বিশ্লেষণের জন্য প্রস্তুত' : 'Ready to Calculate'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {lang === 'bn' ? 'আপনার শরীরের বিশ্লেষণ ফলাফল দেখতে বামপাশে আপনার পরিমাপসমূহ প্রদান করুন।' : 'Fill in your measurements on the left to see your body analysis results.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Health Goals Section */}
      <div className={cn(
        "max-w-5xl mx-auto px-6 pb-12",
        activeTab === 'calculator' ? "block" : "hidden"
      )}>
        <Goals 
          darkMode={darkMode} 
          unit={unit} 
          currentWeight={metricData.weight} 
          currentBodyFat={metrics?.bodyFat}
          lang={lang}
        />
      </div>

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
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">UNIT:</span>
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
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-semibold text-gray-400">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contact Support</a>
          </div>

          {/* Copyright */}
          <p className={cn(
            "text-[9px] font-extrabold uppercase tracking-widest transition-colors opacity-40",
            darkMode ? "text-gray-500" : "text-gray-400"
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
              activeTab === 'calculator' ? "text-primary scale-105" : "text-gray-400 hover:text-gray-500"
            )}
          >
            <Calculator size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabMeasure}</span>
          </button>
          
          <button 
            id="tab_results"
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative",
              activeTab === 'results' ? "text-rose-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-500"
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
              activeTab === 'water' ? "text-blue-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-500"
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
              activeTab === 'groceries' ? "text-[#F04A00] scale-105 font-bold" : "text-gray-400 hover:text-gray-500"
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
              activeTab === 'breathing' ? "text-primary scale-105 animate-pulse" : "text-gray-400 hover:text-gray-500"
            )}
          >
            <Wind size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabBreathe}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
