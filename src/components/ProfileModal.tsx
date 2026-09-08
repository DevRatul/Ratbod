import React, { useState } from 'react';
import { X, User as UserIcon, Smartphone, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { Gender } from '../utils/calculations';
import { auth } from '../lib/firebase';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ThemeToggle from './ThemeToggle';

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

  const [mobilePassword, setMobilePassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState(false);

  const handleSetMobilePassword = async () => {
    if (!user) return;
    if (!mobilePassword || mobilePassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setPasswordError(null);
    setPasswordStatus(null);
    setSettingPassword(true);
    try {
      await updatePassword(user, mobilePassword);
      setPasswordStatus('Password saved! You can now log into the iPhone PWA with your email and this password.');
      setMobilePassword('');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        try {
          if (email) {
            await sendPasswordResetEmail(auth, email);
            setPasswordStatus(`A secure password setup link was sent to ${email}. Open it on your phone to finish setup.`);
          }
        } catch (e2: any) {
          setPasswordError(e2.message || 'Please log in again before setting a password.');
        }
      } else {
        setPasswordError(err.message || 'Failed to update password.');
      }
    } finally {
      setSettingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!email) return;
    setPasswordError(null);
    setPasswordStatus(null);
    setSettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setPasswordStatus(`Password setup email sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email.');
    } finally {
      setSettingPassword(false);
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

        <div className="space-y-4 px-1 pb-4">
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
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('male')}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer border",
                  gender === 'male'
                    ? (darkMode ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-white text-gray-900 border-gray-300 shadow-sm")
                    : (darkMode ? "bg-black/50 text-gray-400 border-white/5" : "bg-gray-50 text-gray-500 border-gray-200")
                )}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer border",
                  gender === 'female'
                    ? (darkMode ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-white text-gray-900 border-gray-300 shadow-sm")
                    : (darkMode ? "bg-black/50 text-gray-400 border-white/5" : "bg-gray-50 text-gray-500 border-gray-200")
                )}
              >
                Female
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Date of Birth</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm",
                darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900",
                !birthdate && "text-gray-400"
              )}
            />
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

          {/* iPhone / Mobile PWA Direct Access Section */}
          <div className={cn(
            "p-4 rounded-2xl border space-y-3 mt-4",
            darkMode ? "bg-white/[0.03] border-white/10" : "bg-blue-50/50 border-blue-100"
          )}>
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-primary" />
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-white" : "text-gray-900")}>
                iPhone / PWA Direct Sign-In
              </h3>
            </div>
            <p className={cn("text-[11px] leading-relaxed", darkMode ? "text-gray-400" : "text-gray-600")}>
              Set a password so you can sign in directly on your iPhone PWA with <strong className="text-primary">{email}</strong> without Safari OAuth popup interruptions.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={mobilePassword}
                  onChange={(e) => setMobilePassword(e.target.value)}
                  placeholder="Set mobile password"
                  className={cn(
                    "w-full pl-8 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-primary",
                    darkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"
                  )}
                />
              </div>
              <button
                type="button"
                onClick={handleSetMobilePassword}
                disabled={settingPassword || !mobilePassword}
                className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {settingPassword ? '...' : 'Save'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={settingPassword}
              className="text-[11px] text-primary hover:underline font-medium block"
            >
              Or email me a password setup link
            </button>

            {passwordStatus && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] flex items-center gap-1.5">
                <CheckCircle size={13} className="shrink-0" />
                <span>{passwordStatus}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
          </div>

          {/* Website Theme & Sunset/Sunrise Schedule */}
          <div className="mt-4 pt-4 border-t border-white/10 dark:border-white/10 border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block">Website Appearance</span>
              <span className="text-[10px] text-gray-500 block">Automatic sunset-to-sunrise dark mode</span>
            </div>
            <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} align="right" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
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
