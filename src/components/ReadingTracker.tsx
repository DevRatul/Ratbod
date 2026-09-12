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
  Sparkles,
  Library,
  ChevronRight,
  Layers,
  ArrowRight,
  X,
  Edit3,
  Quote,
  Target,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BookItem {
  id: string;
  title: string;
  totalPages: number;
  currentPage: number;
  author?: string;
  createdAt: number;
  status?: 'reading' | 'completed';
}

export interface ReadingRecord {
  id: string;
  date: string;
  bookTitle: string;
  bookId?: string;
  fromPage?: number;
  toPage?: number;
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

  // State: Saved Books Library
  const [books, setBooks] = useState<BookItem[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_user_books');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'book_sample_1',
        title: 'Atomic Habits',
        author: 'James Clear',
        totalPages: 320,
        currentPage: 45,
        status: 'reading',
        createdAt: Date.now() - 86400000 * 7
      }
    ];
  });

  // State: Library modal/drawer
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isAddBookMode, setIsAddBookMode] = useState<boolean>(false);
  const [newBookTitle, setNewBookTitle] = useState<string>('');
  const [newBookTotalPages, setNewBookTotalPages] = useState<string>('250');
  const [newBookAuthor, setNewBookAuthor] = useState<string>('');
  const [newBookCurrentPage, setNewBookCurrentPage] = useState<string>('0');

  // State: Goal popover / inline edit
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [pageGoal, setPageGoal] = useState<number>(() => {
    const saved = localStorage.getItem('ratbod_reading_goal');
    return saved ? parseInt(saved, 10) || 20 : 20;
  });

  // State: Active Book selection
  const [selectedBookId, setSelectedBookId] = useState<string>('book_sample_1');
  const [customBookTitle, setCustomBookTitle] = useState<string>('');

  // State: Logging form
  const [usePageRange, setUsePageRange] = useState<boolean>(true);
  const [fromPageInput, setFromPageInput] = useState<string>('46');
  const [toPageInput, setToPageInput] = useState<string>('65');
  const [directPagesInput, setDirectPagesInput] = useState<string>('20');
  const [minutesInput, setMinutesInput] = useState<string>('25');
  const [showNoteField, setShowNoteField] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [savedToast, setSavedToast] = useState<boolean>(false);

  // State: Records
  const [records, setRecords] = useState<ReadingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_reading_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Calculate today's pages & minutes from records
  const todayStr = getLocalDateString();
  const todayPages = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.pages || 0), 0);
  const todayMinutes = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.minutes || 0), 0);

  // Active Book object
  const activeBook = books.find(b => b.id === selectedBookId) || (books.length > 0 ? books[0] : null);

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
          if (Array.isArray(data.books)) setBooks(data.books);
        }
      } catch (e) {}
    };
    load();
    const unsub = onAuthStateChanged(auth, (u) => { if (u) load(u); });
    return () => unsub();
  }, []);

  const persistData = (goal: number, updatedRecords: ReadingRecord[], updatedBooks: BookItem[]) => {
    try {
      localStorage.setItem('ratbod_reading_goal', String(goal));
      localStorage.setItem('ratbod_reading_records', JSON.stringify(updatedRecords));
      localStorage.setItem('ratbod_user_books', JSON.stringify(updatedBooks));

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'), {
          pageGoal: goal,
          records: updatedRecords,
          books: updatedBooks,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {}
  };

  // Switch active book and update starting page
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    if (bookId === 'custom') return;
    const found = books.find(b => b.id === bookId);
    if (found) {
      const nextStart = (found.currentPage || 0) + 1;
      setFromPageInput(String(nextStart));
      const suggestedEnd = Math.min(found.totalPages, nextStart + 19);
      setToPageInput(String(suggestedEnd));
    }
  };

  // Add new book
  const handleAddNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBookTitle.trim();
    const totalP = parseInt(newBookTotalPages, 10) || 0;
    if (!title || totalP <= 0) return;

    const startP = Math.min(totalP, Math.max(0, parseInt(newBookCurrentPage, 10) || 0));
    const newBook: BookItem = {
      id: `book_${Date.now()}`,
      title,
      totalPages: totalP,
      currentPage: startP,
      author: newBookAuthor.trim() || undefined,
      status: startP >= totalP ? 'completed' : 'reading',
      createdAt: Date.now()
    };

    const updatedBooks = [newBook, ...books];
    setBooks(updatedBooks);
    persistData(pageGoal, records, updatedBooks);

    setSelectedBookId(newBook.id);
    const nextStart = startP > 0 ? startP + 1 : 1;
    setFromPageInput(String(nextStart));
    setToPageInput(String(Math.min(totalP, nextStart + 19)));

    // Reset & close add view
    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookTotalPages('250');
    setNewBookCurrentPage('0');
    setIsAddBookMode(false);
  };

  const handleDeleteBook = (bookId: string) => {
    const updatedBooks = books.filter(b => b.id !== bookId);
    setBooks(updatedBooks);
    persistData(pageGoal, records, updatedBooks);
    if (selectedBookId === bookId) {
      if (updatedBooks.length > 0) {
        handleSelectBook(updatedBooks[0].id);
      } else {
        setSelectedBookId('custom');
      }
    }
  };

  // Page calculations
  const fromP = parseInt(fromPageInput, 10) || 0;
  const toP = parseInt(toPageInput, 10) || 0;
  const rangePagesRead = (toP >= fromP && fromP > 0) ? (toP - fromP + 1) : 0;
  const activePagesToday = usePageRange ? rangePagesRead : (parseInt(directPagesInput, 10) || 0);

  // Quick preset chips (+5, +10, +15, +20 pages)
  const applyQuickPages = (delta: number) => {
    if (usePageRange) {
      const baseFrom = fromP > 0 ? fromP : (activeBook?.currentPage ? activeBook.currentPage + 1 : 1);
      const maxP = activeBook ? activeBook.totalPages : 9999;
      const targetTo = Math.min(maxP, baseFrom + delta - 1);
      setFromPageInput(String(baseFrom));
      setToPageInput(String(targetTo));
    } else {
      const current = parseInt(directPagesInput, 10) || 0;
      setDirectPagesInput(String(current + delta));
    }
  };

  // Session logger submit
  const handleLogSession = () => {
    const m = parseInt(minutesInput, 10) || 0;
    let p = 0;
    let fromNum: number | undefined = undefined;
    let toNum: number | undefined = undefined;

    if (usePageRange) {
      if (fromP <= 0 || toP < fromP) return;
      p = toP - fromP + 1;
      fromNum = fromP;
      toNum = toP;
    } else {
      p = parseInt(directPagesInput, 10) || 0;
      if (p <= 0 && m <= 0) return;
    }

    let title = '';
    if (selectedBookId === 'custom') {
      title = customBookTitle.trim() || (isBn ? 'দৈনিক বই পড়া' : 'Daily Reading');
    } else if (activeBook) {
      title = activeBook.title;
    } else {
      title = isBn ? 'দৈনিক বই পড়া' : 'Daily Reading';
    }

    const newRec: ReadingRecord = {
      id: String(Date.now()),
      date: selectedDate || getLocalDateString(),
      bookTitle: title,
      bookId: selectedBookId !== 'custom' ? selectedBookId : undefined,
      fromPage: fromNum,
      toPage: toNum,
      pages: p,
      minutes: m,
      note: noteInput.trim() || undefined,
      createdAt: Date.now()
    };

    let updatedBooks = [...books];
    if (activeBook && selectedBookId !== 'custom') {
      updatedBooks = books.map(b => {
        if (b.id === activeBook.id) {
          const newCurrent = toNum ? Math.max(b.currentPage, toNum) : Math.min(b.totalPages, b.currentPage + p);
          return {
            ...b,
            currentPage: newCurrent,
            status: newCurrent >= b.totalPages ? 'completed' : 'reading'
          };
        }
        return b;
      });
      setBooks(updatedBooks);
    }

    const updatedRecords = [newRec, ...records].slice(0, 50);
    setRecords(updatedRecords);
    persistData(pageGoal, updatedRecords, updatedBooks);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
    setNoteInput('');
    setShowNoteField(false);

    // Auto-advance starting page for the next session
    if (usePageRange && toNum && activeBook) {
      const nextFrom = toNum + 1;
      setFromPageInput(String(nextFrom));
      setToPageInput(String(Math.min(activeBook.totalPages, nextFrom + 19)));
    }
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    persistData(pageGoal, updated, books);
  };

  const percentGoal = Math.min(100, Math.round((todayPages / (pageGoal || 1)) * 100));
  const activeBookPercent = activeBook ? Math.min(100, Math.round((activeBook.currentPage / (activeBook.totalPages || 1)) * 100)) : 0;

  return (
    <div className="max-w-xl mx-auto w-full space-y-3 pb-4">
      {/* ========================================================================= */}
      {/* 1. TOP MINIMAL PULSE: TODAY'S READING PROGRESS                            */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-4 rounded-2xl border transition-all",
        darkMode 
          ? "bg-[#121217] border-white/10 text-white shadow-xs" 
          : "bg-white border-slate-200/80 text-gray-900 shadow-xs"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              {formatNum(todayPages)}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              / {formatNum(pageGoal)} {isBn ? 'পৃষ্ঠা আজ' : 'pages today'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Minutes pill */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono",
              darkMode ? "bg-white/5 text-gray-300 border border-white/10" : "bg-slate-100 text-slate-700 border border-slate-200/70"
            )}>
              <Clock size={12} className="text-amber-500" />
              <span>{formatNum(todayMinutes)}m</span>
            </span>

            {/* Goal pill with quick adjustment */}
            {isEditingGoal ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={pageGoal}
                  onChange={(e) => {
                    const g = parseInt(e.target.value, 10) || 5;
                    setPageGoal(g);
                    persistData(g, records, books);
                  }}
                  onBlur={() => setIsEditingGoal(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingGoal(false); }}
                  className={cn(
                    "w-12 px-1.5 py-0.5 rounded-lg text-xs font-mono font-bold text-center border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    darkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border-slate-300 text-gray-900"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Check size={13} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingGoal(true)}
                title={isBn ? 'দৈনিক লক্ষ্য পরিবর্তন করুন' : 'Click to adjust daily goal'}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold font-mono transition-all cursor-pointer",
                  darkMode 
                    ? "bg-white/5 text-indigo-300 border border-white/10 hover:bg-white/10" 
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200/60 hover:bg-indigo-100"
                )}
              >
                <Target size={11} className="text-indigo-500" />
                <span>{formatNum(pageGoal)}p</span>
                <Edit3 size={10} className="opacity-60 ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimal linear progress line */}
        <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <motion.div 
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${percentGoal}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CURRENTLY READING BOOK SPOTLIGHT (Minimal & Focused)                    */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col gap-2.5",
        darkMode 
          ? "bg-[#121217] border-white/10 text-white" 
          : "bg-white border-slate-200/80 text-gray-900"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40">
              <BookOpen size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {isBn ? 'পড়ছেন' : 'Currently Reading'}
                </span>
              </div>
              <h3 className="font-bold text-xs sm:text-sm truncate leading-tight">
                {selectedBookId === 'custom' ? (customBookTitle || (isBn ? 'কাস্টম বই' : 'Custom Book')) : (activeBook?.title || 'Atomic Habits')}
              </h3>
            </div>
          </div>

          {/* Switch book / Library button */}
          <button
            id="open_reading_library_btn"
            type="button"
            onClick={() => {
              setIsLibraryOpen(true);
              setIsAddBookMode(false);
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border",
              darkMode 
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10" 
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            )}
          >
            <Library size={12} className="text-indigo-500" />
            <span>{isBn ? 'বই বদলান' : 'Switch'}</span>
            <span className="text-[10px] opacity-60 font-mono">({formatNum(books.length)})</span>
          </button>
        </div>

        {/* Current Book Progress */}
        {activeBook && selectedBookId !== 'custom' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400">
              <span>{formatNum(activeBook.currentPage)} / {formatNum(activeBook.totalPages)} {isBn ? 'পৃষ্ঠা' : 'pages'}</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatNum(activeBookPercent)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <div 
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${activeBookPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. LOG SESSION CARD (Clean, Instant, Single-Flow UX)                       */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-4 rounded-2xl border transition-all space-y-3",
        darkMode 
          ? "bg-[#121217] border-white/10 text-white" 
          : "bg-white border-slate-200/80 text-gray-900"
      )}>
        {/* Sub-header: Mode selector (Page Range vs Direct) */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <Bookmark size={13} className="text-indigo-500" />
            <span>{isBn ? 'পড়ার সেশন লগ করুন' : 'Log Reading Session'}</span>
          </span>

          {/* Clean Segmented Pill */}
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/5 text-[11px]">
            <button
              type="button"
              onClick={() => setUsePageRange(true)}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                usePageRange 
                  ? (darkMode ? "bg-white/20 text-white font-bold shadow-2xs" : "bg-white text-gray-900 font-bold shadow-2xs") 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800"
              )}
            >
              {isBn ? 'পৃষ্ঠা হতে পৃষ্ঠা' : 'From → To'}
            </button>
            <button
              type="button"
              onClick={() => setUsePageRange(false)}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                !usePageRange 
                  ? (darkMode ? "bg-white/20 text-white font-bold shadow-2xs" : "bg-white text-gray-900 font-bold shadow-2xs") 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800"
              )}
            >
              {isBn ? 'মোট পৃষ্ঠা' : 'Pages'}
            </button>
          </div>
        </div>

        {/* Inputs */}
        {usePageRange ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                  {isBn ? 'শুরু পৃষ্ঠা' : 'From page'}
                </label>
                <input
                  id="reading_from_page"
                  type="number"
                  min="1"
                  value={fromPageInput}
                  onChange={(e) => setFromPageInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                  )}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                  {isBn ? 'শেষ পৃষ্ঠা' : 'To page'}
                </label>
                <input
                  id="reading_to_page"
                  type="number"
                  min="1"
                  value={toPageInput}
                  onChange={(e) => setToPageInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                  )}
                />
              </div>
            </div>

            {/* Quick page increment pills */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-gray-400 font-medium mr-0.5">{isBn ? 'যোগ:' : 'Add:'}</span>
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => applyQuickPages(num)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer border",
                    darkMode 
                      ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" 
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  +{formatNum(num)}
                </button>
              ))}
              <div className="ml-auto text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatNum(rangePagesRead)} {isBn ? 'পৃ' : 'pg'}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                {isBn ? 'আজ কত পৃষ্ঠা পড়েছেন:' : 'Pages read today:'}
              </label>
              <input
                id="reading_direct_pages"
                type="number"
                min="1"
                value={directPagesInput}
                onChange={(e) => setDirectPagesInput(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                )}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-medium mr-0.5">{isBn ? 'যোগ:' : 'Add:'}</span>
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => applyQuickPages(num)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer border",
                    darkMode 
                      ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" 
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  +{formatNum(num)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time spent & Date Row */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 block mb-1 flex items-center gap-1">
              <Clock size={11} className="text-amber-500" />
              <span>{isBn ? 'পড়ার সময় (মিনিট)' : 'Time (minutes)'}</span>
            </label>
            <input
              id="reading_duration_input"
              type="number"
              min="1"
              value={minutesInput}
              onChange={(e) => setMinutesInput(e.target.value)}
              className={cn(
                "w-full px-3 py-1.5 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
              )}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 block mb-1 flex items-center gap-1">
              <Calendar size={11} className="text-gray-400" />
              <span>{isBn ? 'তারিখ' : 'Date'}</span>
            </label>
            <input
              id="reading_date_picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cn(
                "w-full px-2 py-1.5 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                darkMode ? "bg-white/5 border-white/10 text-white [color-scheme:dark]" : "bg-slate-50 border-slate-200 text-gray-900"
              )}
            />
          </div>
        </div>

        {/* Optional Note Field Toggle */}
        <div>
          {showNoteField ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                  <Quote size={10} />
                  <span>{isBn ? 'সংক্ষিপ্ত নোট বা উদ্ধৃতি' : 'Note or quote'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteField(false);
                    setNoteInput('');
                  }}
                  className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
              <input
                id="reading_note_input"
                type="text"
                placeholder={isBn ? 'আজকের অধ্যায়ের মূল কথা...' : 'Key takeaways or favorite quote...'}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                )}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNoteField(true)}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
            >
              <Plus size={12} />
              <span>{isBn ? '+ নোট বা উদ্ধৃতি যোগ করুন' : '+ Add a note or quote'}</span>
            </button>
          )}
        </div>

        {/* Primary Log Action Button */}
        <button
          id="submit_reading_log_button"
          type="button"
          onClick={handleLogSession}
          disabled={usePageRange && (fromP <= 0 || toP < fromP)}
          className={cn(
            "w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] text-white",
            savedToast 
              ? "bg-emerald-600 shadow-emerald-500/25" 
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {savedToast ? (
            <>
              <Check size={14} strokeWidth={3} />
              <span>{isBn ? 'সংরক্ষিত হয়েছে!' : 'Logged Successfully!'}</span>
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              <span>
                {isBn 
                  ? `পড়া লগ করুন (${formatNum(activePagesToday)} পৃষ্ঠা)` 
                  : `Log Reading (${activePagesToday} pages)`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECENT SESSIONS TIMELINE (Clean, Minimalist List)                       */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-4 rounded-2xl border space-y-2.5 transition-all",
        darkMode ? "bg-[#121217] border-white/10 text-white" : "bg-white border-slate-200/80 text-gray-900"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-500" />
            <span>{isBn ? 'সাম্প্রতিক ইতিহাস' : 'Recent Sessions'}</span>
          </h3>
          {records.length > 0 && (
            <span className="text-[10.5px] font-mono text-gray-400">
              {formatNum(records.length)} {isBn ? 'টি সেশন' : 'sessions'}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            {isBn ? 'এখনো কোনো পড়ার রেকর্ড নেই।' : 'No reading sessions logged yet.'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {records.slice(0, 6).map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all group",
                  darkMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50/70 border-slate-200/60"
                )}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <BookOpen size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">{rec.bookTitle}</span>
                      {rec.fromPage !== undefined && rec.toPage !== undefined && (
                        <span className="text-[10px] font-mono font-semibold opacity-60 shrink-0">
                          (p. {formatNum(rec.fromPage)}–{formatNum(rec.toPage)})
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-gray-400 truncate">
                      {formatHistoryDate(rec.date)} {rec.note ? `• "${rec.note}"` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {formatNum(rec.pages)}p • {formatNum(rec.minutes)}m
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(rec.id)}
                    className="p-1 rounded-md text-gray-400 hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    title={isBn ? 'মুছুন' : 'Delete'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MINIMAL MODAL / SHEET: LIBRARY & ADD BOOK                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isLibraryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "w-full max-w-md rounded-2xl border p-4 sm:p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col",
                darkMode ? "bg-[#16161d] border-white/10 text-white" : "bg-white border-slate-200 text-gray-900"
              )}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Library size={16} className="text-indigo-500" />
                  <h3 className="font-bold text-sm">
                    {isAddBookMode 
                      ? (isBn ? 'নতুন বই যুক্ত করুন' : 'Add New Book') 
                      : (isBn ? 'বইয়ের লাইব্রেরি' : 'Your Book Library')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {isAddBookMode ? (
                  /* Add Book Form */
                  <form onSubmit={handleAddNewBook} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                        {isBn ? 'বইয়ের নাম (আবশ্যক):' : 'Book Title (Required):'}
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder={isBn ? 'যেমন: পারমাণবিক অভ্যাস' : 'e.g. Deep Work, Sapiens...'}
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                        )}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                        {isBn ? 'লেখকের নাম (ঐচ্ছিক):' : 'Author (Optional):'}
                      </label>
                      <input
                        type="text"
                        placeholder={isBn ? 'যেমন: জেমস ক্লিয়ার' : 'e.g. Cal Newport'}
                        value={newBookAuthor}
                        onChange={(e) => setNewBookAuthor(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                          {isBn ? 'মোট পৃষ্ঠা:' : 'Total Pages:'}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="300"
                          value={newBookTotalPages}
                          onChange={(e) => setNewBookTotalPages(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                          {isBn ? 'বর্তমান পৃষ্ঠা:' : 'Start Page:'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={newBookCurrentPage}
                          onChange={(e) => setNewBookCurrentPage(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddBookMode(false)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer",
                          darkMode ? "border-white/10 text-gray-300" : "border-slate-200 text-gray-600"
                        )}
                      >
                        {isBn ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                      >
                        {isBn ? 'বই যুক্ত করুন' : 'Save Book'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Books List */
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsAddBookMode(true)}
                      className={cn(
                        "w-full py-2.5 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        darkMode 
                          ? "border-indigo-500/40 text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10" 
                          : "border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
                      )}
                    >
                      <Plus size={14} />
                      <span>{isBn ? '+ নতুন বই যোগ করুন' : '+ Add New Book'}</span>
                    </button>

                    {books.map((b) => {
                      const isSelected = selectedBookId === b.id;
                      const pct = Math.min(100, Math.round(((b.currentPage || 0) / (b.totalPages || 1)) * 100));

                      return (
                        <div
                          key={b.id}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all",
                            isSelected
                              ? (darkMode ? "bg-indigo-950/30 border-indigo-500/40" : "bg-indigo-50/60 border-indigo-300")
                              : (darkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-50/60 border-slate-200/80")
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs truncate">{b.title}</h4>
                              {isSelected && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-indigo-600 text-white font-bold">
                                  {isBn ? 'সক্রিয়' : 'Active'}
                                </span>
                              )}
                            </div>
                            {b.author && <p className="text-[10px] text-gray-400 truncate">{b.author}</p>}
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500">
                              <span>p. {formatNum(b.currentPage)}/{formatNum(b.totalPages)}</span>
                              <span>•</span>
                              <span>{formatNum(pct)}%</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isSelected && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectBook(b.id);
                                  setIsLibraryOpen(false);
                                }}
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white cursor-pointer"
                              >
                                {isBn ? 'পড়ুন' : 'Select'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(b.id)}
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 cursor-pointer"
                              title={isBn ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Unlisted / Custom option */}
                    <div
                      onClick={() => {
                        setSelectedBookId('custom');
                        setIsLibraryOpen(false);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all",
                        selectedBookId === 'custom'
                          ? (darkMode ? "bg-indigo-950/30 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-300 text-indigo-700")
                          : (darkMode ? "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white" : "bg-slate-50 border-slate-200 text-gray-600 hover:text-gray-900")
                      )}
                    >
                      <span>✏️ {isBn ? 'অন্যান্য / কাস্টম বই' : 'Custom / Unlisted Book'}</span>
                      {selectedBookId === 'custom' && <Check size={14} className="text-indigo-500" />}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
