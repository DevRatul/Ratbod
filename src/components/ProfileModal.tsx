import React, { useState } from 'react';
import { X, User as UserIcon, Key, CheckCircle, AlertCircle, Check, SunMedium } from 'lucide-react';
import { Gender } from '../utils/calculations';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSunriseToSunsetEnabled, toggleSunriseSunset, isSunsetTime, applyThemeToDOM } from '../utils/theme';

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
  height: string;
  setHeight: (h: string) => void;
  unit: 'metric' | 'imperial';
}

export default function ProfileModal({
  isOpen, onClose, darkMode, setDarkMode,
  name, setName, gender, setGender, birthdate, setBirthdate, height, setHeight, unit
}: ProfileModalProps) {
  if (!isOpen) return null;

  const user = auth.currentUser;
  const photoUrl = user?.photoURL;
  const email = user?.email;

  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState(false);
  const [isSunriseToSunset, setIsSunriseToSunset] = useState(() => isSunriseToSunsetEnabled());

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
    const nextState = toggleSunriseSunset(darkMode, (newDark) => {
      if (setDarkMode) setDarkMode(newDark);
    });
    setIsSunriseToSunset(nextState);
    if (nextState) {
      const darkNow = isSunsetTime();
      applyThemeToDOM(darkNow);
      if (setDarkMode) setDarkMode(darkNow);
    }
  };

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
          <h2 className={cn("text-xl font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>Your Profile</h2>
          {email && <p className={cn("text-xs font-medium mt-1 text-emerald-500 font-mono")}>{email}</p>}
        </div>

        <div className="space-y-4 px-1 pb-2">
          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm",
                darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
              )}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm appearance-none",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Birthdate</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider flex justify-between", darkMode ? "text-gray-400" : "text-gray-600")}>
              <span>Height</span>
              <span>{unit === 'metric' ? 'cm' : 'inches'}</span>
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
              )}
              placeholder="e.g. 175"
            />
          </div>

          {/* Sunrise to Sunset Setting: One-liner with tick icon */}
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
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}
