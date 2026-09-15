/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BookItem {
  id: string;
  title: string;
  totalPages: number;
  currentPage: number;
  initialPages?: number;
  author?: string;
  createdAt: number;
  status?: 'reading' | 'completed';
  coverColor?: string;
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

export interface BookStats {
  totalRead: number;
  percent: number;
  intervals: Array<[number, number]>;
  isCompleted: boolean;
  recordsCount: number;
}

/**
 * Accurately calculates the pages read and progress percentage of a book.
 * Handles reading from anywhere: start, middle, or ending sections.
 * Automatically aggregates unique covered pages across all reading records,
 * and seamlessly recalculates whenever sessions are added or deleted.
 */
export function getBookStats(book: BookItem, allRecords: ReadingRecord[]): BookStats {
  if (!book || !book.totalPages || book.totalPages <= 0) {
    return { totalRead: 0, percent: 0, intervals: [], isCompleted: false, recordsCount: 0 };
  }

  const bookRecords = allRecords.filter(r => 
    (r.bookId && r.bookId === book.id) || 
    (!r.bookId && r.bookTitle && r.bookTitle.trim().toLowerCase() === book.title.trim().toLowerCase())
  );

  const coveredPages = new Set<number>();
  let directPagesWithoutRange = 0;

  // 1. Initial pages if configured at book creation (pages 1 to initialPages)
  const initial = book.initialPages || 0;
  for (let p = 1; p <= Math.min(book.totalPages, initial); p++) {
    coveredPages.add(p);
  }

  // 2. Add page numbers from all sessions
  for (const rec of bookRecords) {
    if (rec.fromPage !== undefined && rec.toPage !== undefined && rec.toPage >= rec.fromPage) {
      const start = Math.max(1, Math.min(book.totalPages, rec.fromPage));
      const end = Math.max(1, Math.min(book.totalPages, rec.toPage));
      for (let p = start; p <= end; p++) {
        coveredPages.add(p);
      }
    } else if (rec.pages && rec.pages > 0) {
      directPagesWithoutRange += rec.pages;
    }
  }

  // 3. Fallback for existing legacy books with no records and no initialPages
  if (bookRecords.length === 0 && coveredPages.size === 0 && (book.currentPage || 0) > 0) {
    for (let p = 1; p <= Math.min(book.totalPages, book.currentPage); p++) {
      coveredPages.add(p);
    }
  }

  // 4. Merge continuous ranges into intervals for clean display (e.g. 1-20, 20-40 -> 1-40; 91-100)
  const sorted = Array.from(coveredPages).sort((a, b) => a - b);
  const intervals: Array<[number, number]> = [];
  if (sorted.length > 0) {
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        intervals.push([start, prev]);
        start = curr;
        prev = curr;
      }
    }
    intervals.push([start, prev]);
  }

  const totalRead = Math.min(book.totalPages, coveredPages.size + directPagesWithoutRange);
  const percent = Math.min(100, Math.round((totalRead / book.totalPages) * 100));
  const isCompleted = totalRead >= book.totalPages && book.totalPages > 0;

  return {
    totalRead,
    percent,
    intervals,
    isCompleted,
    recordsCount: bookRecords.length
  };
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

  const DEFAULT_BOOK: BookItem = {
    id: 'book_sample_1',
    title: 'Atomic Habits',
    author: 'James Clear',
    totalPages: 320,
    currentPage: 0,
    initialPages: 0,
    status: 'reading',
    createdAt: 1704067200000
  };

  // State: Saved Books Library
  const [books, setBooks] = useState<BookItem[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_user_books') || localStorage.getItem('ratool_user_books');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_BOOK];
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
    try {
      const saved = localStorage.getItem('ratbod_reading_goal') || localStorage.getItem('ratool_reading_goal');
      return saved ? parseInt(saved, 10) || 20 : 20;
    } catch (e) {
      return 20;
    }
  });

  // State: Active Book selection
  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ratbod_reading_selected_book') || localStorage.getItem('ratool_reading_selected_book');
      if (saved) return saved;
    } catch (e) {}
    return 'book_sample_1';
  });
  const [customBookTitle, setCustomBookTitle] = useState<string>('');

  // State: Logging form - users can enter any range: start, middle, or ending part
  const [usePageRange, setUsePageRange] = useState<boolean>(true);
  const [fromPageInput, setFromPageInput] = useState<string>('1');
  const [toPageInput, setToPageInput] = useState<string>('20');
  const [directPagesInput, setDirectPagesInput] = useState<string>('20');
  const [minutesInput, setMinutesInput] = useState<string>('25');
  const [showNoteField, setShowNoteField] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [savedToast, setSavedToast] = useState<boolean>(false);

  // Deletion confirmation state
  interface DeleteTarget {
    type: 'record' | 'book';
    id: string;
    title: string;
    subtitle?: string;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // State: Records
  const [records, setRecords] = useState<ReadingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ratbod_reading_records') || localStorage.getItem('ratool_reading_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // State refs to prevent race conditions or stale closure overwrites
  const recordsRef = useRef<ReadingRecord[]>([]);
  const booksRef = useRef<BookItem[]>([]);
  const pageGoalRef = useRef<number>(pageGoal);
  const selectedBookIdRef = useRef<string>(selectedBookId);
  const isInitialLoadedRef = useRef<boolean>(false);

  useEffect(() => { recordsRef.current = records; }, [records]);
  useEffect(() => { booksRef.current = books; }, [books]);
  useEffect(() => { pageGoalRef.current = pageGoal; }, [pageGoal]);
  useEffect(() => { selectedBookIdRef.current = selectedBookId; }, [selectedBookId]);

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

  // Robust persistence helper: sanitizes all records to remove undefined properties (which crash Firestore setDoc)
  const persistData = (goal: number, updatedRecords: ReadingRecord[], updatedBooks: BookItem[], bookIdToSave?: string) => {
    try {
      // Guard against race conditions overwriting records with empty array before initial load completes
      if (!isInitialLoadedRef.current && updatedRecords.length === 0 && recordsRef.current.length > 0) {
        updatedRecords = recordsRef.current;
      }
      if (!isInitialLoadedRef.current && updatedBooks.length === 0 && booksRef.current.length > 0) {
        updatedBooks = booksRef.current;
      }

      // 1. Sanitize to guarantee NO undefined properties are ever sent to Firestore or stored
      const cleanRecords = updatedRecords.map((r, idx) => {
        const item: any = {
          id: String(r.id || `rec_${r.date || getLocalDateString()}_${Date.now()}_${idx}`),
          date: String(r.date || getLocalDateString()),
          bookTitle: String(r.bookTitle || ''),
          pages: Number(r.pages) || 0,
          minutes: Number(r.minutes) || 0,
          createdAt: Number(r.createdAt) || (Date.now() - idx * 1000)
        };
        if (r.bookId) item.bookId = String(r.bookId);
        if (r.fromPage !== undefined && r.fromPage !== null) item.fromPage = Number(r.fromPage);
        if (r.toPage !== undefined && r.toPage !== null) item.toPage = Number(r.toPage);
        if (r.note && typeof r.note === 'string' && r.note.trim()) item.note = r.note.trim();
        return item as ReadingRecord;
      });

      const cleanBooks = updatedBooks.map(b => {
        const item: any = {
          id: String(b.id),
          title: String(b.title || ''),
          totalPages: Number(b.totalPages) || 0,
          currentPage: Number(b.currentPage) || 0,
          status: b.status || 'reading',
          createdAt: Number(b.createdAt) || Date.now()
        };
        if (b.author && b.author.trim()) item.author = b.author.trim();
        if (b.initialPages !== undefined && b.initialPages !== null) item.initialPages = Number(b.initialPages);
        if (b.coverColor) item.coverColor = String(b.coverColor);
        return item as BookItem;
      });

      const activeId = bookIdToSave || selectedBookId;

      // 2. Cache locally to both standard keys immediately
      const recJson = JSON.stringify(cleanRecords);
      const bookJson = JSON.stringify(cleanBooks);
      localStorage.setItem('ratbod_reading_records', recJson);
      localStorage.setItem('ratool_reading_records', recJson);
      localStorage.setItem('ratbod_user_books', bookJson);
      localStorage.setItem('ratool_user_books', bookJson);
      localStorage.setItem('ratbod_reading_goal', String(goal));
      localStorage.setItem('ratool_reading_goal', String(goal));
      if (activeId) {
        localStorage.setItem('ratbod_reading_selected_book', activeId);
        localStorage.setItem('ratool_reading_selected_book', activeId);
      }

      // Update refs
      recordsRef.current = cleanRecords;
      booksRef.current = cleanBooks;
      pageGoalRef.current = Number(goal) || 20;
      if (activeId) selectedBookIdRef.current = activeId;

      // 3. Persist to Firestore: Both appData/readingTracker AND user root doc
      const user = auth.currentUser;
      if (user) {
        const payload = JSON.parse(JSON.stringify({
          pageGoal: Number(goal) || 20,
          records: cleanRecords,
          books: cleanBooks,
          selectedBookId: activeId || null,
          updatedAt: Date.now()
        }));

        setDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'), payload, { merge: true })
          .then(() => {
            console.log('[ReadingTracker] Saved to Firestore appData successfully! Records count:', cleanRecords.length);
          })
          .catch(err => {
            console.error('[ReadingTracker] Firestore save to appData failed:', err);
          });

        // Also save to root user document for cross-compatibility and backup
        setDoc(doc(db, 'users', user.uid), {
          readingRecords: cleanRecords,
          readingBooks: cleanBooks,
          readingGoal: Number(goal) || 20,
          selectedReadingBookId: activeId || null,
          readingUpdatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.error('[ReadingTracker] Error persisting data:', e);
    }
  };

  // Load from Firestore with smart merging, real-time sync, and offline preservation
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const setupSync = async (user = auth.currentUser) => {
      if (!user) {
        isInitialLoadedRef.current = true;
        return;
      }

      // Cleanup any previous snapshot listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      try {
        const trackerDocRef = doc(db, 'users', user.uid, 'appData', 'readingTracker');

        // Check initial state from Firestore (both appData and root doc)
        let remoteRecs: ReadingRecord[] = [];
        let remoteBooks: BookItem[] = [];
        let remoteGoal: number | null = null;
        let remoteBookId: string | null = null;

        try {
          const snap = await getDoc(trackerDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.records)) remoteRecs = data.records;
            if (Array.isArray(data.books)) remoteBooks = data.books;
            if (data.pageGoal) remoteGoal = Number(data.pageGoal);
            if (data.selectedBookId) remoteBookId = data.selectedBookId;
          }

          // Check root user doc if appData had no records
          if (remoteRecs.length === 0) {
            const rootSnap = await getDoc(doc(db, 'users', user.uid));
            if (rootSnap.exists()) {
              const rd = rootSnap.data();
              if (Array.isArray(rd.readingRecords) && rd.readingRecords.length > 0) {
                remoteRecs = rd.readingRecords;
              }
              if (Array.isArray(rd.readingBooks) && rd.readingBooks.length > 0 && remoteBooks.length === 0) {
                remoteBooks = rd.readingBooks;
              }
              if (remoteGoal === null && rd.readingGoal) {
                remoteGoal = Number(rd.readingGoal);
              }
              if (!remoteBookId && rd.selectedReadingBookId) {
                remoteBookId = rd.selectedReadingBookId;
              }
            }
          }
        } catch (readErr) {
          console.error('[ReadingTracker] Initial read error:', readErr);
        }

        // Retrieve local cache
        let localRecs: ReadingRecord[] = [];
        try {
          const raw = localStorage.getItem('ratbod_reading_records') || localStorage.getItem('ratool_reading_records');
          if (raw) localRecs = JSON.parse(raw);
        } catch (e) {}

        let localBooks: BookItem[] = [];
        try {
          const raw = localStorage.getItem('ratbod_user_books') || localStorage.getItem('ratool_user_books');
          if (raw) localBooks = JSON.parse(raw);
        } catch (e) {}

        // Smart merge: preserve all records from both local and remote without ever dropping
        const recordMap = new Map<string, ReadingRecord>();
        localRecs.forEach((r, idx) => {
          if (r) {
            const key = String(r.id || `loc_${r.date || ''}_${r.bookTitle || ''}_${r.pages || 0}_${r.createdAt || idx}`);
            recordMap.set(key, { ...r, id: key });
          }
        });
        remoteRecs.forEach((r, idx) => {
          if (r) {
            const key = String(r.id || `rem_${r.date || ''}_${r.bookTitle || ''}_${r.pages || 0}_${r.createdAt || idx}`);
            recordMap.set(key, { ...r, id: key });
          }
        });
        const mergedRecs = Array.from(recordMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Merge books
        const bookMap = new Map<string, BookItem>();
        localBooks.forEach(b => { if (b && b.id) bookMap.set(String(b.id), b); });
        remoteBooks.forEach(b => { if (b && b.id) bookMap.set(String(b.id), b); });
        let mergedBooks = Array.from(bookMap.values());
        if (mergedBooks.length === 0) {
          mergedBooks = [DEFAULT_BOOK];
        }

        // Recalculate book stats based on merged records
        const syncedBooks = mergedBooks.map(b => {
          const stats = getBookStats(b, mergedRecs);
          return {
            ...b,
            currentPage: stats.totalRead,
            status: (stats.isCompleted ? 'completed' : 'reading') as 'completed' | 'reading'
          };
        });

        const chosenGoal = remoteGoal !== null ? remoteGoal : (pageGoal || 20);
        const chosenBookId = remoteBookId || selectedBookId || (syncedBooks.length > 0 ? syncedBooks[0].id : 'book_sample_1');

        setRecords(mergedRecs);
        setBooks(syncedBooks);
        setPageGoal(chosenGoal);
        setSelectedBookId(chosenBookId);

        recordsRef.current = mergedRecs;
        booksRef.current = syncedBooks;
        pageGoalRef.current = chosenGoal;
        selectedBookIdRef.current = chosenBookId;
        isInitialLoadedRef.current = true;

        // Update local storage with merged truth
        try {
          localStorage.setItem('ratbod_reading_records', JSON.stringify(mergedRecs));
          localStorage.setItem('ratool_reading_records', JSON.stringify(mergedRecs));
          localStorage.setItem('ratbod_user_books', JSON.stringify(syncedBooks));
          localStorage.setItem('ratool_user_books', JSON.stringify(syncedBooks));
          localStorage.setItem('ratbod_reading_goal', String(chosenGoal));
          localStorage.setItem('ratool_reading_goal', String(chosenGoal));
          localStorage.setItem('ratbod_reading_selected_book', chosenBookId);
          localStorage.setItem('ratool_reading_selected_book', chosenBookId);
        } catch (e) {}

        // If local has newer records than remote, push to Firestore
        if (localRecs.length > remoteRecs.length || localBooks.length > remoteBooks.length) {
          persistData(chosenGoal, mergedRecs, syncedBooks, chosenBookId);
        }

        // Set up real-time listener for multi-tab or cross-device updates
        unsubscribeSnapshot = onSnapshot(trackerDocRef, (docSnap) => {
          if (!docSnap.exists()) return;
          const liveData = docSnap.data();
          if (!liveData) return;

          const liveRecs: ReadingRecord[] = Array.isArray(liveData.records) ? liveData.records : [];
          if (liveRecs.length > 0) {
            setRecords(prev => {
              const liveMap = new Map<string, ReadingRecord>();
              prev.forEach((r, idx) => {
                const k = String(r.id || `p_${r.date}_${idx}`);
                liveMap.set(k, { ...r, id: k });
              });
              liveRecs.forEach((r, idx) => {
                const k = String(r.id || `l_${r.date}_${idx}`);
                liveMap.set(k, { ...r, id: k });
              });
              const combined = Array.from(liveMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              recordsRef.current = combined;
              try {
                localStorage.setItem('ratbod_reading_records', JSON.stringify(combined));
                localStorage.setItem('ratool_reading_records', JSON.stringify(combined));
              } catch (e) {}
              return combined;
            });
          }

          const liveBooks: BookItem[] = Array.isArray(liveData.books) ? liveData.books : [];
          if (liveBooks.length > 0) {
            setBooks(liveBooks);
            booksRef.current = liveBooks;
            try {
              localStorage.setItem('ratbod_user_books', JSON.stringify(liveBooks));
              localStorage.setItem('ratool_user_books', JSON.stringify(liveBooks));
            } catch (e) {}
          }

          if (liveData.pageGoal) {
            setPageGoal(Number(liveData.pageGoal));
            pageGoalRef.current = Number(liveData.pageGoal);
          }
        }, (err) => {
          console.warn('[ReadingTracker] Snapshot listener notice:', err);
        });

      } catch (e) {
        console.error('[ReadingTracker] Error in setupSync:', e);
        isInitialLoadedRef.current = true;
      }
    };

    setupSync();
    const unsubAuth = onAuthStateChanged(auth, (u) => { setupSync(u); });
    return () => {
      unsubAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Switch active book and suggest intelligent starting page based on existing read history
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    if (bookId === 'custom') return;
    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const found = currentBooks.find(b => b.id === bookId);
    if (found) {
      const stats = getBookStats(found, currentRecs);
      // Find the most recent record for this book if available
      const bookRecs = currentRecs.filter(r => r.bookId === bookId || r.bookTitle === found.title);
      if (bookRecs.length > 0 && bookRecs[0].toPage && bookRecs[0].toPage < found.totalPages) {
        const nextStart = bookRecs[0].toPage + 1;
        setFromPageInput(String(nextStart));
        setToPageInput(String(Math.min(found.totalPages, nextStart + 19)));
      } else {
        const nextStart = stats.totalRead < found.totalPages ? (stats.totalRead + 1) : 1;
        setFromPageInput(String(nextStart));
        setToPageInput(String(Math.min(found.totalPages, nextStart + 19)));
      }
    }
    try {
      localStorage.setItem('ratbod_reading_selected_book', bookId);
      localStorage.setItem('ratool_reading_selected_book', bookId);
    } catch (e) {}
    persistData(pageGoal, currentRecs, currentBooks, bookId);
  };

  // Add new book
  const handleAddNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBookTitle.trim();
    const totalP = parseInt(newBookTotalPages, 10) || 0;
    if (!title || totalP <= 0) return;

    const startP = Math.min(totalP, Math.max(0, parseInt(newBookCurrentPage, 10) || 0));
    const newBook: BookItem = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      totalPages: totalP,
      currentPage: startP,
      initialPages: startP,
      status: startP >= totalP ? 'completed' : 'reading',
      createdAt: Date.now()
    };
    if (newBookAuthor.trim()) {
      newBook.author = newBookAuthor.trim();
    }

    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const updatedBooks = [newBook, ...currentBooks];
    setBooks(updatedBooks);
    setSelectedBookId(newBook.id);
    persistData(pageGoal, currentRecs, updatedBooks, newBook.id);

    const nextStart = startP > 0 && startP < totalP ? startP + 1 : 1;
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
    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const updatedBooks = currentBooks.filter(b => b.id !== bookId);
    setBooks(updatedBooks);
    persistData(pageGoal, currentRecs, updatedBooks);
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
      const baseFrom = fromP > 0 ? fromP : 1;
      const maxP = activeBook ? activeBook.totalPages : 9999;
      const targetTo = Math.min(maxP, baseFrom + delta - 1);
      setFromPageInput(String(baseFrom));
      setToPageInput(String(targetTo));
    } else {
      const current = parseInt(directPagesInput, 10) || 0;
      setDirectPagesInput(String(current + delta));
    }
  };

  // Session logger submit: handles reading anywhere in the book (start, middle, or ending part)
  const handleLogSession = () => {
    const m = parseInt(minutesInput, 10) || 0;
    let p = 0;
    let fromNum: number | undefined = undefined;
    let toNum: number | undefined = undefined;

    if (usePageRange) {
      let start = fromP;
      let end = toP;
      if (start <= 0 || end <= 0) return;
      // Auto-swap if start > end by accident
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
      if (activeBook && activeBook.totalPages > 0) {
        end = Math.min(activeBook.totalPages, end);
      }
      p = end - start + 1;
      fromNum = start;
      toNum = end;
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

    const uniqueRecId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRec: ReadingRecord = {
      id: uniqueRecId,
      date: selectedDate || getLocalDateString(),
      bookTitle: title,
      pages: p,
      minutes: m,
      createdAt: Date.now()
    };
    if (selectedBookId !== 'custom') {
      newRec.bookId = selectedBookId;
    }
    if (fromNum !== undefined) {
      newRec.fromPage = fromNum;
    }
    if (toNum !== undefined) {
      newRec.toPage = toNum;
    }
    if (noteInput.trim()) {
      newRec.note = noteInput.trim();
    }

    const baseRecords = recordsRef.current.length > 0 ? recordsRef.current : records;
    const updatedRecords = [newRec, ...baseRecords.filter(r => r.id !== uniqueRecId)].slice(0, 500);

    // Accurately recalculate all books based on the updated reading records
    const baseBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const updatedBooks = baseBooks.map(b => {
      const stats = getBookStats(b, updatedRecords);
      return {
        ...b,
        currentPage: stats.totalRead,
        status: (stats.isCompleted ? 'completed' : 'reading') as 'completed' | 'reading'
      };
    });

    setRecords(updatedRecords);
    setBooks(updatedBooks);
    persistData(pageGoal, updatedRecords, updatedBooks, selectedBookId);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
    setNoteInput('');
    setShowNoteField(false);

    // Auto-advance starting page for the next session
    if (usePageRange && toNum && activeBook) {
      const nextFrom = toNum + 1;
      if (nextFrom <= activeBook.totalPages) {
        setFromPageInput(String(nextFrom));
        setToPageInput(String(Math.min(activeBook.totalPages, nextFrom + 19)));
      } else {
        setFromPageInput('1');
        setToPageInput(String(Math.min(activeBook.totalPages, 20)));
      }
    }
  };

  // Prompt confirmation for deleting a book
  const requestDeleteBook = (book: BookItem) => {
    setDeleteTarget({
      type: 'book',
      id: book.id,
      title: book.title,
      subtitle: `${formatNum(book.totalPages)} ${isBn ? 'পৃষ্ঠা' : 'pages'}`
    });
  };

  // Prompt confirmation for deleting a reading session record
  const requestDeleteRecord = (rec: ReadingRecord) => {
    const rangeText = rec.fromPage !== undefined && rec.toPage !== undefined 
      ? `p. ${formatNum(rec.fromPage)}–${formatNum(rec.toPage)}`
      : `${formatNum(rec.pages)} ${isBn ? 'পৃষ্ঠা' : 'pages'}`;
    setDeleteTarget({
      type: 'record',
      id: rec.id,
      title: rec.bookTitle,
      subtitle: rangeText
    });
  };

  // Confirm and execute the deletion, then show deleted success status (like saving)
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;

    if (deleteTarget.type === 'record') {
      const targetId = deleteTarget.id;
      const updatedRecords = currentRecs.filter(r => r.id !== targetId);

      // Recalculate all books without the deleted record
      const updatedBooks = currentBooks.map(b => {
        const stats = getBookStats(b, updatedRecords);
        return {
          ...b,
          currentPage: stats.totalRead,
          status: (stats.isCompleted ? 'completed' : 'reading') as 'completed' | 'reading'
        };
      });

      setRecords(updatedRecords);
      setBooks(updatedBooks);
      persistData(pageGoal, updatedRecords, updatedBooks, selectedBookId);
    } else if (deleteTarget.type === 'book') {
      const targetId = deleteTarget.id;
      const updatedBooks = currentBooks.filter(b => b.id !== targetId);
      setBooks(updatedBooks);
      persistData(pageGoal, currentRecs, updatedBooks);

      if (selectedBookId === targetId) {
        if (updatedBooks.length > 0) {
          handleSelectBook(updatedBooks[0].id);
        } else {
          setSelectedBookId('custom');
        }
      }
    }

    setDeleteTarget(null);
  };

  const percentGoal = Math.min(100, Math.round((todayPages / (pageGoal || 1)) * 100));
  const activeBookStats = activeBook ? getBookStats(activeBook, records) : null;
  const activeBookPercent = activeBookStats ? activeBookStats.percent : 0;

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
        {activeBook && selectedBookId !== 'custom' && activeBookStats && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400">
              <span>{formatNum(activeBookStats.totalRead)} / {formatNum(activeBook.totalPages)} {isBn ? 'পৃষ্ঠা পড়া হয়েছে' : 'pages read'}</span>
              <span className={cn(
                "font-bold",
                activeBookStats.isCompleted ? "text-emerald-500 font-black" : "text-indigo-600 dark:text-indigo-400"
              )}>
                {activeBookStats.isCompleted ? (isBn ? '✓ সম্পন্ন (১০০%)' : '✓ Completed (100%)') : `${formatNum(activeBookStats.percent)}%`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  activeBookStats.isCompleted ? "bg-emerald-500" : "bg-indigo-500"
                )}
                style={{ width: `${activeBookStats.percent}%` }}
              />
            </div>

            {/* Sections read chips/summary */}
            {activeBookStats.intervals.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                <span className="font-semibold text-gray-400 dark:text-gray-500 shrink-0">
                  {isBn ? 'পড়া অংশ:' : 'Sections:'}
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-300 font-medium truncate">
                  {activeBookStats.intervals.map(([s, e]) => s === e ? `p.${formatNum(s)}` : `p.${formatNum(s)}–${formatNum(e)}`).join(', ')}
                </span>
              </div>
            )}
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
                    onClick={() => requestDeleteRecord(rec)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
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
                      const bStats = getBookStats(b, records);

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
                              {bStats.isCompleted && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-emerald-600 text-white font-bold">
                                  {isBn ? 'সম্পন্ন' : 'Completed'}
                                </span>
                              )}
                            </div>
                            {b.author && <p className="text-[10px] text-gray-400 truncate">{b.author}</p>}
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500">
                              <span>p. {formatNum(bStats.totalRead)}/{formatNum(b.totalPages)}</span>
                              <span>•</span>
                              <span className={cn(bStats.isCompleted ? "font-bold text-emerald-500" : "")}>
                                {formatNum(bStats.percent)}%
                              </span>
                              {bStats.intervals.length > 1 && (
                                <span className="opacity-75">
                                  ({formatNum(bStats.intervals.length)} {isBn ? 'অংশ' : 'sections'})
                                </span>
                              )}
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
                              onClick={() => requestDeleteBook(b)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 6. DELETION CONFIRMATION DIALOG                                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4",
                darkMode ? "bg-[#181822] border-white/10 text-white" : "bg-white border-slate-200 text-gray-900"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                  <Trash2 size={18} strokeWidth={2.2} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {deleteTarget.type === 'record'
                      ? (isBn ? 'পড়ার সেশনটি মুছে ফেলতে চান?' : 'Delete Reading Session?')
                      : (isBn ? 'বইটি লাইব্রেরি থেকে মুছবেন?' : 'Delete Book from Library?')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {deleteTarget.type === 'record'
                      ? (isBn 
                          ? 'এই সেশনটি মুছে ফেললে বইটির পড়ার পৃষ্ঠা এবং অগ্রগতির শতাংশ স্বয়ংক্রিয়ভাবে পুনর্গণনা করা হবে।' 
                          : 'This session will be removed and your book\'s reading progress will automatically be recalculated.')
                      : (isBn
                          ? 'বইটি আপনার লাইব্রেরি থেকে মুছে ফেলা হবে। আপনি কি নিশ্চিত?'
                          : 'This book will be removed from your library. Are you sure you want to proceed?')}
                  </p>
                </div>
              </div>

              {/* Target Preview Box */}
              <div className={cn(
                "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2",
                darkMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/70"
              )}>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={13} className="text-indigo-500 shrink-0" />
                  <span className="font-bold truncate text-gray-800 dark:text-gray-200">
                    {deleteTarget.title}
                  </span>
                </div>
                {deleteTarget.subtitle && (
                  <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 font-semibold shrink-0">
                    {deleteTarget.subtitle}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    darkMode 
                      ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" 
                      : "bg-slate-100 border-slate-200 text-gray-700 hover:bg-slate-200"
                  )}
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Trash2 size={13} />
                  <span>{isBn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
