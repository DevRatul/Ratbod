import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Droplet, 
  Wind, 
  Footprints,
  ArrowRight,
  ArrowUp,
  Target,
  History as HistoryIcon,
  ShoppingBag,
  Sparkles,
  Flame,
  CheckCircle2,
  Check,
  Plus,
  Trash2,
  Moon,
  Sun,
  CheckSquare,
  Square,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LandingPageProps {
  onNavigateTab?: (tab: 'calculator' | 'results' | 'groceries' | 'water' | 'goals' | 'breathing') => void;
  onLogin?: () => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  lang?: 'en' | 'bn';
  setLang?: (lang: 'en' | 'bn') => void;
}

export default function LandingPage({ 
  onNavigateTab, 
  onLogin, 
  darkMode: propDarkMode, 
  setDarkMode: propSetDarkMode, 
  lang: propLang, 
  setLang: propSetLang 
}: LandingPageProps) {
  const [internalDarkMode, setInternalDarkMode] = useState(true);
  const [internalLang, setInternalLang] = useState<'en' | 'bn'>('en');

  const darkMode = propDarkMode !== undefined ? propDarkMode : internalDarkMode;
  const setDarkMode = propSetDarkMode || setInternalDarkMode;
  const lang = propLang !== undefined ? propLang : internalLang;
  const setLang = propSetLang || setInternalLang;

  const handleNavigate = (tab: 'calculator' | 'results' | 'groceries' | 'water' | 'goals' | 'breathing') => {
    try {
      localStorage.setItem('ratbod_active_tab', tab);
    } catch (e) {}
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (onLogin) {
      onLogin();
    }
  };

  // Demo Switcher Tabs: 1) Health Metrics, 2) Habit Tracker, 3) Water Intake
  const [activeDemoTab, setActiveDemoTab] = useState<'health' | 'habits' | 'water'>('health');

  // Handle Logo Click -> Smooth reload
  const handleLogoClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.location.reload();
  };

  // Built-in Interactive Health Calculator Demo State
  const [healthGender, setHealthGender] = useState<'male' | 'female'>('male');
  const [healthUnit, setHealthUnit] = useState<'metric' | 'imperial'>('metric');
  const [healthHeight, setHealthHeight] = useState<string>('175');
  const [healthWeight, setHealthWeight] = useState<string>('72');
  const [healthAge, setHealthAge] = useState<string>('26');

  // Health Calculator Calculations
  const parsedHeight = parseFloat(healthHeight) || 0;
  const parsedWeight = parseFloat(healthWeight) || 0;
  const parsedAge = parseFloat(healthAge) || 25;

  let bmi = 0;
  let bmiCategory = 'Normal';
  let bmiColor = 'text-emerald-500';
  let bmr = 0;
  let idealWeightMin = 0;
  let idealWeightMax = 0;

  if (healthUnit === 'metric' && parsedHeight > 0 && parsedWeight > 0) {
    const heightM = parsedHeight / 100;
    bmi = parseFloat((parsedWeight / (heightM * heightM)).toFixed(1));
    idealWeightMin = parseFloat((18.5 * heightM * heightM).toFixed(1));
    idealWeightMax = parseFloat((24.9 * heightM * heightM).toFixed(1));
    if (healthGender === 'male') {
      bmr = Math.round(10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge + 5);
    } else {
      bmr = Math.round(10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge - 161);
    }
  } else if (healthUnit === 'imperial' && parsedHeight > 0 && parsedWeight > 0) {
    bmi = parseFloat(((703 * parsedWeight) / (parsedHeight * parsedHeight)).toFixed(1));
    idealWeightMin = parseFloat(((18.5 * parsedHeight * parsedHeight) / 703).toFixed(1));
    idealWeightMax = parseFloat(((24.9 * parsedHeight * parsedHeight) / 703).toFixed(1));
    const kg = parsedWeight * 0.453592;
    const cm = parsedHeight * 2.54;
    if (healthGender === 'male') {
      bmr = Math.round(10 * kg + 6.25 * cm - 5 * parsedAge + 5);
    } else {
      bmr = Math.round(10 * kg + 6.25 * cm - 5 * parsedAge - 161);
    }
  }

  if (bmi > 0) {
    if (bmi < 18.5) {
      bmiCategory = lang === 'bn' ? 'স্বল্প ওজন' : 'Underweight';
      bmiColor = 'text-blue-500';
    } else if (bmi < 25) {
      bmiCategory = lang === 'bn' ? 'স্বাভাবিক' : 'Normal weight';
      bmiColor = 'text-emerald-500';
    } else if (bmi < 30) {
      bmiCategory = lang === 'bn' ? 'অতিরিক্ত ওজন' : 'Overweight';
      bmiColor = 'text-amber-500';
    } else {
      bmiCategory = lang === 'bn' ? 'স্থূলতা' : 'Obese';
      bmiColor = 'text-red-500';
    }
  }

  // Built-in Interactive Habit Tracker Demo State
  const [demoHabits, setDemoHabits] = useState<Array<{ id: string; name: string; icon: string; completed: boolean; streak: number }>>([
    { id: '1', name: lang === 'bn' ? 'সকালের হাঁটা ও সূর্যালোক (১০হাজার স্টেপ)' : 'Morning Sunlight & 10k Steps', icon: '☀️', completed: true, streak: 14 },
    { id: '2', name: lang === 'bn' ? 'দৈনিক ৩ লিটার পানি পান' : 'Hydrate 3 Liters Daily', icon: '💧', completed: true, streak: 9 },
    { id: '3', name: lang === 'bn' ? '২০ পৃষ্ঠা জ্ঞানগর্ভ বই পড়া' : 'Read 20 Pages of Book', icon: '📖', completed: true, streak: 21 },
    { id: '4', name: lang === 'bn' ? '৪৫ মিনিট শরীরচর্চা / কার্ডিও' : '45-Min Workout & Stretching', icon: '🏃', completed: false, streak: 7 },
    { id: '5', name: lang === 'bn' ? '৪-৭-৮ শ্বাসপ্রশ্বাস ও মাইন্ডফুলনেস' : '4-7-8 Box Breathing Relaxation', icon: '🌬️', completed: false, streak: 12 },
  ]);
  const [newHabitInput, setNewHabitInput] = useState('');

  const toggleDemoHabit = (id: string) => {
    setDemoHabits(prev => prev.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
  };

  const handleAddDemoHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitInput.trim()) return;
    setDemoHabits(prev => [
      ...prev,
      { id: Date.now().toString(), name: newHabitInput.trim(), icon: '✨', completed: false, streak: 1 }
    ]);
    setNewHabitInput('');
  };

  const handleRemoveDemoHabit = (id: string) => {
    setDemoHabits(prev => prev.filter(h => h.id !== id));
  };

  const completedHabitsCount = demoHabits.filter(h => h.completed).length;
  const habitProgressPercent = demoHabits.length > 0 ? Math.round((completedHabitsCount / demoHabits.length) * 100) : 0;

  // Built-in Interactive Water Intake Demo State
  const [demoWaterConsumed, setDemoWaterConsumed] = useState<number>(1850);
  const demoWaterGoal = 3000;
  const [demoWaterLogs, setDemoWaterLogs] = useState<Array<{ id: string; amount: number; time: string }>>([
    { id: '1', amount: 300, time: '08:30 AM' },
    { id: '2', amount: 400, time: '11:15 AM' },
    { id: '3', amount: 250, time: '01:45 PM' },
    { id: '4', amount: 500, time: '04:20 PM' },
    { id: '5', amount: 400, time: '06:00 PM' }
  ]);

  const handleAddDemoWater = (amount: number) => {
    setDemoWaterConsumed(prev => prev + amount);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDemoWaterLogs(prev => [{ id: Date.now().toString(), amount, time: timeStr }, ...prev.slice(0, 5)]);
  };

  const handleResetDemoWater = () => {
    setDemoWaterConsumed(0);
    setDemoWaterLogs([]);
  };

  const demoWaterProgress = Math.min(100, Math.round((demoWaterConsumed / demoWaterGoal) * 100));

  // Scroll to Top state and event listener
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div 
      style={{ colorScheme: darkMode ? 'dark' : 'light' }}
      className={cn(
        "min-h-screen font-sans selection:bg-primary-light transition-colors duration-300 overflow-x-hidden",
        darkMode ? "dark bg-[#0A0A0A] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"
      )}
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 transition-all duration-300">
        <div className={cn(
          "max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between rounded-2xl border backdrop-blur-2xl backdrop-saturate-150 shadow-2xl transition-colors duration-300",
          darkMode ? "bg-[#0F0F0F]/85 border-white/15 shadow-black/60" : "bg-white/85 border-black/10 shadow-gray-300/60"
        )}>
          {/* Clickable Logo that reloads */}
          <button 
            type="button"
            id="landing_ratbod_logo_btn"
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
          
          {/* Quick Jump Links */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-bold bg-gray-100/60 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            <a 
              href="#health-calculator-section" 
              className={cn(
                "px-3 py-1 rounded-lg transition-colors flex items-center gap-1",
                darkMode ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:text-gray-900 hover:bg-white"
              )}
            >
              <Activity size={12} className="text-primary" />
              {lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর' : 'Health Calculator'}
            </a>
            <a 
              href="#habit-tracker-section" 
              className={cn(
                "px-3 py-1 rounded-lg transition-colors flex items-center gap-1",
                darkMode ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:text-gray-900 hover:bg-white"
              )}
            >
              <HistoryIcon size={12} className="text-emerald-500" />
              {lang === 'bn' ? 'অভ্যাস ট্র্যাকার' : 'Habit Tracker'}
            </a>
            <a 
              href="#water-tracker-section" 
              className={cn(
                "px-3 py-1 rounded-lg transition-colors flex items-center gap-1",
                darkMode ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:text-gray-900 hover:bg-white"
              )}
            >
              <Droplet size={12} className="text-blue-500" />
              {lang === 'bn' ? 'পানি ট্র্যাকার' : 'Water Tracker'}
            </a>
            <a 
              href="#all-features" 
              className={cn(
                "px-3 py-1 rounded-lg transition-colors",
                darkMode ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:text-gray-900 hover:bg-white"
              )}
            >
              {lang === 'bn' ? 'সকল ফিচার' : 'All Features'}
            </a>
          </nav>
          
          {/* Actions: Theme Toggle, Lang Toggle, Launch App */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-1.5 rounded-full transition-all cursor-pointer",
                darkMode ? "bg-white/5 text-primary hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              title="Toggle Dark Mode"
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
              >
                বাং
              </button>
            </div>

            <button
              onClick={() => handleNavigate('calculator')}
              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/25 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {lang === 'bn' ? 'অ্যাপে প্রবেশ' : 'Launch App'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-8 sm:pt-14 pb-12 sm:pb-16 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6 mb-10 sm:mb-14">
            <div className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm",
              darkMode ? "bg-white/5 border-white/10 text-primary" : "bg-primary/10 border-primary/20 text-primary"
            )}>
              <Sparkles size={14} className="animate-spin text-primary" />
              <span>{lang === 'bn' ? 'অল-ইন-ওয়ান স্বাস্থ্য, অভ্যাস ও হাইড্রেশন হাব' : 'All-In-One Health, Habit & Hydration Hub'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              {lang === 'bn' ? 'আপনার স্বাস্থ্য, অভ্যাস ও' : 'Smart Health Metrics,'} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">
                {lang === 'bn' ? 'দৈনিক হাইড্রেশনের সম্পূর্ণ হাব।' : 'Habit Streaks & Water Hydration.'}
              </span>
            </h1>

            <p className={cn(
              "text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}>
              {lang === 'bn' 
                ? 'বডি কম্পোজিশন, বিএমআই, চর্বি পরিমাপ ও লক্ষ্যের সাথে রয়েছে স্মার্ট রুটিন ও স্ট্রিক ট্র্যাকার এবং গ্লাস অনুযায়ী সুনির্দিষ্ট পানি ট্র্যাকিং।' 
                : 'Track body composition, BMI, body fat & goals alongside daily habit streak routines, smart glass water hydration, and guided box breathing.'}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => handleNavigate('calculator')}
                className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/30 cursor-pointer active:scale-95"
              >
                <Activity size={18} />
                <span>{lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর' : 'Health Calculator'}</span>
                <ArrowRight size={16} />
              </button>

              <button 
                onClick={() => handleNavigate('results')}
                className={cn(
                  "px-6 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md",
                  darkMode 
                    ? "bg-[#141414] hover:bg-[#1f1f1f] border-white/10 text-emerald-400" 
                    : "bg-white hover:bg-gray-50 border-gray-200 text-emerald-600 shadow-gray-200/50"
                )}
              >
                <HistoryIcon size={18} />
                <span>{lang === 'bn' ? 'অভ্যাস ট্র্যাকার' : 'Habit Tracker'}</span>
              </button>

              <button 
                onClick={() => handleNavigate('water')}
                className={cn(
                  "px-6 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md",
                  darkMode 
                    ? "bg-[#141414] hover:bg-[#1f1f1f] border-white/10 text-blue-400" 
                    : "bg-white hover:bg-gray-50 border-gray-200 text-blue-600 shadow-gray-200/50"
                )}
              >
                <Droplet size={18} />
                <span>{lang === 'bn' ? 'পানি ট্র্যাকার' : 'Water Tracker'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Mini-Tools Hub on Landing Page */}
          <div className={cn(
            "rounded-3xl border p-5 sm:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 max-w-4xl mx-auto",
            darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
          )}>
            <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200 dark:border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Built-In Interactive Demos</span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                  {lang === 'bn' ? 'সরাসরি পৃষ্ঠা থেকেই পরীক্ষা করুন' : 'Test Live Tools Right Here'}
                </h3>
              </div>

              {/* Demo Switcher Tabs: 1) Health Calculator, 2) Habit Tracker, 3) Water Tracker */}
              <div className={cn(
                "flex p-1 rounded-2xl border flex-wrap gap-1",
                darkMode ? "bg-black/50 border-white/10" : "bg-gray-100 border-gray-200"
              )}>
                <button
                  onClick={() => setActiveDemoTab('health')}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeDemoTab === 'health'
                      ? "bg-primary text-white shadow-md shadow-primary/30"
                      : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  <Activity size={14} />
                  <span>{lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর' : 'Health Calculator'}</span>
                </button>

                <button
                  onClick={() => setActiveDemoTab('habits')}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeDemoTab === 'habits'
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  <HistoryIcon size={14} />
                  <span>{lang === 'bn' ? 'অভ্যাস ট্র্যাকার' : 'Habit Tracker'}</span>
                </button>

                <button
                  onClick={() => setActiveDemoTab('water')}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeDemoTab === 'water'
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  <Droplet size={14} />
                  <span>{lang === 'bn' ? 'পানি ট্র্যাকার' : 'Water Tracker'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Built-in Live Health Calculator */}
            {activeDemoTab === 'health' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Height */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {lang === 'bn' ? 'উচ্চতা' : 'Height'} ({healthUnit === 'metric' ? 'cm' : 'inches'})
                    </label>
                    <input 
                      type="number"
                      value={healthHeight}
                      onChange={(e) => setHealthHeight(e.target.value)}
                      placeholder={healthUnit === 'metric' ? '175' : '69'}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                        darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>

                  {/* Weight */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {lang === 'bn' ? 'ওজন' : 'Weight'} ({healthUnit === 'metric' ? 'kg' : 'lbs'})
                    </label>
                    <input 
                      type="number"
                      value={healthWeight}
                      onChange={(e) => setHealthWeight(e.target.value)}
                      placeholder={healthUnit === 'metric' ? '72' : '158'}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                        darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>

                  {/* Gender & Unit Toggle */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {lang === 'bn' ? 'লিঙ্গ' : 'Gender'}
                      </label>
                      <select
                        value={healthGender}
                        onChange={(e) => setHealthGender(e.target.value as any)}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      >
                        <option value="male">{lang === 'bn' ? 'পুরুষ' : 'Male'}</option>
                        <option value="female">{lang === 'bn' ? 'মহিলা' : 'Female'}</option>
                      </select>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {lang === 'bn' ? 'ইউনিট' : 'Unit'}
                      </label>
                      <select
                        value={healthUnit}
                        onChange={(e) => setHealthUnit(e.target.value as any)}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      >
                        <option value="metric">Metric (cm/kg)</option>
                        <option value="imperial">Imperial (in/lbs)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Instant Calculation Output */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">BMI Score</div>
                    <div className="text-2xl font-black text-primary">{bmi > 0 ? bmi : '--'}</div>
                    <div className={cn("text-[10px] font-bold", bmiColor)}>{bmiCategory}</div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">BMR Basal Burn</div>
                    <div className="text-2xl font-black text-teal-400">{bmr > 0 ? `${bmr}` : '--'}</div>
                    <div className="text-[10px] text-gray-500 font-bold">kcal / day</div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Ideal Weight</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-500">
                      {idealWeightMin > 0 ? `${idealWeightMin}-${idealWeightMax}` : '--'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold">{healthUnit === 'metric' ? 'kg' : 'lbs'}</div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">TDEE Target</div>
                    <div className="text-2xl font-black text-amber-500">{bmr > 0 ? `${Math.round(bmr * 1.375)}` : '--'}</div>
                    <div className="text-[10px] text-gray-500 font-bold">kcal budget</div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleNavigate('calculator')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সম্পূর্ণ নেভি বডি ফ্যাট ও বিশদ লক্ষ্য বিশ্লেষণ দেখুন' : 'Explore Full Navy Body Fat & Timeline Targets'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Built-in Live Habit Tracker (Habitor) */}
            {activeDemoTab === 'habits' && (
              <div className="space-y-5">
                {/* Progress Header & Streak Banner */}
                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4",
                  darkMode ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30 shrink-0">
                      <Flame size={20} className="fill-current text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {completedHabitsCount} of {demoHabits.length} Habits Completed Today
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {habitProgressPercent}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-semibold block mt-0.5">
                        🔥 14-Day Active Consistency Streak
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-48 bg-gray-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${habitProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Interactive Checklist */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {demoHabits.map((habit) => (
                    <div
                      key={habit.id}
                      onClick={() => toggleDemoHabit(habit.id)}
                      className={cn(
                        "p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer group select-none",
                        habit.completed
                          ? (darkMode ? "bg-emerald-950/15 border-emerald-500/30 text-white" : "bg-emerald-50/70 border-emerald-200 text-emerald-950")
                          : (darkMode ? "bg-black/40 border-white/5 text-gray-300 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 border",
                            habit.completed
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                              : (darkMode ? "border-gray-600 group-hover:border-gray-400" : "border-gray-300 group-hover:border-gray-400")
                          )}
                        >
                          {habit.completed && <Check size={14} strokeWidth={3} />}
                        </button>
                        <span className="text-base sm:text-lg select-none">{habit.icon}</span>
                        <span className={cn(
                          "text-xs sm:text-sm font-bold transition-all",
                          habit.completed ? "line-through opacity-70" : ""
                        )}>
                          {habit.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Flame size={12} className="fill-current" />
                          {habit.streak}d
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDemoHabit(habit.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="Remove Habit"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Quick Habit Form */}
                <form onSubmit={handleAddDemoHabit} className="flex gap-2">
                  <input
                    type="text"
                    value={newHabitInput}
                    onChange={(e) => setNewHabitInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'নতুন অভ্যাসের নাম লিখুন (যেমন: ২০ মিনিট মেডিটেশন)...' : 'Add custom habit (e.g. 20 min evening walk)...'}
                    className={cn(
                      "flex-1 px-3.5 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all",
                      darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!newHabitInput.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Plus size={14} />
                    <span>{lang === 'bn' ? 'যোগ করুন' : 'Add Habit'}</span>
                  </button>
                </form>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleNavigate('results')}
                    className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সম্পূর্ণ হ্যাবিটর ও স্ট্রিক ক্যালেন্ডার ভিউ খুলুন' : 'Open Habitor Streak Calendar & Routine Suite'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Built-in Live Water Intake Tracker */}
            {activeDemoTab === 'water' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  
                  {/* Left: Interactive Hydration Glass Visual */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    <div className={cn(
                      "relative w-28 h-38 rounded-b-[2rem] rounded-t-md border-x-4 border-b-4 border-t-2 flex items-center justify-center shadow-xl overflow-hidden transition-all shrink-0",
                      demoWaterConsumed >= demoWaterGoal 
                        ? "border-[#32CD32]/80 shadow-[#32CD32]/20 " + (darkMode ? "bg-slate-950/90" : "bg-emerald-50/90")
                        : "border-blue-400/80 dark:border-blue-500/70 shadow-blue-500/20 " + (darkMode ? "bg-slate-950/90" : "bg-blue-50/90")
                    )}>
                      {/* Vertical Glass Shine */}
                      <div className="absolute left-1.5 top-2 bottom-4 w-1 bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-full z-20 pointer-events-none" />

                      {/* Liquid Water Animation */}
                      <div
                        className={cn("absolute bottom-0 left-0 right-0 w-full pointer-events-none transition-all duration-700",
                          demoWaterConsumed >= demoWaterGoal
                            ? "bg-gradient-to-t from-emerald-800 via-[#32CD32] to-emerald-400"
                            : "bg-gradient-to-t from-blue-800 via-blue-600 to-sky-400"
                        )}
                        style={{ height: `${demoWaterProgress}%` }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/50 animate-pulse" />
                      </div>

                      {/* Cup Centered Stat */}
                      <div className="relative z-10 text-center p-1 select-none pointer-events-none">
                        <span className="text-xl font-black text-slate-900 dark:text-white block leading-none">
                          {(demoWaterConsumed / 250).toFixed(1)}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-800 dark:text-blue-100 mt-0.5 block">
                          / {(demoWaterGoal / 250).toFixed(0)} Glasses
                        </span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-blue-100 mt-0.5 block">
                          {demoWaterConsumed} ml
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-blue-500 mt-2">
                      {demoWaterProgress}% of 3.0 L Daily Goal
                    </span>
                  </div>

                  {/* Right: Quick Cup Buttons & Control Actions */}
                  <div className="sm:col-span-7 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                        {lang === 'bn' ? 'তাৎক্ষণিক পানি যোগ করুন (গ্লাস বাটন)' : 'Tap Quick Glass to Log'}
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {[
                          { ml: 300, label: '300 ml' },
                          { ml: 400, label: '400 ml' },
                          { ml: 250, label: '250 ml' },
                          { ml: 100, label: '100 ml' }
                        ].map((btn) => (
                          <button
                            key={btn.ml}
                            type="button"
                            onClick={() => handleAddDemoWater(btn.ml)}
                            className={cn(
                              "p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs hover:border-blue-400 min-w-0",
                              darkMode ? "bg-blue-600/10 border-blue-500/20 text-blue-300 hover:bg-blue-600/20" : "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100"
                            )}
                          >
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-1">
                              <Droplet size={12} className="fill-current" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-black truncate w-full text-center">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Reset */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
                      <span className="text-gray-500 font-bold">
                        Remaining: <strong className="text-blue-500">{Math.max(0, demoWaterGoal - demoWaterConsumed)} ml</strong>
                      </span>
                      <button
                        onClick={handleResetDemoWater}
                        disabled={demoWaterConsumed === 0}
                        className="text-red-500 hover:underline disabled:opacity-40 font-bold cursor-pointer"
                      >
                        Reset Demo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleNavigate('water')}
                    className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সম্পূর্ণ পানি ট্র্যাকার, লক্ষ্য কনফিগ ও লগ দেখুন' : 'Open Full Hydration Tracker with Custom Goals & Logs'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 1: Health Calculator Detailed Feature Showcase */}
      <motion.section 
        id="health-calculator-section" 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cn(
          "py-16 sm:py-24 px-4 sm:px-6 border-t",
          darkMode ? "bg-[#080808] border-white/5" : "bg-gray-50/70 border-gray-200"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-primary/10 border-primary/20 text-primary" : "bg-primary/10 border-primary/20 text-primary"
              )}>
                <Activity size={14} />
                <span>{lang === 'bn' ? 'বিল্ট-ইন স্বাস্থ্য অ্যানালিটিক্স' : 'Precision Health Analytics'}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {lang === 'bn' ? 'বিজ্ঞানসম্মত বডি কম্পোজিশন ও লক্ষ্য ট্র্যাকার' : 'Precision Body Metrics & Goal Planning'}
              </h2>

              <p className={cn("text-sm sm:text-base leading-relaxed", darkMode ? "text-gray-400" : "text-gray-600")}>
                {lang === 'bn' 
                  ? 'ইউএস নেভি মেথডে চর্বির শতাংশ, মিফলিন-সেন্ট জিওর ফর্মুলায় বিএমআর, দৈনিক ক্যালরি চাহিদা এবং লক্ষ্য পৌঁছানোর সুনির্দিষ্ট দিন গণনা করুন।' 
                  : 'Calculate accurate Body Fat Percentage via U.S. Navy standards, Mifflin-St Jeor Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and set target timelines.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'US Navy Body Fat %', desc: 'Circumference-based precise body fat' },
                  { title: 'BMR & TDEE Calorie Target', desc: 'Daily calorie budget for loss or gain' },
                  { title: 'Ideal Body Weight Ranges', desc: 'Devine, Robinson & Miller formulas' },
                  { title: 'PDF Health Reports', desc: 'One-click visual medical-grade export' }
                ].map((f, i) => (
                  <div key={i} className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-200 shadow-sm shadow-gray-200/50"
                  )}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <CheckCircle2 size={14} />
                      <span>{f.title}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleNavigate('calculator')}
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer active:scale-95 transition-all"
                >
                  <Activity size={16} />
                  <span>{lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর চালু করুন' : 'Launch Full Health Suite'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Health Visual Card Preview */}
            <div className={cn(
              "p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden",
              darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Sample Body Composition</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Healthy Range</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={cn("p-4 rounded-2xl border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">BMI Index</div>
                    <div className="text-3xl font-black text-primary mt-1">22.4</div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1">Optimal category</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Body Fat</div>
                    <div className="text-3xl font-black text-teal-400 mt-1">16.2%</div>
                    <div className="text-[10px] text-teal-500 font-bold mt-1">Fitness standard</div>
                  </div>
                </div>

                <div className={cn("p-4 rounded-2xl border space-y-2", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Goal: 70 kg Target</span>
                    <span className="text-primary font-black">85% Complete</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 2: Habit Tracker (Habitor) Detailed Feature Showcase */}
      <motion.section 
        id="habit-tracker-section" 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cn(
          "py-16 sm:py-24 px-4 sm:px-6 border-t",
          darkMode ? "bg-[#0A0A0A] border-white/5" : "bg-white border-gray-200"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Habit Visual Preview Card */}
            <div className={cn(
              "order-2 lg:order-1 p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden",
              darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HistoryIcon size={18} className="text-emerald-500" />
                    <span className="text-sm font-black">Habitor Consistency Log</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Flame size={14} className="fill-current" />
                    18 Days Streak
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'Morning Sunlight & Walk', streak: '18 Days', done: true },
                    { name: 'Hydrate 3000 mL Clean Water', streak: '14 Days', done: true },
                    { name: '45-Min Workout & Stretching', streak: '9 Days', done: true },
                    { name: '10-Min Box Breathing Calm', streak: '22 Days', done: false }
                  ].map((it, idx) => (
                    <div key={idx} className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between text-xs",
                      it.done 
                        ? (darkMode ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")
                        : (darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")
                    )}>
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center",
                          it.done ? "bg-emerald-600 text-white" : "border border-gray-500"
                        )}>
                          {it.done && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className={cn("font-bold", it.done ? "line-through opacity-80" : "")}>{it.name}</span>
                      </div>
                      <span className="font-black text-amber-500 flex items-center gap-1">
                        <Flame size={12} className="fill-current" />
                        {it.streak}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              )}>
                <HistoryIcon size={14} />
                <span>{lang === 'bn' ? 'বিল্ট-ইন অভ্যাস ও স্ট্রিক ট্র্যাকার' : 'Built-In Habitor Routine Engine'}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {lang === 'bn' ? 'প্রতিদিনের নিয়ম ও দীর্ঘমেয়াদী ধারাবাহিকতা' : 'Build Unstoppable Daily Routines & Streaks'}
              </h2>

              <p className={cn("text-sm sm:text-base leading-relaxed", darkMode ? "text-gray-400" : "text-gray-600")}>
                {lang === 'bn' 
                  ? 'সকাল ও সন্ধ্যার দৈনন্দিন রুটিন সাজান, প্রতি অভ্যাসে স্ট্রিক গণনা করুন এবং ধারাবাহিক স্বাস্থ্য পরিবর্তনের আনন্দ উপভোগ করুন।' 
                  : 'Cultivate high-impact morning rituals, monitor consecutive streak milestones, and achieve compounding lifestyle improvements with smart daily routines.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'Interactive Streak Flashes', desc: 'Celebrate uninterrupted daily milestones' },
                  { title: 'Morning & Evening Routines', desc: 'Organized sections for prime energy hours' },
                  { title: 'One-Tap Toggle Checklists', desc: 'Lightning-fast completion recording' },
                  { title: 'Cloud & Offline Persistence', desc: 'Habits stay synchronized seamlessly' }
                ].map((f, i) => (
                  <div key={i} className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-200 shadow-sm shadow-gray-200/50"
                  )}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                      <CheckCircle2 size={14} />
                      <span>{f.title}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleNavigate('results')}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95 transition-all"
                >
                  <HistoryIcon size={16} />
                  <span>{lang === 'bn' ? 'হ্যাবিটর চালু করুন' : 'Launch Habitor Suite'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: Water Tracker Detailed Feature Showcase */}
      <motion.section 
        id="water-tracker-section" 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cn(
          "py-16 sm:py-24 px-4 sm:px-6 border-t",
          darkMode ? "bg-[#080808] border-white/5" : "bg-gray-50/70 border-gray-200"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
              )}>
                <Droplet size={14} />
                <span>{lang === 'bn' ? 'স্মার্ট পানি ট্র্যাকার' : 'Smart Hydration Tracker'}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {lang === 'bn' ? 'গ্লাস অনুযায়ী সঠিক হাইড্রেশন ও লক্ষ্য পূরণ' : 'Targeted Glass Hydration & Daily Water Goals'}
              </h2>

              <p className={cn("text-sm sm:text-base leading-relaxed", darkMode ? "text-gray-400" : "text-gray-600")}>
                {lang === 'bn' 
                  ? '৩০০ মিলি, ৪০০ মিলি, ২৫০ মিলি কিংবা ১০০ মিলি গ্লাস বাটনে এক ট্যাপে পানি যোগ করুন। ডায়নামিক তরল স্তর ও শতাংশে নিজের হাইড্রেশন ট্র্যাক করুন।' 
                  : 'Log water intake effortlessly with dedicated 300 ml, 400 ml, 250 ml, and 100 ml glass buttons. Experience dynamic liquid visual indicators, customizable glass sizes, and daily target tracking.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'Quick Multi-Glass Logging', desc: 'One-tap 300, 400, 250 & 100 ml presets' },
                  { title: 'Dynamic Wave Tumbler', desc: 'Real-time sea water animated liquid level' },
                  { title: 'Daily Goal Customization', desc: 'Adjust target glasses or liter thresholds' },
                  { title: 'Itemized Intake History', desc: 'Timestamped logs with undo & reset' }
                ].map((f, i) => (
                  <div key={i} className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-200 shadow-sm shadow-gray-200/50"
                  )}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                      <CheckCircle2 size={14} />
                      <span>{f.title}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleNavigate('water')}
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer active:scale-95 transition-all"
                >
                  <Droplet size={16} />
                  <span>{lang === 'bn' ? 'পানি ট্র্যাকার চালু করুন' : 'Launch Water Tracker'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Water Visual Card Preview */}
            <div className={cn(
              "p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden",
              darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Hydration Progress</span>
                  <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">85% of Daily Target</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={cn("p-4 rounded-2xl border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Consumed</div>
                    <div className="text-3xl font-black text-blue-500 mt-1">2,550 <span className="text-xs">ml</span></div>
                    <div className="text-[10px] text-blue-400 font-bold mt-1">10.2 Glasses</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Remaining</div>
                    <div className="text-3xl font-black text-teal-400 mt-1">450 <span className="text-xs">ml</span></div>
                    <div className="text-[10px] text-teal-500 font-bold mt-1">1.8 Glasses to Goal</div>
                  </div>
                </div>

                <div className={cn("p-4 rounded-2xl border space-y-2", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Target: 3,000 ml</span>
                    <span className="text-blue-500 font-black">Optimal Hydration</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 4: All 6 Integrated Features Bento Grid */}
      <motion.section 
        id="all-features" 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={cn(
          "py-16 sm:py-24 px-4 sm:px-6 border-t",
          darkMode ? "bg-[#080808] border-white/5" : "bg-white border-gray-200"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              {lang === 'bn' ? 'সম্পূর্ণ স্যুট — ৬টি সমন্বিত টুল' : 'Six Specialized Tools, One Seamless Hub'}
            </h2>
            <p className={cn("text-xs sm:text-sm font-medium", darkMode ? "text-gray-400" : "text-gray-600")}>
              {lang === 'bn' 
                ? 'আপনার প্রতিদিনের ফিটনেস, হাইড্রেশন, অভ্যাস ও বাজার ব্যবস্থাপনার সবকিছু।' 
                : 'Everything you need to optimize your body composition, hydration, daily habits, and groceries.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Feature 1: Health */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('calculator')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-primary/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-primary/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Activity size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>Health Metrics & Goals</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                BMI, Navy body fat %, BMR, TDEE, ideal weight estimation and detailed PDF report generation.
              </p>
            </motion.div>

            {/* Feature 2: Habitor */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('results')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-emerald-500/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-emerald-500/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <HistoryIcon size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>Habitor & Streaks</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Build daily morning and evening routines with interactive streak counters and completion logs.
              </p>
            </motion.div>

            {/* Feature 3: Water Tracker */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('water')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-blue-500/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-blue-500/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Droplet size={24} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>Water Hydration</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-500" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Smart hydration tracking with one-tap cup logs, daily goals, and visual percentage indicators.
              </p>
            </motion.div>

            {/* Feature 4: Grocery Calculator */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('groceries')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-orange-500/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-orange-500/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShoppingBag size={24} className="text-orange-500" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>Grocery Calculator</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-orange-500" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Multi-unit price & quantity conversion (kg/g/L/ml/doz), itemized shopping lists, and budget estimator.
              </p>
            </motion.div>

            {/* Feature 5: Step Entries */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('calculator')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-amber-500/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-amber-500/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Footprints size={24} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>Quick Step Entries</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-amber-500" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Log daily steps quickly to monitor your walking targets and maintain high daily activity.
              </p>
            </motion.div>

            {/* Feature 6: Breathing */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleNavigate('breathing')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer group",
                darkMode ? "bg-[#101010] border-white/5 hover:border-teal-500/40 shadow-lg shadow-black/40" : "bg-white border-gray-200 hover:border-teal-500/40 shadow-md shadow-gray-200/50"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wind size={24} className="text-teal-400" />
              </div>
              <h3 className="text-lg font-black mb-2 flex items-center justify-between">
                <span>4-7-8 Breathing Calmer</span>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-teal-400" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Lower your heart rate and reduce stress with guided box breathing and relaxation cycles.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer matching logged-in inner footer style exactly */}
      <footer className={cn(
        "max-w-5xl mx-auto px-6 py-6 border-t transition-colors",
        darkMode ? "border-white/5" : "border-black/5"
      )}>
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {/* Logo with reload functionality */}
          <button 
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all text-left bg-transparent border-0 p-0 select-none"
            title="Reload RatboD"
            aria-label="Reload RatboD"
          >
            <Activity size={14} className="text-gray-700 dark:text-gray-300" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">RATBOD</span>
          </button>

          {/* UNIT Switcher Pill matching inner footer */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-400">UNIT:</span>
            <div className={cn(
              "flex p-0.5 rounded-full border transition-colors",
              darkMode ? "bg-[#18181c] border-white/10" : "bg-gray-200 border-gray-300"
            )}>
              <button 
                onClick={() => setHealthUnit('metric')}
                className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer",
                  healthUnit === 'metric' 
                    ? "bg-[#00A3FF] text-white shadow-xs shadow-cyan-500/30" 
                    : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
                )}
                title="Metric System"
              >
                M
              </button>
              <button 
                onClick={() => setHealthUnit('imperial')}
                className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer",
                  healthUnit === 'imperial' 
                    ? "bg-[#00A3FF] text-white shadow-xs shadow-cyan-500/30" 
                    : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")
                )}
                title="Imperial System"
              >
                I
              </button>
            </div>
          </div>

          {/* Policy Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-semibold text-gray-700 dark:text-gray-400">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Contact Support</a>
          </div>

          {/* Copyright */}
          <p className={cn(
            "text-[9px] font-extrabold uppercase tracking-widest transition-colors opacity-40",
            darkMode ? "text-gray-900 dark:text-gray-100" : "text-gray-800"
          )}>
            © 2026 CRAFTED BY <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">RATUL BIN ZAHANGIR</a>
          </p>
        </div>
      </footer>

      {/* Landing Page Only: Simple Top Up Arrow Floating Action Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            id="landing_scroll_to_top_btn"
            type="button"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-2xl border flex items-center justify-center cursor-pointer transition-colors backdrop-blur-md",
              darkMode 
                ? "bg-[#18181c]/90 hover:bg-[#25252b] border-white/20 text-white shadow-black/80" 
                : "bg-white/90 hover:bg-gray-100 border-black/10 text-gray-900 shadow-gray-400/50"
            )}
            title="Scroll to Top"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} className="text-primary stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
