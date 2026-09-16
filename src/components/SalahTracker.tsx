/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
  Circle,
  Palette,
  Smartphone
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SalahTheme = 'clarity' | 'emerald' | 'indigo' | 'sand';

export const SALAH_THEMES: Record<SalahTheme, {
  nameBn: string;
  nameEn: string;
  dotColor: string;
  bannerBg: string;
  bannerBorder: string;
  bannerTitle: string;
  bannerSubtitle: string;
  badge: string;
  iconBox: string;
  iconText: string;
  dateBox: string;
  dateHover: string;
  todayBtn: string;
  statsBorder: string;
  statCard: string;
  farzStatDone: string;
  farzStatPending: string;
  farzStatText: string;
  // Waqt section
  waqtClockIcon: string;
  waqtTitle: string;
  waqtCountBadge: string;
  prayerCardDone: string;
  prayerCardIdle: string;
  prayerIconDone: string;
  prayerIconIdle: string;
  prayerNameDone: string;
  prayerNameIdle: string;
  prayerArabic: string;
  jamaatBadge: string;
  qazaBadge: string;
  statusOnTime: string;
  statusJamaat: string;
  statusQaza: string;
  statusIdle: string;
  prayerBtnDone: string;
  prayerBtnIdle: string;
  expandBtn: string;
  subPartDone: string;
  subPartCheck: string;
  subPartIdle: string;
  // Nafl section
  nafalIcon: string;
  nafalBadge: string;
  nafalDone: string;
  nafalIdle: string;
  nafalBtnDone: string;
  nafalBtnIdle: string;
  nafalPillDone: string;
  nafalPillIdle: string;
  nafalAddBtn: string;
  // Tasbeeh section
  tasbeehIcon: string;
  tasbeehBadge: string;
  tasbeehVibrateActive: string;
  tasbeehUnitBg: string;
  tasbeehArabic: string;
  tasbeehBead: string;
  tasbeehTargetActive: string;
  tasbeehTargetIdle: string;
  tasbeehItemDone: string;
  tasbeehItemIdle: string;
  tasbeehCountBadge: string;
  tasbeehPlusBtn: string;
  tasbeehAddBtn: string;
  // Adhkar section
  adhkarIcon: string;
  adhkarBadge: string;
  adhkarDone: string;
  adhkarCheck: string;
  adhkarIdle: string;
}> = {
  clarity: {
    nameBn: 'হাই-কন্ট্রাস্ট',
    nameEn: 'Pure Clarity',
    dotColor: 'bg-emerald-700',
    bannerBg: 'bg-white border-slate-300 text-slate-900 shadow-sm',
    bannerBorder: 'border-slate-300',
    bannerTitle: 'text-slate-950 font-black',
    bannerSubtitle: 'text-slate-700 font-semibold',
    badge: 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-bold',
    iconBox: 'bg-emerald-700 text-white shadow-xs',
    iconText: 'text-emerald-700',
    dateBox: 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs font-bold',
    dateHover: 'text-slate-900 hover:text-black hover:bg-slate-200/90 font-bold',
    todayBtn: 'bg-emerald-700 text-white hover:bg-emerald-800 font-bold shadow-xs',
    statsBorder: 'border-slate-300',
    statCard: 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs',
    farzStatDone: 'bg-emerald-700 text-white shadow-xs font-black',
    farzStatPending: 'bg-slate-200 text-slate-900 font-bold',
    farzStatText: 'text-slate-950 font-black',
    // Waqt section
    waqtClockIcon: 'text-emerald-700',
    waqtTitle: 'text-slate-950 font-black',
    waqtCountBadge: 'text-slate-700 font-bold',
    prayerCardDone: 'bg-emerald-50/90 border-emerald-400 shadow-xs',
    prayerCardIdle: 'bg-white border-slate-300 hover:border-slate-400 shadow-xs',
    prayerIconDone: 'bg-emerald-700 text-white shadow-sm',
    prayerIconIdle: 'bg-slate-100 text-slate-800 border border-slate-200',
    prayerNameDone: 'text-emerald-950 font-black',
    prayerNameIdle: 'text-slate-950 font-extrabold',
    prayerArabic: 'text-slate-700 font-bold',
    jamaatBadge: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black',
    qazaBadge: 'bg-amber-100 text-amber-950 border-amber-400 font-black',
    statusOnTime: 'bg-emerald-700 text-white shadow-xs font-black',
    statusJamaat: 'bg-emerald-900 text-white shadow-xs font-black',
    statusQaza: 'bg-amber-700 text-white shadow-xs font-black',
    statusIdle: 'text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold',
    prayerBtnDone: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm font-black',
    prayerBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    expandBtn: 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-bold',
    subPartDone: 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-black shadow-xs',
    subPartCheck: 'bg-emerald-700 border-emerald-700 text-white',
    subPartIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-semibold shadow-xs',
    // Nafl section
    nafalIcon: 'text-teal-700',
    nafalBadge: 'text-teal-950 bg-teal-100 border-teal-400 font-bold',
    nafalDone: 'bg-teal-50/90 border-teal-400 shadow-xs',
    nafalIdle: 'bg-white border-slate-300 hover:border-slate-400 shadow-xs',
    nafalBtnDone: 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm font-bold',
    nafalBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    nafalPillDone: 'bg-teal-700 text-white shadow-xs font-bold',
    nafalPillIdle: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 font-semibold',
    nafalAddBtn: 'border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold shadow-xs',
    // Tasbeeh section
    tasbeehIcon: 'text-emerald-700',
    tasbeehBadge: 'text-emerald-950 bg-emerald-100 border-emerald-400 font-bold',
    tasbeehVibrateActive: 'text-emerald-950 bg-emerald-100 font-black',
    tasbeehUnitBg: 'bg-white border-slate-300 shadow-sm',
    tasbeehArabic: 'text-slate-950 font-black',
    tasbeehBead: 'border-emerald-700 hover:border-emerald-800 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-bold',
    tasbeehTargetActive: 'bg-emerald-700 text-white shadow-xs font-bold',
    tasbeehTargetIdle: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold',
    tasbeehItemDone: 'bg-emerald-50/90 border-emerald-400 shadow-xs',
    tasbeehItemIdle: 'bg-white border-slate-300 hover:border-slate-400',
    tasbeehCountBadge: 'bg-slate-100 text-slate-950 border-slate-300 shadow-xs font-bold',
    tasbeehPlusBtn: 'bg-emerald-700 text-white font-black hover:bg-emerald-800 transition-all shadow-xs',
    tasbeehAddBtn: 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold shadow-xs',
    // Adhkar section
    adhkarIcon: 'text-amber-700',
    adhkarBadge: 'text-amber-950 bg-amber-100 border-amber-400 font-bold',
    adhkarDone: 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold shadow-xs',
    adhkarCheck: 'bg-amber-700 border-amber-700 text-white',
    adhkarIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-semibold shadow-xs',
  },
  emerald: {
    nameBn: 'মরুদ্যান এমারেল্ড',
    nameEn: 'Emerald Oasis',
    dotColor: 'bg-emerald-600',
    bannerBg: 'bg-white border-emerald-300 text-slate-900 shadow-xs',
    bannerBorder: 'border-emerald-300',
    bannerTitle: 'text-emerald-950 font-black',
    bannerSubtitle: 'text-slate-700 font-semibold',
    badge: 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold',
    iconBox: 'bg-emerald-600 text-white shadow-xs',
    iconText: 'text-emerald-700',
    dateBox: 'bg-white border-emerald-300 text-slate-900 shadow-xs font-bold',
    dateHover: 'text-slate-800 hover:text-slate-950 hover:bg-emerald-50',
    todayBtn: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs font-bold',
    statsBorder: 'border-emerald-200',
    statCard: 'bg-white border-emerald-300 shadow-xs',
    farzStatDone: 'bg-emerald-700 text-white shadow-xs font-black',
    farzStatPending: 'bg-emerald-100 text-emerald-950 font-bold',
    farzStatText: 'text-slate-950 font-black',
    // Waqt section
    waqtClockIcon: 'text-emerald-700',
    waqtTitle: 'text-slate-950 font-black',
    waqtCountBadge: 'text-slate-700 font-bold',
    prayerCardDone: 'bg-emerald-50/90 border-emerald-400 shadow-xs',
    prayerCardIdle: 'bg-white border-slate-300 hover:border-emerald-300 shadow-xs',
    prayerIconDone: 'bg-emerald-700 text-white shadow-sm',
    prayerIconIdle: 'bg-slate-100 text-slate-800 border border-slate-200',
    prayerNameDone: 'text-emerald-950 font-black',
    prayerNameIdle: 'text-slate-950 font-extrabold',
    prayerArabic: 'text-slate-700 font-bold',
    jamaatBadge: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold',
    qazaBadge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    statusOnTime: 'bg-emerald-700 text-white shadow-xs font-bold',
    statusJamaat: 'bg-emerald-900 text-white shadow-xs font-bold',
    statusQaza: 'bg-amber-700 text-white shadow-xs font-bold',
    statusIdle: 'text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold',
    prayerBtnDone: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm font-bold',
    prayerBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    expandBtn: 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-bold',
    subPartDone: 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-xs',
    subPartCheck: 'bg-emerald-700 border-emerald-700 text-white',
    subPartIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-medium shadow-xs',
    // Nafl section
    nafalIcon: 'text-teal-700',
    nafalBadge: 'text-teal-950 bg-teal-50 border-teal-300 font-bold',
    nafalDone: 'bg-teal-50/90 border-teal-400 shadow-xs',
    nafalIdle: 'bg-white border-slate-300 hover:border-teal-300 shadow-xs',
    nafalBtnDone: 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm font-bold',
    nafalBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    nafalPillDone: 'bg-teal-700 text-white shadow-xs font-bold',
    nafalPillIdle: 'bg-white text-slate-800 border border-slate-300 hover:bg-teal-50 hover:text-teal-950 font-semibold',
    nafalAddBtn: 'border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold shadow-xs',
    // Tasbeeh section
    tasbeehIcon: 'text-teal-700',
    tasbeehBadge: 'text-teal-950 bg-teal-50 border-teal-300 font-bold',
    tasbeehVibrateActive: 'text-teal-950 bg-teal-100 font-bold',
    tasbeehUnitBg: 'bg-white border-teal-300 shadow-sm',
    tasbeehArabic: 'text-slate-950 font-black',
    tasbeehBead: 'border-teal-700 hover:border-teal-800 bg-teal-700 text-white shadow-md font-bold',
    tasbeehTargetActive: 'bg-teal-700 text-white shadow-xs font-bold',
    tasbeehTargetIdle: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold',
    tasbeehItemDone: 'bg-teal-50/90 border-teal-400 shadow-xs',
    tasbeehItemIdle: 'bg-white border-slate-300 hover:border-teal-300',
    tasbeehCountBadge: 'bg-slate-100 text-slate-950 border-slate-300 shadow-xs font-bold',
    tasbeehPlusBtn: 'bg-teal-700 text-white font-black hover:bg-teal-800 transition-all shadow-xs',
    tasbeehAddBtn: 'border-teal-400 bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold shadow-xs',
    // Adhkar section
    adhkarIcon: 'text-amber-600',
    adhkarBadge: 'text-amber-950 bg-amber-50 border-amber-300 font-bold',
    adhkarDone: 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold shadow-xs',
    adhkarCheck: 'bg-amber-600 border-amber-600 text-white',
    adhkarIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-medium',
  },
  indigo: {
    nameBn: 'রয়েল ইন্দিগো',
    nameEn: 'Royal Indigo',
    dotColor: 'bg-indigo-600',
    bannerBg: 'bg-white border-indigo-200 text-slate-900 shadow-xs',
    bannerBorder: 'border-indigo-200',
    bannerTitle: 'text-indigo-950 font-black',
    bannerSubtitle: 'text-slate-700 font-semibold',
    badge: 'bg-indigo-100 text-indigo-950 border border-indigo-300 font-bold',
    iconBox: 'bg-indigo-600 text-white shadow-xs',
    iconText: 'text-indigo-700',
    dateBox: 'bg-white border-indigo-200 text-slate-900 shadow-xs font-bold',
    dateHover: 'text-slate-800 hover:text-slate-950 hover:bg-indigo-50',
    todayBtn: 'bg-indigo-700 text-white hover:bg-indigo-800 shadow-xs font-bold',
    statsBorder: 'border-indigo-200',
    statCard: 'bg-white border-indigo-200 shadow-xs',
    farzStatDone: 'bg-indigo-700 text-white shadow-xs font-black',
    farzStatPending: 'bg-indigo-100 text-indigo-950 font-bold',
    farzStatText: 'text-indigo-950 font-black',
    // Waqt section
    waqtClockIcon: 'text-indigo-700',
    waqtTitle: 'text-slate-950 font-black',
    waqtCountBadge: 'text-slate-700 font-bold',
    prayerCardDone: 'bg-indigo-50/90 border-indigo-300 shadow-xs',
    prayerCardIdle: 'bg-white border-slate-300 hover:border-indigo-300 shadow-xs',
    prayerIconDone: 'bg-indigo-700 text-white shadow-sm',
    prayerIconIdle: 'bg-slate-100 text-slate-800 border border-slate-200',
    prayerNameDone: 'text-indigo-950 font-black',
    prayerNameIdle: 'text-slate-950 font-extrabold',
    prayerArabic: 'text-slate-700 font-bold',
    jamaatBadge: 'bg-indigo-100 text-indigo-950 border-indigo-300 font-bold',
    qazaBadge: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
    statusOnTime: 'bg-indigo-700 text-white shadow-xs font-bold',
    statusJamaat: 'bg-indigo-900 text-white shadow-xs font-bold',
    statusQaza: 'bg-amber-700 text-white shadow-xs font-bold',
    statusIdle: 'text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold',
    prayerBtnDone: 'bg-indigo-700 text-white hover:bg-indigo-800 shadow-sm font-bold',
    prayerBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    expandBtn: 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-bold',
    subPartDone: 'bg-indigo-100/90 border-indigo-300 text-indigo-950 font-bold shadow-xs',
    subPartCheck: 'bg-indigo-700 border-indigo-700 text-white',
    subPartIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-medium shadow-xs',
    // Nafl section
    nafalIcon: 'text-sky-700',
    nafalBadge: 'text-sky-950 bg-sky-50 border-sky-300 font-bold',
    nafalDone: 'bg-sky-50/90 border-sky-300 shadow-xs',
    nafalIdle: 'bg-white border-slate-300 hover:border-sky-300 shadow-xs',
    nafalBtnDone: 'bg-sky-700 text-white shadow-sm hover:bg-sky-800 font-bold',
    nafalBtnIdle: 'bg-slate-900 text-white hover:bg-black border border-slate-900 font-bold shadow-xs',
    nafalPillDone: 'bg-sky-700 text-white shadow-xs font-bold',
    nafalPillIdle: 'bg-white text-slate-800 border border-slate-300 hover:bg-sky-50 hover:text-sky-950 font-semibold',
    nafalAddBtn: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-950 font-bold shadow-xs',
    // Tasbeeh section
    tasbeehIcon: 'text-indigo-700',
    tasbeehBadge: 'text-indigo-950 bg-indigo-50 border-indigo-300 font-bold',
    tasbeehVibrateActive: 'text-indigo-950 bg-indigo-100 font-bold',
    tasbeehUnitBg: 'bg-white border-indigo-300 shadow-sm',
    tasbeehArabic: 'text-slate-950 font-black',
    tasbeehBead: 'border-indigo-700 hover:border-indigo-800 bg-indigo-700 text-white shadow-md font-bold',
    tasbeehTargetActive: 'bg-indigo-700 text-white shadow-xs font-bold',
    tasbeehTargetIdle: 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold',
    tasbeehItemDone: 'bg-indigo-50/90 border-indigo-300 shadow-xs',
    tasbeehItemIdle: 'bg-white border-slate-300 hover:border-indigo-300',
    tasbeehCountBadge: 'bg-slate-100 text-slate-950 border-slate-300 shadow-xs font-bold',
    tasbeehPlusBtn: 'bg-indigo-700 text-white font-black hover:bg-indigo-800 transition-all shadow-xs',
    tasbeehAddBtn: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold shadow-xs',
    // Adhkar section
    adhkarIcon: 'text-amber-600',
    adhkarBadge: 'text-amber-950 bg-amber-50 border-amber-300 font-bold',
    adhkarDone: 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-xs',
    adhkarCheck: 'bg-amber-600 border-amber-600 text-white',
    adhkarIdle: 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 font-medium',
  },
  sand: {
    nameBn: 'মরু বালুকা',
    nameEn: 'Warm Sand',
    dotColor: 'bg-amber-600',
    bannerBg: 'bg-white border-amber-300 text-slate-900 shadow-xs',
    bannerBorder: 'border-amber-300',
    bannerTitle: 'text-stone-950 font-black',
    bannerSubtitle: 'text-stone-700 font-semibold',
    badge: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold',
    iconBox: 'bg-amber-700 text-white shadow-xs',
    iconText: 'text-amber-700',
    dateBox: 'bg-white border-amber-300 text-slate-900 shadow-xs font-bold',
    dateHover: 'text-stone-800 hover:text-stone-950 hover:bg-amber-50',
    todayBtn: 'bg-amber-700 text-white hover:bg-amber-800 shadow-xs font-bold',
    statsBorder: 'border-amber-200',
    statCard: 'bg-white border-amber-300 shadow-xs',
    farzStatDone: 'bg-amber-700 text-white shadow-xs font-black',
    farzStatPending: 'bg-amber-100 text-amber-950 font-bold',
    farzStatText: 'text-stone-950 font-black',
    // Waqt section
    waqtClockIcon: 'text-amber-700',
    waqtTitle: 'text-stone-950 font-black',
    waqtCountBadge: 'text-stone-700 font-bold',
    prayerCardDone: 'bg-amber-50/90 border-amber-400 shadow-xs',
    prayerCardIdle: 'bg-white border-stone-300 hover:border-amber-300 shadow-xs',
    prayerIconDone: 'bg-amber-700 text-white shadow-sm',
    prayerIconIdle: 'bg-stone-100 text-stone-800 border border-stone-200',
    prayerNameDone: 'text-stone-950 font-black',
    prayerNameIdle: 'text-stone-950 font-extrabold',
    prayerArabic: 'text-stone-700 font-bold',
    jamaatBadge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
    qazaBadge: 'bg-orange-100 text-orange-950 border-orange-400 font-bold',
    statusOnTime: 'bg-amber-700 text-white shadow-xs font-bold',
    statusJamaat: 'bg-stone-900 text-white shadow-xs font-bold',
    statusQaza: 'bg-orange-600 text-white shadow-xs font-bold',
    statusIdle: 'text-stone-800 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 border border-stone-300 font-bold',
    prayerBtnDone: 'bg-amber-700 text-white hover:bg-amber-800 shadow-sm font-bold',
    prayerBtnIdle: 'bg-stone-900 text-white hover:bg-black border border-stone-900 font-bold shadow-xs',
    expandBtn: 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 font-bold',
    subPartDone: 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-xs',
    subPartCheck: 'bg-amber-700 border-amber-700 text-white',
    subPartIdle: 'bg-white border-stone-300 text-stone-900 hover:bg-stone-50 hover:border-stone-400 font-medium shadow-xs',
    // Nafl section
    nafalIcon: 'text-amber-700',
    nafalBadge: 'text-amber-950 bg-amber-50 border-amber-300 font-bold',
    nafalDone: 'bg-orange-50/90 border-orange-300 shadow-xs',
    nafalIdle: 'bg-white border-stone-300 hover:border-orange-300 shadow-xs',
    nafalBtnDone: 'bg-orange-700 text-white shadow-sm hover:bg-orange-800 font-bold',
    nafalBtnIdle: 'bg-stone-900 text-white hover:bg-black border border-stone-900 font-bold shadow-xs',
    nafalPillDone: 'bg-orange-700 text-white shadow-xs font-bold',
    nafalPillIdle: 'bg-white text-stone-800 border border-stone-300 hover:bg-orange-50 hover:text-orange-950 font-semibold',
    nafalAddBtn: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold shadow-xs',
    // Tasbeeh section
    tasbeehIcon: 'text-amber-700',
    tasbeehBadge: 'text-amber-950 bg-amber-50 border-amber-300 font-bold',
    tasbeehVibrateActive: 'text-amber-950 bg-amber-100 font-bold',
    tasbeehUnitBg: 'bg-white border-amber-300 shadow-sm',
    tasbeehArabic: 'text-stone-950 font-black',
    tasbeehBead: 'border-amber-700 hover:border-amber-800 bg-amber-700 text-white shadow-md font-bold',
    tasbeehTargetActive: 'bg-amber-700 text-white shadow-xs font-bold',
    tasbeehTargetIdle: 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 font-semibold',
    tasbeehItemDone: 'bg-amber-50/90 border-amber-300 shadow-xs',
    tasbeehItemIdle: 'bg-white border-stone-300 hover:border-amber-300',
    tasbeehCountBadge: 'bg-stone-100 text-stone-950 border-stone-300 shadow-xs font-bold',
    tasbeehPlusBtn: 'bg-amber-700 text-white font-black hover:bg-amber-800 transition-all shadow-xs',
    tasbeehAddBtn: 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold shadow-xs',
    // Adhkar section
    adhkarIcon: 'text-amber-700',
    adhkarBadge: 'text-amber-950 bg-amber-50 border-amber-300 font-bold',
    adhkarDone: 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-xs',
    adhkarCheck: 'bg-amber-700 border-amber-700 text-white',
    adhkarIdle: 'bg-white border-stone-300 text-stone-900 hover:bg-stone-50 hover:border-stone-400 font-medium',
  }
};

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

