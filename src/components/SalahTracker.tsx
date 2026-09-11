/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, 
  Sunrise, 
  Sun, 
  Sunset, 
  Moon, 
  Check, 
  CheckCircle2, 
  Calendar, 
  RotateCcw, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Heart, 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Circle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PrayerStatus = 'not_prayed' | 'prayed_on_time' | 'prayed_jamaat' | 'qaza';

export interface PrayerDetail {
  sunnahMuakkadah?: boolean;
  fard: boolean;
  sunnahGhairMuakkadah?: boolean;
  nafl?: boolean;
  witr?: boolean;
  status: PrayerStatus;
  time?: string;
}

export interface DailySalahRecord {
  date: string; // YYYY-MM-DD
  prayers: {
    fajr: PrayerDetail;
    dhuhr: PrayerDetail;
    asr: PrayerDetail;
    maghrib: PrayerDetail;
    isha: PrayerDetail;
  };
  nafal: {
    tahajjud: { completed: boolean; rakahs: number };
    ishraq: { completed: boolean; rakahs: number };
    awwabin: { completed: boolean; rakahs: number };
    salatutTasbih: { completed: boolean };
    tahiyyatulWuduMasjid: { completed: boolean; rakahs: number };
    customNafal: Array<{ id: string; name: string; rakahs: number; completed: boolean }>;
  };
  azkarChecklist: {
    ayatulKursi: boolean;
    fourQuls: boolean;
    sayyidulIstighfar: boolean;
    morningDhikr: boolean;
    eveningDhikr: boolean;
    duroodDaily: boolean;
  };
  dhikrCounts: Record<string, number>;
  notes?: string;
  updatedAt: number;
}

interface SalahTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
}

interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  meaningEn: string;
  meaningBn: string;
  defaultTarget: number;
}

const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    meaningEn: 'Glory be to Allah',
    meaningBn: 'আল্লাহ পবিত্র ও মহিমান্বিত',
    defaultTarget: 33
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    meaningEn: 'All praise is due to Allah',
    meaningBn: 'সকল প্রশংসা মহান আল্লাহর জন্য',
    defaultTarget: 33
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    meaningEn: 'Allah is the Greatest',
    meaningBn: 'আল্লাহ সর্বশ্রেষ্ঠ',
    defaultTarget: 34
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    meaningEn: 'I seek forgiveness from Allah',
    meaningBn: 'আমি আল্লাহর কাছে ক্ষমা চাই',
    defaultTarget: 100
  },
  {
    id: 'lailahaillallah',
    arabic: 'لَا إِلٰهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illallah',
    meaningEn: 'There is no god but Allah',
    meaningBn: 'আল্লাহ ছাড়া কোনো উপাস্য নেই',
    defaultTarget: 100
  },
  {
    id: 'durood',
    arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ',
    transliteration: 'Sallallahu Alaihi Wasallam',
    meaningEn: 'Peace and blessings be upon him',
    meaningBn: 'তাঁর উপর আল্লাহর রহমত ও শান্তি বর্ষিত হোক',
    defaultTarget: 100
  },
  {
    id: 'subhanallahi_bihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
    transliteration: 'SubhanAllahi wa bihamdihi, SubhanAllahil Azeem',
    meaningEn: 'Glory be to Allah and His praise, Glory be to Allah the Supreme',
    meaningBn: 'আল্লাহর পবিত্রতা ও প্রশংসা বর্ণনা করছি, আল্লাহ মহান',
    defaultTarget: 100
  },
  {
    id: 'hasbunallah',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: 'Hasbunallahu wa ni\'mal wakeel',
    meaningEn: 'Allah is sufficient for us, and He is the best Disposer of affairs',
    meaningBn: 'আল্লাহই আমাদের জন্য যথেষ্ট, তিনি কতই না উত্তম অভিভাবক',
    defaultTarget: 33
  },
  {
    id: 'lahawla',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'La hawla wala quwwata illa billah',
    meaningEn: 'There is no power nor strength except with Allah',
    meaningBn: 'আল্লাহর শক্তি ও সামর্থ্য ছাড়া কোনো ভরসা নেই',
    defaultTarget: 33
  }
];

const DEFAULT_RECORD = (dateStr: string): DailySalahRecord => ({
  date: dateStr,
  prayers: {
    fajr: { fard: false, sunnahMuakkadah: false, status: 'not_prayed' },
    dhuhr: { fard: false, sunnahMuakkadah: false, nafl: false, status: 'not_prayed' },
    asr: { fard: false, sunnahGhairMuakkadah: false, status: 'not_prayed' },
    maghrib: { fard: false, sunnahMuakkadah: false, nafl: false, status: 'not_prayed' },
    isha: { fard: false, sunnahMuakkadah: false, witr: false, nafl: false, status: 'not_prayed' }
  },
  nafal: {
    tahajjud: { completed: false, rakahs: 2 },
    ishraq: { completed: false, rakahs: 2 },
    awwabin: { completed: false, rakahs: 2 },
    salatutTasbih: { completed: false },
    tahiyyatulWuduMasjid: { completed: false, rakahs: 2 },
    customNafal: []
  },
  azkarChecklist: {
    ayatulKursi: false,
    fourQuls: false,
    sayyidulIstighfar: false,
    morningDhikr: false,
    eveningDhikr: false,
    duroodDaily: false
  },
  dhikrCounts: {},
  updatedAt: Date.now()
});

