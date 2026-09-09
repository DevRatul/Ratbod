/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  FileText, 
  Plus, 
  Check, 
  Calendar, 
  Trash2, 
  RotateCcw,
  Sparkles,
  AlignLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface WritingRecord {
  id: string;
  date: string;
  title: string;
  words: number;
  content?: string;
  createdAt: number;
}

interface WritingTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
}

export default function WritingTracker({ darkMode, lang = 'en' }: WritingTrackerProps) {
  const isBn = lang === 'bn';

  const formatNum = (num: number | string) => {
    if (!isBn) return String(num);
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, d => bnDigits[Number(d)]);
  };

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatHistoryDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const today = getLocalDateString(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateString(yesterdayDate);

      if (dateStr === today) return isBn ? 'আজ' : 'Today';
      if (dateStr === yesterday) return isBn ? 'গতকাল' : 'Yesterday';

      if (isBn) {
        const monthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
        return `${formatNum(d)} ${monthsBn[m - 1]}`;
      } else {
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d} ${monthsEn[m - 1]}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [manualWords, setManualWords] = useState<string>('');
  const [wordGoal, setWordGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ratbod_writing_goal');
    return saved ? parseInt(saved, 10) || 300 : 300;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [records, setRecords] = useState<WritingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_writing_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Count words from content
  const typedWordsCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const currentCount = manualWords ? (parseInt(manualWords, 10) || 0) : typedWordsCount;

  // Calculate today's words from records
  const todayStr = getLocalDateString();
  const todayTotalWords = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.words || 0), 0);

  // Load from Firestore
  useEffect(() => {
    const load = async (user = auth.currentUser) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'writingTracker'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.wordGoal) setWordGoal(data.wordGoal);
          if (Array.isArray(data.records)) setRecords(data.records);
        }
      } catch (e) {}
    };
    load();
    const unsub = onAuthStateChanged(auth, (u) => { if (u) load(u); });
    return () => unsub();
  }, []);

  const persistData = (goal: number, updatedRecords: WritingRecord[]) => {
    try {
      localStorage.setItem('ratbod_writing_goal', String(goal));
      localStorage.setItem('ratbod_writing_records', JSON.stringify(updatedRecords));

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'writingTracker'), {
          wordGoal: goal,
          records: updatedRecords,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleSaveEntry = () => {
    if (currentCount <= 0 && !content.trim()) return;

    const entryTitle = title.trim() || (isBn ? 'দৈনিক লেখা' : 'Daily Writing');
    const newRec: WritingRecord = {
      id: String(Date.now()),
      date: selectedDate || getLocalDateString(),
      title: entryTitle,
      words: currentCount || 1,
      content: content.trim() || undefined,
      createdAt: Date.now()
    };

    const updated = [newRec, ...records].slice(0, 40);
    setRecords(updated);
    persistData(wordGoal, updated);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
    setTitle('');
    setContent('');
    setManualWords('');
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    persistData(wordGoal, updated);
  };

  const percentGoal = Math.min(100, Math.round((todayTotalWords / (wordGoal || 1)) * 100));

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full pb-6">
      {/* Main Writing Dashboard Card */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-xs",
        darkMode 
          ? "bg-[#10141f] border-blue-500/25 shadow-blue-950/20 text-white" 
          : "bg-white border-blue-100 shadow-blue-500/5 text-gray-900"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-blue-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
              <PenTool size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isBn ? 'লেখার হিসাব' : 'Writing Logger'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isBn ? 'দৈনিক শব্দ সংখ্যা ও জার্নাল এন্ট্রি সংরক্ষণ' : 'Track daily word count and write notes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {isBn ? 'লক্ষ্য (শব্দ):' : 'Goal (words):'}
            </span>
            <input 
              type="number"
              value={wordGoal}
              onChange={(e) => {
                const g = parseInt(e.target.value, 10) || 50;
                setWordGoal(g);
                persistData(g, records);
              }}
              className={cn(
                "w-16 px-2 py-1 rounded-lg text-xs font-black border text-center font-mono",
                darkMode ? "bg-white/5 border-white/10 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-700"
              )}
            />
          </div>
        </div>

        {/* Progress & Today Stats */}
        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-blue-50/50 border-blue-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'আজকে লিখিত' : "Written Today"}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                {formatNum(todayTotalWords)}
              </span>
              <span className="text-xs font-bold text-gray-400">/ {formatNum(wordGoal)} {isBn ? 'শব্দ' : 'words'}</span>
            </div>
          </div>

          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-blue-50/50 border-blue-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'বর্তমান এন্ট্রি' : "Current Session"}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                {formatNum(currentCount)}
              </span>
              <span className="text-xs font-bold text-gray-400">{isBn ? 'শব্দ' : 'words'}</span>
            </div>
          </div>

          <div className={cn(
            "col-span-2 sm:col-span-1 p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-blue-50/50 border-blue-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'দৈনিক অগ্রগতি' : "Progress"}</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentGoal}%` }} />
              </div>
              <span className="text-xs font-black font-mono text-blue-500">{formatNum(percentGoal)}%</span>
            </div>
          </div>
        </div>

        {/* Text Entry & Logging Area */}
        <div className="pt-3 border-t border-gray-200/20 dark:border-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder={isBn ? 'শিরোনাম / লেখার বিষয় (যেমন: সকালের ভাবনা)' : 'Title or topic...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500",
                darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
              )}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{isBn ? 'বা শব্দ:' : 'Or words:'}</span>
              <input
                type="number"
                placeholder="250"
                value={manualWords}
                onChange={(e) => setManualWords(e.target.value)}
                className={cn(
                  "w-20 px-2 py-1.5 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                title={isBn ? 'সরাসরি শব্দের সংখ্যা দিন' : 'Direct word count'}
              />
            </div>
          </div>

          <textarea
            rows={3}
            placeholder={isBn ? 'এখানে লিখুন বা নোট করুন... স্বয়ংক্রিয়ভাবে শব্দ গোনা হবে।' : 'Write or paste your text here... Words count automatically.'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans",
              darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            )}
          />

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-1">
            {/* Quick Word Increment Buttons */}
            <div className="flex items-center gap-1.5">
              {[100, 250, 500].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    const current = parseInt(manualWords, 10) || 0;
                    setManualWords(String(current + count));
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer active:scale-95",
                    darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  +{formatNum(count)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={cn(
                  "px-2 py-1.5 rounded-xl text-xs font-bold border text-center font-mono",
                  darkMode ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]" : "bg-white text-gray-900 border-gray-300"
                )}
              />

              <button
                type="button"
                onClick={handleSaveEntry}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 text-white",
                  savedToast ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {savedToast ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
                <span>{savedToast ? (isBn ? 'সংরক্ষিত!' : 'Saved!') : (isBn ? 'এন্ট্রি সংরক্ষণ করুন' : 'Log Entry')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Writing Sessions History */}
      <div className={cn(
        "p-4 rounded-2xl border space-y-3",
        darkMode ? "bg-[#10141f] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" />
            <span>{isBn ? 'সাম্প্রতিক লেখার ইতিহাস' : 'Recent Writing Logs'}</span>
          </h3>
          {records.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {isBn ? `মোট ${formatNum(records.length)}টি এন্ট্রি` : `${records.length} entries`}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className={cn(
            "p-6 rounded-xl border text-center space-y-1",
            darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
          )}>
            <p className="text-xs font-medium">
              {isBn ? 'এখনো কোনো লেখার এন্ট্রি নেই।' : 'No writing entries logged yet.'}
            </p>
            <p className="text-[11px] opacity-75">
              {isBn ? 'উপরে শিরোনাম বা লেখা লিখে "এন্ট্রি সংরক্ষণ করুন" চাপুন।' : 'Write your notes or word count above to save your entry.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 6).map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-2 shadow-2xs",
                  darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                      {rec.title}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatHistoryDate(rec.date)} {rec.content ? `• "${rec.content.slice(0, 35)}..."` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-500/20 bg-blue-500/10">
                    {formatNum(rec.words)} {isBn ? 'শব্দ' : 'words'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(rec.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
