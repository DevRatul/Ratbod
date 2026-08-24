import React, { useState } from 'react';
import { 
  Activity, 
  Droplet, 
  Wind, 
  Footprints,
  ArrowRight,
  Target,
  History as HistoryIcon,
  ShoppingBag,
  Calculator,
  Scale,
  Sparkles,
  Flame,
  CheckCircle2,
  Plus,
  Trash2,
  TrendingDown,
  Moon,
  Sun
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  // Built-in Interactive Health Calculator Demo State
  const [healthGender, setHealthGender] = useState<'male' | 'female'>('male');
  const [healthUnit, setHealthUnit] = useState<'metric' | 'imperial'>('metric');
  const [healthHeight, setHealthHeight] = useState<string>('175');
  const [healthWeight, setHealthWeight] = useState<string>('72');
  const [healthAge, setHealthAge] = useState<string>('26');

  // Built-in Interactive Grocery Calculator Demo State
  const [groceryName, setGroceryName] = useState<string>('Chicken Breast');
  const [groceryBaseUnit, setGroceryBaseUnit] = useState<string>('kg');
  const [groceryUnitPrice, setGroceryUnitPrice] = useState<string>('280');
  const [groceryDesiredQty, setGroceryDesiredQty] = useState<string>('750');
  const [groceryDesiredUnit, setGroceryDesiredUnit] = useState<string>('g');
  const [groceryDemoItems, setGroceryDemoItems] = useState<Array<{ name: string; qtyStr: string; price: number }>>([
    { name: 'Apples (Honeycrisp)', qtyStr: '1.5 kg', price: 360 },
    { name: 'Brown Rice', qtyStr: '5 kg', price: 420 },
    { name: 'Farm Eggs', qtyStr: '12 pcs (1 doz)', price: 155 }
  ]);

  // Active Interactive Demo Tab
  const [activeDemoTab, setActiveDemoTab] = useState<'health' | 'grocery'>('health');

  // Handle Logo Click -> Smooth reload
  const handleLogoClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.location.reload();
  };

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

  // Grocery Calculator Calculations
  const parsedUnitPrice = parseFloat(groceryUnitPrice) || 0;
  const parsedDesiredQty = parseFloat(groceryDesiredQty) || 0;
  let calculatedGroceryPrice = 0;

  if (parsedUnitPrice > 0 && parsedDesiredQty > 0) {
    let multiplier = 1;
    if (groceryBaseUnit === 'kg') {
      multiplier = groceryDesiredUnit === 'g' ? parsedDesiredQty / 1000 : parsedDesiredQty;
    } else if (groceryBaseUnit === 'g') {
      multiplier = groceryDesiredUnit === 'kg' ? parsedDesiredQty * 1000 : parsedDesiredQty;
    } else if (groceryBaseUnit === 'L') {
      multiplier = groceryDesiredUnit === 'ml' ? parsedDesiredQty / 1000 : parsedDesiredQty;
    } else if (groceryBaseUnit === 'dozen') {
      multiplier = groceryDesiredUnit === 'piece' ? parsedDesiredQty / 12 : parsedDesiredQty;
    } else {
      multiplier = parsedDesiredQty;
    }
    calculatedGroceryPrice = parseFloat((parsedUnitPrice * multiplier).toFixed(2));
  }

  const handleAddGroceryItem = () => {
    if (!groceryName.trim() || calculatedGroceryPrice <= 0) return;
    const newItem = {
      name: groceryName.trim(),
      qtyStr: `${groceryDesiredQty} ${groceryDesiredUnit}`,
      price: calculatedGroceryPrice
    };
    setGroceryDemoItems([newItem, ...groceryDemoItems.slice(0, 4)]);
    setGroceryName('');
  };

  const handleRemoveGroceryItem = (index: number) => {
    setGroceryDemoItems(groceryDemoItems.filter((_, i) => i !== index));
  };

  const totalGroceryDemoCost = groceryDemoItems.reduce((acc, item) => acc + item.price, 0);

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
              href="#grocery-calculator-section" 
              className={cn(
                "px-3 py-1 rounded-lg transition-colors flex items-center gap-1",
                darkMode ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:text-gray-900 hover:bg-white"
              )}
            >
              <ShoppingBag size={12} className="text-orange-500" />
              {lang === 'bn' ? 'মুদি ক্যালকুলেটর' : 'Grocery Calculator'}
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
              <span>{lang === 'bn' ? 'অল-ইন-ওয়ান স্বাস্থ্য ও মুদি ক্যালকুলেটর হাব' : 'All-In-One Health & Grocery Hub'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              {lang === 'bn' ? 'আপনার স্বাস্থ্য ও দৈনন্দিন হিসাবের' : 'Smart Health Metrics &'} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-teal-400">
                {lang === 'bn' ? 'সম্পূর্ণ সমাধান' : 'Daily Grocery Calculator.'}
              </span>
            </h1>

            <p className={cn(
              "text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}>
              {lang === 'bn' 
                ? 'বডি কম্পোজিশন, বিএমআই, বিএমআর, চর্বি পরিমাপ ও লক্ষ্যের সাথে রয়েছে স্মার্ট মুদি ইউনিট কনভার্টার ও খরচ হিসাবকারী টুল।' 
                : 'Track body composition, BMI, BMR, body fat & goals alongside an intelligent multi-unit grocery calculator, hydration tracker, habits, and box breathing.'}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => handleNavigate('calculator')}
                className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/30 cursor-pointer active:scale-95"
              >
                <Activity size={18} />
                <span>{lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর খুলুন' : 'Open Health Calculator'}</span>
                <ArrowRight size={16} />
              </button>

              <button 
                onClick={() => handleNavigate('groceries')}
                className={cn(
                  "px-6 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md",
                  darkMode 
                    ? "bg-[#141414] hover:bg-[#1f1f1f] border-white/10 text-orange-400" 
                    : "bg-white hover:bg-gray-50 border-gray-200 text-orange-600 shadow-gray-200/50"
                )}
              >
                <ShoppingBag size={18} />
                <span>{lang === 'bn' ? 'মুদি ক্যালকুলেটর খুলুন' : 'Open Grocery Calculator'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Mini-Calculator Hub on Landing Page */}
          <div className={cn(
            "rounded-3xl border p-5 sm:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 max-w-4xl mx-auto",
            darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
          )}>
            <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200 dark:border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Built-In Interactive Demos</span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                  {lang === 'bn' ? 'সরাসরি পৃষ্ঠা থেকেই পরীক্ষা করুন' : 'Test Calculators Live Right Here'}
                </h3>
              </div>

              {/* Demo Switcher Tabs */}
              <div className={cn(
                "flex p-1 rounded-2xl border",
                darkMode ? "bg-black/50 border-white/10" : "bg-gray-100 border-gray-200"
              )}>
                <button
                  onClick={() => setActiveDemoTab('health')}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeDemoTab === 'health'
                      ? "bg-primary text-white shadow-md shadow-primary/30"
                      : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  <Activity size={14} />
                  <span>{lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর' : 'Health Calculator'}</span>
                </button>

                <button
                  onClick={() => setActiveDemoTab('grocery')}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeDemoTab === 'grocery'
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                      : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                  )}
                >
                  <ShoppingBag size={14} />
                  <span>{lang === 'bn' ? 'মুদি ক্যালকুলেটর' : 'Grocery Calculator'}</span>
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

                    <button
                      type="button"
                      onClick={() => setHealthUnit(healthUnit === 'metric' ? 'imperial' : 'metric')}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors shrink-0",
                        darkMode ? "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300" : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700"
                      )}
                    >
                      {healthUnit === 'metric' ? 'Metric' : 'Imperial'}
                    </button>
                  </div>
                </div>

                {/* Instant Output Result Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className={cn(
                    "p-3.5 rounded-2xl border text-center",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">BMI Index</div>
                    <div className="text-2xl font-black text-primary mt-0.5">{bmi > 0 ? bmi : '--'}</div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border text-center",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</div>
                    <div className={cn("text-sm sm:text-base font-black mt-1.5 truncate", bmiColor)}>
                      {bmi > 0 ? bmiCategory : '--'}
                    </div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border text-center",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Base BMR</div>
                    <div className="text-xl font-black text-amber-500 mt-0.5">{bmr > 0 ? `${bmr} kcal` : '--'}</div>
                  </div>

                  <div className={cn(
                    "p-3.5 rounded-2xl border text-center",
                    darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ideal Weight</div>
                    <div className="text-xs font-black text-teal-400 mt-1.5">
                      {idealWeightMin > 0 ? `${idealWeightMin} - ${idealWeightMax} ${healthUnit === 'metric' ? 'kg' : 'lbs'}` : '--'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleNavigate('calculator')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সম্পূর্ণ স্বাস্থ্য বিশ্লেষণ দেখুন' : 'Explore Full Health Suite with Body Fat & Goals'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Built-in Live Grocery Calculator */}
            {activeDemoTab === 'grocery' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Item Name */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {lang === 'bn' ? 'পণ্যের নাম' : 'Item Name'}
                    </label>
                    <input 
                      type="text"
                      value={groceryName}
                      onChange={(e) => setGroceryName(e.target.value)}
                      placeholder="e.g. Beef, Rice, Milk"
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all",
                        darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>

                  {/* Unit & Unit Price */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {lang === 'bn' ? 'মূল্য / একক' : 'Price / Base Unit'}
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="number"
                        value={groceryUnitPrice}
                        onChange={(e) => setGroceryUnitPrice(e.target.value)}
                        placeholder="280"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      />
                      <select
                        value={groceryBaseUnit}
                        onChange={(e) => {
                          const u = e.target.value;
                          setGroceryBaseUnit(u);
                          if (u === 'kg') setGroceryDesiredUnit('g');
                          else if (u === 'L') setGroceryDesiredUnit('ml');
                          else if (u === 'dozen') setGroceryDesiredUnit('piece');
                          else setGroceryDesiredUnit(u);
                        }}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 shrink-0",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      >
                        <option value="kg">/ kg</option>
                        <option value="g">/ g</option>
                        <option value="L">/ L</option>
                        <option value="dozen">/ doz</option>
                        <option value="piece">/ pc</option>
                        <option value="pack">/ pack</option>
                      </select>
                    </div>
                  </div>

                  {/* Desired Qty */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {lang === 'bn' ? 'প্রয়োজনীয় পরিমাণ' : 'Desired Quantity'}
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="number"
                        value={groceryDesiredQty}
                        onChange={(e) => setGroceryDesiredQty(e.target.value)}
                        placeholder="750"
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      />
                      <select
                        value={groceryDesiredUnit}
                        onChange={(e) => setGroceryDesiredUnit(e.target.value)}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 shrink-0",
                          darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      >
                        {groceryBaseUnit === 'kg' && (
                          <>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                          </>
                        )}
                        {groceryBaseUnit === 'L' && (
                          <>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                          </>
                        )}
                        {groceryBaseUnit === 'dozen' && (
                          <>
                            <option value="piece">pcs</option>
                            <option value="dozen">doz</option>
                          </>
                        )}
                        {['piece', 'pack', 'g'].includes(groceryBaseUnit) && (
                          <option value={groceryBaseUnit}>{groceryBaseUnit}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Instant Calculation Output & Add to List */}
                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4",
                  darkMode ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-200"
                )}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Calculated Price</div>
                    <div className="text-2xl sm:text-3xl font-black text-orange-500">
                      {calculatedGroceryPrice > 0 ? `৳ ${calculatedGroceryPrice}` : '৳ 0.00'}
                    </div>
                  </div>

                  <button
                    onClick={handleAddGroceryItem}
                    disabled={!groceryName.trim() || calculatedGroceryPrice <= 0}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/25 transition-all active:scale-95"
                  >
                    <Plus size={16} />
                    <span>{lang === 'bn' ? 'তালিকায় যোগ করুন' : 'Add to Preview List'}</span>
                  </button>
                </div>

                {/* Live Preview List */}
                {groceryDemoItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                      <span>Shopping Preview List ({groceryDemoItems.length})</span>
                      <span className="text-orange-500 font-black">Total: ৳ {totalGroceryDemoCost.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {groceryDemoItems.map((item, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs",
                            darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.name}</span>
                            <span className="text-gray-500 text-[10px]">({item.qtyStr})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-orange-500">৳ {item.price.toFixed(2)}</span>
                            <button 
                              onClick={() => handleRemoveGroceryItem(idx)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleNavigate('groceries')}
                    className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সম্পূর্ণ মুদি ক্যালকুলেটর ও পিডিএফ ডাউনলোড দেখুন' : 'Open Full Grocery Suite with Export & Cloud Sync'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 1: Health Calculator Detailed Feature Showcase */}
      <section id="health-calculator-section" className={cn(
        "py-16 sm:py-24 px-4 sm:px-6 border-t",
        darkMode ? "bg-[#080808] border-white/5" : "bg-gray-50/70 border-gray-200"
      )}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-primary/10 border-primary/20 text-primary" : "bg-primary/10 border-primary/20 text-primary"
              )}>
                <Activity size={14} />
                <span>{lang === 'bn' ? 'বিল্ট-ইন স্বাস্থ্য অ্যানালিটিক্স' : 'Built-In Health Calculator'}</span>
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
      </section>

      {/* SECTION 2: Grocery Calculator Detailed Feature Showcase */}
      <section id="grocery-calculator-section" className={cn(
        "py-16 sm:py-24 px-4 sm:px-6 border-t",
        darkMode ? "bg-[#0A0A0A] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Grocery Visual Preview */}
            <div className={cn(
              "order-2 lg:order-1 p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden",
              darkMode ? "bg-[#0F0F0F] border-white/10 shadow-black/80" : "bg-white border-gray-200 shadow-gray-200/80"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-orange-500" />
                    <span className="text-sm font-black">Grocery Bag Total</span>
                  </div>
                  <span className="text-lg font-black text-orange-500">৳ 1,420.00</span>
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'Fresh Milk', qty: '2 Liters', rate: '৳ 90 / L', total: '৳ 180.00' },
                    { name: 'Boneless Beef', qty: '1.25 kg', rate: '৳ 780 / kg', total: '৳ 975.00' },
                    { name: 'Farm Eggs', qty: '20 pcs', rate: '৳ 159 / doz', total: '৳ 265.00' }
                  ].map((it, idx) => (
                    <div key={idx} className={cn(
                      "p-3 rounded-2xl border flex items-center justify-between text-xs",
                      darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200"
                    )}>
                      <div>
                        <div className="font-bold">{it.name}</div>
                        <div className="text-[10px] text-gray-500">{it.qty} • {it.rate}</div>
                      </div>
                      <div className="font-black text-orange-500">{it.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
                darkMode ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-500/10 border-orange-500/20 text-orange-600"
              )}>
                <ShoppingBag size={14} />
                <span>{lang === 'bn' ? 'বিল্ট-ইন মুদি ক্যালকুলেটর' : 'Built-In Grocery Calculator'}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {lang === 'bn' ? 'সহজ ইউনিট রূপান্তর ও নির্ভুল বাজার খরচ' : 'Smart Multi-Unit Shopping & Cost Estimator'}
              </h2>

              <p className={cn("text-sm sm:text-base leading-relaxed", darkMode ? "text-gray-400" : "text-gray-600")}>
                {lang === 'bn' 
                  ? 'কেজি থেকে গ্রাম, লিটার থেকে মিলি, ডজন ও খাঁচি রূপান্তরের মাধ্যমে যেকোনো নির্দিষ্ট বাজেট বা পরিমাণের সঠিক মূল্য তাৎক্ষণিক বের করুন।' 
                  : 'Effortlessly convert kilograms to grams, liters to milliliters, dozens to individual units, and compute prices based on custom budgets or exact gram weights.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'Intelligent Unit Math', desc: 'kg ↔ g, L ↔ ml, dozen, piece, khachi' },
                  { title: 'Dual Calculation Mode', desc: 'Compute by Qty OR compute by Budget' },
                  { title: 'Printable Grocery Lists', desc: 'Export summary receipt or PDF for shopping' },
                  { title: 'Cloud & Offline Sync', desc: 'Items stay saved on any phone or PC' }
                ].map((f, i) => (
                  <div key={i} className={cn(
                    "p-3.5 rounded-2xl border space-y-1",
                    darkMode ? "bg-[#111111] border-white/5" : "bg-white border-gray-200 shadow-sm shadow-gray-200/50"
                  )}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                      <CheckCircle2 size={14} />
                      <span>{f.title}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">{f.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleNavigate('groceries')}
                  className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all"
                >
                  <ShoppingBag size={16} />
                  <span>{lang === 'bn' ? 'মুদি ক্যালকুলেটর চালু করুন' : 'Launch Full Grocery Suite'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: All 6 Integrated Features Bento Grid */}
      <section id="all-features" className={cn(
        "py-16 sm:py-24 px-4 sm:px-6 border-t",
        darkMode ? "bg-[#080808] border-white/5" : "bg-gray-50/70 border-gray-200"
      )}>
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
            <div 
              onClick={() => handleNavigate('calculator')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>

            {/* Feature 2: Grocery */}
            <div 
              onClick={() => handleNavigate('groceries')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>

            {/* Feature 3: Habitor */}
            <div 
              onClick={() => handleNavigate('results')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>

            {/* Feature 4: Water Tracker */}
            <div 
              onClick={() => handleNavigate('water')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>

            {/* Feature 5: Step Entries */}
            <div 
              onClick={() => handleNavigate('calculator')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>

            {/* Feature 6: Breathing */}
            <div 
              onClick={() => handleNavigate('breathing')}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 group",
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
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Clickable Logo */}
      <footer className={cn(
        "border-t py-10 px-4 sm:px-6 transition-colors",
        darkMode ? "bg-[#050505] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <button 
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 active:scale-95 transition-all text-left bg-transparent border-0 p-0"
            title="Reload RatboD"
          >
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shadow-primary/30 shrink-0">
              <Activity size={16} />
            </div>
            <div>
              <span className="font-black text-sm tracking-tighter">RatboD</span>
              <span className="text-[10px] text-gray-500 block">Health & Grocery Hub</span>
            </div>
          </button>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-500">
            <button onClick={() => handleNavigate('calculator')} className="hover:text-primary transition-colors cursor-pointer">
              {lang === 'bn' ? 'স্বাস্থ্য ক্যালকুলেটর' : 'Health Calculator'}
            </button>
            <button onClick={() => handleNavigate('groceries')} className="hover:text-orange-500 transition-colors cursor-pointer">
              {lang === 'bn' ? 'মুদি ক্যালকুলেটর' : 'Grocery Calculator'}
            </button>
            <button onClick={() => handleNavigate('water')} className="hover:text-blue-500 transition-colors cursor-pointer">
              {lang === 'bn' ? 'পানি ট্র্যাকার' : 'Water Tracker'}
            </button>
            <button onClick={() => handleNavigate('breathing')} className="hover:text-teal-400 transition-colors cursor-pointer">
              {lang === 'bn' ? 'শ্বাসপ্রশ্বাস' : 'Breathe'}
            </button>
          </div>

          <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 text-gray-500">
            © 2026 CRAFTED BY <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">RATUL BIN ZAHANGIR</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
