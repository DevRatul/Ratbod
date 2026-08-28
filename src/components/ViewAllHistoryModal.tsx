import React, { useState } from 'react';
import { ArrowLeft, Scale, Footprints, Trash2, Calendar, Check, Layers } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'all' | 'weight' | 'steps'>('all');

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

  const showWeights = activeTab === 'all' || activeTab === 'weight';
  const showSteps = activeTab === 'all' || activeTab === 'steps';

  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col md:p-6 overflow-hidden", darkMode ? "bg-[#050505]" : "bg-gray-100")}>
      <div className={cn(
        "flex-1 w-full max-w-6xl mx-auto flex flex-col overflow-hidden relative",
        darkMode ? "bg-[#0A0A0A] md:rounded-3xl md:border border-white/5" : "bg-white md:rounded-3xl md:shadow-2xl md:border border-black/5"
      )}>
        {/* Header with Back Button */}
        <div className={cn(
          "flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b z-10 sticky top-0",
          darkMode ? "border-white/10 bg-[#0A0A0A]/95 backdrop-blur" : "border-gray-200 bg-white/95 backdrop-blur"
        )}>
          {/* Back Button */}
          <button 
            onClick={onClose}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shrink-0 select-none",
              darkMode 
                ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
            )}
            aria-label="Go Back"
          >
            <ArrowLeft size={16} className="shrink-0" />
            <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </button>

          {/* Title */}
          <h2 className="text-base sm:text-xl font-black tracking-tight text-center truncate px-2">
            {lang === 'bn' ? 'সকল ইতিহাস' : 'All History'}
          </h2>

          {/* Total Count Badge */}
          <div className="shrink-0">
            <span className={cn(
              "text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
              darkMode ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            )}>
              {lang === 'bn' ? `${formatNum(weightHistory.length + stepsHistory.length)}টি রেকর্ড` : `${weightHistory.length + stepsHistory.length} Total`}
            </span>
          </div>
        </div>

        {/* Category Tabs for Mobile / Filter */}
        <div className={cn(
          "px-3.5 py-2.5 sm:px-6 border-b flex items-center gap-2 overflow-x-auto select-none",
          darkMode ? "bg-[#0d0d0d] border-white/5" : "bg-gray-50 border-gray-100"
        )}>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'all'
                ? (darkMode ? "bg-white text-black" : "bg-gray-900 text-white")
                : (darkMode ? "bg-white/5 text-gray-400 hover:text-white" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200")
            )}
          >
            <Layers size={13} />
            <span>{lang === 'bn' ? 'সব' : 'All'} ({formatNum(weightHistory.length + stepsHistory.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('weight')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'weight'
                ? "bg-primary text-white shadow-xs shadow-primary/30"
                : (darkMode ? "bg-white/5 text-gray-400 hover:text-white" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200")
            )}
          >
            <Scale size={13} />
            <span>{lang === 'bn' ? 'ওজন' : 'Weights'} ({formatNum(weightHistory.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('steps')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'steps'
                ? "bg-blue-600 text-white shadow-xs shadow-blue-600/30"
                : (darkMode ? "bg-white/5 text-gray-400 hover:text-white" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200")
            )}
          >
            <Footprints size={13} />
            <span>{lang === 'bn' ? 'পদক্ষেপ' : 'Steps'} ({formatNum(stepsHistory.length)})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-6">
          <div className={cn(
            "grid gap-4 sm:gap-6 md:gap-8",
            activeTab === 'all' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"
          )}>
            
            {/* Weight History Section */}
            {showWeights && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight">{lang === 'bn' ? 'ওজন রেকর্ড' : 'Weight Records'}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">{lang === 'bn' ? `${formatNum(weightHistory.length)}টি ভুক্তি সংরক্ষিত` : `${weightHistory.length} measurements saved`}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {weightHistory.length === 0 ? (
                    <div className={cn("text-center py-10 px-4 rounded-2xl border text-xs text-gray-500 font-medium", darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200")}>
                      {lang === 'bn' ? 'কোনো ওজনের তথ্য পাওয়া যায়নি' : 'No weight records available'}
                    </div>
                  ) : (
                    weightHistory.map((entry) => {
                      const displayWeight = unit === 'metric' ? entry.weight : entry.weight * 2.20462;
                      const dateObj = new Date(entry.date);
                      const formattedDate = dateObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                      const formattedTime = dateObj.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : undefined, { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div 
                          key={entry.id} 
                          className={cn(
                            "p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all gap-3 shadow-2xs", 
                            darkMode ? "bg-[#111111] border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("p-2 rounded-xl shrink-0 flex items-center justify-center", darkMode ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary")}>
                              <Scale size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-lg sm:text-xl font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                                  {formatNum(displayWeight)}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                  {unit === 'metric' ? (lang === 'bn' ? 'কেজি' : 'kg') : (lang === 'bn' ? 'পাউন্ড' : 'lb')}
                                </span>
                                {entry.bmi > 0 && (
                                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1", darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600")}>
                                    BMI {formatNum(entry.bmi.toFixed(1))}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                                <span>{formatNum(formattedDate)}</span>
                                <span>•</span>
                                <span>{formatNum(formattedTime)}</span>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setDeleteConfirm({ type: 'weight', id: entry.id })}
                            className={cn(
                              "p-2 rounded-xl transition-all cursor-pointer shrink-0 active:scale-90", 
                              darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Steps History Section */}
            {showSteps && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                      <Footprints className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight">{lang === 'bn' ? 'পদক্ষেপ রেকর্ড' : 'Step Records'}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">{lang === 'bn' ? `${formatNum(stepsHistory.length)}টি ভুক্তি সংরক্ষিত` : `${stepsHistory.length} logs saved`}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {stepsHistory.length === 0 ? (
                    <div className={cn("text-center py-10 px-4 rounded-2xl border text-xs text-gray-500 font-medium", darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200")}>
                      {lang === 'bn' ? 'কোনো পদক্ষেপের তথ্য পাওয়া যায়নি' : 'No step records available'}
                    </div>
                  ) : (
                    stepsHistory.map((entry) => {
                      const dateObj = new Date(entry.date);
                      const formattedDate = dateObj.toLocaleDateString(lang === 'bn' ? 'bn-BD' : undefined, { year: 'numeric', month: 'short', day: 'numeric' });

                      return (
                        <div 
                          key={entry.id} 
                          className={cn(
                            "p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all gap-3 shadow-2xs", 
                            darkMode ? "bg-[#111111] border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0 flex items-center justify-center">
                              <Footprints size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-lg sm:text-xl font-black text-blue-500 tracking-tight">
                                  {formatNum(entry.steps)}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                  {lang === 'bn' ? 'পদক্ষেপ' : 'steps'}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                {formatNum(formattedDate)}
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setDeleteConfirm({ type: 'steps', id: entry.id })}
                            className={cn(
                              "p-2 rounded-xl transition-all cursor-pointer shrink-0 active:scale-90", 
                              darkMode ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            )}
                            title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-xs p-6 rounded-3xl shadow-2xl border",
              darkMode ? "bg-[#111] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
            )}
          >
            <h3 className="text-lg font-black tracking-tight mb-2 text-center">
              {lang === 'bn' ? 'নিশ্চিত করুন' : 'Are you sure?'}
            </h3>
            <p className={cn("text-xs text-center mb-6", darkMode ? "text-gray-400" : "text-gray-500")}>
              {lang === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।' : 'Are you sure you want to delete this measurement? This action cannot be undone.'}
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={cn(
                  "flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                  darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                )}
              >
                {lang === 'bn' ? 'না' : 'Cancel'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'weight') {
                    onDeleteWeight(deleteConfirm.id);
                  } else {
                    onDeleteStep(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/30 cursor-pointer"
              >
                {lang === 'bn' ? 'হ্যাঁ, মুছুন' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