export default function SalahTracker({ darkMode, lang = 'en' }: SalahTrackerProps) {
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

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [recordsMap, setRecordsMap] = useState<Record<string, DailySalahRecord>>({});
  const [activeTasbeehDhikr, setActiveTasbeehDhikr] = useState<string>('subhanallah');
  const [tasbeehTarget, setTasbeehTarget] = useState<number>(33);
  const [tasbeehVibrate, setTasbeehVibrate] = useState<boolean>(true);
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);

  // New custom nafl modal / form states
  const [customNaflName, setCustomNaflName] = useState<string>('');
  const [customNaflRakahs, setCustomNaflRakahs] = useState<number>(2);
  const [showAddCustomNafl, setShowAddCustomNafl] = useState<boolean>(false);

  // Custom Dhikr states
  const [customDhikrName, setCustomDhikrName] = useState<string>('');
  const [customDhikrTarget, setCustomDhikrTarget] = useState<number>(33);
  const [showAddCustomDhikr, setShowAddCustomDhikr] = useState<boolean>(false);
  const [userCustomDhikrs, setUserCustomDhikrs] = useState<Array<{ id: string; title: string; target: number }>>([]);

  // Load from LocalStorage & Firestore
  useEffect(() => {
    try {
      const savedMap = localStorage.getItem('ratbod_salah_records_map');
      if (savedMap) {
        setRecordsMap(JSON.parse(savedMap));
      }
      const savedCustomDhikrs = localStorage.getItem('ratbod_user_custom_dhikrs');
      if (savedCustomDhikrs) {
        setUserCustomDhikrs(JSON.parse(savedCustomDhikrs));
      }
    } catch (e) {
      console.error('Error reading localStorage for Salah Tracker:', e);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid, 'appData', 'salahTracker'));
          if (snap.exists()) {
            const data = snap.data();
            if (data.recordsMap && typeof data.recordsMap === 'object') {
              setRecordsMap(prev => {
                const merged = { ...prev, ...data.recordsMap };
                localStorage.setItem('ratbod_salah_records_map', JSON.stringify(merged));
                return merged;
              });
            }
            if (Array.isArray(data.customDhikrs)) {
              setUserCustomDhikrs(data.customDhikrs);
              localStorage.setItem('ratbod_user_custom_dhikrs', JSON.stringify(data.customDhikrs));
            }
          }
        } catch (e) {
          console.error('Error fetching Firestore salah data:', e);
        }
      }
    });

    return () => unsub();
  }, []);

  // Save changes to LocalStorage & Firestore
  const saveRecord = (updated: DailySalahRecord) => {
    setRecordsMap(prev => {
      const nextMap = { ...prev, [updated.date]: updated };
      try {
        localStorage.setItem('ratbod_salah_records_map', JSON.stringify(nextMap));
      } catch (e) {}

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'salahTracker'), {
          recordsMap: nextMap,
          customDhikrs: userCustomDhikrs,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.error('Firestore save failed:', err));
      }

      return nextMap;
    });
  };

  const saveCustomDhikrs = (newList: Array<{ id: string; title: string; target: number }>) => {
    setUserCustomDhikrs(newList);
    try {
      localStorage.setItem('ratbod_user_custom_dhikrs', JSON.stringify(newList));
    } catch (e) {}
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'salahTracker'), {
        customDhikrs: newList
      }, { merge: true }).catch(() => {});
    }
  };

  // Current day's record
  const currentRecord: DailySalahRecord = useMemo(() => {
    return recordsMap[selectedDate] || DEFAULT_RECORD(selectedDate);
  }, [recordsMap, selectedDate]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateString(d));
  };

  const handleToday = () => {
    setSelectedDate(getLocalDateString());
  };

  // Calculation of Farz completion
  const farzCount = useMemo(() => {
    let count = 0;
    const p = currentRecord.prayers;
    if (p.fajr.fard) count++;
    if (p.dhuhr.fard) count++;
    if (p.asr.fard) count++;
    if (p.maghrib.fard) count++;
    if (p.isha.fard) count++;
    return count;
  }, [currentRecord]);

  // Calculation of Total Dhikr for selected date
  const totalDhikrToday = useMemo(() => {
    return Object.values(currentRecord.dhikrCounts || {}).reduce((a, b) => a + b, 0);
  }, [currentRecord]);

  // Total Nafl Rak'ahs
  const totalNaflRakahs = useMemo(() => {
    let r = 0;
    const n = currentRecord.nafal;
    if (n.tahajjud.completed) r += n.tahajjud.rakahs || 2;
    if (n.ishraq.completed) r += n.ishraq.rakahs || 2;
    if (n.awwabin.completed) r += n.awwabin.rakahs || 2;
    if (n.salatutTasbih.completed) r += 4;
    if (n.tahiyyatulWuduMasjid.completed) r += n.tahiyyatulWuduMasjid.rakahs || 2;
    (n.customNafal || []).forEach(item => {
      if (item.completed) r += (item.rakahs || 2);
    });
    return r;
  }, [currentRecord]);

  // Streak calculation (consecutive days with 5 farz completed)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = getLocalDateString(d);
      const rec = recordsMap[ds];
      if (!rec) {
        if (i === 0) continue; // Today might not be completed yet
        break;
      }
      const p = rec.prayers;
      const completed = p.fajr.fard && p.dhuhr.fard && p.asr.fard && p.maghrib.fard && p.isha.fard;
      if (completed) {
        streak++;
      } else {
        if (i === 0) continue; // Allow today in progress
        break;
      }
    }
    return streak;
  }, [recordsMap]);

  // Toggle Farz Prayer directly
  const toggleFarz = (prayerKey: keyof DailySalahRecord['prayers']) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const current = updated.prayers[prayerKey];
    const nextFard = !current.fard;
    current.fard = nextFard;
    if (nextFard) {
      if (current.status === 'not_prayed') {
        current.status = 'prayed_on_time';
      }
    } else {
      current.status = 'not_prayed';
    }
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Change status of a prayer
  const setPrayerStatus = (prayerKey: keyof DailySalahRecord['prayers'], status: PrayerStatus) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const current = updated.prayers[prayerKey];
    current.status = status;
    current.fard = status !== 'not_prayed';
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Toggle individual sunnah/nafl/witr inside prayer
  const togglePrayerSubPart = (prayerKey: keyof DailySalahRecord['prayers'], part: string) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const current = updated.prayers[prayerKey] as any;
    current[part] = !current[part];
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Toggle Nafl Ibadat
  const toggleNafl = (naflKey: keyof Omit<DailySalahRecord['nafal'], 'customNafal'>) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const target = updated.nafal[naflKey] as any;
    target.completed = !target.completed;
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  const setNaflRakahs = (naflKey: keyof Omit<DailySalahRecord['nafal'], 'customNafal' | 'salatutTasbih'>, rakahs: number) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const target = updated.nafal[naflKey] as any;
    target.rakahs = rakahs;
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Add custom nafl
  const handleAddCustomNafl = () => {
    if (!customNaflName.trim()) return;
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    if (!updated.nafal.customNafal) updated.nafal.customNafal = [];
    updated.nafal.customNafal.push({
      id: 'custom_' + Date.now(),
      name: customNaflName.trim(),
      rakahs: customNaflRakahs || 2,
      completed: true
    });
    updated.updatedAt = Date.now();
    saveRecord(updated);
    setCustomNaflName('');
    setShowAddCustomNafl(false);
  };

  const toggleCustomNafl = (id: string) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    const item = (updated.nafal.customNafal || []).find(x => x.id === id);
    if (item) {
      item.completed = !item.completed;
      updated.updatedAt = Date.now();
      saveRecord(updated);
    }
  };

  const deleteCustomNafl = (id: string) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    updated.nafal.customNafal = (updated.nafal.customNafal || []).filter(x => x.id !== id);
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Toggle Azkar Checklist
  const toggleAzkarCheck = (key: keyof DailySalahRecord['azkarChecklist']) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    updated.azkarChecklist[key] = !updated.azkarChecklist[key];
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Tactile Digital Tasbeeh increment
  const handleTasbeehTap = (dhikrId: string = activeTasbeehDhikr) => {
    if (tasbeehVibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    if (!updated.dhikrCounts) updated.dhikrCounts = {};
    const current = updated.dhikrCounts[dhikrId] || 0;
    updated.dhikrCounts[dhikrId] = current + 1;
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  const handleTasbeehReset = (dhikrId: string) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    if (!updated.dhikrCounts) updated.dhikrCounts = {};
    updated.dhikrCounts[dhikrId] = 0;
    updated.updatedAt = Date.now();
    saveRecord(updated);
  };

  // Add custom dhikr
  const handleAddCustomDhikr = () => {
    if (!customDhikrName.trim()) return;
    const newId = 'dhikr_' + Date.now();
    const newList = [...userCustomDhikrs, { id: newId, title: customDhikrName.trim(), target: customDhikrTarget || 33 }];
    saveCustomDhikrs(newList);
    setCustomDhikrName('');
    setShowAddCustomDhikr(false);
    setActiveTasbeehDhikr(newId);
  };

  // Find active Dhikr meta
  const activeDhikrMeta = useMemo(() => {
    const preset = DHIKR_PRESETS.find(p => p.id === activeTasbeehDhikr);
    if (preset) return preset;
    const custom = userCustomDhikrs.find(c => c.id === activeTasbeehDhikr);
    if (custom) {
      return {
        id: custom.id,
        arabic: 'ذِكْر',
        transliteration: custom.title,
        meaningEn: custom.title,
        meaningBn: custom.title,
        defaultTarget: custom.target
      };
    }
    return DHIKR_PRESETS[0];
  }, [activeTasbeehDhikr, userCustomDhikrs]);

  const activeDhikrCount = currentRecord.dhikrCounts?.[activeTasbeehDhikr] || 0;
  const tasbeehProgress = Math.min(100, Math.round((activeDhikrCount / (tasbeehTarget || 33)) * 100));

  // Collapsible section states for compact mobile experience (auto-expand on desktop)
  const [isNafalExpanded, setIsNafalExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return true;
    return false;
  });
  const [isTasbeehExpanded, setIsTasbeehExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return true;
    return false;
  });
  const [isAzkarExpanded, setIsAzkarExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return true;
    return false;
  });

  const completedAdhkarCount = useMemo(() => {
    if (!currentRecord.azkarChecklist) return 0;
    return Object.values(currentRecord.azkarChecklist).filter(Boolean).length;
  }, [currentRecord.azkarChecklist]);

  // Formatted date string for header
  const formattedDisplayDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const isToday = selectedDate === getLocalDateString();
      const isYesterday = selectedDate === getLocalDateString(new Date(Date.now() - 86400000));

      if (isToday) return isBn ? 'আজ (Today)' : 'Today';
      if (isYesterday) return isBn ? 'গতকাল (Yesterday)' : 'Yesterday';

      return dateObj.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate, isBn]);

  const prayersList: Array<{
    key: keyof DailySalahRecord['prayers'];
    nameEn: string;
    nameBn: string;
    arabic: string;
    icon: React.ElementType;
    breakdown: { labelEn: string; labelBn: string; key: string; rakahs: number }[];
  }> = [
    {
      key: 'fajr',
      nameEn: 'Fajr',
      nameBn: 'ফজর',
      arabic: 'الفجر',
      icon: Sunrise,
      breakdown: [
        { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
        { labelEn: '2 Fard', labelBn: '২ রাকাত ফরজ', key: 'fard', rakahs: 2 }
      ]
    },
    {
      key: 'dhuhr',
      nameEn: 'Dhuhr',
      nameBn: 'যোহর',
      arabic: 'الظهر',
      icon: Sun,
      breakdown: [
        { labelEn: '4 Sunnah Muakkadah', labelBn: '৪ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 4 },
        { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 },
        { labelEn: '2 Sunnah Ba\'diyyah', labelBn: '২ রাকাত পরবর্তী সুন্নত', key: 'nafl', rakahs: 2 }
      ]
    },
    {
      key: 'asr',
      nameEn: 'Asr',
      nameBn: 'আসর',
      arabic: 'العصر',
      icon: Sun,
      breakdown: [
        { labelEn: '4 Sunnah (Ghair Muakkadah)', labelBn: '৪ রাকাত সুন্নত (গায়রে মুয়াক্কাদাহ)', key: 'sunnahGhairMuakkadah', rakahs: 4 },
        { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 }
      ]
    },
    {
      key: 'maghrib',
      nameEn: 'Maghrib',
      nameBn: 'মাগরিব',
      arabic: 'المغرب',
      icon: Sunset,
      breakdown: [
        { labelEn: '3 Fard', labelBn: '৩ রাকাত ফরজ', key: 'fard', rakahs: 3 },
        { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
        { labelEn: '2 Nafl', labelBn: '২ রাকাত নফল', key: 'nafl', rakahs: 2 }
      ]
    },
    {
      key: 'isha',
      nameEn: 'Isha',
      nameBn: 'এশা',
      arabic: 'العشاء',
      icon: Moon,
      breakdown: [
        { labelEn: '4 Sunnah', labelBn: '৪ রাকাত পূর্ববর্তী সুন্নত', key: 'sunnahGhairMuakkadah', rakahs: 4 },
        { labelEn: '4 Fard', labelBn: '৪ রাকাত ফরজ', key: 'fard', rakahs: 4 },
        { labelEn: '2 Sunnah Muakkadah', labelBn: '২ রাকাত সুন্নত (মুয়াক্কাদাহ)', key: 'sunnahMuakkadah', rakahs: 2 },
        { labelEn: '3 Witr Wajib', labelBn: '৩ রাকাত বিতর ওয়াজিব', key: 'witr', rakahs: 3 },
        { labelEn: '2 Nafl', labelBn: '২ রাকাত নফল', key: 'nafl', rakahs: 2 }
      ]
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-5">
      {/* 1. Header Banner with Date & Progress */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all shadow-sm",
        darkMode 
          ? "bg-gradient-to-br from-[#121b18] to-[#161a1e] border-emerald-500/20 text-white" 
          : "bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200 text-gray-900"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Compass size={16} className="text-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-base sm:text-xl font-black tracking-tight flex items-center gap-1.5">
                {isBn ? 'সালাত ও ইবাদত ট্র্যাকার' : 'Salah & Ibadat Tracker'}
                <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  {isBn ? '৫ ওয়াক্ত' : '5 Waqt'}
                </span>
              </h1>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              {isBn 
                ? 'পাঁচ ওয়াক্ত ফরজ সালাত, নফল ইবাদত ও যিকির-আযকার নিয়মিত আদায় করুন।' 
                : 'Track daily five waqt prayers, nafal ibadat, and daily zikar azkar with peace of mind.'}
            </p>
          </div>

          {/* Quick Date Switcher */}
          <div className="flex items-center gap-1 self-start sm:self-auto bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-1 px-1.5 text-[11px] sm:text-xs font-semibold">
              <Calendar size={12} className="text-emerald-500" />
              <span>{formattedDisplayDate}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>
            {selectedDate !== getLocalDateString() && (
              <button
                onClick={handleToday}
                className="ml-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-all cursor-pointer"
              >
                {isBn ? 'আজ' : 'Today'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip: 4 stats in a single compact row on mobile */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2.5 mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-emerald-500/15 text-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/5 dark:bg-black/20 border border-emerald-500/10 min-w-0">
            <div className={cn(
              "w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center font-black text-[11px] sm:text-sm shrink-0",
              farzCount === 5 ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-400"
            )}>
              {formatNum(farzCount)}/৫
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[8px] sm:text-[10px] text-neutral-400 font-medium truncate">
                {isBn ? 'ফরজ সালাত' : 'Fard'}
              </span>
              <span className="font-bold text-[10px] sm:text-xs truncate block">
                {farzCount === 5 ? (isBn ? '৫/৫ ★' : '5/5 ★') : `${formatNum(farzCount)}/5`}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/5 dark:bg-black/20 border border-emerald-500/10 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
              <Flame size={13} className="sm:w-4 sm:h-4 text-amber-500" />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[8px] sm:text-[10px] text-neutral-400 font-medium truncate">
                {isBn ? 'ধারাবাহিক' : 'Streak'}
              </span>
              <span className="font-bold text-[10px] sm:text-xs text-amber-400 truncate block">
                {formatNum(currentStreak)}{isBn ? ' দিন' : 'd'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/5 dark:bg-black/20 border border-emerald-500/10 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-black shrink-0">
              <Sparkles size={13} className="sm:w-4 sm:h-4 text-teal-400" />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[8px] sm:text-[10px] text-neutral-400 font-medium truncate">
                {isBn ? 'নফল রাকাত' : 'Nafl'}
              </span>
              <span className="font-bold text-[10px] sm:text-xs text-teal-400 truncate block">
                {formatNum(totalNaflRakahs)}{isBn ? ' রা' : 'R'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/5 dark:bg-black/20 border border-emerald-500/10 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black shrink-0">
              <Heart size={13} className="sm:w-4 sm:h-4 text-cyan-400" />
            </div>
            <div className="min-w-0 w-full">
              <span className="block text-[8px] sm:text-[10px] text-neutral-400 font-medium truncate">
                {isBn ? 'যিকির' : 'Dhikr'}
              </span>
              <span className="font-bold text-[10px] sm:text-xs text-cyan-400 font-mono truncate block">
                {formatNum(totalDhikrToday)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Five Waqt Salah Section */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-500" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              {isBn ? 'পাঁচ ওয়াক্ত ফরজ সালাত' : 'Five Waqt Farz Salah'}
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400">
            {formatNum(farzCount)} / {formatNum(5)} {isBn ? 'আদায়' : 'Offered'}
          </span>
        </div>

        {/* 5 Prayers Stack */}
        <div className="space-y-2 sm:space-y-2.5">
          {prayersList.map(item => {
            const Icon = item.icon;
            const currentPrayer = currentRecord.prayers[item.key];
            const isFardPrayed = Boolean(currentPrayer.fard);
            const isJamaat = currentPrayer.status === 'prayed_jamaat';
            const isQaza = currentPrayer.status === 'qaza';
            const isExpanded = expandedPrayer === item.key;

            return (
              <div
                key={item.key}
                className={cn(
                  "rounded-lg sm:rounded-xl border transition-all p-2.5 sm:p-3.5",
                  isFardPrayed
                    ? (darkMode ? "bg-emerald-950/20 border-emerald-500/30" : "bg-emerald-50/60 border-emerald-300/80")
                    : (darkMode ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-gray-50/50 border-gray-200 hover:border-gray-300")
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Waqt info */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isFardPrayed 
                        ? "bg-emerald-500 text-white shadow-sm" 
                        : (darkMode ? "bg-white/5 text-neutral-400" : "bg-gray-200 text-gray-600")
                    )}>
                      <Icon size={15} className="sm:w-4 sm:h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-base tracking-tight truncate">
                          {isBn ? item.nameBn : item.nameEn}
                        </span>
                        <span className="text-[10px] sm:text-xs text-neutral-400 font-serif">
                          {item.arabic}
                        </span>
                        {isJamaat && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                            {isBn ? 'জামাআত' : 'Jama\'at'}
                          </span>
                        )}
                        {isQaza && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                            {isBn ? 'কাজা' : 'Qaza'}
                          </span>
                        )}
                      </div>

                      {/* Status Pills */}
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setPrayerStatus(item.key, 'prayed_on_time')}
                          className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer",
                            currentPrayer.status === 'prayed_on_time'
                              ? "bg-emerald-500 text-white shadow-xs font-bold"
                              : "text-neutral-400 hover:text-white bg-black/5 dark:bg-white/5"
                          )}
                        >
                          {isBn ? 'সময়মত' : 'On Time'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrayerStatus(item.key, 'prayed_jamaat')}
                          className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer",
                            currentPrayer.status === 'prayed_jamaat'
                              ? "bg-emerald-600 text-white shadow-xs font-bold"
                              : "text-neutral-400 hover:text-white bg-black/5 dark:bg-white/5"
                          )}
                        >
                          {isBn ? 'জামাআতে' : 'In Jama\'at'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrayerStatus(item.key, 'qaza')}
                          className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer",
                            currentPrayer.status === 'qaza'
                              ? "bg-amber-500 text-white shadow-xs font-bold"
                              : "text-neutral-400 hover:text-white bg-black/5 dark:bg-white/5"
                          )}
                        >
                          {isBn ? 'কাজা' : 'Qaza'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Farz Toggle & Details Accordion Toggle */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleFarz(item.key)}
                      className={cn(
                        "flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs transition-all cursor-pointer active:scale-95",
                        isFardPrayed
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                          : (darkMode ? "bg-white/10 text-neutral-300 hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                      )}
                    >
                      {isFardPrayed ? (
                        <>
                          <Check size={13} className="stroke-[3]" />
                          <span>{isBn ? 'আদায়' : 'Prayed'}</span>
                        </>
                      ) : (
                        <>
                          <Circle size={13} />
                          <span>{isBn ? 'আদায়' : 'Mark Done'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedPrayer(isExpanded ? null : item.key)}
                      className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Toggle rak'ahs breakdown"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Granular Rak'ah Breakdown Details */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                    {item.breakdown.map(sub => {
                      const isSubChecked = Boolean((currentPrayer as any)[sub.key]);
                      return (
                        <button
                          key={sub.key}
                          type="button"
                          onClick={() => togglePrayerSubPart(item.key, sub.key)}
                          className={cn(
                            "flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer text-left",
                            isSubChecked
                              ? (darkMode ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-800")
                              : (darkMode ? "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100")
                          )}
                        >
                          <span className="font-medium">{isBn ? sub.labelBn : sub.labelEn}</span>
                          <span className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                            isSubChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-500"
                          )}>
                            {isSubChecked && <Check size={10} className="stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Nafal Ibadat Section */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl border transition-all overflow-hidden shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-gray-200"
      )}>
        <button
          type="button"
          onClick={() => setIsNafalExpanded(!isNafalExpanded)}
          className="w-full p-3 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-400" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              {isBn ? 'নফল ইবাদত ও সালাত' : 'Nafal Ibadat & Voluntary Prayers'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
              {formatNum(totalNaflRakahs)} {isBn ? 'রাকাত আদায়' : 'Rakahs Today'}
            </span>
            <div className="p-1 rounded-lg text-neutral-400">
              {isNafalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </button>

        {isNafalExpanded && (
          <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {/* Tahajjud */}
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                currentRecord.nafal.tahajjud.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : "bg-teal-50/60 border-teal-300")
                  : (darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-200")
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      {isBn ? 'তাহাজ্জুদ সালাত' : 'Tahajjud (Qiyam al-Layl)'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-neutral-400">
                      {isBn ? 'রাতের শেষ তৃতীয়াংশের সালাত' : 'Night vigil prayer before Fajr'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('tahajjud')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.tahajjud.completed
                        ? "bg-teal-500 text-white shadow-sm"
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300")
                    )}
                  >
                    {currentRecord.nafal.tahajjud.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.tahajjud.completed && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/10 text-xs">
                    <span className="text-neutral-400 text-[10px] sm:text-[11px]">{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 8, 12].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('tahajjud', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                          currentRecord.nafal.tahajjud.rakahs === r
                            ? "bg-teal-500 text-white"
                            : "bg-white/10 text-neutral-400 hover:text-white"
                        )}
                      >
                        {formatNum(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ishraq / Duha */}
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                currentRecord.nafal.ishraq.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : "bg-teal-50/60 border-teal-300")
                  : (darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-200")
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      {isBn ? 'ইশরাক ও চাশত / দুহা' : 'Ishraq & Duha (Chasht)'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-neutral-400">
                      {isBn ? 'সূর্যোদয়ের পরের বরকতময় সালাত' : 'Morning forenoon prayer'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('ishraq')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.ishraq.completed
                        ? "bg-teal-500 text-white shadow-sm"
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300")
                    )}
                  >
                    {currentRecord.nafal.ishraq.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.ishraq.completed && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/10 text-xs">
                    <span className="text-neutral-400 text-[10px] sm:text-[11px]">{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 8].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('ishraq', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                          currentRecord.nafal.ishraq.rakahs === r
                            ? "bg-teal-500 text-white"
                            : "bg-white/10 text-neutral-400 hover:text-white"
                        )}
                      >
                        {formatNum(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Awwabin */}
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                currentRecord.nafal.awwabin.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : "bg-teal-50/60 border-teal-300")
                  : (darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-200")
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      {isBn ? 'আউওয়াবিন সালাত' : 'Awwabin Prayer'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-neutral-400">
                      {isBn ? 'মাগরিবের পর ২ থেকে ৬ রাকাত' : '2-6 rakahs after Maghrib'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('awwabin')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.awwabin.completed
                        ? "bg-teal-500 text-white shadow-sm"
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300")
                    )}
                  >
                    {currentRecord.nafal.awwabin.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.awwabin.completed && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/10 text-xs">
                    <span className="text-neutral-400 text-[10px] sm:text-[11px]">{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 6].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('awwabin', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                          currentRecord.nafal.awwabin.rakahs === r
                            ? "bg-teal-500 text-white"
                            : "bg-white/10 text-neutral-400 hover:text-white"
                        )}
                      >
                        {formatNum(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Salatut Tasbih */}
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                currentRecord.nafal.salatutTasbih.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : "bg-teal-50/60 border-teal-300")
                  : (darkMode ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-200")
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      {isBn ? 'সালাতুত তাসবীহ (৪ রাকাত)' : 'Salatut Tasbih (4 Rakahs)'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-neutral-400">
                      {isBn ? '৩০০ বার তাসবীহ পাঠের সালাত' : 'Special 300 tasbeeh prayer'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('salatutTasbih')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.salatutTasbih.completed
                        ? "bg-teal-500 text-white shadow-sm"
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300")
                    )}
                  >
                    {currentRecord.nafal.salatutTasbih.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Nafl List */}
            {(currentRecord.nafal.customNafal || []).length > 0 && (
              <div className="mt-2.5 space-y-1.5 pt-2.5 border-t border-white/10">
                {(currentRecord.nafal.customNafal || []).map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs",
                      item.completed 
                        ? (darkMode ? "bg-teal-950/20 border-teal-500/30 text-teal-300" : "bg-teal-50 border-teal-300 text-teal-900")
                        : (darkMode ? "bg-white/5 border-white/5 text-neutral-400" : "bg-gray-50 border-gray-200 text-gray-600")
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCustomNafl(item.id)}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer",
                          item.completed ? "bg-teal-500 border-teal-500 text-white" : "border-neutral-500"
                        )}
                      >
                        {item.completed && <Check size={12} className="stroke-[3]" />}
                      </button>
                      <span className="font-bold">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">
                        {formatNum(item.rakahs)} {isBn ? 'রাকাত' : 'rakahs'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCustomNafl(item.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Nafl Button */}
            {!showAddCustomNafl ? (
              <button
                type="button"
                onClick={() => setShowAddCustomNafl(true)}
                className="w-full py-1.5 sm:py-2 rounded-xl border border-dashed border-teal-500/30 hover:border-teal-500/60 text-teal-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>{isBn ? 'অন্যান্য নফল / কাজা উমরি যোগ করুন' : 'Add Custom Nafl / Qada Prayer'}</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-teal-500/30 bg-black/5 dark:bg-black/20 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isBn ? 'সালাতের নাম (উদাঃ তাহিয়্যাতুল ওযু)' : 'Prayer name (e.g. Salatul Hajat)'}
                    value={customNaflName}
                    onChange={e => setCustomNaflName(e.target.value)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[38px]",
                      darkMode ? "bg-black/40 border-white/10 text-white placeholder:text-neutral-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    )}
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customNaflRakahs}
                    onChange={e => setCustomNaflRakahs(Number(e.target.value))}
                    className={cn(
                      "w-20 px-2 py-2 rounded-xl text-xs sm:text-sm font-bold text-center font-mono border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[38px]",
                      darkMode ? "bg-black/40 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                    )}
                    placeholder="Rakahs"
                  />
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomNafl(false)}
                    className="px-3 py-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomNafl}
                    className="px-3 py-1 rounded-lg bg-teal-500 text-white font-bold hover:bg-teal-600 transition-colors cursor-pointer"
                  >
                    {isBn ? 'যুক্ত করুন' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Digital Tasbeeh & Zikar Azkar Section */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl border transition-all overflow-hidden shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-gray-200"
      )}>
        <div className="p-3 sm:p-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsTasbeehExpanded(!isTasbeehExpanded)}
            className="flex-1 flex items-center justify-between cursor-pointer text-left mr-2 min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Heart size={16} className="text-cyan-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                {isBn ? 'যিকির ও ডিজিটাল তাসবীহ' : 'Zikar Azkar & Digital Tasbeeh'}
              </h2>
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono shrink-0 ml-2 hidden xs:inline-block truncate max-w-[140px]">
              {activeDhikrMeta.transliteration}: {formatNum(activeDhikrCount)}/{formatNum(tasbeehTarget)}
            </span>
          </button>
          
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTasbeehVibrate(!tasbeehVibrate)}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                tasbeehVibrate ? "text-cyan-400 bg-cyan-500/10" : "text-neutral-500 hover:text-neutral-400"
              )}
              title={tasbeehVibrate ? "Haptic ON" : "Haptic OFF"}
            >
              {tasbeehVibrate ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setIsTasbeehExpanded(!isTasbeehExpanded)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
            >
              {isTasbeehExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isTasbeehExpanded && (
          <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-white/5 space-y-4">
            {/* Tactile Interactive Tasbeeh Unit */}
            <div className={cn(
              "rounded-xl sm:rounded-2xl p-3 sm:p-5 border flex flex-col items-center justify-center text-center transition-all shadow-inner",
              darkMode ? "bg-gradient-to-b from-[#141b22] to-[#0d1217] border-cyan-500/20" : "bg-gradient-to-b from-cyan-50/70 to-teal-50/40 border-cyan-200"
            )}>
              {/* Active Dhikr Title */}
              <div className="mb-1 max-w-sm">
                <span className="text-base sm:text-2xl font-serif text-cyan-400 block mb-0.5">
                  {activeDhikrMeta.arabic}
                </span>
                <span className="text-xs sm:text-sm font-black tracking-tight block">
                  {activeDhikrMeta.transliteration}
                </span>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 line-clamp-1">
                  {isBn ? activeDhikrMeta.meaningBn : activeDhikrMeta.meaningEn}
                </span>
              </div>

              {/* Responsive Bead Button */}
              <button
                type="button"
                onClick={() => handleTasbeehTap(activeTasbeehDhikr)}
                className="relative my-2 sm:my-3 w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 flex flex-col items-center justify-center transition-all cursor-pointer select-none group shadow-[0_0_30px_rgba(6,182,212,0.2)]"
              >
                <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white group-hover:text-cyan-300 drop-shadow">
                  {formatNum(activeDhikrCount)}
                </span>
                <span className="text-[9px] sm:text-xs font-bold text-cyan-400 uppercase tracking-widest mt-1">
                  {isBn ? 'ট্যাপ করুন' : 'Tap Bead'}
                </span>
                <div className="text-[9px] sm:text-[10px] text-neutral-400 font-mono">
                  / {formatNum(tasbeehTarget)}
                </div>
              </button>

              {/* Target Preset Selectors & Reset */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] sm:text-[11px] text-neutral-400">{isBn ? 'টার্গেট:' : 'Target:'}</span>
                {[33, 100, 300, 1000].map(tg => (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => setTasbeehTarget(tg)}
                    className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer font-mono",
                      tasbeehTarget === tg
                        ? "bg-cyan-500 text-white shadow-xs"
                        : "bg-black/10 dark:bg-white/5 text-neutral-400 hover:text-white"
                    )}
                  >
                    {formatNum(tg)}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleTasbeehReset(activeTasbeehDhikr)}
                  className="ml-1.5 p-1 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Reset Counter"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Quick Dhikr List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-extrabold text-neutral-300 text-[11px] sm:text-xs">
                  {isBn ? 'দৈনন্দিন মাসনুন যিকির তালিকা' : 'Daily Masnoon Dhikr Selection'}
                </span>
                <span className="text-[9px] sm:text-[10px] text-neutral-400">
                  {isBn ? 'ট্যাপ করে সেট করুন' : 'Tap to set in tasbeeh'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {DHIKR_PRESETS.map(preset => {
                  const count = currentRecord.dhikrCounts?.[preset.id] || 0;
                  const isSelected = activeTasbeehDhikr === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setActiveTasbeehDhikr(preset.id);
                        setTasbeehTarget(preset.defaultTarget);
                      }}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2",
                        isSelected
                          ? (darkMode ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm" : "bg-cyan-50 border-cyan-300")
                          : (darkMode ? "bg-white/[0.02] border-white/5 hover:bg-white/5" : "bg-gray-50 border-gray-200 hover:bg-gray-100")
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate">
                            {preset.transliteration}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-neutral-400 block truncate">
                          {isBn ? preset.meaningBn : preset.meaningEn}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold font-mono px-1.5 sm:px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-cyan-300">
                          {formatNum(count)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTasbeehTap(preset.id)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500 text-white font-bold text-xs flex items-center justify-center hover:bg-cyan-600 active:scale-90 transition-all cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* User Custom Dhikrs */}
                {userCustomDhikrs.map(custom => {
                  const count = currentRecord.dhikrCounts?.[custom.id] || 0;
                  const isSelected = activeTasbeehDhikr === custom.id;

                  return (
                    <div
                      key={custom.id}
                      onClick={() => {
                        setActiveTasbeehDhikr(custom.id);
                        setTasbeehTarget(custom.target);
                      }}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2",
                        isSelected
                          ? (darkMode ? "bg-cyan-950/30 border-cyan-500/50" : "bg-cyan-50 border-cyan-300")
                          : (darkMode ? "bg-white/[0.02] border-white/5 hover:bg-white/5" : "bg-gray-50 border-gray-200")
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs truncate block">{custom.title}</span>
                        <span className="text-[9px] sm:text-[10px] text-neutral-400">Target: {formatNum(custom.target)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-bold font-mono px-1.5 sm:px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-cyan-300">
                          {formatNum(count)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTasbeehTap(custom.id)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500 text-white font-bold text-xs flex items-center justify-center hover:bg-cyan-600 active:scale-90 transition-all cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Dhikr Modal Toggle */}
              {!showAddCustomDhikr ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomDhikr(true)}
                  className="w-full py-1.5 rounded-xl border border-dashed border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{isBn ? 'কাস্টম যিকির যোগ করুন' : 'Add Custom Dhikr'}</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-cyan-500/30 bg-black/5 dark:bg-black/20 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isBn ? 'যিকিরের নাম (উদাঃ দরূদ ইব্রাহিম)' : 'Dhikr name (e.g. Durood Ibrahimi)'}
                      value={customDhikrName}
                      onChange={e => setCustomDhikrName(e.target.value)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[38px]",
                        darkMode ? "bg-black/40 border-white/10 text-white placeholder:text-neutral-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      )}
                    />
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={customDhikrTarget}
                      onChange={e => setCustomDhikrTarget(Number(e.target.value))}
                      className={cn(
                        "w-24 px-2 py-2 rounded-xl text-xs sm:text-sm font-bold text-center font-mono border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[38px]",
                        darkMode ? "bg-black/40 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                      )}
                      placeholder="Target"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomDhikr(false)}
                      className="px-3 py-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomDhikr}
                      className="px-3 py-1 rounded-lg bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-colors cursor-pointer"
                    >
                      {isBn ? 'যুক্ত করুন' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Daily Protective Azkar Checklist */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl border transition-all overflow-hidden shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-gray-200"
      )}>
        <button
          type="button"
          onClick={() => setIsAzkarExpanded(!isAzkarExpanded)}
          className="w-full p-3 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              {isBn ? 'দৈনন্দিন মাসনুন আযকার চেকলিস্ট' : 'Daily Masnoon Adhkar Checklist'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              {formatNum(completedAdhkarCount)} / {formatNum(6)} {isBn ? 'সম্পূর্ণ' : 'Done'}
            </span>
            <div className="p-1 rounded-lg text-neutral-400">
              {isAzkarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </button>

        {isAzkarExpanded && (
          <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs">
              {[
                { key: 'ayatulKursi', labelEn: 'Ayat-ul-Kursi after Farz Prayers', labelBn: 'ফরজ সালাতের পর আয়াতুল কুরসী' },
                { key: 'fourQuls', labelEn: '4 Qul Surahs (Morning & Evening)', labelBn: '৪ কুল (সকাল ও সন্ধ্যার ৩ বার পাঠ)' },
                { key: 'sayyidulIstighfar', labelEn: 'Sayyidul Istighfar (Best repentance)', labelBn: 'সাইয়্যিদুল ইস্তিগফার পাঠ' },
                { key: 'morningDhikr', labelEn: 'Morning Protective Adhkar', labelBn: 'সকালের সুরক্ষামূলক আযকার' },
                { key: 'eveningDhikr', labelEn: 'Evening Protective Adhkar', labelBn: 'সন্ধ্যার সুরক্ষামূলক আযকার' },
                { key: 'duroodDaily', labelEn: 'Daily Durood Sharif (100x)', labelBn: 'দৈনিক ১০০ বার দরূদ শরীফ পাঠ' }
              ].map(item => {
                const isChecked = Boolean(currentRecord.azkarChecklist[item.key as keyof DailySalahRecord['azkarChecklist']]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleAzkarCheck(item.key as keyof DailySalahRecord['azkarChecklist'])}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer text-left",
                      isChecked
                        ? (darkMode ? "bg-amber-500/15 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900")
                        : (darkMode ? "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/5" : "bg-gray-50 border-gray-200 text-gray-700")
                    )}
                  >
                    <span className="font-semibold text-xs pr-2">
                      {isBn ? item.labelBn : item.labelEn}
                    </span>
                    <span className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors",
                      isChecked ? "bg-amber-500 border-amber-500 text-white" : "border-neutral-500"
                    )}>
                      {isChecked && <Check size={12} className="stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
