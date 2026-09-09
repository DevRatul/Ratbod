/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Bookmark, 
  Plus, 
  Check, 
  Calendar, 
  Trash2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ReadingRecord {
  id: string;
  date: string;
  bookTitle: string;
  pages: number;
  minutes: number;
  note?: string;
  createdAt: number;
}

interface ReadingTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
}

export default function ReadingTracker({ darkMode, lang = 'en' }: ReadingTrackerProps) {
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

  const [bookTitle, setBookTitle] = useState<string>('');
  const [pagesInput, setPagesInput] = useState<string>('10');
  const [minutesInput, setMinutesInput] = useState<string>('20');
  const [noteInput, setNoteInput] = useState<string>('');
  const [pageGoal, setPageGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ratbod_reading_goal');
    return saved ? parseInt(saved, 10) || 20 : 20;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [records, setRecords] = useState<ReadingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_reading_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Calculate today's pages from records
  const todayStr = getLocalDateString();
  const todayPages = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.pages || 0), 0);
  const todayMinutes = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.minutes || 0), 0);

  // Load from Firestore
  useEffect(() => {
    const load = async (user = auth.currentUser) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.pageGoal) setPageGoal(data.pageGoal);
          if (Array.isArray(data.records)) setRecords(data.records);
        }
      } catch (e) {}
    };
    load();
    const unsub = onAuthStateChanged(auth, (u) => { if (u) load(u); });
    return () => unsub();
  }, []);

  const persistData = (goal: number, updatedRecords: ReadingRecord[]) => {
    try {
      localStorage.setItem('ratbod_reading_goal', String(goal));
      localStorage.setItem('ratbod_reading_records', JSON.stringify(updatedRecords));

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'), {
          pageGoal: goal,
          records: updatedRecords,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleLogSession = () => {
    const p = parseInt(pagesInput, 10) || 0;
    const m = parseInt(minutesInput, 10) || 0;
    if (p <= 0 && m <= 0) return;

    const title = bookTitle.trim() || (isBn ? 'দৈনিক বই পড়া' : 'Daily Reading');
    const newRec: ReadingRecord = {
      id: String(Date.now()),
      date: selectedDate || getLocalDateString(),
      bookTitle: title,
      pages: p,
      minutes: m,
      note: noteInput.trim() || undefined,
      createdAt: Date.now()
    };

    const updated = [newRec, ...records].slice(0, 40);
    setRecords(updated);
    persistData(pageGoal, updated);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
    setNoteInput('');
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    persistData(pageGoal, updated);
  };

  const percentGoal = Math.min(100, Math.round((todayPages / (pageGoal || 1)) * 100));

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full pb-6">
      {/* Main Reading Dashboard Card */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-xs",
        darkMode 
          ? "bg-[#18111f] border-purple-500/25 shadow-purple-950/20 text-white" 
          : "bg-white border-purple-100 shadow-purple-500/5 text-gray-900"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-purple-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isBn ? 'পড়ার হিসাব' : 'Reading Logger'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isBn ? 'দৈনিক বই বা প্রবন্ধ পাঠের লগ ও সারাংশ' : 'Track book pages, reading time and thoughts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {isBn ? 'পৃষ্ঠার লক্ষ্য:' : 'Goal (pg):'}
            </span>
            <input 
              type="number"
              value={pageGoal}
              onChange={(e) => {
                const g = parseInt(e.target.value, 10) || 5;
                setPageGoal(g);
                persistData(g, records);
              }}
              className={cn(
                "w-16 px-2 py-1 rounded-lg text-xs font-black border text-center font-mono",
                darkMode ? "bg-white/5 border-white/10 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700"
              )}
            />
          </div>
        </div>

        {/* Progress & Today Stats */}
        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-purple-50/50 border-purple-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'আজকে পঠিত' : "Read Today"}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                {formatNum(todayPages)}
              </span>
              <span className="text-xs font-bold text-gray-400">/ {formatNum(pageGoal)} {isBn ? 'পৃষ্ঠা' : 'pg'}</span>
            </div>
          </div>

          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-purple-50/50 border-purple-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'আজকের সময়' : "Time Spent"}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                {formatNum(todayMinutes)}
              </span>
              <span className="text-xs font-bold text-gray-400">{isBn ? 'মিনিট' : 'min'}</span>
            </div>
          </div>

          <div className={cn(
            "col-span-2 sm:col-span-1 p-3 rounded-xl border flex flex-col justify-center",
            darkMode ? "bg-white/5 border-white/5" : "bg-purple-50/50 border-purple-100"
          )}>
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'দৈনিক অগ্রগতি' : "Progress"}</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percentGoal}%` }} />
              </div>
              <span className="text-xs font-black font-mono text-purple-500">{formatNum(percentGoal)}%</span>
            </div>
          </div>
        </div>

        {/* Input Form for New Log */}
        <div className="pt-3 border-t border-gray-200/20 dark:border-white/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder={isBn ? 'বই বা লেখার নাম (যেমন: পরমাণু অভ্যাস)' : 'Book or article title...'}
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-purple-500",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1">
                <span className="text-[11px] font-bold text-gray-400 shrink-0">{isBn ? 'পৃষ্ঠা:' : 'Pg:'}</span>
                <input
                  type="number"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>

              <div className="flex-1 flex items-center gap-1">
                <span className="text-[11px] font-bold text-gray-400 shrink-0">{isBn ? 'মিনিট:' : 'Min:'}</span>
                <input
                  type="number"
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <input
              type="text"
              placeholder={isBn ? 'সংক্ষিপ্ত ভাবনা বা উদ্ধৃতি (ঐচ্ছিক)...' : 'Brief insight or quote (optional)...'}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-purple-500",
                darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
              )}
            />

            <div className="flex items-center gap-2 shrink-0">
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
                onClick={handleLogSession}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 text-white",
                  savedToast ? "bg-emerald-600" : "bg-purple-600 hover:bg-purple-700"
                )}
              >
                {savedToast ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
                <span>{savedToast ? (isBn ? 'সংরক্ষিত!' : 'Saved!') : (isBn ? 'লগ যুক্ত করুন' : 'Log Reading')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reading Sessions History */}
      <div className={cn(
        "p-4 rounded-2xl border space-y-3",
        darkMode ? "bg-[#18111f] border-white/5" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={14} className="text-purple-500" />
            <span>{isBn ? 'পড়ার সাম্প্রতিক ইতিহাস' : 'Recent Reading Sessions'}</span>
          </h3>
          {records.length > 0 && (
            <span className="text-[11px] text-gray-400">
              {isBn ? `মোট ${formatNum(records.length)}টি সেশন` : `${records.length} sessions`}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className={cn(
            "p-6 rounded-xl border text-center space-y-1",
            darkMode ? "bg-white/5 border-white/5 text-gray-400" : "bg-gray-50 border-gray-100 text-gray-500"
          )}>
            <p className="text-xs font-medium">
              {isBn ? 'এখনো কোনো পড়ার রেকর্ড নেই।' : 'No reading sessions logged yet.'}
            </p>
            <p className="text-[11px] opacity-75">
              {isBn ? 'উপরে বইয়ের নাম ও পৃষ্ঠা দিয়ে "লগ যুক্ত করুন" বাটনে চাপ দিন।' : 'Enter your book and pages above to save your reading session.'}
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
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 text-xs">
                    <BookOpen size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                      {rec.bookTitle}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatHistoryDate(rec.date)} {rec.note ? `• "${rec.note.slice(0, 35)}..."` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg border border-purple-500/20 bg-purple-500/10">
                    {formatNum(rec.pages)} {isBn ? 'পৃ' : 'pg'} • {formatNum(rec.minutes)}m
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
