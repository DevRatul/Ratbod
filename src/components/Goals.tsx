/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Target, Trophy, Calendar, ArrowRight, Save, RefreshCw, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Goal {
  id?: string;
  targetWeight: number;
  targetBodyFat: number;
  dailyCalorieGoal: number;
  targetDate: string;
  weeklyStepsGoal?: number;
}

interface GoalsProps {
  darkMode: boolean;
  unit: 'metric' | 'imperial';
  currentWeight?: number; // in kg
  currentBodyFat?: number;
  onGoalUpdate?: () => void;
  lang?: string;
}

export default function Goals({ darkMode, unit, currentWeight, currentBodyFat, onGoalUpdate, lang = 'en' }: GoalsProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const formatNum = (num: number | string | undefined | null, maxDecimals = 2) => {
    if (num === undefined || num === null || num === '') return '';
    let finalStr = '';
    if (typeof num === 'number') {
      if (Number.isInteger(num)) {
        finalStr = num.toString();
      } else {
        finalStr = parseFloat(num.toFixed(maxDecimals)).toString();
      }
    } else {
      finalStr = num.toString();
    }
    if (lang !== 'bn') return finalStr;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return finalStr.replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit)]);
  };

  // Form state
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weeklyStepsGoal, setWeeklyStepsGoal] = useState('');

  useEffect(() => {
    fetchGoal();
  }, []);

  useEffect(() => {
    if (goal) {
      setTargetWeight(unit === 'metric' ? goal.targetWeight.toString() : (goal.targetWeight * 2.20462).toFixed(1));
    }
  }, [unit]);

  const fetchGoal = async () => {
    setIsLoading(true);
    try {
      let data = null;
      const user = auth.currentUser;
      
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'appData', 'goals');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = docSnap.data().goal;
          }
        } catch (e) {}
      }

      if (!data) {
        const savedGoalJson = localStorage.getItem('ratbod_goals');
        if (savedGoalJson) data = JSON.parse(savedGoalJson);
      }

      if (data) {
        localStorage.setItem('ratbod_goals', JSON.stringify(data));
        setGoal(data);
        if (onGoalUpdate) onGoalUpdate();
        setTargetWeight(unit === 'metric' ? data.targetWeight.toString() : (data.targetWeight * 2.20462).toFixed(1));
        setTargetBodyFat(data.targetBodyFat.toString());
        setDailyCalorieGoal(data.dailyCalorieGoal.toString());
        setTargetDate(data.targetDate ? data.targetDate.split('T')[0] : '');
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const weightVal = parseFloat(targetWeight) || 0;
    const finalWeight = unit === 'metric' ? weightVal : weightVal / 2.20462;

    const goalData = {
      targetWeight: finalWeight,
      targetBodyFat: parseFloat(targetBodyFat) || 0,
      dailyCalorieGoal: parseInt(dailyCalorieGoal) || 0,
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      weeklyStepsGoal: parseInt(weeklyStepsGoal) || 0
    };

    try {
      localStorage.setItem('ratbod_goals', JSON.stringify(goalData));
      
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'goals'), { goal: goalData }, { merge: true }).catch(e => {});
      }

      setGoal(goalData as Goal);
      setIsEditing(false);
      if (onGoalUpdate) onGoalUpdate();
    } catch (error) {
      alert('Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const weightProgress = goal && currentWeight 
    ? (currentWeight > goal.targetWeight ? 'down' : currentWeight < goal.targetWeight ? 'up' : 'stable') 
    : null;

  const bodyFatProgress = goal && currentBodyFat
    ? (currentBodyFat > goal.targetBodyFat ? 'down' : currentBodyFat < goal.targetBodyFat ? 'up' : 'stable')
    : null;

  return (
    <div className={cn(
      "w-full rounded-3xl transition-all overflow-hidden",
      (isEditing || isExpanded) && !isEditing ? (darkMode ? "bg-[#0A0A0A]" : "bg-white") : "",
      !isEditing && !isExpanded ? (darkMode ? "bg-[#0F0F0F] border border-white/10 p-4 sm:p-6" : "bg-white border border-black/5 p-4 sm:p-6") : (isEditing ? "" : "p-4 sm:p-6 border " + (darkMode ? "border-white/10" : "border-black/5"))
    )}>
      {!isEditing && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Target size={18} />
            </div>
            <h3 className={cn("text-sm font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
              {lang === 'bn' ? 'আপনার স্বাস্থ্য লক্ষ্য' : 'Your Health Goals'}
            </h3>
          </div>
          <div className={cn("p-1.5 rounded-full transition-colors", darkMode ? "group-hover:bg-white/10" : "group-hover:bg-black/5")}>
            {isExpanded ? <ChevronUp size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} /> : <ChevronDown size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />}
          </div>
        </button>
      )}

      {isEditing && (
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Target size={18} />
          </div>
          <h3 className={cn("text-sm font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
            {lang === 'bn' ? 'আপনার স্বাস্থ্য লক্ষ্য' : 'Your Health Goals'}
          </h3>
        </div>
      )}

      <AnimatePresence initial={false}>
        {(isExpanded || isEditing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("overflow-hidden", !isEditing ? "pt-6" : "")}
          >
            {isEditing ? (
        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave} 
          className={cn(
            "p-6 rounded-3xl border space-y-6",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}
        >
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {lang === 'bn' ? 'লক্ষ্যিত ওজন' : 'Target Weight'} ({unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')})
              </label>
              <input 
                type="number" 
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder={unit === 'metric' ? '65' : '143'}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {lang === 'bn' ? 'লক্ষ্যিত চর্বি (%)' : 'Target Body Fat (%)'}
              </label>
              <input 
                type="number" 
                step="0.1"
                value={targetBodyFat}
                onChange={(e) => setTargetBodyFat(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder="15"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {lang === 'bn' ? 'দৈনিক ক্যালোরির লক্ষ্য (ক্যালোরি)' : 'Daily Calorie Goal (kcal)'}
              </label>
              <input 
                type="number" 
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder="2000"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {lang === 'bn' ? 'লক্ষ্যের সম্ভাব্য তারিখ' : 'Target Date'}
              </label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              {lang === 'bn' ? 'লক্ষ্য সংরক্ষণ করুন' : 'Save Goals'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all cursor-pointer",
                darkMode ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </motion.form>
      ) : goal ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {/* Weight Goal Card */}
            <div className={cn(
              "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-3 sm:space-y-4",
              darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
            )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'ওজন লক্ষ্য' : 'Weight Goal'}</span>
              <Trophy className="text-yellow-500" size={16} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-light tracking-tighter">
                  {formatNum(unit === 'metric' ? goal.targetWeight : (goal.targetWeight || 0) * 2.20462)}
                  <span className="text-[10px] sm:text-sm text-gray-500 font-bold ml-1">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? 'লক্ষ্যিত ওজন' : 'Target Weight'}</p>
              </div>
              {currentWeight !== undefined && currentWeight !== null && currentWeight > 0 && (
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    {weightProgress === 'down' ? <TrendingDown className="text-primary" size={14} /> : 
                     weightProgress === 'up' ? <TrendingUp className="text-red-500" size={14} /> : 
                     <Minus className="text-gray-500 dark:text-gray-400" size={14} />}
                    <span className={cn(
                      "text-sm sm:text-xl font-bold tracking-tighter",
                      weightProgress === 'down' ? "text-primary" : weightProgress === 'up' ? "text-red-500" : "text-emerald-500"
                    )}>
                      {formatNum(
                        unit === 'metric' 
                          ? Math.abs(currentWeight - goal.targetWeight) 
                          : Math.abs((currentWeight * 2.20462) - (goal.targetWeight * 2.20462))
                      )} <span className="text-[10px] sm:text-xs font-normal">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? 'আর বাকি আছে' : 'More to go'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Body Fat Goal Card */}
          <div className={cn(
            "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-3 sm:space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'চর্বির লক্ষ্য' : 'Body Fat Goal'}</span>
              <Target className="text-primary" size={16} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xl sm:text-3xl font-light tracking-tighter">
                  {formatNum((goal.targetBodyFat || 0).toFixed(1))}
                  <span className="text-[10px] sm:text-sm text-gray-500 font-bold ml-1">%</span>
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? 'লক্ষ্যিত চর্বি %' : 'Target Fat %'}</p>
              </div>
              {currentBodyFat && (
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    {bodyFatProgress === 'down' ? <TrendingDown className="text-primary" size={14} /> : 
                     bodyFatProgress === 'up' ? <TrendingUp className="text-red-500" size={14} /> : 
                     <Minus className="text-gray-500 dark:text-gray-400" size={14} />}
                    <span className={cn(
                      "text-sm sm:text-xl font-bold tracking-tighter",
                      bodyFatProgress === 'down' ? "text-primary" : bodyFatProgress === 'up' ? "text-red-500" : "text-gray-400"
                    )}>
                      {formatNum(Math.abs(currentBodyFat - goal.targetBodyFat).toFixed(1))}%
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? 'বাকি আছে' : 'To Go'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Calories Goal Card */}
          <div className={cn(
            "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-3 sm:space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'দৈনিক ক্যালরি' : 'Daily Calorie'}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-3xl font-light tracking-tighter text-primary">{formatNum(goal.dailyCalorieGoal || 0)}</span>
              <span className="text-[10px] sm:text-sm text-gray-500 font-bold">{lang === 'bn' ? 'ক্যালোরি' : 'kcal'}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? 'লক্ষ্যে পৌঁছাতে দৈনিক ক্যালোরি গ্রহণ' : 'Daily intake'}</p>
          </div>

          {/* Timeframe Card */}
          <div className={cn(
            "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-3 sm:space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'শেষ তারিখ' : 'Target Date'}</span>
              <Calendar className="text-gray-500 dark:text-gray-400" size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-2xl font-bold tracking-tight">
                {goal.targetDate ? formatNum(new Date(goal.targetDate).toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, { month: 'short', day: 'numeric', year: 'numeric' })) : '--'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
              {lang === 'bn' 
                ? `${formatNum(Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} দিন বাকি`
                : `${Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`}
            </p>
          </div>
          </div>
          
          <button
            onClick={() => setIsEditing(true)}
            className={cn(
              "w-full px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
              darkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {lang === 'bn' ? 'লক্ষ্য পরিবর্তন করুন' : 'Edit Goals'}
          </button>
        </div>
      ) : (
        <div className={cn(
          "p-12 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center space-y-4",
          darkMode ? "border-white/10 bg-white/5" : "border-gray-300 bg-gray-50"
        )}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Target size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">{lang === 'bn' ? 'এখনো কোনো লক্ষ্য নির্ধারিত হয়নি' : 'No Goals Set Yet'}</h3>
            <p className="text-sm text-gray-500 max-w-xs">{lang === 'bn' ? 'অগ্রগতি ট্র্যাক করতে এবং অনুপ্রাণিত থাকতে আপনার স্বাস্থ্য ও ফিটনেস লক্ষ্য নির্ধারণ করুন।' : 'Set your fitness objectives to track your progress and stay motivated.'}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-all flex items-center gap-2 cursor-pointer"
          >
            {lang === 'bn' ? 'আপনার প্রথম লক্ষ্য নির্ধারণ করুন' : 'Set Your First Goal'}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
