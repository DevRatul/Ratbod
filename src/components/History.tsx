import React, { useState, useEffect } from 'react';
import { Calendar, Scale, Activity, TrendingDown, TrendingUp, Minus, Trash2, History as HistoryIcon, Eye
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import ViewAllHistoryModal from './ViewAllHistoryModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MetricEntry {
  id: string | number;
  date: string;
  weight: number;
  bmi: number;
  bodyFat: number;
}

interface StepEntry {
  id: string | number;
  date: string;
  steps: number;
}

interface HistoryProps {
  darkMode: boolean;
  unit: 'metric' | 'imperial';
  refreshTrigger?: number;
  isLoggedIn: boolean;
  lang?: string;
  onUpdate?: () => void;
}

export default function History({ darkMode, unit, refreshTrigger, isLoggedIn, lang = 'en', onUpdate }: HistoryProps) {
  const [history, setHistory] = useState<MetricEntry[]>([]);
  const [stepsHistory, setStepsHistory] = useState<StepEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

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

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger, isLoggedIn]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let data = null;
      let stepsData = null;
      const user = auth.currentUser;
      
      if (user) {
        try {
          // Fetch weight history
          const docRef = doc(db, 'users', user.uid, 'appData', 'history');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = docSnap.data().history;
          }
          
          // Fetch steps history
          const stepsDocRef = doc(db, 'users', user.uid);
          const stepsDocSnap = await getDoc(stepsDocRef);
          if (stepsDocSnap.exists()) {
            stepsData = stepsDocSnap.data().stepsHistory;
          }
        } catch (e) {}
      }

      if (!data) {
        const localData = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
        data = localData;
      }
      if (!stepsData) {
        const localSteps = JSON.parse(localStorage.getItem('ratbod_steps_history') || '[]');
        stepsData = localSteps;
      }
      
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHistory(sorted);
      
      const sortedSteps = stepsData.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setStepsHistory(sortedSteps);
      
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistory([]);
      setStepsHistory([]);
    } finally {
      setIsLoading(false);
    }
  };



  const deleteEntry = (id: string | number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      let data = history.filter((entry: MetricEntry) => entry.id !== deleteConfirmId);
      localStorage.setItem('ratbod_history', JSON.stringify(data));
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'appData', 'history'), { history: data }, { merge: true }).catch(e => {});
      }
      
      // Refresh history
      fetchHistory();
      if (onUpdate) onUpdate();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      const errMsg = lang === 'bn'
        ? 'পরিমাপটি ডিলিট করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।'
        : 'Failed to delete measurement. Please try again.';
      alert(errMsg);
      setDeleteConfirmId(null);
    }
  };

  const deleteStep = async (id: string | number) => {
    try {
      let data = stepsHistory.filter((entry: StepEntry) => entry.id !== id);
      localStorage.setItem('ratbod_steps_history', JSON.stringify(data));
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { stepsHistory: data }, { merge: true }).catch(e => {});
      }
      
      fetchHistory();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete steps:', error);
    }
  };

  const deleteWeight = async (id: string | number) => {
    try {
      let data = history.filter((entry: MetricEntry) => entry.id !== id);
      localStorage.setItem('ratbod_history', JSON.stringify(data));
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'appData', 'history'), { history: data }, { merge: true }).catch(e => {});
      }
      
      fetchHistory();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete weight:', error);
    }
  };

  const formatWeight = (kg: number) => {
    if (unit === 'metric') return `${formatNum(kg)} ${lang === 'bn' ? 'কেজি' : 'kg'}`;
    return `${formatNum(kg * 2.20462)} ${lang === 'bn' ? 'পাউন্ড' : 'lb'}`;
  };

  const formatDate = (dateString: string) => {
    const raw = new Date(dateString).toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return formatNum(raw);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  
  if (history.length === 0) {
    return (
      <div className={cn(
        "p-8 rounded-3xl border border-dashed text-center space-y-3",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-300 bg-white shadow-sm"
      )}>
        <Calendar className="mx-auto text-gray-500 dark:text-gray-400" size={32} />
        <p className={cn("text-sm font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
          {lang === 'bn' 
            ? 'পরিমাপের কোনো ইতিহাস পাওয়া যায়নি। এটি দেখতে প্রথমে আপনার পরিমাপ সংরক্ষণ করুন!'
            : 'No history entries found. Save your first measurement to see it here!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-100 text-emerald-600")}> 
             <HistoryIcon size={18} />
          </div>
          <h3 className={cn("text-sm font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
            {lang === 'bn' ? 'ইতিহাস' : 'History'}
          </h3>
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", darkMode ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-700")}>
            {lang === 'bn' ? `${formatNum(history.length)}টি ভুক্তি` : `${history.length} ENTRIES`}
          </span>
        </div>
        
        <button
          onClick={() => setShowAllModal(true)}
          className={cn("text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full", darkMode ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}
        >
          <Eye size={14} />
          {lang === 'bn' ? 'সব দেখুন' : 'View All'}
        </button>
      </div>

      <div className="space-y-2">
        {history.slice(0, 4).map((entry, idx) => {
          const index = history.findIndex(h => h.id === entry.id);
          const prevEntry = history[index + 1];
          const weightDiff = prevEntry ? entry.weight - prevEntry.weight : 0;
          const displayDiff = unit === 'metric' ? weightDiff : weightDiff * 2.20462;
          
          return (
            <motion.div 
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-2xl border transition-all", 
                darkMode ? "bg-[#111111] border-white/5" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50 hover:shadow-lg"
              )}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-100 text-emerald-600")}>
                    <Calendar size={14} />
                  </div>
                  <div>
                    <div className={cn("font-bold text-xs", darkMode ? "text-white" : "text-gray-900")}>
                      {formatDate(entry.date)}
                    </div>
                    <div className="text-[9px] text-gray-500 font-bold">
                      {formatNum(new Date(entry.date).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : undefined, { hour: '2-digit', minute: '2-digit' }))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {Math.abs(weightDiff) > 0.001 ? (
                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black", weightDiff > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                       {weightDiff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                       {formatNum(Math.abs(displayDiff))}
                    </div>
                  ) : (
                    <div className={cn("px-1.5 py-0.5 rounded-lg text-[10px] font-black flex items-center justify-center", darkMode ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400")}>
                       <Minus size={10} />
                    </div>
                  )}
                  
                  <button onClick={() => deleteEntry(entry.id)} className="text-red-500 hover:text-red-400 p-1 cursor-pointer transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center items-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50 border border-gray-200/60")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 ">
                     <Scale size={10} /> {lang === 'bn' ? 'ওজন' : 'WEIGHT'}
                   </div>
                   <div className={cn("text-sm font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {unit === 'metric' ? formatNum(entry.weight) : formatNum(entry.weight * 2.20462)} <span className="text-[9px] font-bold text-gray-500">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                   </div>
                </div>
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center items-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50 border border-gray-200/60")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest ">
                     {lang === 'bn' ? 'বিএমআই' : 'BMI'}
                   </div>
                   <div className={cn("text-sm font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {formatNum(entry.bmi.toFixed(1))} <span className="text-[10px] font-bold text-gray-500">kg/m²</span>
                   </div>
                </div>
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center items-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50 border border-gray-200/60")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 ">
                     <Activity size={10} /> {lang === 'bn' ? 'শরীরের চর্বি' : 'BODY FAT'}
                   </div>
                   <div className={cn("text-sm font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {entry.bodyFat > 0 ? `${formatNum(entry.bodyFat.toFixed(1))}%` : '--'}
                   </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {showAllModal && (
        <ViewAllHistoryModal
          darkMode={darkMode}
          unit={unit}
          lang={lang}
          onClose={() => setShowAllModal(false)}
          weightHistory={history}
          stepsHistory={stepsHistory}
          onDeleteWeight={deleteWeight}
          onDeleteStep={deleteStep}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-xs p-6 rounded-3xl shadow-2xl",
              darkMode ? "bg-[#111] border border-white/10" : "bg-white"
            )}
          >
            <h3 className={cn("text-lg font-black tracking-tight mb-2 text-center", darkMode ? "text-white" : "text-gray-900")}>
              {lang === 'bn' ? 'নিশ্চিত করুন' : 'Are you sure?'}
            </h3>
            <p className={cn("text-sm text-center mb-6", darkMode ? "text-gray-400" : "text-gray-500")}>
              {lang === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this measurement? This action cannot be undone.'}
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className={cn(
                  "flex-1 py-3 rounded-2xl text-sm font-bold transition-all",
                  darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                )}
              >
                {lang === 'bn' ? 'না' : 'No'}
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/30"
              >
                {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
