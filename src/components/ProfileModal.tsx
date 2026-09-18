import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Key, CheckCircle, AlertCircle, Check, SunMedium, Calendar } from 'lucide-react';
import { Gender } from '../utils/calculations';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  isSunriseToSunsetEnabled, 
  toggleSunriseSunset, 
  isSunsetTime, 
  applyThemeToDOM,
  saveAutoTheme,
  saveManualTheme 
} from '../utils/theme';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode?: (val: boolean) => void;
  name: string;
  setName: (name: string) => void;
  gender: Gender;
  setGender: (gender: Gender) => void;
  birthdate: string;
  setBirthdate: (date: string) => void;
  age?: string;
  setAge?: (age: string) => void;
  height: string;
  setHeight: (h: string) => void;
  unit: 'metric' | 'imperial';
  setUnit?: (unit: 'metric' | 'imperial') => void;
  isSunriseToSunset?: boolean;
  onToggleSunriseSunset?: () => void;
  weekStartDay?: number;
  onSetWeekStartDay?: (day: number) => void;
  onSaveProfile?: () => void;
}

export default function ProfileModal({
  isOpen, onClose, darkMode, setDarkMode,
  name, setName, gender, setGender, birthdate, setBirthdate,
  age = '', setAge, height, setHeight, unit, setUnit,
  isSunriseToSunset: propIsSunriseToSunset,
  onToggleSunriseSunset: propOnToggleSunriseSunset,
  weekStartDay = 6,
  onSetWeekStartDay,
  onSaveProfile
}: ProfileModalProps) {
  const user = auth.currentUser;
  const photoUrl = user?.photoURL;
  const email = user?.email;

  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState(false);
  const [internalSunriseToSunset, setInternalSunriseToSunset] = useState(() => {
    if (propIsSunriseToSunset !== undefined) return propIsSunriseToSunset;
    return isSunriseToSunsetEnabled();
  });

  useEffect(() => {
    if (propIsSunriseToSunset !== undefined) {
      setInternalSunriseToSunset(propIsSunriseToSunset);
    } else {
      setInternalSunriseToSunset(isSunriseToSunsetEnabled());
    }
  }, [isOpen, propIsSunriseToSunset]);

  const isSunriseToSunset = propIsSunriseToSunset !== undefined ? propIsSunriseToSunset : internalSunriseToSunset;

  const handleBirthdateChange = (newDate: string) => {
    setBirthdate(newDate);
    if (newDate) {
      const bDate = new Date(newDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - bDate.getFullYear();
      const m = today.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
        calculatedAge--;
      }
      if (!isNaN(calculatedAge) && calculatedAge >= 0 && setAge) {
        setAge(calculatedAge.toString());
      }
    }
  };

  const handleSaveAndExit = () => {
    // 1. Immediately persist all profile fields to localStorage under both keys
    try {
      localStorage.setItem('ratool_name', name);
      localStorage.setItem('ratbod_name', name);
      localStorage.setItem('ratool_gender', gender);
      localStorage.setItem('ratbod_gender', gender);
      localStorage.setItem('ratool_birthdate', birthdate);
      localStorage.setItem('ratbod_birthdate', birthdate);
      if (age) {
        localStorage.setItem('ratool_age', age);
        localStorage.setItem('ratbod_age', age);
      }
      localStorage.setItem('ratool_height', height);
      localStorage.setItem('ratbod_height', height);
      localStorage.setItem('ratool_unit', unit);
      localStorage.setItem('ratbod_unit', unit);
      if (typeof weekStartDay === 'number') {
        localStorage.setItem('ratool_week_start_day', String(weekStartDay));
        localStorage.setItem('ratbod_week_start_day', String(weekStartDay));
      }
      localStorage.setItem('ratool_sunrise_sunset', String(Boolean(isSunriseToSunset)));
      localStorage.setItem('ratbod_sunrise_sunset', String(Boolean(isSunriseToSunset)));
    } catch (e) {}

    // 2. If user is signed in to Firebase, sync directly to Firestore
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, {
        name,
        gender,
        birthdate,
        age: age || '',
        height,
        unit,
        weekStartDay,
        isSunriseToSunset: Boolean(isSunriseToSunset),
        updatedAt: serverTimestamp()
      }, { merge: true }).catch((err) => {
        console.error("Failed to sync profile on save:", err);
      });
    }

    // 3. Dispatch global toast event for visual confirmation
    window.dispatchEvent(new CustomEvent('ratool_saved_toast'));

    if (onSaveProfile) {
      onSaveProfile();
    }

    onClose();
  };

  const handleSendResetEmail = async () => {
    if (!email) {
      setPasswordError('No email associated with this account.');
      return;
    }
    setPasswordError(null);
    setPasswordStatus(null);
    setSettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setPasswordStatus(`Password reset link sent to ${email}! Check your Gmail or email inbox.`);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email.');
    } finally {
      setSettingPassword(false);
    }
  };

  const handleToggleSunriseSunset = () => {
    if (propOnToggleSunriseSunset) {
      propOnToggleSunriseSunset();
      return;
    }

    const nextState = toggleSunriseSunset(darkMode, (newDark) => {
      applyThemeToDOM(newDark);
      saveAutoTheme(newDark);
      if (setDarkMode) setDarkMode(newDark);
    });
    setInternalSunriseToSunset(nextState);
    const darkNow = nextState ? isSunsetTime() : darkMode;
    applyThemeToDOM(darkNow);
    if (nextState) {
      saveAutoTheme(darkNow);
    } else {
      saveManualTheme(darkNow);
    }
    if (setDarkMode) setDarkMode(darkNow);

    // Sync directly to Firestore for real-time multi-device propagation
    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        isSunriseToSunset: nextState,
        themeMode: nextState ? 'auto' : (darkNow ? 'dark' : 'light'),
        darkMode: darkNow,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex flex-col sm:justify-center items-center p-4 pt-20 sm:pt-4 transition-colors">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col z-10 my-auto",
        darkMode ? "bg-[#0F0F0F] border border-white/10" : "bg-white border border-black/5"
      )}>
        <button 
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full transition-colors z-10 cursor-pointer",
            darkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"
          )}
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-blue-500/20" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg mx-auto">
                <UserIcon size={36} className="text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-black">{name || 'User Profile'}</h2>
          <p className={cn("text-xs mt-1", darkMode ? "text-gray-400" : "text-gray-500")}>
            {email || 'Signed in via Firebase Auth'}
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
              )}
              placeholder="Your Name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
                Height ({unit === 'metric' ? 'cm' : 'in'})
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
                placeholder={unit === 'metric' ? 'e.g. 175' : 'e.g. 69'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
                Date of Birth
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => handleBirthdateChange(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              />
            </div>
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
                Age (years)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={age || ''}
                onChange={(e) => setAge?.(e.target.value)}
                placeholder="e.g. 28"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              />
            </div>
          </div>

          {/* Unit System Selector */}
          <div>
            <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", darkMode ? "text-gray-400" : "text-gray-600")}>
              Unit System
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setUnit?.('metric')}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  unit === 'metric'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Metric (kg / cm)
              </button>
              <button
                type="button"
                onClick={() => setUnit?.('imperial')}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  unit === 'imperial'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Imperial (lbs / in)
              </button>
            </div>
          </div>

          {/* Sunrise to Sunset Setting: One-liner with tick icon - ONLY available in Profile Edit section */}
          <div className="mt-4 pt-3 border-t border-white/10 dark:border-white/10 border-gray-100">
            <button
              type="button"
              onClick={handleToggleSunriseSunset}
              className={cn(
                "w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none",
                darkMode ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <SunMedium size={16} className="text-amber-500 shrink-0" />
                <span className={cn("text-xs font-bold", darkMode ? "text-gray-200" : "text-gray-800")}>
                  Sunrise to sunset setting
                </span>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center border transition-all",
                isSunriseToSunset
                  ? "bg-primary border-primary text-white shadow-sm"
                  : (darkMode ? "border-white/20 bg-white/5" : "border-gray-300 bg-white")
              )}>
                {isSunriseToSunset && <Check size={14} strokeWidth={3} />}
              </div>
            </button>

            {/* Week Start Day Setting */}
            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-emerald-500 shrink-0" />
                <span className={cn("text-xs font-bold", darkMode ? "text-gray-200" : "text-gray-800")}>
                  Week Start Day
                </span>
              </div>
              <select
                id="profile_week_start_select"
                value={weekStartDay}
                onChange={(e) => onSetWeekStartDay?.(Number(e.target.value))}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                  darkMode 
                    ? "bg-[#18181b] border-white/10 text-white" 
                    : "bg-white border-gray-200 text-gray-900 shadow-2xs"
                )}
              >
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
              </select>
            </div>
          </div>

          {/* Reset Password Button */}
          {email && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={settingPassword}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98",
                  darkMode 
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" 
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800"
                )}
              >
                <Key size={14} className="text-primary" />
                <span>{settingPassword ? 'Sending reset link...' : 'Reset Password'}</span>
              </button>

              {passwordStatus && (
                <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] flex items-center gap-1.5">
                  <CheckCircle size={13} className="shrink-0" />
                  <span>{passwordStatus}</span>
                </div>
              )}

              {passwordError && (
                <div className="mt-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-3">
          <button
            type="button"
            id="profile_save_exit_btn"
            onClick={handleSaveAndExit}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>Save & Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
