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
  LogOut,
  LogIn,
  Camera,
  History,
  UserCircle
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
import { api } from './services/api';
import Goals from './components/Goals';
import HistoryComponent from './components/History';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: number;
  username: string;
  name: string;
  profilePic?: string;
  birthdate?: string;
  gender?: Gender;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [darkMode, setDarkMode] = useState(true);
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
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getMe().then(setUser);
    api.checkStatus().then(data => {
      setIsSupabaseConfigured(data.supabaseConfigured);
    });
  }, []);

  useEffect(() => {
    if (user) {
      if (user.birthdate) {
        setBirthdate(user.birthdate);
        const birthDate = new Date(user.birthdate);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        setAge(calculatedAge.toString());
      }
      if (user.name) {
        setName(user.name);
      }
      if (user.gender) {
        setGender(user.gender);
      }
    }
  }, [user]);

  useEffect(() => {
    if (birthdate && !user?.birthdate) {
      const birthDate = new Date(birthdate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    }
  }, [birthdate, user?.birthdate]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (authMode === 'login') {
        const loggedInUser = await api.login(data);
        setUser(loggedInUser);
      } else {
        const registeredUser = await api.register(data);
        setUser(registeredUser);
      }
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const updatedUser = await api.updateProfile(formData);
      setUser(updatedUser);
      setIsProfileModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveMetrics = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!metrics) return;

    await api.saveMetrics({
      ...metricData,
      ...metrics
    });
    setHistoryRefreshTrigger(prev => prev + 1);
    alert('Metrics saved to your history!');
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
      
      const reportName = user?.name || name || 'Guest';
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${reportName}-${dateStr}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const activityOptions: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
    { value: 'lightly_active', label: 'Lightly Active', desc: 'Exercise 1-3 times/week' },
    { value: 'moderately_active', label: 'Moderately Active', desc: 'Exercise 4-5 times/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Intense exercise 6-7 times/week' },
    { value: 'extra_active', label: 'Extra Active', desc: 'Very intense exercise daily, or physical job' },
  ];

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300 selection:bg-primary-light",
      darkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"
    )}>
      {/* Header */}
      {!isSupabaseConfigured && (
        <div className="bg-red-500 text-white text-center py-2 text-xs font-bold uppercase tracking-widest z-[100] relative">
          Database not configured. Please add Supabase API keys in Settings.
        </div>
      )}
      <header className={cn(
        "border-b sticky top-0 z-50 transition-colors duration-300",
        darkMode ? "bg-[#0F0F0F]/60 backdrop-blur-xl border-white/5" : "bg-white/60 backdrop-blur-xl border-black/5"
      )}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
              <Activity size={14} />
            </div>
            <h1 className="font-sans font-black text-base tracking-tighter">RatboD</h1>
          </a>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  {user.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full object-cover border border-primary/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-primary-dark">
                      <UserIcon size={14} />
                    </div>
                  )}
                  <span className={cn("text-xs font-semibold hidden md:block", darkMode ? "text-white" : "text-gray-800")}>
                    {user.name}
                  </span>
                </button>
                <button 
                  onClick={handleLogout}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    darkMode ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-white rounded-full text-xs font-semibold hover:bg-primary-hover transition-all"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-1.5 rounded-full transition-all",
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
                onClick={() => setUnit('metric')}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                  unit === 'metric' 
                    ? (darkMode ? "bg-primary text-white" : "bg-white shadow-sm text-primary-dark") 
                    : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                )}
              >
                M<span className="hidden xs:inline">etric</span>
              </button>
              <button 
                onClick={() => setUnit('imperial')}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                  unit === 'imperial' 
                    ? (darkMode ? "bg-primary text-white" : "bg-white shadow-sm text-primary-dark") 
                    : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                )}
              >
                I<span className="hidden xs:inline">mperial</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Input Section */}
        <section className="lg:col-span-5 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Your Measurements</h2>
            <p className={cn("text-sm font-medium", darkMode ? "text-gray-300" : "text-gray-600")}>Enter your details for a precise body analysis.</p>
          </div>

          <div className="space-y-6">
            {/* Name and Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="Enter your name"
                />
              </div>

              {/* Gender Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <UserIcon size={14} /> Gender
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
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date of Birth</label>
                <input 
                  type="date" 
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Age</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Weight ({unit === 'metric' ? 'kg' : 'lb'})
                </label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder={unit === 'metric' ? '70' : '154'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Height ({unit === 'metric' ? 'cm' : 'in'})
                </label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder={unit === 'metric' ? '175' : '69'}
                />
              </div>
            </div>

            {/* Body Measurements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Waist ({unit === 'metric' ? 'cm' : 'in'})
                </label>
                <input 
                  type="number" 
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Neck ({unit === 'metric' ? 'cm' : 'in'})
                </label>
                <input 
                  type="number" 
                  value={neck}
                  onChange={(e) => setNeck(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
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
                  Hip ({unit === 'metric' ? 'cm' : 'in'})
                </label>
                <input 
                  type="number" 
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  placeholder="95"
                />
              </motion.div>
            )}

            {/* Activity Level */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Activity size={14} /> Activity Level
              </label>
              <div className="relative">
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className={cn(
                    "w-full appearance-none border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer",
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
        <section className="lg:col-span-7">
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
                  <h2 className="text-2xl font-semibold tracking-tight">Analysis Results</h2>
                  <div className="flex items-center gap-2">
                    {user && (
                      <button 
                        onClick={handleSaveMetrics}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                          darkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        <History size={16} />
                        Save
                      </button>
                    )}
                    <button 
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                        darkMode ? "bg-primary text-white hover:bg-primary-hover" : "bg-black text-white hover:bg-gray-800"
                      )}
                    >
                      {isGeneratingPdf ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </button>
                  </div>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* BMI Card */}
                  <div className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">BMI</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        metrics.category === 'Normal weight' 
                          ? (darkMode ? "bg-primary/20 text-primary" : "bg-primary-light text-primary-dark") 
                          : (darkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
                      )}>
                        {metrics.category}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-light tracking-tighter">{metrics.bmi.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 font-bold">kg/m²</span>
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
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Body Fat</span>
                      <Info size={14} className="text-gray-400" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-light tracking-tighter">{metrics.bodyFat.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 font-bold">%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary/80">
                      <span>Ideal: {metrics.idealFatRange.min}-{metrics.idealFatRange.max}%</span>
                    </div>
                  </div>

                  {/* BMR Card */}
                  <div className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Basal Metabolic Rate</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(metrics.bmr)}</span>
                      <span className="text-sm text-gray-500 font-bold">kcal/day</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Calories burned at complete rest</p>
                  </div>

                  {/* TDEE Card */}
                  <div className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
                  )}>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Daily Energy</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-light tracking-tighter text-primary">{Math.round(metrics.tdee)}</span>
                      <span className="text-sm text-gray-500 font-bold">kcal/day</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Calories to maintain current weight</p>
                  </div>
                </div>

                {/* Goal Section */}
                <div className={cn(
                  "p-8 rounded-3xl border shadow-lg transition-all relative overflow-hidden",
                  metrics.weightDiff.type === 'lose' ? (darkMode ? "bg-red-500/5 border-red-500/20" : "bg-red-50/50 border-red-200") : 
                  metrics.weightDiff.type === 'gain' ? (darkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50/50 border-blue-200") : 
                  (darkMode ? "bg-primary/5 border-primary/20" : "bg-primary-light/50 border-primary/20")
                )}>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        metrics.weightDiff.type === 'lose' ? "bg-red-500/10 text-red-500" : 
                        metrics.weightDiff.type === 'gain' ? "bg-blue-500/10 text-blue-500" : 
                        "bg-primary/10 text-primary"
                      )}>
                        <Activity size={20} />
                      </div>
                      <h3 className={cn("text-lg font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>Your Health Goal</h3>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Target Action</p>
                        <span className={cn(
                          "text-4xl font-black tracking-tighter uppercase block",
                          metrics.weightDiff.type === 'lose' ? "text-red-500" : 
                          metrics.weightDiff.type === 'gain' ? "text-blue-500" : 
                          "text-primary"
                        )}>
                          {metrics.weightDiff.type === 'maintain' ? 'Maintain' : 
                           metrics.weightDiff.type === 'lose' ? 'Lose Weight' : 'Gain Weight'}
                        </span>
                      </div>

                      {metrics.weightDiff.type !== 'maintain' && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Weight Difference</p>
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-4xl font-black tracking-tighter", darkMode ? "text-white" : "text-gray-900")}>
                              {metrics.weightDiff.kg.toFixed(1)}
                            </span>
                            <span className="text-xl font-bold opacity-40">kg</span>
                            <span className="text-sm font-bold opacity-20 ml-2">/ {metrics.weightDiff.lb.toFixed(1)} lb</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={cn(
                      "mt-6 p-4 rounded-2xl font-bold text-sm",
                      darkMode ? "bg-white/5 text-gray-300" : "bg-white/80 text-gray-700 shadow-sm"
                    )}>
                      {metrics.weightDiff.type === 'maintain' 
                        ? "Excellent! You are currently at your ideal body weight. Focus on maintaining your healthy habits." 
                        : `To reach your ideal body weight of ${metrics.idealWeight.kg.toFixed(1)}kg, you should aim to ${metrics.weightDiff.type === 'lose' ? 'lose' : 'gain'} ${metrics.weightDiff.kg.toFixed(1)}kg.`}
                    </div>
                  </div>
                  {/* Decorative background accent */}
                  <div className={cn(
                    "absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-10",
                    metrics.weightDiff.type === 'lose' ? "bg-red-500" : 
                    metrics.weightDiff.type === 'gain' ? "bg-blue-500" : 
                    "bg-primary"
                  )} />
                </div>

                  {/* Ideal Weight Section (Accordion) */}
                  <div className={cn(
                    "rounded-xl shadow-lg relative overflow-hidden border transition-all duration-300",
                    darkMode ? "bg-[#0A0A0A] border-white/5" : "bg-[#1A2B3C] border-white/5"
                  )}>
                    <button 
                      onClick={() => setIsIdealWeightOpen(!isIdealWeightOpen)}
                      className="w-full px-6 py-4 flex items-center justify-between group transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg transition-colors",
                          darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-400/10 text-blue-300"
                        )}>
                          <Scale size={18} />
                        </div>
                        <div className="text-left">
                          <h3 className={cn("text-sm font-black uppercase tracking-widest", darkMode ? "text-white" : "text-blue-100")}>Ideal Body Weight</h3>
                          <p className={cn("text-[10px] font-medium opacity-50", darkMode ? "text-gray-400" : "text-blue-300")}>Devine Formula ({gender === 'male' ? 'Male' : 'Female'})</p>
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
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-white/5">
                            <div className="grid grid-cols-2 gap-4">
                              <div className={cn(
                                "p-4 rounded-xl border transition-colors",
                                darkMode ? "bg-white/5 border-white/10" : "bg-blue-900/20 border-blue-800/20"
                              )}>
                                <span className={cn("text-[10px] uppercase font-black block mb-1", darkMode ? "text-white/40" : "text-blue-400/40")}>Metric</span>
                                <p className="text-2xl font-light tracking-tighter text-white">
                                  {metrics.idealWeight.kg.toFixed(1)}
                                  <span className="text-xs opacity-40 ml-1 font-normal">kg</span>
                                </p>
                              </div>
                              <div className={cn(
                                "p-4 rounded-xl border transition-colors",
                                darkMode ? "bg-white/5 border-white/10" : "bg-blue-900/20 border-blue-800/20"
                              )}>
                                <span className={cn("text-[10px] uppercase font-black block mb-1", darkMode ? "text-white/40" : "text-blue-400/40")}>Imperial</span>
                                <p className="text-2xl font-light tracking-tighter text-white">
                                  {metrics.idealWeight.lb.toFixed(1)}
                                  <span className="text-xs opacity-40 ml-1 font-normal">lb</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className={cn(
                              "mt-4 p-3 rounded-lg text-[10px] leading-relaxed",
                              darkMode ? "bg-blue-500/5 text-blue-300/70 border border-blue-500/10" : "bg-blue-400/5 text-blue-200/70 border border-blue-400/10"
                            )}>
                              The Devine formula is a widely used method for estimating ideal body weight based on height and gender. It provides a healthy target weight for medical and nutritional purposes.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-5 pointer-events-none" />
                  </div>

                  {/* History Section */}
                  {user && (
                    <HistoryComponent 
                      darkMode={darkMode} 
                      unit={unit} 
                      refreshTrigger={historyRefreshTrigger} 
                      isLoggedIn={!!user}
                    />
                  )}

                {/* Hidden Report for PDF Generation (Off-screen) */}
                <div className="fixed left-[-9999px] top-0 pointer-events-none">
                  <div ref={reportRef} style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }} className="p-12 w-[800px] space-y-12">
                    <div style={{ borderBottom: '1px solid #e5e7eb' }} className="flex justify-between items-start pb-8">
                      <div className="flex items-center gap-4">
                        {user?.profilePic && (
                          <img 
                            src={user.profilePic} 
                            alt={user.name} 
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #32CD32' }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <h1 style={{ color: '#32CD32' }} className="text-4xl font-black tracking-tighter">RatboD</h1>
                          <p style={{ color: '#6b7280' }}>Health Analysis for {user?.name || name || 'Guest'}</p>
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
                  <h3 className="text-lg font-medium text-gray-700">Ready to Calculate</h3>
                  <p className="text-sm text-gray-400">Fill in your measurements on the left to see your body analysis results.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {user && (
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <Goals 
            darkMode={darkMode} 
            unit={unit} 
            currentWeight={metricData.weight} 
            currentBodyFat={metrics?.bodyFat}
          />
        </div>
      )}

      {/* Footer */}
      <footer className={cn(
        "max-w-5xl mx-auto px-6 py-6 border-t transition-colors",
        darkMode ? "border-white/5" : "border-black/5"
      )}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-40">
            <Activity size={14} className="text-[#b4a8a8]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#b4a8a8]">RatboD</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] text-[#b4a8a8] hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-[10px] text-[#b4a8a8] hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-[10px] text-[#b4a8a8] hover:text-primary transition-colors">Contact Support</a>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#cacaca]">
            © 2026 Crafted By <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Ratul Bin Zahangir</a>
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-3xl shadow-2xl transition-colors",
                darkMode ? "bg-[#0F0F0F] text-white" : "bg-white text-[#1A1A1A]"
              )}
            >
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className={cn("text-sm font-medium", darkMode ? "text-gray-300" : "text-gray-600")}>
                  {authMode === 'login' ? 'Access your body metrics history' : 'Start tracking your health journey'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                      <input 
                        name="name"
                        required
                        className={cn(
                          "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                        )}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Birthdate</label>
                      <input 
                        name="birthdate"
                        type="date"
                        required
                        className={cn(
                          "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Gender</label>
                      <select 
                        name="gender"
                        required
                        className={cn(
                          "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                        )}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Username</label>
                  <input 
                    name="username"
                    required
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                    placeholder="johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                  <input 
                    name="password"
                    type="password"
                    required
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                    placeholder="••••••••"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-500 font-medium">{authError}</p>
                )}

                <button 
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                >
                  {authMode === 'login' ? 'Login' : 'Sign Up'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-3xl shadow-2xl transition-colors",
                darkMode ? "bg-[#0F0F0F] text-white" : "bg-white text-[#1A1A1A]"
              )}
            >
              <h2 className="text-2xl font-bold tracking-tight mb-8">Edit Profile</h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {user?.profilePic ? (
                      <img 
                        src={user.profilePic} 
                        alt={user.name} 
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center text-primary-dark">
                        <UserCircle size={48} />
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={24} className="text-white" />
                      <input 
                        type="file" 
                        name="profilePic" 
                        className="hidden" 
                        accept="image/*"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Click to change photo</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Display Name</label>
                  <input 
                    name="name"
                    defaultValue={user?.name}
                    required
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Birthdate</label>
                  <input 
                    name="birthdate"
                    type="date"
                    defaultValue={user?.birthdate}
                    required
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Gender</label>
                  <select 
                    name="gender"
                    defaultValue={user?.gender}
                    required
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-semibold transition-all",
                      darkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