export type SalahSubTab = 'zikar' | 'salah' | 'adhkar';

export interface SalahTabConfig {
  id: SalahSubTab;
  labelEn: string;
  labelBn: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const SALAH_TABS: SalahTabConfig[] = [
  {
    id: 'zikar',
    labelEn: 'Zikar',
    labelBn: 'যিকির',
    icon: Sparkles
  },
  {
    id: 'salah',
    labelEn: 'Salah',
    labelBn: 'সালাত',
    icon: Compass
  },
  {
    id: 'adhkar',
    labelEn: 'Adhkar',
    labelBn: 'আযকার',
    icon: Award
  }
];

interface SalahTrackerProps {
  darkMode: boolean;
  lang?: 'en' | 'bn' | string;
  activeSubTab?: SalahSubTab;
  onSubTabChange?: (tab: SalahSubTab) => void;
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

// Web Audio API Sound Synthesizer for Tasbeeh & Adhkar
let salahAudioCtx: AudioContext | null = null;

async function getSalahAudioContext(): Promise<AudioContext | null> {
  try {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!salahAudioCtx) {
      salahAudioCtx = new AudioCtxClass();
    }
    if (salahAudioCtx.state !== 'running') {
      await salahAudioCtx.resume();
    }
    return salahAudioCtx;
  } catch (e) {
    return null;
  }
}

// Global user gesture unlock for Web Audio
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      if (!salahAudioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) salahAudioCtx = new AudioCtxClass();
      }
      if (salahAudioCtx && salahAudioCtx.state !== 'running') {
        salahAudioCtx.resume().catch(() => {});
      }
    } catch (e) {}
  };
  window.addEventListener('click', unlockAudio, { once: false, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
}

/**
 * Fast crisp tactile timepiece notch tick sound for Tasbeeh tap,
 * identical to the rotary sleep dial timepiece tick sound.
 */
async function playTasbeehClick() {
  try {
    const ctx = await getSalahAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Fast high-pitch clock click impulse matching the sleep clock dial
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2100, now);
    osc.frequency.exponentialRampToValueAtTime(2100 * 0.4, now + 0.015);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.016);
  } catch (e) {}
}

