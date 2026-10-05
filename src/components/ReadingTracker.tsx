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
import { getDhakaLogicalDateKey } from '../utils/sunsetDate';
import { onAuthStateChanged } from 'firebase/auth';
import { syncHabitsWithTrackers, markReadingHabitCompleted } from '../utils/habitSync';

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

  const getLocalDateString = (d?: Date) => {
    if (!d) return getDhakaLogicalDateKey().dateKey;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatHistoryDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const logicalInfo = getDhakaLogicalDateKey();
      const today = logicalInfo.dateKey;
      const yesterday = logicalInfo.yesterdayDateKey;

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

  // Permanently deleted book IDs tracker to ensure deleted books NEVER reappear on date change or reload
  const [deletedBookIds, setDeletedBookIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ratbod_deleted_book_ids') || localStorage.getItem('ratool_deleted_book_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set<string>(parsed);
      }
    } catch (e) {}
    return new Set<string>();
  });
  const deletedBookIdsRef = useRef<Set<string>>(deletedBookIds);
  useEffect(() => {
    deletedBookIdsRef.current = deletedBookIds;
  }, [deletedBookIds]);

  // State: Saved Books Library
  const [books, setBooks] = useState<BookItem[]>(() => {
    try {
      const delRaw = localStorage.getItem('ratbod_deleted_book_ids') || localStorage.getItem('ratool_deleted_book_ids');
      const delSet = new Set<string>(delRaw ? JSON.parse(delRaw) : []);
      const saved = localStorage.getItem('ratbod_user_books') || localStorage.getItem('ratool_user_books');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validBooks = parsed.filter((b: BookItem) => b && b.id && !delSet.has(b.id));
          return validBooks;
        }
      }
      if (delSet.has(DEFAULT_BOOK.id)) {
        return [];
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

  // State: Edit book mode
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editBookTitle, setEditBookTitle] = useState<string>('');
  const [editBookTotalPages, setEditBookTotalPages] = useState<string>('');
  const [editBookAuthor, setEditBookAuthor] = useState<string>('');
  const [editBookCurrentPage, setEditBookCurrentPage] = useState<string>('');

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
      const delRaw = localStorage.getItem('ratbod_deleted_book_ids') || localStorage.getItem('ratool_deleted_book_ids');
      const delSet = new Set<string>(delRaw ? JSON.parse(delRaw) : []);
      const saved = localStorage.getItem('ratbod_reading_selected_book') || localStorage.getItem('ratool_reading_selected_book');
      if (saved && !delSet.has(saved)) return saved;
    } catch (e) {}
    return 'book_sample_1';
  });
  const [customBookTitle, setCustomBookTitle] = useState<string>('');

  // State: Logging form - users can enter any range: start, middle, or ending part
  const [usePageRange, setUsePageRange] = useState<boolean>(true);
  const [fromPageInput, setFromPageInput] = useState<string>('1');
  const [toPageInput, setToPageInput] = useState<string>('20');
  const [directPagesInput, setDirectPagesInput] = useState<string>('20');
  const [showNoteField, setShowNoteField] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => getDhakaLogicalDateKey().dateKey);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [showBookSessionsModal, setShowBookSessionsModal] = useState<boolean>(false);
  const [bookSessionsSelectedId, setBookSessionsSelectedId] = useState<string | null>(null);

  // Keep date synchronized when sunset passes in real-time
  useEffect(() => {
    const updateSunsetDate = () => {
      const currentLogical = getDhakaLogicalDateKey().dateKey;
      setSelectedDate(prev => {
        // If user was on the previous logical date, roll it forward with sunset
        const prevLogical = getDhakaLogicalDateKey(new Date(Date.now() - 30000)).dateKey;
        if (prev === prevLogical) {
          return currentLogical;
        }
        return prev;
      });
    };
    const interval = setInterval(updateSunsetDate, 15000);
    window.addEventListener('focus', updateSunsetDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateSunsetDate);
    };
  }, []);

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

  // Calculate today's pages from records (aligned with sunset rollover)
  const todayStr = getDhakaLogicalDateKey().dateKey;
  const todayPages = records
    .filter(r => r.date === todayStr)
    .reduce((acc, r) => acc + (r.pages || 0), 0);

  // Active Book object
  const activeBook = books.find(b => b.id === selectedBookId) || (books.length > 0 ? books[0] : null);

  // Robust persistence helper: sanitizes all records to remove undefined properties (which crash Firestore setDoc)
  const persistData = (
    goal: number, 
    updatedRecords: ReadingRecord[], 
    updatedBooks: BookItem[], 
    bookIdToSave?: string,
    currentDeletedIds?: Set<string>
  ) => {
    try {
      const activeDel = currentDeletedIds || deletedBookIdsRef.current;

      // 1. Sanitize to guarantee NO undefined properties are ever sent to Firestore or stored
      const activeLogicalDate = getDhakaLogicalDateKey().dateKey;
      const cleanRecords = updatedRecords.map((r, idx) => {
        const item: any = {
          id: String(r.id || `rec_${r.date || activeLogicalDate}_${Date.now()}_${idx}`),
          date: String(r.date || activeLogicalDate),
          bookTitle: String(r.bookTitle || ''),
          pages: Number(r.pages) || 0,
          minutes: 0,
          createdAt: Number(r.createdAt) || (Date.now() - idx * 1000)
        };
        if (r.bookId) item.bookId = String(r.bookId);
        if (r.fromPage !== undefined && r.fromPage !== null) item.fromPage = Number(r.fromPage);
        if (r.toPage !== undefined && r.toPage !== null) item.toPage = Number(r.toPage);
        if (r.note && typeof r.note === 'string' && r.note.trim()) item.note = r.note.trim();
        return item as ReadingRecord;
      });

      // Filter out any deleted books permanently
      const cleanBooks = updatedBooks
        .filter(b => b && b.id && !activeDel.has(b.id))
        .map(b => {
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

      let activeId = bookIdToSave || selectedBookId;
      if (activeId && activeDel.has(activeId)) {
        activeId = cleanBooks.length > 0 ? cleanBooks[0].id : 'custom';
      }

      const delList = Array.from(activeDel);
      const delJson = JSON.stringify(delList);
      localStorage.setItem('ratbod_deleted_book_ids', delJson);
      localStorage.setItem('ratool_deleted_book_ids', delJson);

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
          deletedBookIds: delList,
          selectedBookId: activeId || null,
          updatedAt: Date.now()
        }));

        setDoc(doc(db, 'users', user.uid, 'appData', 'readingTracker'), payload, { merge: true })
          .catch(err => {
            console.error('[ReadingTracker] Firestore save to appData failed:', err);
          });

        // Also save to root user document for cross-compatibility and backup
        setDoc(doc(db, 'users', user.uid), {
          readingRecords: cleanRecords,
          readingBooks: cleanBooks,
          readingDeletedBookIds: delList,
          readingGoal: Number(goal) || 20,
          selectedReadingBookId: activeId || null,
          readingUpdatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }

      // Auto-sync Habitor: if a user logged that day reading session, inhabitant section read a book will be ticked
      syncHabitsWithTrackers();
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
        let remoteDeleted: string[] = [];
        let remoteGoal: number | null = null;
        let remoteBookId: string | null = null;

        try {
          const snap = await getDoc(trackerDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.records)) remoteRecs = data.records;
            if (Array.isArray(data.books)) remoteBooks = data.books;
            if (Array.isArray(data.deletedBookIds)) remoteDeleted = data.deletedBookIds;
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
              if (Array.isArray(rd.readingDeletedBookIds) && rd.readingDeletedBookIds.length > 0) {
                remoteDeleted = [...remoteDeleted, ...rd.readingDeletedBookIds];
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

        let localDeleted: string[] = [];
        try {
          const raw = localStorage.getItem('ratbod_deleted_book_ids') || localStorage.getItem('ratool_deleted_book_ids');
          if (raw) localDeleted = JSON.parse(raw);
        } catch (e) {}

        // Merge deleted books list permanently
        const mergedDeleted = new Set<string>([
          ...localDeleted,
          ...Array.from(deletedBookIdsRef.current),
          ...remoteDeleted
        ]);
        setDeletedBookIds(mergedDeleted);
        deletedBookIdsRef.current = mergedDeleted;

        // Filter out deleted books from both local and remote
        localBooks = localBooks.filter(b => b && b.id && !mergedDeleted.has(b.id));
        remoteBooks = remoteBooks.filter(b => b && b.id && !mergedDeleted.has(b.id));

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
        localBooks.forEach(b => { if (b && b.id && !mergedDeleted.has(b.id)) bookMap.set(String(b.id), b); });
        remoteBooks.forEach(b => { if (b && b.id && !mergedDeleted.has(b.id)) bookMap.set(String(b.id), b); });
        let mergedBooks = Array.from(bookMap.values());
        if (mergedBooks.length === 0 && !mergedDeleted.has(DEFAULT_BOOK.id) && mergedDeleted.size === 0) {
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
        let chosenBookId = remoteBookId || selectedBookId;
        if (!chosenBookId || mergedDeleted.has(chosenBookId) || !syncedBooks.some(b => b.id === chosenBookId)) {
          chosenBookId = syncedBooks.length > 0 ? syncedBooks[0].id : 'custom';
        }

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
          localStorage.setItem('ratbod_deleted_book_ids', JSON.stringify(Array.from(mergedDeleted)));
          localStorage.setItem('ratool_deleted_book_ids', JSON.stringify(Array.from(mergedDeleted)));
          localStorage.setItem('ratbod_reading_goal', String(chosenGoal));
          localStorage.setItem('ratool_reading_goal', String(chosenGoal));
          localStorage.setItem('ratbod_reading_selected_book', chosenBookId);
          localStorage.setItem('ratool_reading_selected_book', chosenBookId);
        } catch (e) {}

        // Persist clean merged truth
        persistData(chosenGoal, mergedRecs, syncedBooks, chosenBookId, mergedDeleted);

        // Set up real-time listener for multi-tab or cross-device updates
        unsubscribeSnapshot = onSnapshot(trackerDocRef, (docSnap) => {
          if (!docSnap.exists()) return;
          const liveData = docSnap.data();
          if (!liveData) return;

          let liveDeleted: string[] = [];
          if (Array.isArray(liveData.deletedBookIds)) liveDeleted = liveData.deletedBookIds;
          const currentDel = new Set<string>([...Array.from(deletedBookIdsRef.current), ...liveDeleted]);
          setDeletedBookIds(currentDel);
          deletedBookIdsRef.current = currentDel;

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

          if (Array.isArray(liveData.books)) {
            const liveBooks = liveData.books.filter((b: BookItem) => b && b.id && !currentDel.has(b.id));
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

  // When date changes, verify selected book is still valid and not deleted
  useEffect(() => {
    if (selectedBookId && selectedBookId !== 'custom') {
      const isDeleted = deletedBookIdsRef.current.has(selectedBookId);
      const exists = booksRef.current.some(b => b.id === selectedBookId);
      if (isDeleted || !exists) {
        if (booksRef.current.length > 0) {
          setSelectedBookId(booksRef.current[0].id);
        } else {
          setSelectedBookId('custom');
        }
      }
    }
  }, [selectedDate]);

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

  // Start editing an existing book
  const handleStartEditBook = (book: BookItem) => {
    setEditingBookId(book.id);
    setEditBookTitle(book.title || '');
    setEditBookAuthor(book.author || '');
    setEditBookTotalPages(String(book.totalPages || 250));
    setEditBookCurrentPage(String(book.initialPages ?? book.currentPage ?? 0));
    setIsAddBookMode(false);
  };

  const handleCancelEditBook = () => {
    setEditingBookId(null);
    setEditBookTitle('');
    setEditBookAuthor('');
    setEditBookTotalPages('');
    setEditBookCurrentPage('');
  };

  // Save changes to edited book details (name, author, total pages, start pages)
  const handleSaveEditBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId) return;

    const title = editBookTitle.trim();
    const totalP = parseInt(editBookTotalPages, 10) || 0;
    if (!title || totalP <= 0) return;

    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const targetBook = currentBooks.find(b => b.id === editingBookId);
    if (!targetBook) return;

    const startP = Math.min(totalP, Math.max(0, parseInt(editBookCurrentPage, 10) || 0));

    const updatedBooks = currentBooks.map(b => {
      if (b.id !== editingBookId) return b;
      const updated: BookItem = {
        ...b,
        title,
        totalPages: totalP,
        initialPages: startP,
        status: (b.currentPage || startP) >= totalP ? 'completed' : 'reading'
      };
      if (editBookAuthor.trim()) {
        updated.author = editBookAuthor.trim();
      } else {
        delete updated.author;
      }
      return updated;
    });

    // Update records referencing this book
    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const updatedRecs = currentRecs.map(r => {
      if (r.bookId === editingBookId || (r.bookTitle && r.bookTitle === targetBook.title)) {
        return { ...r, bookTitle: title, bookId: editingBookId };
      }
      return r;
    });

    setBooks(updatedBooks);
    setRecords(updatedRecs);
    persistData(pageGoal, updatedRecs, updatedBooks, selectedBookId);

    // If currently active book was edited, adjust page range limits if needed
    if (selectedBookId === editingBookId) {
      setToPageInput(prev => {
        const val = parseInt(prev, 10) || 20;
        return String(Math.min(totalP, val));
      });
      setFromPageInput(prev => {
        const val = parseInt(prev, 10) || 1;
        return String(Math.min(totalP, val));
      });
    }

    setEditingBookId(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleDeleteBook = (bookId: string) => {
    const nextDeleted = new Set([...Array.from(deletedBookIdsRef.current), bookId]);
    setDeletedBookIds(nextDeleted);
    deletedBookIdsRef.current = nextDeleted;

    const currentRecs = recordsRef.current.length > 0 ? recordsRef.current : records;
    const currentBooks = booksRef.current.length > 0 ? booksRef.current : books;
    const updatedBooks = currentBooks.filter(b => b.id !== bookId);
    setBooks(updatedBooks);

    let nextSelected = selectedBookId;
    if (selectedBookId === bookId) {
      nextSelected = updatedBooks.length > 0 ? updatedBooks[0].id : 'custom';
      setSelectedBookId(nextSelected);
    }
    persistData(pageGoal, currentRecs, updatedBooks, nextSelected, nextDeleted);

    if (selectedBookId === bookId && updatedBooks.length > 0) {
      handleSelectBook(updatedBooks[0].id);
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
      if (p <= 0) return;
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
    const logicalToday = getDhakaLogicalDateKey().dateKey;
    const newRec: ReadingRecord = {
      id: uniqueRecId,
      date: selectedDate || logicalToday,
      bookTitle: title,
      pages: p,
      minutes: 0,
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
    markReadingHabitCompleted(selectedDate || logicalToday);

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
      const nextDeleted = new Set([...Array.from(deletedBookIdsRef.current), targetId]);
      setDeletedBookIds(nextDeleted);
      deletedBookIdsRef.current = nextDeleted;

      const updatedBooks = currentBooks.filter(b => b.id !== targetId);
      setBooks(updatedBooks);

      let nextSelected = selectedBookId;
      if (selectedBookId === targetId) {
        nextSelected = updatedBooks.length > 0 ? updatedBooks[0].id : 'custom';
        setSelectedBookId(nextSelected);
      }
      persistData(pageGoal, currentRecs, updatedBooks, nextSelected, nextDeleted);

      if (selectedBookId === targetId && updatedBooks.length > 0) {
        handleSelectBook(updatedBooks[0].id);
      }
    }

    setDeleteTarget(null);
  };

  const percentGoal = Math.min(100, Math.round((todayPages / (pageGoal || 1)) * 100));
  const activeBookStats = activeBook ? getBookStats(activeBook, records) : null;
  const activeBookPercent = activeBookStats ? activeBookStats.percent : 0;
  const remainingGoalPages = Math.max(0, pageGoal - todayPages);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3.5 pb-6">
      {/* ========================================================================= */}
      {/* 1. DAILY READING TARGET / GOAL SET (One Line Section)                     */}
      {/* ========================================================================= */}
      <div className={cn(
        "px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-2.5 sm:gap-4 relative overflow-hidden",
        darkMode 
          ? "bg-[#18181b]/95 backdrop-blur-xl border-white/[0.08] text-white shadow-xs" 
          : "bg-white backdrop-blur-xl border-black/[0.06] text-gray-900 shadow-xs"
      )}>
        {/* Left: Target Icon + Label + Count */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Target size={15} strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-black tracking-tight text-gray-900 dark:text-white truncate">
              {isBn ? 'দৈনিক লক্ষ্য' : 'Daily Goal'}:
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
              {formatNum(todayPages)}
            </span>
            <span className="text-[11px] sm:text-xs font-mono text-neutral-400 dark:text-neutral-500">
              /{formatNum(pageGoal)} {isBn ? 'পৃ' : 'p'}
            </span>
            {todayPages >= pageGoal && (
              <span className="inline-flex items-center text-[10px] text-emerald-500 font-bold ml-0.5">
                ✓
              </span>
            )}
          </div>
        </div>

        {/* Middle: Inline Progress Bar + Percent */}
        <div className="flex-1 max-w-[140px] sm:max-w-[220px] flex items-center gap-2 min-w-0">
          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden relative shadow-inner">
            <motion.div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                todayPages >= pageGoal
                  ? "bg-gradient-to-r from-indigo-500 to-emerald-400"
                  : "bg-gradient-to-r from-indigo-600 to-violet-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${percentGoal}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
            {formatNum(percentGoal)}%
          </span>
        </div>

        {/* Right: Goal Set Control */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isEditingGoal ? (
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-black/10 dark:border-white/10 shadow-inner">
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
                  "w-11 px-1.5 py-0.5 rounded-md text-xs font-mono font-bold text-center border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                  darkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border-slate-300 text-gray-900"
                )}
              />
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/15 cursor-pointer transition-colors"
              >
                <Check size={13} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingGoal(true)}
              title={isBn ? 'দৈনিক লক্ষ্য সেট করুন' : 'Set daily goal'}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold font-mono transition-all cursor-pointer border shadow-2xs active:scale-95",
                darkMode 
                  ? "bg-white/[0.04] text-indigo-300 border-white/10 hover:bg-white/[0.08] hover:border-indigo-500/30" 
                  : "bg-indigo-50/70 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/80"
              )}
            >
              <span>{isBn ? 'লক্ষ্য সেট' : 'Set Goal'}</span>
              <Edit3 size={10} className="opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CURRENTLY READING BOOK SPOTLIGHT (Big Book Water-Glass Style Progression) */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-3.5",
        darkMode 
          ? "bg-[#18181b]/90 backdrop-blur-xl border-white/[0.08] text-white shadow-[0_12px_36px_rgba(0,0,0,0.35)]" 
          : "bg-white/95 backdrop-blur-xl border-black/[0.06] text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      )}>
        {/* Subtle background ambient corner glow */}
        <div className="absolute top-0 right-0 w-64 h-36 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Currently Reading Badge + Switch Action Button (Edit button removed as requested) */}
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px] sm:text-xs uppercase font-black tracking-wider text-indigo-500 dark:text-indigo-400">
              {isBn ? 'বর্তমানে পড়ছেন' : 'Currently Reading'}
            </span>
            {activeBookStats?.isCompleted && (
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                ✓ {isBn ? 'সম্পন্ন (১০০%)' : 'Completed'}
              </span>
            )}
          </div>

          {/* Switch Book Button (Edit button removed) */}
          <button
            id="open_reading_library_btn"
            type="button"
            onClick={() => {
              setIsLibraryOpen(true);
              setIsAddBookMode(false);
              setEditingBookId(null);
            }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border active:scale-95 shadow-2xs",
              darkMode 
                ? "bg-white/[0.04] text-neutral-300 border-white/10 hover:bg-white/[0.08] hover:text-indigo-400 hover:border-indigo-500/30" 
                : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-indigo-600"
            )}
          >
            <Library size={13} className="text-indigo-500 shrink-0" />
            <span>{isBn ? 'বই বদলান' : 'Switch Book'}</span>
            <span className="text-[10px] opacity-70 font-mono">({formatNum(books.length)})</span>
          </button>
        </div>

        {/* Central Display: Realistic 3D Hardcover Book with Percentage Style Progression (No Water Waves) */}
        <div className="relative my-2 flex flex-col items-center justify-center w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full py-2">
            {/* Left Quick Stat Pill: Remaining Pages */}
            {activeBook && selectedBookId !== 'custom' && activeBookStats && (
              <div className={cn(
                "hidden sm:flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all select-none w-26 h-32 text-center shadow-sm",
                darkMode ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200/80"
              )}>
                <BookOpen size={18} className="text-indigo-500 mb-1.5" />
                <span className="text-lg font-black font-mono text-gray-900 dark:text-white leading-tight">
                  {formatNum(Math.max(0, activeBook.totalPages - activeBookStats.totalRead))}
                </span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                  {isBn ? 'পৃষ্ঠা বাকি' : 'Pages Left'}
                </span>
              </div>
            )}

            {/* REALISTIC 3D PHYSICAL BOOK ARTIFACT */}
            <div className="relative flex items-center justify-center select-none group transition-transform duration-300 hover:scale-[1.02]">
              {/* Stacked Paper Page Block Depth (Right & Bottom Edges) */}
              <div 
                className={cn(
                  "relative w-[185px] sm:w-[220px] h-[245px] sm:h-[285px] rounded-r-2xl rounded-l-md overflow-hidden transition-all duration-300",
                  darkMode 
                    ? "bg-gradient-to-tr from-[#090d1a] via-[#10162a] to-[#18203d] text-white border-y border-r border-amber-400/35 shadow-[7px_7px_0px_#27272a,_14px_14px_32px_rgba(0,0,0,0.65)]" 
                    : "bg-gradient-to-tr from-[#fbf8ee] via-[#f7f2e4] to-[#eee4cd] text-stone-900 border-y border-r border-amber-600/30 shadow-[7px_7px_0px_#dfd5c0,_14px_14px_28px_rgba(0,0,0,0.12)]"
                )}
              >
                {/* 1. Stitched Leather Bound Spine (Left side) */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-6 sm:w-7 z-20 flex flex-col justify-between py-6 items-center",
                  darkMode 
                    ? "bg-gradient-to-r from-black/70 via-indigo-950/90 to-black/40 border-r border-amber-400/30" 
                    : "bg-gradient-to-r from-[#d8c39e] via-[#e2cfaf] to-[#cbb28b] border-r border-amber-600/30"
                )}>
                  <div className={cn("w-3.5 h-0.5 rounded-full shadow-xs", darkMode ? "bg-amber-400/70" : "bg-amber-700/60")} />
                  <div className={cn("w-3.5 h-0.5 rounded-full shadow-xs", darkMode ? "bg-amber-400/70" : "bg-amber-700/60")} />
                  <div className={cn("w-3.5 h-0.5 rounded-full shadow-xs", darkMode ? "bg-amber-400/70" : "bg-amber-700/60")} />
                  <div className={cn("w-3.5 h-0.5 rounded-full shadow-xs", darkMode ? "bg-amber-400/70" : "bg-amber-700/60")} />
                </div>

                {/* 2. Golden Satin Bookmark Ribbon Hanging at Top */}
                <div className="absolute top-0 right-7 sm:right-9 z-30 flex flex-col items-center pointer-events-none">
                  <div className="w-3.5 sm:w-4 h-7 sm:h-9 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-b-xs shadow-md border-x border-amber-200/50" />
                </div>

                {/* 3. Gold Foil Inset Frame on Front Cover */}
                <div className={cn(
                  "absolute inset-y-2.5 right-2.5 left-8 sm:left-9.5 rounded-r-xl rounded-l-xs pointer-events-none border",
                  darkMode ? "border-amber-400/25" : "border-amber-700/25"
                )} />

                {/* 4. Book Cover Content & Percentage Progress Style */}
                <div className="relative z-10 w-full h-full pl-7 sm:pl-8.5 pr-2.5 py-3.5 flex flex-col items-center justify-between text-center">
                  
                  {/* Top: Book Title & Author */}
                  <div className="w-full flex flex-col items-center px-1 pt-1">
                    <span className={cn(
                      "text-[8.5px] font-black tracking-widest uppercase mb-0.5",
                      darkMode ? "text-amber-400/80" : "text-amber-800/80"
                    )}>
                      ✦ {isBn ? 'গ্রন্থ' : 'BOOK'} ✦
                    </span>
                    <h3 className={cn(
                      "font-extrabold text-xs sm:text-sm leading-tight line-clamp-2 w-full",
                      darkMode ? "text-white drop-shadow-md" : "text-stone-900"
                    )}>
                      {selectedBookId === 'custom' 
                        ? (customBookTitle || (isBn ? 'কাস্টম বই' : 'Custom Book')) 
                        : (activeBook?.title || 'Atomic Habits')}
                    </h3>
                    {activeBook?.author && (
                      <p className={cn(
                        "text-[9px] sm:text-[10px] font-medium truncate max-w-[130px] sm:max-w-[155px] mt-0.5",
                        darkMode ? "text-amber-200/90 drop-shadow-sm" : "text-stone-600"
                      )}>
                        {activeBook.author}
                      </p>
                    )}
                  </div>

                  {/* Middle: Elegant Circular Percentage Progress Gauge (Green in both light and dark mode) */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center my-auto drop-shadow-sm">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      {/* Background Track Circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className={darkMode ? "stroke-white/15" : "stroke-stone-300/80"}
                        strokeWidth="7"
                        fill="transparent"
                      />
                      {/* Animated Active Progress Stroke (Green in light & dark mode) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="url(#book-circular-gauge-gradient)"
                        strokeWidth="7"
                        strokeDasharray={238.76}
                        strokeDashoffset={238.76 * (1 - Math.min(100, Math.max(0, activeBookPercent)) / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                      <defs>
                        <linearGradient id="book-circular-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#4ade80" />
                          <stop offset="50%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Percentage Information Inside the Ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className={cn(
                        "text-xl sm:text-2xl font-black font-mono tracking-tight leading-none",
                        darkMode ? "text-emerald-400 drop-shadow-sm" : "text-emerald-600 font-extrabold"
                      )}>
                        {formatNum(activeBookPercent)}%
                      </span>
                      {activeBookStats?.isCompleted ? (
                        <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider mt-1 drop-shadow-xs">
                          ✓ {isBn ? 'সম্পন্ন' : 'DONE'}
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[7.5px] font-black uppercase tracking-widest mt-1",
                          darkMode ? "text-emerald-400/90 drop-shadow-xs" : "text-emerald-700/90 font-bold"
                        )}>
                          {isBn ? 'পড়া' : 'READ'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Pages Read Counter Pill + Mini Cover Progress Bar (Green in light & dark mode) */}
                  <div className="w-full flex flex-col items-center pb-1">
                    <div className={cn(
                      "px-2.5 py-0.5 rounded-full border shadow-2xs",
                      darkMode ? "bg-white/10 border-white/20" : "bg-black/[0.05] border-stone-300/80"
                    )}>
                      <span className={cn(
                        "text-[10px] sm:text-[11px] font-black font-mono leading-none",
                        darkMode ? "text-white" : "text-stone-800"
                      )}>
                        {formatNum(activeBookStats?.totalRead || 0)} / {formatNum(activeBook?.totalPages || 0)} {isBn ? 'পৃ' : 'p'}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-wider mt-0.5",
                      darkMode ? "text-white/75" : "text-stone-600"
                    )}>
                      {isBn ? 'পৃষ্ঠা পড়া হয়েছে' : 'pages read'}
                    </span>

                    {/* Minimalist book cover bottom hairline bar (Green progress) */}
                    <div className={cn(
                      "w-20 sm:w-24 h-1 rounded-full overflow-hidden mt-1.5 shadow-inner",
                      darkMode ? "bg-white/15" : "bg-stone-300/70"
                    )}>
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-400 shadow-sm"
                        style={{ width: `${activeBookPercent}%` }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Right Quick Stat Pill: Total Sessions (Clickable to open all sessions) */}
            {activeBook && selectedBookId !== 'custom' && activeBookStats && (
              <button
                type="button"
                onClick={() => {
                  setBookSessionsSelectedId(selectedBookId);
                  setShowBookSessionsModal(true);
                }}
                className={cn(
                  "hidden sm:flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer w-26 h-32 text-center shadow-sm active:scale-95 group",
                  darkMode 
                    ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-indigo-500/30" 
                    : "bg-slate-50 border-slate-200/80 hover:bg-indigo-50/60 hover:border-indigo-200"
                )}
                title={isBn ? 'এই বইয়ের সকল পূর্ববর্তী সেশন দেখুন' : 'Show all sessions of this book'}
              >
                <Clock size={18} className="text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-black font-mono text-gray-900 dark:text-white leading-tight">
                  {formatNum(activeBookStats.recordsCount)}
                </span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5">
                  {isBn ? 'সেশন' : 'Sessions'}
                </span>
              </button>
            )}
          </div>

          {/* Mobile Quick Stats Strip below the Book */}
          {activeBook && selectedBookId !== 'custom' && activeBookStats && (
            <div className="flex sm:hidden items-center justify-center gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-300">
                {formatNum(Math.max(0, activeBook.totalPages - activeBookStats.totalRead))} {isBn ? 'পৃষ্ঠা বাকি' : 'pages left'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setBookSessionsSelectedId(selectedBookId);
                  setShowBookSessionsModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 active:scale-95 cursor-pointer"
              >
                {formatNum(activeBookStats.recordsCount)} {isBn ? 'সেশন' : 'sessions'}
              </button>
            </div>
          )}
        </div>

        {/* Read intervals/sections tags */}
        {activeBookStats && activeBookStats.intervals.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-[10.5px] text-neutral-500 dark:text-neutral-400 flex-wrap justify-center sm:justify-start">
            <span className="font-bold text-neutral-400 dark:text-neutral-500 shrink-0">
              {isBn ? 'পড়া অংশ:' : 'Sections read:'}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeBookStats.intervals.map(([s, e], idx) => (
                <span 
                  key={idx}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20"
                >
                  {s === e ? `p.${formatNum(s)}` : `p.${formatNum(s)}–${formatNum(e)}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. LOG SESSION CARD (Compact, Clean, Ergonomic UI/UX)                     */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden space-y-3",
        darkMode 
          ? "bg-[#18181b]/95 backdrop-blur-xl border-white/[0.08] text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)]" 
          : "bg-white backdrop-blur-xl border-black/[0.06] text-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.03)]"
      )}>
        {/* Header: Title ('Log Pages') + Segmented Mode Switcher */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Bookmark size={14} strokeWidth={2.5} />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-tight text-gray-900 dark:text-white truncate">
              {isBn ? 'লগ পেজ' : 'Log Pages'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Segmented Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-[10.5px] font-semibold">
              <button
                type="button"
                onClick={() => setUsePageRange(true)}
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                  usePageRange 
                    ? (darkMode ? "bg-white/15 text-white shadow-2xs" : "bg-white text-gray-900 shadow-2xs") 
                    : "text-neutral-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {isBn ? 'হতে-পর্যন্ত' : 'From → To'}
              </button>
              <button
                type="button"
                onClick={() => setUsePageRange(false)}
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                  !usePageRange 
                    ? (darkMode ? "bg-white/15 text-white shadow-2xs" : "bg-white text-gray-900 shadow-2xs") 
                    : "text-neutral-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {isBn ? 'মোট পৃষ্ঠা' : 'Pages'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Inputs: Connected From -> To Row or Direct Pages + Inline Quick Chips */}
        {usePageRange ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Unified From -> To container */}
              <div className={cn(
                "flex-1 flex items-center rounded-xl border transition-all overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40",
                darkMode ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"
              )}>
                {/* From Input */}
                <div className="relative flex-1 flex items-center px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase mr-1.5 shrink-0 select-none">
                    {isBn ? 'হতে' : 'From'}
                  </span>
                  <input
                    id="reading_from_page"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={fromPageInput}
                    onChange={(e) => setFromPageInput(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Arrow Divider */}
                <div className="px-1 text-neutral-300 dark:text-neutral-600 select-none shrink-0 font-mono text-xs">
                  →
                </div>

                {/* To Input */}
                <div className="relative flex-1 flex items-center px-2.5 py-1.5 border-l border-black/[0.05] dark:border-white/[0.06]">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase mr-1.5 shrink-0 select-none">
                    {isBn ? 'পর্যন্ত' : 'To'}
                  </span>
                  <input
                    id="reading_to_page"
                    type="number"
                    min="1"
                    placeholder="20"
                    value={toPageInput}
                    onChange={(e) => setToPageInput(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Increment Preset Chips */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                {isBn ? 'দ্রুত যোগ:' : 'Quick add:'}
              </span>
              <div className="flex items-center gap-1">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => applyQuickPages(num)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer border shadow-2xs active:scale-95",
                      darkMode 
                        ? "bg-white/[0.04] border-white/10 text-neutral-300 hover:bg-white/[0.08] hover:text-indigo-400" 
                        : "bg-slate-100 hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700"
                    )}
                  >
                    +{formatNum(num)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={cn(
              "flex items-center rounded-xl border px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/40",
              darkMode ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"
            )}>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase mr-2 shrink-0 select-none">
                {isBn ? 'পৃষ্ঠা সংখ্যা' : 'Pages Read'}
              </span>
              <input
                id="reading_direct_pages"
                type="number"
                min="1"
                placeholder="10"
                value={directPagesInput}
                onChange={(e) => setDirectPagesInput(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                {isBn ? 'দ্রুত যোগ:' : 'Quick add:'}
              </span>
              <div className="flex items-center gap-1">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => applyQuickPages(num)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer border shadow-2xs active:scale-95",
                      darkMode 
                        ? "bg-white/[0.04] border-white/10 text-neutral-300 hover:bg-white/[0.08] hover:text-indigo-400" 
                        : "bg-slate-100 hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700"
                    )}
                  >
                    +{formatNum(num)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compact Date Row (Clean & Compact on both Mobile & Desktop) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
          <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 uppercase flex items-center gap-1.5 select-none shrink-0">
            <Calendar size={12} className="text-indigo-500" />
            <span>{isBn ? 'তারিখ' : 'Date'}</span>
          </span>
          <div className={cn(
            "flex items-center px-2 py-1 rounded-lg border text-xs transition-all w-32 sm:w-36 shrink-0",
            darkMode ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <input
              id="reading_date_picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono font-medium text-neutral-700 dark:text-neutral-200 focus:outline-none [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
            />
          </div>
        </div>

        {/* Compact, High-Impact Action Button */}
        <button
          id="submit_reading_log_button"
          type="button"
          onClick={handleLogSession}
          disabled={usePageRange && (fromP <= 0 || toP < fromP)}
          className={cn(
            "w-full py-2.5 h-10 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] text-white",
            savedToast 
              ? "bg-emerald-600 shadow-emerald-500/20 ring-2 ring-emerald-400/50" 
              : "bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/25 hover:shadow-indigo-600/35 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {savedToast ? (
            <>
              <Check size={15} strokeWidth={3} className="animate-bounce" />
              <span>{isBn ? 'সংরক্ষিত হয়েছে!' : 'Logged Successfully!'}</span>
            </>
          ) : (
            <>
              <Plus size={15} strokeWidth={2.5} />
              <span>{isBn ? 'লগ পেজ' : 'Log Pages'}</span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECENT SESSIONS TIMELINE (Clean, Modern, Aesthetic List)                */}
      {/* ========================================================================= */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl border space-y-3.5 transition-all duration-300 relative overflow-hidden",
        darkMode 
          ? "bg-[#18181b]/90 backdrop-blur-xl border-white/[0.08] text-white shadow-[0_12px_36px_rgba(0,0,0,0.35)]" 
          : "bg-white/95 backdrop-blur-xl border-black/[0.06] text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      )}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Calendar size={13} strokeWidth={2.5} />
            </div>
            <span>{isBn ? 'সাম্প্রতিক ইতিহাস' : 'Recent Sessions'}</span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBookSessionsSelectedId(selectedBookId);
                setShowBookSessionsModal(true);
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs whitespace-nowrap active:scale-95",
                darkMode
                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/25 hover:text-white"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100"
              )}
              title={isBn ? 'এই বইয়ের সকল পূর্ববর্তী সেশন দেখুন' : 'Show all previous logs of this book'}
            >
              <BookOpen size={12} className="shrink-0" />
              <span>{isBn ? `সেশনসমূহ (${formatNum(records.length)})` : `Sessions (${records.length})`}</span>
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            {isBn ? 'এখনো কোনো পড়ার রেকর্ড নেই।' : 'No reading sessions logged yet.'}
          </div>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 7).map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "p-3 rounded-xl border border-l-[3.5px] border-l-indigo-500 flex items-center justify-between gap-2.5 transition-all group",
                  darkMode 
                    ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06]" 
                    : "bg-slate-50/80 hover:bg-slate-100/90 border-slate-200/70"
                )}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <BookOpen size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{rec.bookTitle}</span>
                      {rec.fromPage !== undefined && rec.toPage !== undefined && (
                        <span className="text-[10px] font-mono font-semibold opacity-60 shrink-0">
                          (p. {formatNum(rec.fromPage)}–{formatNum(rec.toPage)})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium">{formatHistoryDate(rec.date)}</span>
                      {rec.note && <span className="truncate italic text-neutral-400 dark:text-neutral-500">• "{rec.note}"</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
                    +{formatNum(rec.pages)} {isBn ? 'পৃ' : 'pg'}
                  </span>
                  <button
                    type="button"
                    onClick={() => requestDeleteRecord(rec)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
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
      {/* 4b. ALL PREVIOUS SESSIONS FOR SELECTED BOOK MODAL                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBookSessionsModal && (() => {
          const targetSessionBookId = bookSessionsSelectedId || selectedBookId;
          const targetSessionBook = books.find(b => b.id === targetSessionBookId);
          const isCustomSessionTarget = targetSessionBookId === 'custom';
          const targetSessionBookTitle = isCustomSessionTarget 
            ? (customBookTitle.trim() || (isBn ? 'কাস্টম বই' : 'Custom Book')) 
            : (targetSessionBook?.title || 'Atomic Habits');

          const selectedBookPreviousLogs = records.filter(r => {
            if (isCustomSessionTarget) {
              return r.bookId === 'custom' || (!r.bookId && r.bookTitle === targetSessionBookTitle);
            }
            return r.bookId === targetSessionBookId || r.bookTitle === targetSessionBookTitle;
          });

          const selectedBookTotalPagesRead = selectedBookPreviousLogs.reduce((acc, r) => acc + (r.pages || 0), 0);

          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "w-full max-w-md sm:max-w-lg max-h-[72vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-3xl border shadow-2xl space-y-3.5 my-auto",
                  darkMode ? "bg-[#14151b] border-white/10 text-white" : "bg-white border-slate-200 text-gray-900"
                )}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 shrink-0">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <BookOpen size={17} className="text-indigo-500 shrink-0" />
                      <h3 className="font-bold text-sm sm:text-base truncate">
                        {targetSessionBookTitle}
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {isBn ? 'এই বইটির সকল পূর্ববর্তী পড়ার সেশন ও ইতিহাস' : 'All previous reading sessions & logs for this book'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBookSessionsModal(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* Book Switcher Pills if user has books */}
                {books.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                    {books.map(b => {
                      const isSelected = targetSessionBookId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBookSessionsSelectedId(b.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : (darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-gray-700 hover:bg-slate-200")
                          )}
                        >
                          {b.title}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setBookSessionsSelectedId('custom')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border",
                        targetSessionBookId === 'custom'
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : (darkMode ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-gray-700 hover:bg-slate-200")
                      )}
                    >
                      ✏️ {isBn ? 'কাস্টম বই' : 'Custom Book'}
                    </button>
                  </div>
                )}

                {/* Summary Stats Header Card */}
                <div className={cn(
                  "p-3 rounded-xl border flex items-center justify-between text-xs shrink-0",
                  darkMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200/80"
                )}>
                  <div>
                    <span className="text-[10.5px] text-gray-400 block">{isBn ? 'মোট সেশন' : 'Total Sessions'}</span>
                    <span className="font-bold text-sm font-mono text-indigo-500">
                      {formatNum(selectedBookPreviousLogs.length)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-gray-400 block">{isBn ? 'মোট পড়া হয়েছে' : 'Total Read'}</span>
                    <span className="font-bold text-sm font-mono text-emerald-500">
                      {formatNum(selectedBookTotalPagesRead)} {isBn ? 'পৃষ্ঠা' : 'pages'}
                    </span>
                  </div>
                  {targetSessionBook && (
                    <div>
                      <span className="text-[10.5px] text-gray-400 block">{isBn ? 'অগ্রগতি' : 'Progress'}</span>
                      <span className="font-bold text-sm font-mono text-amber-500">
                        {Math.min(100, Math.round((selectedBookTotalPagesRead / (targetSessionBook.totalPages || 1)) * 100))}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Scrollable list of all previous sessions */}
                <div className="overflow-y-auto space-y-2 pr-1 my-1 flex-1 min-h-0">
                  {selectedBookPreviousLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {isBn ? 'এই বইটির জন্য এখনো কোনো পূর্ববর্তী সেশন পাওয়া যায়নি।' : 'No previous reading sessions logged for this book yet.'}
                    </div>
                  ) : (
                    selectedBookPreviousLogs.map((rec) => (
                      <div
                        key={rec.id}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all",
                          darkMode ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70"
                        )}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <BookOpen size={13} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                +{formatNum(rec.pages)} {isBn ? 'পৃষ্ঠা' : 'pages'}
                              </span>
                              {rec.fromPage !== undefined && rec.toPage !== undefined && (
                                <span className="text-[10.5px] font-mono font-medium opacity-70">
                                  (p. {formatNum(rec.fromPage)}–{formatNum(rec.toPage)})
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="shrink-0" />
                              <span>{formatHistoryDate(rec.date)}</span>
                              {rec.note && <span className="truncate italic">• "{rec.note}"</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            requestDeleteRecord(rec);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title={isBn ? 'মুছুন' : 'Delete'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Close Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 shrink-0 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowBookSessionsModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all active:scale-95"
                  >
                    {isBn ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. MINIMAL MODAL / SHEET: LIBRARY & ADD BOOK                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isLibraryOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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
                    {editingBookId
                      ? (isBn ? 'বইয়ের তথ্য সম্পাদনা' : 'Edit Book Details')
                      : isAddBookMode 
                        ? (isBn ? 'নতুন বই যুক্ত করুন' : 'Add New Book') 
                        : (isBn ? 'বইয়ের লাইব্রেরি' : 'Your Book Library')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsLibraryOpen(false);
                    setIsAddBookMode(false);
                    setEditingBookId(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {editingBookId ? (
                  /* Edit Book Form */
                  <form onSubmit={handleSaveEditBook} className="space-y-3">
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-[11px] font-semibold">
                      <Edit3 size={13} className="shrink-0 text-indigo-500" />
                      <span>{isBn ? 'বইয়ের নাম, লেখক ও পৃষ্ঠা সংখ্যা পরিবর্তন করুন' : 'Update book title, author, or page numbers'}</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                        {isBn ? 'বইয়ের নাম (আবশ্যক):' : 'Book Title / Name (Required):'}
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder={isBn ? 'যেমন: পারমাণবিক অভ্যাস' : 'e.g. Deep Work, Sapiens...'}
                        value={editBookTitle}
                        onChange={(e) => setEditBookTitle(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                        )}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                        {isBn ? 'লেখকের নাম:' : 'Author Name:'}
                      </label>
                      <input
                        type="text"
                        placeholder={isBn ? 'যেমন: জেমস ক্লিয়ার' : 'e.g. Cal Newport'}
                        value={editBookAuthor}
                        onChange={(e) => setEditBookAuthor(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                          {isBn ? 'মোট পৃষ্ঠা (আবশ্যক):' : 'Total Pages (Required):'}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="300"
                          value={editBookTotalPages}
                          onChange={(e) => setEditBookTotalPages(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-gray-900"
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                          {isBn ? 'শুরুর পৃষ্ঠা:' : 'Start Page:'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={editBookCurrentPage}
                          onChange={(e) => setEditBookCurrentPage(e.target.value)}
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
                        onClick={handleCancelEditBook}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all",
                          darkMode ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-slate-200 text-gray-600 hover:bg-slate-100"
                        )}
                      >
                        {isBn ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>{isBn ? 'আপডেট করুন' : 'Update Book'}</span>
                      </button>
                    </div>
                  </form>
                ) : isAddBookMode ? (
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
                              onClick={() => handleStartEditBook(b)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                              title={isBn ? 'বইয়ের বিবরণ সম্পাদনা করুন' : 'Edit Book Details'}
                            >
                              <Edit3 size={13} />
                            </button>
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
