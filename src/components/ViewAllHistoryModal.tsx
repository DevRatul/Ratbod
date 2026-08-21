import React, { useState } from 'react';
import { X, Scale, Footprints, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

interface ViewAllHistoryModalProps {
  darkMode: boolean;
  unit: 'metric' | 'imperial';
  lang?: string;
  onClose: () => void;
  weightHistory: MetricEntry[];
  stepsHistory: StepEntry[];
  onDeleteWeight: (id: string | number) => void;
  onDeleteStep: (id: string | number) => void;
}

export default function ViewAllHistoryModal({ darkMode, unit, lang = 'en', onClose, weightHistory, stepsHistory, onDeleteWeight, onDeleteStep }: ViewAllHistoryModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'weight' | 'steps', id: string | number } | null>(null);

  const formatNum = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '';
    const str = typeof num === 'number' ? num.toFixed(1) : num.toString();
    let finalStr = str;
    if (finalStr.endsWith('.0')) {
      finalStr = finalStr.substring(0, finalStr.length - 2);
    }
    if (lang !== 'bn') return finalStr;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return finalStr.replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit)]);
  };

  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col md:p-6 overflow-hidden", darkMode ? "bg-[#050505]" : "bg-gray-100")}>
      <div className={cn(
        "flex-1 w-full max-w-6xl mx-auto flex flex-col overflow-hidden relative",
        darkMode ? "bg-[#0A0A0A] md:rounded-3xl md:border border-white/5" : "bg-white md:rounded-3xl md:shadow-2xl md:border border-black/5"
      )}>
        {/* Header */}
        <div className={cn("flex items-center justify-between p-4 sm:p-6 border-b z-10 sticky top-0", darkMode ? "border-white/10 bg-[#0A0A0A]/90 backdrop-blur" : "border-gray-200 bg-white/90 backdrop-blur")}>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{lang === 'bn' ? 'সকল ইতিহাস' : 'All History'}</h2>
          <button 
            onClick={onClose}
            className={cn("p-2 rounded-full transition-colors cursor-pointer", darkMode ? "hover:bg-white/10" : "hover:bg-black/5")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Columns */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
          <div className="grid grid-cols-2 gap-3 md:gap-12">
            
            {/* Weight History Column */}
            <div className="space-y-3 sm:space-y-6">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold">{lang === 'bn' ? 'ওজন' : 'Weights'}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? `${formatNum(weightHistory.length)}টি ভুক্তি` : `${weightHistory.length} entries`}</p>
                </div>
              </div>

              <div className="space-y-3">
                {weightHistory.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">{lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data available'}</div>
                ) : weightHistory.map((entry) => {
                  const displayWeight = unit === 'metric' ? entry.weight : entry.weight * 2.20462;
                  return (
                    <div key={entry.id} className={cn("px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border flex items-center justify-between transition-colors", darkMode ? "bg-[#111111] border-white/10 hover:bg-white/5" : "bg-white border-black/5 hover:bg-gray-50 shadow-xs")}>
                      <div className="flex flex-col">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                           {formatNum(new Date(entry.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, { year: 'numeric', month: 'short', day: 'numeric' }))}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={cn("text-base sm:text-xl font-black", darkMode ? "text-white" : "text-gray-900")}>
                            {formatNum(displayWeight.toFixed(1))}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">{unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDeleteConfirm({ type: 'weight', id: entry.id })}
                        className={cn("p-1.5 sm:p-2 rounded-full transition-colors", darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Steps History Column */}
            <div className="space-y-3 sm:space-y-6">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold">{lang === 'bn' ? 'পদক্ষেপ' : 'Steps'}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{lang === 'bn' ? `${formatNum(stepsHistory.length)}টি ভুক্তি` : `${stepsHistory.length} entries`}</p>
                </div>
              </div>

              <div className="space-y-3">
                {stepsHistory.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">{lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data available'}</div>
                ) : stepsHistory.map((entry) => (
                  <div key={entry.id} className={cn("px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border flex items-center justify-between transition-colors", darkMode ? "bg-[#111111] border-white/10 hover:bg-white/5" : "bg-white border-black/5 hover:bg-gray-50 shadow-xs")}>
                    <div className="flex flex-col">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                         {formatNum(new Date(entry.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, { year: 'numeric', month: 'short', day: 'numeric' }))}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={cn("text-base sm:text-xl font-black text-blue-500")}>
                          {formatNum(entry.steps)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">{lang === 'bn' ? 'পদক্ষেপ' : 'steps'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setDeleteConfirm({ type: 'steps', id: entry.id })}
                      className={cn("p-1.5 sm:p-2 rounded-full transition-colors", darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50")}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                onClick={() => setDeleteConfirm(null)}
                className={cn(
                  "flex-1 py-3 rounded-2xl text-sm font-bold transition-colors",
                  darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                )}
              >
                {lang === 'bn' ? 'না' : 'No'}
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm.type === 'weight') {
                    onDeleteWeight(deleteConfirm.id);
                  } else {
                    onDeleteStep(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
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
