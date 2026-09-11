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
  Sparkles,
  Library,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  X,
  Edit3,
  Award,
  BookMarked
} from 'lucide-react';
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

  // State: Book Menu / Entry drawer or section
  const [showBookSection, setShowBookSection] = useState<boolean>(false);
  const [newBookTitle, setNewBookTitle] = useState<string>('');
  const [newBookTotalPages, setNewBookTotalPages] = useState<string>('250');
  const [newBookAuthor, setNewBookAuthor] = useState<string>('');
  const [newBookCurrentPage, setNewBookCurrentPage] = useState<string>('0');
  const [bookSavedNotice, setBookSavedNotice] = useState<boolean>(false);

  // State: Daily Logger Form
  const [selectedBookId, setSelectedBookId] = useState<string>('book_sample_1');
  const [customBookTitle, setCustomBookTitle] = useState<string>('');
  const [usePageRange, setUsePageRange] = useState<boolean>(true); // "from page to page" mode
  const [fromPageInput, setFromPageInput] = useState<string>('46');
  const [toPageInput, setToPageInput] = useState<string>('65');
  const [directPagesInput, setDirectPagesInput] = useState<string>('20');
  const [minutesInput, setMinutesInput] = useState<string>('25');
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

  // When selected book changes, automatically pre-fill fromPage and toPage
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    if (bookId === 'custom') {
      return;
    }
    const found = books.find(b => b.id === bookId);
    if (found) {
      const nextStart = (found.currentPage || 0) + 1;
      setFromPageInput(String(nextStart));
      const suggestedEnd = Math.min(found.totalPages, nextStart + 19);
      setToPageInput(String(suggestedEnd));
    }
  };

  // Add a new book to the library
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

    // Select this newly added book
    setSelectedBookId(newBook.id);
    const nextStart = startP > 0 ? startP + 1 : 1;
    setFromPageInput(String(nextStart));
    setToPageInput(String(Math.min(totalP, nextStart + 19)));

    // Reset form
    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookTotalPages('250');
    setNewBookCurrentPage('0');
    setBookSavedNotice(true);
    setTimeout(() => setBookSavedNotice(false), 2500);
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

  // Dynamic calculation for Page to Page option
  const fromP = parseInt(fromPageInput, 10) || 0;
  const toP = parseInt(toPageInput, 10) || 0;
  const rangePagesRead = (toP >= fromP && fromP > 0) ? (toP - fromP + 1) : 0;
  const activePagesToday = usePageRange ? rangePagesRead : (parseInt(directPagesInput, 10) || 0);

  // Selected Book object
  const activeBook = books.find(b => b.id === selectedBookId);

  // Handle logging session
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

    // Determine title
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

    // Update book progress if a saved book was used
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

    // Advance page numbers for next log
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full pb-0">
      {/* ========================================================================= */}
      {/* 1. BOOK ENTRY MENU SECTION / LIBRARY */}
      {/* ========================================================================= */}
      <div className={cn(
        "rounded-2xl sm:rounded-3xl border transition-all overflow-hidden shadow-xs",
        darkMode 
          ? "bg-[#18111f] border-purple-500/25 shadow-purple-950/20 text-white" 
          : "bg-white border-purple-100 shadow-purple-500/5 text-gray-900"
      )}>
        {/* Header Bar with Toggle */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-purple-500/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Library size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black tracking-tight">
                  {isBn ? 'বই এন্ট্রি ও সংরক্ষিত লাইব্রেরি' : 'Book Entry & Library'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold font-mono">
                  {formatNum(books.length)} {isBn ? 'টি বই' : books.length === 1 ? 'book' : 'books'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isBn ? 'নতুন বই যোগ করুন এবং সংরক্ষিত বইয়ের অগ্রগতি দেখুন' : 'Add books with total pages to select in your daily reading logs'}
              </p>
            </div>
          </div>

          <button
            id="toggle_book_entry_section"
            type="button"
            onClick={() => setShowBookSection(!showBookSection)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs",
              showBookSection 
                ? (darkMode ? "bg-white/10 text-white border-white/15" : "bg-purple-100 text-purple-900 border-purple-200") 
                : (darkMode ? "bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30" : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100")
            )}
          >
            <Plus size={13} className={cn("transition-transform duration-200", showBookSection && "rotate-45")} />
            <span>{showBookSection ? (isBn ? 'লুকান' : 'Collapse') : (isBn ? 'বই যোগ / দেখুন' : 'Add / View Books')}</span>
          </button>
        </div>

        {/* Expandable Book Entry & Library Content */}
        {showBookSection && (
          <div className="p-3.5 sm:p-5 space-y-4 bg-black/[0.02] dark:bg-white/[0.01]">
            {/* Add Book Form */}
            <form onSubmit={handleAddNewBook} className="p-3.5 sm:p-4 rounded-2xl border border-purple-500/20 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <BookMarked size={14} />
                  <span>{isBn ? 'নতুন বইয়ের বিবরণ যুক্ত করুন' : 'Add a New Book to Your Library'}</span>
                </span>
                {bookSavedNotice && (
                  <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                    <Check size={13} /> {isBn ? 'বই সংরক্ষিত হয়েছে!' : 'Book Saved to Library!'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                    {isBn ? 'বইয়ের নাম (আবশ্যক):' : 'Book Title (Required):'}
                  </label>
                  <input
                    id="new_book_title_input"
                    type="text"
                    required
                    placeholder={isBn ? 'যেমন: পারমাণবিক অভ্যাস (Atomic Habits)' : 'e.g. Deep Work, Sapiens...'}
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-[#1f1629] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                    {isBn ? 'মোট পৃষ্ঠা (আবশ্যক):' : 'Total Pages (Required):'}
                  </label>
                  <input
                    id="new_book_pages_input"
                    type="number"
                    required
                    min="1"
                    placeholder="300"
                    value={newBookTotalPages}
                    onChange={(e) => setNewBookTotalPages(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold border font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-[#1f1629] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                    {isBn ? 'বর্তমান পৃষ্ঠা (ঐচ্ছিক):' : 'Start Page (Optional):'}
                  </label>
                  <input
                    id="new_book_start_page_input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newBookCurrentPage}
                    onChange={(e) => setNewBookCurrentPage(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold border font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-[#1f1629] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="flex-1">
                  <input
                    id="new_book_author_input"
                    type="text"
                    placeholder={isBn ? 'লেখকের নাম (ঐচ্ছিক, যেমন: জেমস ক্লিয়ার)...' : 'Author name (optional, e.g. James Clear)...'}
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    className={cn(
                      "w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-[#1f1629] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>

                <button
                  id="save_new_book_button"
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>{isBn ? 'বইটি লাইব্রেরিতে সংরক্ষণ করুন' : 'Save Book to Library'}</span>
                </button>
              </div>
            </form>

            {/* Saved Books Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block">
                {isBn ? 'আপনার সংরক্ষিত বইসমূহ:' : 'Your Saved Books in Library:'}
              </span>

              {books.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-center text-xs text-gray-400">
                  {isBn ? 'কোনো বই সংরক্ষিত নেই। উপরের ফর্মে বই যোগ করুন।' : 'No books saved yet. Add your first book above.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {books.map((b) => {
                    const pct = Math.min(100, Math.round(((b.currentPage || 0) / (b.totalPages || 1)) * 100));
                    const isSelectedInLogger = selectedBookId === b.id;

                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 relative",
                          isSelectedInLogger
                            ? (darkMode ? "bg-purple-950/40 border-purple-400/50 shadow-xs" : "bg-purple-50/70 border-purple-300 shadow-xs")
                            : (darkMode ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200")
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs truncate" title={b.title}>
                              {b.title}
                            </h4>
                            {b.author && (
                              <p className="text-[10px] text-gray-400 truncate">
                                {b.author}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteBook(b.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md"
                            title={isBn ? 'বই মুছুন' : 'Delete book'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400">
                            <span>{formatNum(b.currentPage)} / {formatNum(b.totalPages)} {isBn ? 'পৃ' : 'pg'}</span>
                            <span className={cn("font-bold", pct >= 100 ? "text-emerald-500" : "text-purple-500")}>
                              {formatNum(pct)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", pct >= 100 ? "bg-emerald-500" : "bg-purple-600")}
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>

                        {/* Action: Select to Log */}
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectBook(b.id);
                            setShowBookSection(false);
                          }}
                          className={cn(
                            "w-full py-1 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                            isSelectedInLogger
                              ? "bg-purple-600 text-white"
                              : (darkMode ? "bg-white/5 hover:bg-white/10 text-purple-300" : "bg-purple-50 hover:bg-purple-100 text-purple-700")
                          )}
                        >
                          {isSelectedInLogger ? <Check size={11} /> : <BookOpen size={11} />}
                          <span>{isSelectedInLogger ? (isBn ? 'লগিং এর জন্য নির্বাচিত' : 'Selected for Logger') : (isBn ? 'এই বই থেকে পড়ুন' : 'Select for Reading')}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN READING DASHBOARD CARD & LOGGING SECTION */}
      {/* ========================================================================= */}
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
                {isBn ? 'পড়ার হিসাব ও পৃষ্ঠা এন্ট্রি' : 'Daily Reading Logger'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isBn ? 'সংরক্ষিত বই নির্বাচন করে পৃষ্ঠা থেকে পৃষ্ঠা লগ করুন' : 'Select saved books and log page-to-page progress'}
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
                persistData(g, records, books);
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
            <span className="text-[10.5px] text-gray-400 font-bold block">{isBn ? 'দৈনিক লক্ষ্য অগ্রগতি' : "Goal Progress"}</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percentGoal}%` }} />
              </div>
              <span className="text-xs font-black font-mono text-purple-500">{formatNum(percentGoal)}%</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INPUT FORM FOR DAILY READING LOG WITH BOOK SELECTION & PAGE TO PAGE */}
        {/* ========================================================================= */}
        <div className="pt-3.5 border-t border-gray-200/20 dark:border-white/5 space-y-3.5">
          {/* 1. SELECT BOOK FROM SAVED LIST OR CUSTOM */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Bookmark size={13} className="text-purple-500" />
                <span>{isBn ? 'বই নির্বাচন করুন (সংরক্ষিত তালিকা হতে):' : 'Select Book from Saved List:'}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowBookSection(true)}
                className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={11} />
                <span>{isBn ? '+ নতুন বই যোগ করুন' : '+ Add New Book'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  id="reading_book_selector"
                  value={selectedBookId}
                  onChange={(e) => handleSelectBook(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer",
                    darkMode ? "bg-[#1f1629] border-white/10 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-900"
                  )}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      📖 {b.title} ({isBn ? `পৃষ্ঠা ${formatNum(b.currentPage)} / ${formatNum(b.totalPages)}` : `p. ${b.currentPage}/${b.totalPages}`})
                    </option>
                  ))}
                  <option value="custom">✏️ {isBn ? 'অন্যান্য / ম্যানুয়াল বইয়ের নাম লিখুন' : 'Custom / Unlisted Book...'}</option>
                </select>
              </div>

              {selectedBookId === 'custom' && (
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    placeholder={isBn ? 'বইয়ের নাম লিখুন...' : 'Type book title...'}
                    value={customBookTitle}
                    onChange={(e) => setCustomBookTitle(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Active Book Progress Strip */}
            {activeBook && selectedBookId !== 'custom' && (
              <div className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between text-xs",
                darkMode ? "bg-purple-950/30 border-purple-500/20 text-purple-200" : "bg-purple-50/60 border-purple-200 text-purple-900"
              )}>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-purple-500 shrink-0" />
                  <span className="font-bold truncate max-w-[200px] sm:max-w-[320px]">{activeBook.title}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold shrink-0">
                  <span>{isBn ? 'বর্তমানে' : 'At'}: {formatNum(activeBook.currentPage)}/{formatNum(activeBook.totalPages)} {isBn ? 'পৃ' : 'pg'}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-500">
                    {Math.round((activeBook.currentPage / (activeBook.totalPages || 1)) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. PAGE TO PAGE OPTION (Example: page 1 to 20 today) */}
          <div className="p-3 rounded-2xl border border-purple-500/20 bg-purple-50/25 dark:bg-white/[0.02] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Layers size={13} className="text-purple-500" />
                <span>{isBn ? 'পড়ার ধরন ও পৃষ্ঠা নির্বাচন:' : 'Reading Mode & Pages:'}</span>
              </span>

              {/* Mode Toggle: Page to Page vs Direct Pages */}
              <div className="flex items-center p-0.5 rounded-lg border border-purple-300/40 dark:border-white/10 bg-white/50 dark:bg-black/20 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setUsePageRange(true)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                    usePageRange 
                      ? "bg-purple-600 text-white shadow-2xs" 
                      : "text-gray-500 dark:text-gray-400 hover:text-purple-600"
                  )}
                >
                  {isBn ? 'পৃষ্ঠা থেকে পৃষ্ঠা (যেমন ১ হতে ২০)' : 'Page to Page (e.g. 1 to 20)'}
                </button>
                <button
                  type="button"
                  onClick={() => setUsePageRange(false)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                    !usePageRange 
                      ? "bg-purple-600 text-white shadow-2xs" 
                      : "text-gray-500 dark:text-gray-400 hover:text-purple-600"
                  )}
                >
                  {isBn ? 'সরাসরি মোট পৃষ্ঠা' : 'Total Pages'}
                </button>
              </div>
            </div>

            {usePageRange ? (
              /* Page to Page Inputs: From Page to To Page */
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                      {isBn ? 'শুরু পৃষ্ঠা (From):' : 'From Page:'}
                    </label>
                    <input
                      id="reading_from_page"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={fromPageInput}
                      onChange={(e) => setFromPageInput(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                        darkMode ? "bg-[#181a20] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                      {isBn ? 'শেষ পৃষ্ঠা (To):' : 'To Page:'}
                    </label>
                    <input
                      id="reading_to_page"
                      type="number"
                      min="1"
                      placeholder="20"
                      value={toPageInput}
                      onChange={(e) => setToPageInput(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                        darkMode ? "bg-[#181a20] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                      )}
                    />
                  </div>

                  {/* Calculated Pages Today Banner */}
                  <div className="col-span-2 p-2.5 rounded-xl border border-purple-500/30 bg-purple-600/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block">
                        {isBn ? 'আজকের মোট পঠিত পৃষ্ঠা:' : 'Calculated Pages Today:'}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-black text-purple-600 dark:text-purple-300 mt-0.5">
                        <span>{formatNum(fromP)}</span>
                        <ArrowRight size={11} />
                        <span>{formatNum(toP)}</span>
                        <span>=</span>
                        <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                          {formatNum(rangePagesRead)} {isBn ? 'পৃষ্ঠা' : 'pg'}
                        </span>
                      </div>
                    </div>

                    {toP < fromP && (
                      <span className="text-[10px] font-bold text-amber-500">
                        {isBn ? 'শেষ পৃষ্ঠা শুরু পৃষ্ঠার চেয়ে বেশি দিন' : 'To ≥ From'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress preview on the selected book */}
                {activeBook && toP > 0 && (
                  <div className="text-[10.5px] text-gray-500 dark:text-gray-400 flex items-center gap-2 pt-0.5">
                    <Sparkles size={12} className="text-purple-500 shrink-0" />
                    <span>
                      {isBn
                        ? `এই সেশন লগ করলে বইটি ${formatNum(toP)} / ${formatNum(activeBook.totalPages)} পৃষ্ঠায় উন্নীত হবে (${formatNum(Math.min(100, Math.round((toP / activeBook.totalPages) * 100)))}%)`
                        : `Logging this session will advance "${activeBook.title}" to page ${toP} of ${activeBook.totalPages} (${Math.min(100, Math.round((toP / activeBook.totalPages) * 100))}%)`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Direct Page Count Input */
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                    {isBn ? 'আজ কত পৃষ্ঠা পড়েছেন:' : 'Pages Read Today:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={directPagesInput}
                    onChange={(e) => setDirectPagesInput(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                      darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. TIME SPENT, NOTES & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                {isBn ? 'সময় ব্যয় (মিনিট):' : 'Reading Duration (Minutes):'}
              </label>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Clock size={14} />
                </div>
                <input
                  id="reading_duration_input"
                  type="number"
                  min="1"
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  className={cn(
                    "w-full px-2.5 py-2 rounded-xl text-xs font-bold border text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                {isBn ? 'সংক্ষিপ্ত ভাবনা বা উদ্ধৃতি (ঐচ্ছিক):' : 'Insight or Favorite Quote (Optional):'}
              </label>
              <input
                id="reading_note_input"
                type="text"
                placeholder={isBn ? 'আজকের অধ্যায় থেকে কী শিখলেন...' : 'Key takeaways or favorite quote...'}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-purple-500",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
              />
            </div>
          </div>

          {/* 4. SUBMIT BUTTON & DATE PICKER */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input
                id="reading_date_picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold border text-center font-mono",
                  darkMode ? "bg-[#181a20] text-white border-gray-700/80 [color-scheme:dark]" : "bg-white text-gray-900 border-gray-300"
                )}
              />
            </div>

            <button
              id="submit_reading_log_button"
              type="button"
              onClick={handleLogSession}
              disabled={usePageRange && (fromP <= 0 || toP < fromP)}
              className={cn(
                "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 text-white",
                savedToast 
                  ? "bg-emerald-600 shadow-emerald-500/25" 
                  : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {savedToast ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
              <span>
                {savedToast 
                  ? (isBn ? 'লগ সফলভাবে সংরক্ষিত হয়েছে!' : 'Reading Log Saved!') 
                  : (isBn ? `পড়ার লগ সংরক্ষণ করুন (${formatNum(activePagesToday)} পৃষ্ঠা)` : `Save Reading Log (${activePagesToday} pg)`)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RECENT READING SESSIONS HISTORY */}
      {/* ========================================================================= */}
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
              {isBn ? `মোট ${formatNum(records.length)}টি সেশন` : `${records.length} sessions logged`}
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
              {isBn ? 'উপরের ফর্মে বই ও পৃষ্ঠা রেঞ্জ (১ হতে ২০ পৃষ্ঠা) দিয়ে "পড়ার লগ সংরক্ষণ করুন" চাপুন।' : 'Select a book, choose your page range (e.g. 1 to 20), and click "Save Reading Log".'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 8).map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-2 shadow-2xs transition-all",
                  darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 text-xs">
                    <BookOpen size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-white block truncate">
                        {rec.bookTitle}
                      </span>
                      {rec.fromPage !== undefined && rec.toPage !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 font-mono font-bold shrink-0">
                          p. {formatNum(rec.fromPage)} → {formatNum(rec.toPage)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
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