/**
 * Harmonic bell chime when reaching target (33, 100, etc.)
 */
async function playTargetReachedSound() {
  try {
    const ctx = await getSalahAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;

    // Harmonic chord: C5, E5, G5, C6 (523Hz, 659Hz, 784Hz, 1046Hz)
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  } catch (e) {}
}

/**
 * Sweet confirmation chime for Daily Adhkar Checklist
 */
async function playAzkarCheckSound() {
  try {
    const ctx = await getSalahAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;

    const notes = [659.25, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {}
}

/**
 * Subtle reset sound
 */
async function playResetSound() {
  try {
    const ctx = await getSalahAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch (e) {}
}

export default function SalahTracker({ 
  darkMode, 
  lang = 'en',
  activeSubTab: propActiveSubTab,
  onSubTabChange
}: SalahTrackerProps) {
  const isBn = lang === 'bn';

  const [internalActiveSubTab, setInternalActiveSubTab] = useState<SalahSubTab>(() => {
    try {
      const saved = localStorage.getItem('ratool_salah_subtab');
      if (saved && ['zikar', 'salah', 'adhkar'].includes(saved)) {
        return saved as SalahSubTab;
      }
    } catch (e) {}
    return 'salah';
  });

  const activeSubTab = propActiveSubTab || internalActiveSubTab;

  const handleSubTabChange = (newTab: SalahSubTab) => {
    setInternalActiveSubTab(newTab);
    try {
      localStorage.setItem('ratool_salah_subtab', newTab);
    } catch (e) {}
    if (onSubTabChange) {
      onSubTabChange(newTab);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const [mobileNavHeight, setMobileNavHeight] = useState(58);

  useEffect(() => {
    const updateNavHeight = () => {
      const navEl = document.getElementById('mobile_bottom_nav');
      if (navEl) {
        setMobileNavHeight(navEl.offsetHeight || 58);
      }
    };
    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    const navEl = document.getElementById('mobile_bottom_nav');
    const observer = typeof ResizeObserver !== 'undefined' && navEl ? new ResizeObserver(updateNavHeight) : null;
    if (observer && navEl) {
      observer.observe(navEl);
    }
    return () => {
      window.removeEventListener('resize', updateNavHeight);
      observer?.disconnect();
    };
  }, []);

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
  const [tasbeehSound, setTasbeehSound] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ratbod_tasbeeh_sound');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
  const [tasbeehVibrate, setTasbeehVibrate] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ratbod_tasbeeh_vibrate');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });
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

  // Salah section theme state
  const [salahTheme, setSalahTheme] = useState<SalahTheme>(() => {
    try {
      const saved = localStorage.getItem('ratbod_salah_light_theme');
      if (saved === 'clarity' || saved === 'emerald' || saved === 'indigo' || saved === 'sand') return saved;
    } catch (e) {}
    return 'clarity';
  });

  const handleThemeChange = (newTheme: SalahTheme) => {
    setSalahTheme(newTheme);
    try {
      localStorage.setItem('ratbod_salah_light_theme', newTheme);
    } catch (e) {}
  };

  const handleToggleSound = () => {
    setTasbeehSound(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ratbod_tasbeeh_sound', JSON.stringify(next));
      } catch (e) {}
      if (next) {
        playTasbeehClick();
      }
      return next;
    });
  };

  const handleToggleVibrate = () => {
    setTasbeehVibrate(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ratbod_tasbeeh_vibrate', JSON.stringify(next));
      } catch (e) {}
      if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
      return next;
    });
  };

  const st = SALAH_THEMES[salahTheme] || SALAH_THEMES.clarity;

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
    const isNowChecked = !updated.azkarChecklist[key];
    updated.azkarChecklist[key] = isNowChecked;
    updated.updatedAt = Date.now();
    saveRecord(updated);

    if (isNowChecked) {
      if (tasbeehSound) {
        playAzkarCheckSound();
      }
      if (tasbeehVibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  };

  // Tactile Digital Tasbeeh increment
  const handleTasbeehTap = (dhikrId: string = activeTasbeehDhikr) => {
    const updated = JSON.parse(JSON.stringify(currentRecord)) as DailySalahRecord;
    if (!updated.dhikrCounts) updated.dhikrCounts = {};
    const current = updated.dhikrCounts[dhikrId] || 0;
    const nextCount = current + 1;
    updated.dhikrCounts[dhikrId] = nextCount;
    updated.updatedAt = Date.now();
    saveRecord(updated);

    const isTargetReached = (tasbeehTarget > 0 && nextCount % tasbeehTarget === 0);

    // Audio feedback (sound of rotary sleep clock timepiece)
    if (tasbeehSound) {
      if (isTargetReached) {
        playTargetReachedSound();
      } else {
        playTasbeehClick();
      }
    }
  };

  const handleTasbeehReset = (dhikrId: string) => {
    if (tasbeehSound) {
      playResetSound();
    }
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

  // Collapsible section states
  const [isNafalExpanded, setIsNafalExpanded] = useState<boolean>(true);
  const [isTasbeehExpanded, setIsTasbeehExpanded] = useState<boolean>(true);
  const [isAzkarExpanded, setIsAzkarExpanded] = useState<boolean>(true);

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

  // Current week date range with week number (e.g., 14–20 Sep • Week 38)
  const currentWeekInfo = useMemo(() => {
    try {
      const now = new Date();
      // Calculate start of current week (Monday)
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // ISO week number calculation
      const target = new Date(now.valueOf());
      const dayNr = (now.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

      const monDay = formatNum(monday.getDate());
      const sunDay = formatNum(sunday.getDate());
      const monthName = isBn
        ? monday.toLocaleDateString('bn-BD', { month: 'short' })
        : monday.toLocaleDateString('en-US', { month: 'short' });
      const sunMonthName = isBn
        ? sunday.toLocaleDateString('bn-BD', { month: 'short' })
        : sunday.toLocaleDateString('en-US', { month: 'short' });

      const dateRange = monday.getMonth() === sunday.getMonth()
        ? `${monDay}–${sunDay} ${monthName}`
        : `${monDay} ${monthName} – ${sunDay} ${sunMonthName}`;

      const weekLabel = isBn ? `সপ্তাহ ${formatNum(weekNumber)}` : `Week ${weekNumber}`;
      return `${dateRange} • ${weekLabel}`;
    } catch (e) {
      return isBn ? 'চলতি সপ্তাহ' : 'Current Week';
    }
  }, [isBn]);

  const renderDateAndThemeControls = () => (
    <div className="flex items-center gap-1.5 self-start sm:self-auto py-0.5 px-0 text-[11px] sm:text-xs font-bold">
      <Calendar size={13} className={cn(darkMode ? "text-emerald-400" : st.iconText, "shrink-0")} />
      <span className={cn("whitespace-nowrap font-bold", darkMode ? "text-neutral-300" : "text-slate-800")}>
        {currentWeekInfo}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-3.5 lg:gap-4 w-full">
        {/* Tab Content Area: 3 sub nav menu pages */}
        <div id={`salah_content_${activeSubTab}`} className="flex-1 min-w-0 w-full pb-16 md:pb-0 md:pr-32 xl:pr-0 space-y-3 sm:space-y-5">
          {/* Sub Tab: Salah */}
          <div className={cn("space-y-3 sm:space-y-5 w-full", activeSubTab === 'salah' ? "block" : "hidden")}>
            {/* 1. Header Banner with Date & Progress */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all shadow-sm",
        darkMode 
          ? "bg-gradient-to-br from-[#121b18] to-[#161a1e] border-emerald-500/20 text-white" 
          : st.bannerBg
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center",
                darkMode ? "bg-emerald-500/20 text-emerald-400" : st.iconBox
              )}>
                <Compass size={16} className={cn("animate-pulse", darkMode ? "text-emerald-500" : st.iconText)} />
              </div>
              <h1 className={cn("text-base sm:text-xl font-black tracking-tight flex items-center gap-1.5", darkMode ? "text-white" : st.bannerTitle)}>
                {isBn ? 'সালাত ট্র্যাকার' : 'Salah Tracker'}
                <span className={cn(
                  "text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold",
                  darkMode ? "bg-emerald-500/20 text-emerald-400" : st.badge
                )}>
                  {isBn ? '৫ ওয়াক্ত' : '5 Waqt'}
                </span>
              </h1>
            </div>
            <p className={cn("text-xs hidden sm:block", darkMode ? "text-neutral-400" : st.bannerSubtitle)}>
              {isBn 
                ? 'পাঁচ ওয়াক্ত ফরজ সালাত, নফল ইবাদত ও যিকির-আযকার নিয়মিত আদায় করুন।' 
                : 'Track daily five waqt prayers, nafal ibadat, and daily zikar azkar with peace of mind.'}
            </p>
          </div>

          {renderDateAndThemeControls()}
        </div>

        {/* Stats Strip: 4 larger, easily readable cards (Fard, Streak, Nafl, Dhikr) */}
        <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t", darkMode ? "border-emerald-500/15" : st.statsBorder)}>
          {/* 1. Fard */}
          <div className={cn(
            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 transition-all shadow-2xs",
            darkMode ? "bg-black/25 border-emerald-500/20" : st.statCard
          )}>
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs",
              farzCount === 5 
                ? (darkMode ? "bg-emerald-600 text-white shadow-xs" : st.farzStatDone)
                : (darkMode ? "bg-emerald-500/20 text-emerald-400" : st.farzStatPending)
            )}>
              {formatNum(farzCount)}/৫
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn("block text-[11px] sm:text-xs font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-700 font-bold")}>
                {isBn ? 'ফরজ সালাত' : 'Fard'}
              </span>
              <span className={cn("font-black text-xs sm:text-sm truncate block mt-0.5", darkMode ? "text-white" : st.farzStatText)}>
                {farzCount === 5 ? (isBn ? '৫/৫ ★' : '5/5 ★') : `${formatNum(farzCount)}/5`}
              </span>
            </div>
          </div>

          {/* 2. Streak */}
          <div className={cn(
            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 transition-all shadow-2xs",
            darkMode ? "bg-black/25 border-emerald-500/20" : st.statCard
          )}>
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black shrink-0 shadow-xs",
              darkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-900 font-bold"
            )}>
              <Flame size={18} className="text-amber-600 dark:text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn("block text-[11px] sm:text-xs font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-700 font-bold")}>
                {isBn ? 'ধারাবাহিক' : 'Streak'}
              </span>
              <span className={cn("font-black text-xs sm:text-sm truncate block mt-0.5", darkMode ? "text-amber-400" : "text-amber-900 font-black")}>
                {formatNum(currentStreak)}{isBn ? ' দিন' : ' Days'}
              </span>
            </div>
          </div>

          {/* 3. Nafl */}
          <div className={cn(
            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 transition-all shadow-2xs",
            darkMode ? "bg-black/25 border-emerald-500/20" : st.statCard
          )}>
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black shrink-0 shadow-xs",
              darkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-900 font-bold"
            )}>
              <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn("block text-[11px] sm:text-xs font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-700 font-bold")}>
                {isBn ? 'নফল রাকাত' : 'Nafl'}
              </span>
              <span className={cn("font-black text-xs sm:text-sm truncate block mt-0.5", darkMode ? "text-teal-400" : "text-teal-900 font-black")}>
                {formatNum(totalNaflRakahs)}{isBn ? ' রাকাত' : ' Rakahs'}
              </span>
            </div>
          </div>

          {/* 4. Dhikr */}
          <div className={cn(
            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 transition-all shadow-2xs",
            darkMode ? "bg-black/25 border-emerald-500/20" : st.statCard
          )}>
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black shrink-0 shadow-xs",
              darkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-900 font-bold"
            )}>
              <Heart size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn("block text-[11px] sm:text-xs font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-700 font-bold")}>
                {isBn ? 'যিকির' : 'Dhikr'}
              </span>
              <span className={cn("font-black text-xs sm:text-sm font-mono truncate block mt-0.5", darkMode ? "text-cyan-400" : "text-cyan-950 font-black")}>
                {formatNum(totalDhikrToday)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Five Waqt Salah Section */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-slate-300 shadow-sm"
      )}>
        <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className={cn(darkMode ? "text-emerald-500" : st.waqtClockIcon)} />
            <h2 className={cn("text-sm sm:text-base font-black tracking-tight", darkMode ? "text-white" : st.waqtTitle)}>
              {isBn ? 'পাঁচ ওয়াক্ত ফরজ সালাত' : 'Five Waqt Farz Salah'}
            </h2>
          </div>
          <span className={cn("text-[10px] sm:text-[11px] font-bold", darkMode ? "text-neutral-400" : st.waqtCountBadge)}>
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
                    ? (darkMode ? "bg-emerald-950/20 border-emerald-500/30" : st.prayerCardDone)
                    : (darkMode ? "bg-white/[0.02] border-white/5 hover:border-white/10" : st.prayerCardIdle)
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Waqt info */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isFardPrayed 
                        ? (darkMode ? "bg-emerald-600 text-white shadow-sm" : st.prayerIconDone)
                        : (darkMode ? "bg-white/5 text-neutral-400" : st.prayerIconIdle)
                    )}>
                      <Icon size={15} className="sm:w-4 sm:h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={cn("font-black text-xs sm:text-base tracking-tight truncate", darkMode ? "text-white" : (isFardPrayed ? st.prayerNameDone : st.prayerNameIdle))}>
                          {isBn ? item.nameBn : item.nameEn}
                        </span>
                        <span className={cn("text-[10px] sm:text-xs font-serif font-medium", darkMode ? "text-neutral-400" : st.prayerArabic)}>
                          {item.arabic}
                        </span>
                        {isJamaat && (
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black border uppercase",
                            darkMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : st.jamaatBadge
                          )}>
                            {isBn ? 'জামাআত' : 'Jama\'at'}
                          </span>
                        )}
                        {isQaza && (
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black border uppercase",
                            darkMode ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : st.qazaBadge
                          )}>
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
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-all cursor-pointer",
                            currentPrayer.status === 'prayed_on_time'
                              ? (darkMode ? "bg-emerald-600 text-white shadow-xs font-bold" : st.statusOnTime)
                              : (darkMode ? "text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10" : st.statusIdle)
                          )}
                        >
                          {isBn ? 'সময়মত' : 'On Time'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrayerStatus(item.key, 'prayed_jamaat')}
                          className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-all cursor-pointer",
                            currentPrayer.status === 'prayed_jamaat'
                              ? (darkMode ? "bg-emerald-700 text-white shadow-xs font-bold" : st.statusJamaat)
                              : (darkMode ? "text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10" : st.statusIdle)
                          )}
                        >
                          {isBn ? 'জামাআতে' : 'In Jama\'at'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrayerStatus(item.key, 'qaza')}
                          className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] transition-all cursor-pointer",
                            currentPrayer.status === 'qaza'
                              ? (darkMode ? "bg-amber-600 text-white shadow-xs font-bold" : st.statusQaza)
                              : (darkMode ? "text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10" : st.statusIdle)
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
                          ? (darkMode ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20" : st.prayerBtnDone)
                          : (darkMode ? "bg-white/10 text-neutral-300 hover:bg-white/15" : st.prayerBtnIdle)
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
                      className={cn(
                        "p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer",
                        darkMode ? "text-neutral-400 hover:text-white hover:bg-white/10" : st.expandBtn
                      )}
                      title="Toggle rak'ahs breakdown"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Granular Rak'ah Breakdown Details */}
                {isExpanded && (
                  <div className={cn("mt-2.5 pt-2.5 border-t grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs", darkMode ? "border-white/10" : "border-gray-200")}>
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
                              ? (darkMode ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : st.subPartDone)
                              : (darkMode ? "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10" : st.subPartIdle)
                          )}
                        >
                          <span>{isBn ? sub.labelBn : sub.labelEn}</span>
                          <span className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                            isSubChecked 
                              ? (darkMode ? "bg-emerald-600 border-emerald-600 text-white" : st.subPartCheck)
                              : (darkMode ? "border-neutral-500" : "border-gray-400")
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
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-slate-300 shadow-sm"
      )}>
        <button
          type="button"
          onClick={() => setIsNafalExpanded(!isNafalExpanded)}
          className={cn(
            "w-full p-3 sm:p-5 flex items-center justify-between cursor-pointer transition-colors text-left",
            darkMode ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={cn(darkMode ? "text-teal-400" : st.nafalIcon)} />
            <h2 className={cn("text-sm sm:text-base font-black tracking-tight", darkMode ? "text-white" : "text-gray-950")}>
              {isBn ? 'নফল ইবাদত ও সালাত' : 'Nafal Ibadat & Voluntary Prayers'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md border",
              darkMode ? "text-teal-400 bg-teal-500/10 border-teal-500/20" : st.nafalBadge
            )}>
              {formatNum(totalNaflRakahs)} {isBn ? 'রাকাত আদায়' : 'Rakahs Today'}
            </span>
            <div className={cn("p-1 rounded-lg", darkMode ? "text-neutral-400" : "text-slate-700")}>
              {isNafalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </button>

        {isNafalExpanded && (
          <div className={cn("px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t space-y-3", darkMode ? "border-white/5" : "border-slate-200")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {/* Tahajjud */}
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-xs",
                currentRecord.nafal.tahajjud.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : st.nafalDone)
                  : (darkMode ? "bg-white/[0.02] border-white/5" : st.nafalIdle)
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={cn("font-black text-xs sm:text-sm block", darkMode ? "text-white" : "text-gray-950")}>
                      {isBn ? 'তাহাজ্জুদ সালাত' : 'Tahajjud (Qiyam al-Layl)'}
                    </span>
                    <span className={cn("text-[10px] sm:text-[11px] font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                      {isBn ? 'রাতের শেষ তৃতীয়াংশের সালাত' : 'Night vigil prayer before Fajr'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('tahajjud')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.tahajjud.completed
                        ? (darkMode ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700" : st.nafalBtnDone)
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : st.nafalBtnIdle)
                    )}
                  >
                    {currentRecord.nafal.tahajjud.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.tahajjud.completed && (
                  <div className={cn("flex items-center gap-1.5 pt-1 border-t text-xs", darkMode ? "border-white/10" : "border-gray-200")}>
                    <span className={cn("text-[10px] sm:text-[11px] font-bold", darkMode ? "text-neutral-400" : "text-gray-950")}>{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 8, 12].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('tahajjud', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer",
                          currentRecord.nafal.tahajjud.rakahs === r
                            ? (darkMode ? "bg-teal-600 text-white shadow-xs" : st.nafalPillDone)
                            : (darkMode ? "bg-white/10 text-neutral-400 hover:text-white" : st.nafalPillIdle)
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
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-xs",
                currentRecord.nafal.ishraq.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : st.nafalDone)
                  : (darkMode ? "bg-white/[0.02] border-white/5" : st.nafalIdle)
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={cn("font-black text-xs sm:text-sm block", darkMode ? "text-white" : "text-gray-950")}>
                      {isBn ? 'ইশরাক ও চাশত / দুহা' : 'Ishraq & Duha (Chasht)'}
                    </span>
                    <span className={cn("text-[10px] sm:text-[11px] font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                      {isBn ? 'সূর্যোদয়ের পরের বরকতময় সালাত' : 'Morning forenoon prayer'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('ishraq')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.ishraq.completed
                        ? (darkMode ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700" : st.nafalBtnDone)
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : st.nafalBtnIdle)
                    )}
                  >
                    {currentRecord.nafal.ishraq.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.ishraq.completed && (
                  <div className={cn("flex items-center gap-1.5 pt-1 border-t text-xs", darkMode ? "border-white/10" : "border-gray-200")}>
                    <span className={cn("text-[10px] sm:text-[11px] font-bold", darkMode ? "text-neutral-400" : "text-gray-950")}>{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 8].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('ishraq', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer",
                          currentRecord.nafal.ishraq.rakahs === r
                            ? (darkMode ? "bg-teal-600 text-white shadow-xs" : st.nafalPillDone)
                            : (darkMode ? "bg-white/10 text-neutral-400 hover:text-white" : st.nafalPillIdle)
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
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-xs",
                currentRecord.nafal.awwabin.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : st.nafalDone)
                  : (darkMode ? "bg-white/[0.02] border-white/5" : st.nafalIdle)
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={cn("font-black text-xs sm:text-sm block", darkMode ? "text-white" : "text-gray-950")}>
                      {isBn ? 'আউওয়াবিন সালাত' : 'Awwabin Prayer'}
                    </span>
                    <span className={cn("text-[10px] sm:text-[11px] font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                      {isBn ? 'মাগরিবের পর ২ থেকে ৬ রাকাত' : '2-6 rakahs after Maghrib'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('awwabin')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.awwabin.completed
                        ? (darkMode ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700" : st.nafalBtnDone)
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : st.nafalBtnIdle)
                    )}
                  >
                    {currentRecord.nafal.awwabin.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
                {currentRecord.nafal.awwabin.completed && (
                  <div className={cn("flex items-center gap-1.5 pt-1 border-t text-xs", darkMode ? "border-white/10" : "border-gray-200")}>
                    <span className={cn("text-[10px] sm:text-[11px] font-bold", darkMode ? "text-neutral-400" : "text-gray-950")}>{isBn ? 'রাকাত:' : 'Rakahs:'}</span>
                    {[2, 4, 6].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNaflRakahs('awwabin', r)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer",
                          currentRecord.nafal.awwabin.rakahs === r
                            ? (darkMode ? "bg-teal-600 text-white shadow-xs" : st.nafalPillDone)
                            : (darkMode ? "bg-white/10 text-neutral-400 hover:text-white" : st.nafalPillIdle)
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
                "p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-xs",
                currentRecord.nafal.salatutTasbih.completed
                  ? (darkMode ? "bg-teal-950/20 border-teal-500/30" : st.nafalDone)
                  : (darkMode ? "bg-white/[0.02] border-white/5" : st.nafalIdle)
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={cn("font-black text-xs sm:text-sm block", darkMode ? "text-white" : "text-gray-950")}>
                      {isBn ? 'সালাতুত তাসবীহ (৪ রাকাত)' : 'Salatut Tasbih (4 Rakahs)'}
                    </span>
                    <span className={cn("text-[10px] sm:text-[11px] font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                      {isBn ? '৩০০ বার তাসবীহ পাঠের সালাত' : 'Special 300 tasbeeh prayer'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNafl('salatutTasbih')}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                      currentRecord.nafal.salatutTasbih.completed
                        ? (darkMode ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700" : st.nafalBtnDone)
                        : (darkMode ? "bg-white/10 text-neutral-400 hover:bg-white/20" : st.nafalBtnIdle)
                    )}
                  >
                    {currentRecord.nafal.salatutTasbih.completed ? <Check size={15} className="stroke-[3]" /> : <Plus size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Nafl List */}
            {(currentRecord.nafal.customNafal || []).length > 0 && (
              <div className={cn("mt-2.5 space-y-1.5 pt-2.5 border-t", darkMode ? "border-white/10" : "border-gray-200")}>
                {(currentRecord.nafal.customNafal || []).map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-xs shadow-xs",
                      item.completed 
                        ? (darkMode ? "bg-teal-950/20 border-teal-500/30 text-teal-300" : st.nafalDone)
                        : (darkMode ? "bg-white/5 border-white/5 text-neutral-300" : "bg-white border-gray-200 text-gray-800")
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCustomNafl(item.id)}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer",
                          item.completed 
                            ? (darkMode ? "bg-teal-600 border-teal-600 text-white" : st.nafalBtnDone)
                            : (darkMode ? "border-neutral-500" : "border-gray-400")
                        )}
                      >
                        {item.completed && <Check size={12} className="stroke-[3]" />}
                      </button>
                      <span className="font-bold">{item.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold",
                        darkMode ? "bg-white/10 text-neutral-300" : "bg-gray-100 text-gray-700"
                      )}>
                        {formatNum(item.rakahs)} {isBn ? 'রাকাত' : 'rakahs'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCustomNafl(item.id)}
                      className={cn("p-1 transition-colors cursor-pointer", darkMode ? "text-neutral-500 hover:text-red-400" : "text-gray-400 hover:text-red-600")}
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
                className={cn(
                  "w-full py-1.5 sm:py-2 rounded-xl border border-dashed text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  darkMode 
                    ? "border-teal-500/30 hover:border-teal-500/60 text-teal-400" 
                    : st.nafalAddBtn
                )}
              >
                <Plus size={14} />
                <span>{isBn ? 'অন্যান্য নফল / কাজা উমরি যোগ করুন' : 'Add Custom Nafl / Qada Prayer'}</span>
              </button>
            ) : (
              <div className={cn(
                "p-3 rounded-xl border space-y-2",
                darkMode ? "border-teal-500/30 bg-black/20" : "border-gray-300 bg-gray-50/70 shadow-xs"
              )}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isBn ? 'সালাতের নাম (উদাঃ তাহিয়্যাতুল ওযু)' : 'Prayer name (e.g. Salatul Hajat)'}
                    value={customNaflName}
                    onChange={e => setCustomNaflName(e.target.value)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[38px]",
                      darkMode ? "bg-black/40 border-white/10 text-white placeholder:text-neutral-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
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
                    className={cn("px-3 py-1 rounded-lg cursor-pointer font-bold", darkMode ? "text-neutral-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomNafl}
                    className={cn("px-3 py-1 rounded-lg font-black transition-colors cursor-pointer shadow-xs", darkMode ? "bg-teal-600 text-white hover:bg-teal-700" : st.nafalBtnDone)}
                  >
                    {isBn ? 'যুক্ত করুন' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Sub Tab: Zikar */}
    <div className={cn("space-y-3 sm:space-y-5 w-full", activeSubTab === 'zikar' ? "block" : "hidden")}>
      {/* Zikar Header Banner with Date & Progress */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all shadow-sm",
        darkMode 
          ? "bg-gradient-to-br from-[#12181b] to-[#161a1e] border-cyan-500/20 text-white" 
          : st.bannerBg
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center",
                darkMode ? "bg-cyan-500/20 text-cyan-400" : st.iconBox
              )}>
                <Sparkles size={16} className={cn("animate-pulse", darkMode ? "text-cyan-400" : st.iconText)} />
              </div>
              <h1 className={cn("text-base sm:text-xl font-black tracking-tight flex items-center gap-1.5", darkMode ? "text-white" : st.bannerTitle)}>
                {isBn ? 'যিকির ও ডিজিটাল তাসবীহ' : 'Zikar & Digital Tasbeeh'}
                <span className={cn(
                  "text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold",
                  darkMode ? "bg-cyan-500/20 text-cyan-400" : st.badge
                )}>
                  {isBn ? 'তাসবীহ' : 'Tasbeeh'}
                </span>
              </h1>
            </div>
            <p className={cn("text-xs hidden sm:block", darkMode ? "text-neutral-400" : st.bannerSubtitle)}>
              {isBn 
                ? 'দৈনন্দিন তাসবীহ, তাহলীল ও নিজস্ব যিকির গণনা ও আমল করুন।' 
                : 'Count daily tasbeeh, tahleel, and custom dhikr with peace of mind.'}
            </p>
          </div>

          {renderDateAndThemeControls()}
        </div>

        {/* Stats Strip for Zikar */}
        <div className={cn("grid grid-cols-3 gap-1.5 sm:gap-3 mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t text-xs", darkMode ? "border-cyan-500/15" : st.statsBorder)}>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-cyan-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-900")}>
              <Heart size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'আজকের মোট যিকির' : 'Total Dhikr Today'}</span>
              <span className={cn("font-black text-xs sm:text-sm font-mono block truncate", darkMode ? "text-cyan-400" : "text-cyan-950")}>{formatNum(totalDhikrToday)}</span>
            </div>
          </div>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-cyan-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-900")}>
              <Sparkles size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'বর্তমান টার্গেট' : 'Current Target'}</span>
              <span className={cn("font-black text-xs sm:text-sm font-mono block truncate", darkMode ? "text-emerald-400" : "text-emerald-950")}>{formatNum(activeDhikrCount)} / {formatNum(tasbeehTarget)}</span>
            </div>
          </div>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-cyan-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-900")}>
              <Volume2 size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'সাউন্ড ফিডব্যাক' : 'Sound Feedback'}</span>
              <span className={cn("font-black text-xs sm:text-sm block truncate", darkMode ? "text-amber-400" : "text-amber-900")}>{tasbeehSound ? (isBn ? 'চালু' : 'ON') : (isBn ? 'বন্ধ' : 'OFF')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Digital Tasbeeh & Zikar Azkar Section */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl border transition-all overflow-hidden shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-slate-300 shadow-sm"
      )}>
        <div className="p-3 sm:p-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsTasbeehExpanded(!isTasbeehExpanded)}
            className="flex-1 flex items-center justify-between cursor-pointer text-left mr-2 min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Heart size={16} className={cn(darkMode ? "text-cyan-400" : st.tasbeehIcon, "shrink-0")} />
              <h2 className={cn("text-sm sm:text-base font-black tracking-tight truncate", darkMode ? "text-white" : "text-gray-950")}>
                {isBn ? 'যিকির ও ডিজিটাল তাসবীহ' : 'Zikar Azkar & Digital Tasbeeh'}
              </h2>
            </div>
            <span className={cn(
              "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border font-mono shrink-0 ml-2 hidden xs:inline-block truncate max-w-[140px]",
              darkMode ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : st.tasbeehBadge
            )}>
              {activeDhikrMeta.transliteration}: {formatNum(activeDhikrCount)}/{formatNum(tasbeehTarget)}
            </span>
          </button>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center",
                tasbeehSound 
                  ? (darkMode ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-xs" : "text-emerald-800 bg-emerald-100/90 border border-emerald-300 shadow-xs") 
                  : (darkMode ? "text-neutral-500 hover:text-neutral-400" : "text-slate-500 hover:text-slate-800 border border-transparent")
              )}
              title={tasbeehSound ? (isBn ? "সাউন্ড চালু (মিউট করতে ক্লিক করুন)" : "Sound ON (Click to mute)") : (isBn ? "সাউন্ড বন্ধ (চালু করতে ক্লিক করুন)" : "Sound OFF (Click to unmute)")}
              aria-label={tasbeehSound ? "Sound ON" : "Sound OFF"}
            >
              {tasbeehSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setIsTasbeehExpanded(!isTasbeehExpanded)}
              className={cn("p-1.5 rounded-lg cursor-pointer", darkMode ? "text-neutral-400 hover:text-white" : "text-slate-700 hover:text-gray-950")}
            >
              {isTasbeehExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isTasbeehExpanded && (
          <div className={cn("px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t space-y-4", darkMode ? "border-white/5" : "border-slate-200")}>
            {/* Tactile Interactive Tasbeeh Unit */}
            <div className={cn(
              "rounded-xl sm:rounded-2xl p-3 sm:p-5 border flex flex-col items-center justify-center text-center transition-all shadow-inner",
              darkMode 
                ? "bg-gradient-to-b from-[#141b22] to-[#0d1217] border-cyan-500/20" 
                : st.tasbeehUnitBg
            )}>
              {/* Active Dhikr Title */}
              <div className="mb-1 max-w-sm">
                <span className={cn("text-base sm:text-2xl font-serif block mb-0.5", darkMode ? "text-cyan-400" : st.tasbeehArabic)}>
                  {activeDhikrMeta.arabic}
                </span>
                <span className={cn("text-xs sm:text-sm font-black tracking-tight block", darkMode ? "text-white" : "text-gray-950")}>
                  {activeDhikrMeta.transliteration}
                </span>
                <span className={cn("text-[10px] sm:text-[11px] line-clamp-1 font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                  {isBn ? activeDhikrMeta.meaningBn : activeDhikrMeta.meaningEn}
                </span>
              </div>

              {/* Responsive Bead Button */}
              <button
                type="button"
                onClick={() => handleTasbeehTap(activeTasbeehDhikr)}
                className={cn(
                  "relative my-2 sm:my-3 w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 active:scale-95 flex flex-col items-center justify-center transition-all cursor-pointer select-none group shadow-lg",
                  darkMode 
                    ? "border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]" 
                    : st.tasbeehBead
                )}
              >
                <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow">
                  {formatNum(activeDhikrCount)}
                </span>
                <span className={cn(
                  "text-[9px] sm:text-xs font-black uppercase tracking-widest mt-1 text-white/90"
                )}>
                  {isBn ? 'ট্যাপ করুন' : 'Tap Bead'}
                </span>
                <div className={cn(
                  "text-[9px] sm:text-[10px] font-mono text-white/80 font-bold"
                )}>
                  / {formatNum(tasbeehTarget)}
                </div>
              </button>

              {/* Target Preset Selectors & Reset */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn("text-[10px] sm:text-[11px] font-bold", darkMode ? "text-neutral-400" : "text-gray-700")}>{isBn ? 'টার্গেট:' : 'Target:'}</span>
                {[33, 100, 300, 1000].map(tg => (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => setTasbeehTarget(tg)}
                    className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black transition-all cursor-pointer font-mono",
                      tasbeehTarget === tg
                        ? (darkMode ? "bg-cyan-500 text-white shadow-xs" : st.tasbeehTargetActive)
                        : (darkMode ? "bg-white/5 text-neutral-400 hover:text-white" : st.tasbeehTargetIdle)
                    )}
                  >
                    {formatNum(tg)}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleTasbeehReset(activeTasbeehDhikr)}
                  className={cn(
                    "ml-1.5 p-1 rounded-lg transition-colors cursor-pointer",
                    darkMode ? "text-neutral-400 hover:text-red-400 hover:bg-red-500/10" : "text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200"
                  )}
                  title="Reset Counter"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Quick Dhikr List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={cn("font-black text-[11px] sm:text-xs", darkMode ? "text-neutral-300" : "text-gray-900")}>
                  {isBn ? 'দৈনন্দিন মাসনুন যিকির তালিকা' : 'Daily Masnoon Dhikr Selection'}
                </span>
                <span className={cn("text-[9px] sm:text-[10px]", darkMode ? "text-neutral-400" : "text-gray-500 font-medium")}>
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
                        "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs",
                        isSelected
                          ? (darkMode ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm" : st.tasbeehItemDone)
                          : (darkMode ? "bg-white/[0.02] border-white/5 hover:bg-white/5" : st.tasbeehItemIdle)
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-black text-xs truncate", darkMode ? "text-white" : "text-gray-950")}>
                            {preset.transliteration}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                          )}
                        </div>
                        <span className={cn("text-[9px] sm:text-[10px] block truncate font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>
                          {isBn ? preset.meaningBn : preset.meaningEn}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={cn(
                          "text-xs font-black font-mono px-1.5 sm:px-2 py-0.5 rounded border",
                          darkMode ? "bg-white/10 text-cyan-300 border-white/5" : st.tasbeehCountBadge
                        )}>
                          {formatNum(count)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTasbeehTap(preset.id)}
                          className={cn("w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-black text-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-xs", darkMode ? "bg-cyan-600 text-white hover:bg-cyan-700" : st.tasbeehPlusBtn)}
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
                        "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs",
                        isSelected
                          ? (darkMode ? "bg-cyan-950/30 border-cyan-500/50" : st.tasbeehItemDone)
                          : (darkMode ? "bg-white/[0.02] border-white/5 hover:bg-white/5" : st.tasbeehItemIdle)
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={cn("font-black text-xs truncate block", darkMode ? "text-white" : "text-gray-950")}>{custom.title}</span>
                        <span className={cn("text-[9px] sm:text-[10px] font-semibold", darkMode ? "text-neutral-400" : "text-slate-700")}>Target: {formatNum(custom.target)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={cn(
                          "text-xs font-black font-mono px-1.5 sm:px-2 py-0.5 rounded border",
                          darkMode ? "bg-white/10 text-cyan-300 border-white/5" : st.tasbeehCountBadge
                        )}>
                          {formatNum(count)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTasbeehTap(custom.id)}
                          className={cn("w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-black text-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-xs", darkMode ? "bg-cyan-600 text-white hover:bg-cyan-700" : st.tasbeehPlusBtn)}
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
                  className={cn(
                    "w-full py-1.5 rounded-xl border border-dashed text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                    darkMode ? "border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400" : st.tasbeehAddBtn
                  )}
                >
                  <Plus size={13} />
                  <span>{isBn ? 'কাস্টম যিকির যোগ করুন' : 'Add Custom Dhikr'}</span>
                </button>
              ) : (
                <div className={cn(
                  "p-3 rounded-xl border space-y-2",
                  darkMode ? "border-cyan-500/30 bg-black/20" : "border-gray-300 bg-gray-50/70 shadow-xs"
                )}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isBn ? 'যিকিরের নাম (উদাঃ দরূদ ইব্রাহিম)' : 'Dhikr name (e.g. Durood Ibrahimi)'}
                      value={customDhikrName}
                      onChange={e => setCustomDhikrName(e.target.value)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[38px]",
                        darkMode ? "bg-black/40 border-white/10 text-white placeholder:text-neutral-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
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
                      className={cn("px-3 py-1 rounded-lg cursor-pointer font-bold", darkMode ? "text-neutral-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomDhikr}
                      className={cn("px-3 py-1 rounded-lg font-black transition-colors cursor-pointer shadow-xs", darkMode ? "bg-cyan-600 text-white hover:bg-cyan-700" : st.tasbeehPlusBtn)}
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
    </div>

    {/* Sub Tab: Adhkar */}
    <div className={cn("space-y-3 sm:space-y-5 w-full", activeSubTab === 'adhkar' ? "block" : "hidden")}>
      {/* Adhkar Header Banner with Date & Progress */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl p-3 sm:p-5 border transition-all shadow-sm",
        darkMode 
          ? "bg-gradient-to-br from-[#1b1912] to-[#1a1714] border-amber-500/20 text-white" 
          : st.bannerBg
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center",
                darkMode ? "bg-amber-500/20 text-amber-400" : st.iconBox
              )}>
                <Award size={16} className={cn("animate-pulse", darkMode ? "text-amber-400" : st.iconText)} />
              </div>
              <h1 className={cn("text-base sm:text-xl font-black tracking-tight flex items-center gap-1.5", darkMode ? "text-white" : st.bannerTitle)}>
                {isBn ? 'দৈনন্দিন মাসনুন আযকার' : 'Daily Masnoon Adhkar'}
                <span className={cn(
                  "text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold",
                  darkMode ? "bg-amber-500/20 text-amber-400" : st.badge
                )}>
                  {isBn ? 'চেকলিস্ট' : 'Checklist'}
                </span>
              </h1>
            </div>
            <p className={cn("text-xs hidden sm:block", darkMode ? "text-neutral-400" : st.bannerSubtitle)}>
              {isBn 
                ? 'সকাল, সন্ধ্যা ও ফরজ সালাত পরবর্তী মাসনুন সুরক্ষামূলক আযকার নিয়মিত আদায় করুন।' 
                : 'Recite authentic morning, evening, and post-prayer protective masnoon adhkar.'}
            </p>
          </div>

          {renderDateAndThemeControls()}
        </div>

        {/* Stats Strip for Adhkar */}
        <div className={cn("grid grid-cols-3 gap-1.5 sm:gap-3 mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t text-xs", darkMode ? "border-amber-500/15" : st.statsBorder)}>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-amber-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-900")}>
              <CheckCircle2 size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'সম্পন্ন আযকার' : 'Completed Adhkar'}</span>
              <span className={cn("font-black text-xs sm:text-sm font-mono block truncate", darkMode ? "text-amber-400" : "text-amber-950")}>{formatNum(completedAdhkarCount)} / {formatNum(6)}</span>
            </div>
          </div>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-amber-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-900")}>
              <Award size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'অগ্রগতি' : 'Progress'}</span>
              <span className={cn("font-black text-xs sm:text-sm font-mono block truncate", darkMode ? "text-emerald-400" : "text-emerald-950")}>{Math.round((completedAdhkarCount / 6) * 100)}%</span>
            </div>
          </div>
          <div className={cn("p-2 rounded-xl border flex items-center gap-2", darkMode ? "bg-black/20 border-amber-500/10" : st.statCard)}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", darkMode ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-900")}>
              <Calendar size={14} />
            </div>
            <div className="min-w-0">
              <span className={cn("block text-[9px] font-bold truncate", darkMode ? "text-neutral-400" : "text-slate-800")}>{isBn ? 'আমলের তারিখ' : 'Routine'}</span>
              <span className={cn("font-bold text-xs sm:text-sm block truncate", darkMode ? "text-teal-400" : "text-teal-900")}>{selectedDate === getLocalDateString() ? (isBn ? 'আজ' : 'Today') : selectedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Daily Protective Azkar Checklist */}
      <div className={cn(
        "rounded-xl sm:rounded-2xl border transition-all overflow-hidden shadow-xs",
        darkMode ? "bg-[#18181b] border-white/10" : "bg-white border-slate-300 shadow-sm"
      )}>
        <div className="p-3 sm:p-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsAzkarExpanded(!isAzkarExpanded)}
            className="flex-1 flex items-center justify-between cursor-pointer text-left mr-2 min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Award size={16} className={cn(darkMode ? "text-amber-400" : st.adhkarIcon, "shrink-0")} />
              <h2 className={cn("text-sm sm:text-base font-black tracking-tight truncate", darkMode ? "text-white" : "text-gray-950")}>
                {isBn ? 'দৈনন্দিন মাসনুন আযকার চেকলিস্ট' : 'Daily Masnoon Adhkar Checklist'}
              </h2>
            </div>
            <span className={cn(
              "text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md border shrink-0 ml-2 hidden xs:inline-block",
              darkMode ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : st.adhkarBadge
            )}>
              {formatNum(completedAdhkarCount)} / {formatNum(6)} {isBn ? 'সম্পূর্ণ' : 'Done'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center",
                tasbeehSound 
                  ? (darkMode ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-xs" : "text-amber-800 bg-amber-100/90 border border-amber-300 shadow-xs") 
                  : (darkMode ? "text-neutral-500 hover:text-neutral-400" : "text-slate-500 hover:text-slate-800 border border-transparent")
              )}
              title={tasbeehSound ? (isBn ? "সাউন্ড চালু (মিউট করতে ক্লিক করুন)" : "Sound ON (Click to mute)") : (isBn ? "সাউন্ড বন্ধ (চালু করতে ক্লিক করুন)" : "Sound OFF (Click to unmute)")}
              aria-label={tasbeehSound ? "Sound ON" : "Sound OFF"}
            >
              {tasbeehSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setIsAzkarExpanded(!isAzkarExpanded)}
              className={cn("p-1.5 rounded-lg cursor-pointer", darkMode ? "text-neutral-400 hover:text-white" : "text-slate-700 hover:text-gray-950")}
            >
              {isAzkarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isAzkarExpanded && (
          <div className={cn("px-3 pb-3 sm:px-5 sm:pb-5 pt-1 border-t", darkMode ? "border-white/5" : "border-gray-100")}>
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
                      "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer text-left shadow-xs",
                      isChecked
                        ? (darkMode ? "bg-amber-500/15 border-amber-500/30 text-amber-200" : st.adhkarDone)
                        : (darkMode ? "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/5" : st.adhkarIdle)
                    )}
                  >
                    <span className="text-xs pr-2">
                      {isBn ? item.labelBn : item.labelEn}
                    </span>
                    <span className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors",
                      isChecked 
                        ? (darkMode ? "bg-amber-500 border-amber-500 text-white" : st.adhkarCheck) 
                        : (darkMode ? "border-neutral-500" : "border-gray-400 bg-gray-50")
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
  </div>

  {/* Desktop Sub Navigation: Fixed vertical pill on right side */}
  <aside className="hidden md:flex flex-col shrink-0 fixed right-3 lg:right-5 xl:right-7 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
    <nav 
      aria-label="Salah Desktop Navigation"
      className={cn(
        "flex flex-col gap-1 text-[11px] font-bold p-1 rounded-2xl border backdrop-blur-2xl backdrop-saturate-180 transition-all w-28",
        darkMode 
          ? "bg-[#1c1c1e]/75 border-white/[0.14] text-white shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]" 
          : "bg-[#f2f2f7]/80 border-black/[0.08] text-gray-900 shadow-[0_12px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
      )}
    >
      {SALAH_TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeSubTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`salah_tab_desktop_${tab.id}`}
            type="button"
            onClick={() => handleSubTabChange(tab.id)}
            className={cn(
              "relative w-full px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 select-none text-left active:scale-[0.96]",
              isSelected
                ? (darkMode ? "text-white font-black" : "text-neutral-900 font-black")
                : (darkMode ? "text-neutral-400 hover:text-white hover:bg-white/[0.06]" : "text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]")
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="activeSalahSubTabIndicatorDesktop"
                className={cn(
                  "absolute inset-0 rounded-xl",
                  darkMode 
                    ? "bg-white/[0.22] backdrop-blur-xl border border-white/35 shadow-[0_4px_18px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]" 
                    : "bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_3px_12px_rgba(0,0,0,0.12),inset_0_1px_0.5px_rgba(255,255,255,1)]"
                )}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 25,
                  mass: 0.7
                }}
              />
            )}
            <Icon 
              size={14} 
              className={cn(
                "relative z-10 shrink-0 transition-all duration-200", 
                isSelected 
                  ? (darkMode ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" : "text-neutral-950 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]")
                  : "opacity-75"
              )} 
            />
            <span className={cn(
              "relative z-10 truncate tracking-tight transition-colors duration-200",
              isSelected 
                ? (darkMode ? "font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "font-black text-neutral-900")
                : "font-medium"
            )}>
              {isBn ? tab.labelBn : tab.labelEn}
            </span>
          </button>
        );
      })}
    </nav>
  </aside>
</div>

{/* Mobile 3-Tab Navigation: Floating capsule docked right above bottom menu */}
<div 
  id="salah_mobile_subnav_wrapper"
  style={{ bottom: `${mobileNavHeight + 6}px` }}
  className="fixed left-0 right-0 z-40 md:hidden flex justify-center px-4 pointer-events-none transition-all duration-300"
>
  <div 
    id="salah_mobile_subnav"
    className={cn(
      "pointer-events-auto w-full max-w-[260px] xs:max-w-[280px] grid grid-cols-3 py-1 px-1 rounded-full border backdrop-blur-2xl backdrop-saturate-180 transition-all gap-1",
      darkMode 
        ? "bg-[#1c1c1e]/80 border-white/[0.14] text-white shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]" 
        : "bg-[#f2f2f7]/85 border-black/[0.08] text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
    )}
  >
    {SALAH_TABS.map((tab) => {
      const Icon = tab.icon;
      const isSelected = activeSubTab === tab.id;

      return (
        <button
          key={tab.id}
          id={`salah_tab_${tab.id}`}
          type="button"
          onClick={() => handleSubTabChange(tab.id)}
          className={cn(
            "relative flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-full min-h-[28px] cursor-pointer select-none text-center min-w-0 w-full transition-all duration-200 active:scale-[0.95]",
            isSelected
              ? (darkMode ? "text-white font-black" : "text-neutral-900 font-black")
              : (darkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-900")
          )}
        >
          {isSelected && (
            <motion.div
              layoutId="activeSalahSubTabIndicatorMobile"
              className={cn(
                "absolute inset-0 rounded-full",
                darkMode 
                  ? "bg-white/[0.22] backdrop-blur-xl border border-white/35 shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]" 
                  : "bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.12),inset_0_1px_0.5px_rgba(255,255,255,1)]"
              )}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 25,
                mass: 0.7
              }}
            />
          )}
          <Icon 
            size={12} 
            className={cn(
              "relative z-10 shrink-0 transition-all duration-200", 
              isSelected 
                ? (darkMode ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" : "text-neutral-950 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]") 
                : "opacity-75"
            )} 
          />
          <span className={cn(
            "relative z-10 truncate tracking-tight leading-none text-[10.5px] transition-all duration-200", 
            isSelected 
              ? (darkMode ? "font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "font-black text-neutral-900") 
              : "font-semibold"
          )}>
            {isBn ? tab.labelBn : tab.labelEn}
          </span>
        </button>
      );
    })}
  </div>
</div>
</div>
  );
}
