import React from 'react';
import { X, User as UserIcon } from 'lucide-react';
import { Gender } from '../utils/calculations';
import { auth } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
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
  isOpen, onClose, darkMode,
  name, setName, gender, setGender, birthdate, setBirthdate, height, setHeight, unit
}: ProfileModalProps) {
  if (!isOpen) return null;

  const user = auth.currentUser;
  const photoUrl = user?.photoURL;
  const email = user?.email;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex flex-col sm:justify-center items-center p-4 pt-20 sm:pt-4 transition-colors">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col z-10",
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
          {email && <p className={cn("text-xs font-medium mt-1", darkMode ? "text-gray-400" : "text-gray-500")}>{email}</p>}
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
                    ? (darkMode ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200")
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
                    ? (darkMode ? "bg-pink-500/20 text-pink-400 border-pink-500/30" : "bg-pink-50 text-pink-700 border-pink-200")
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
