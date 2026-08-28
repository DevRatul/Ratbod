import React, { useState } from 'react';
import { Footprints, Save } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface QuickStepsProps {
  darkMode: boolean;
  lang?: string;
  onSave?: () => void;
}

export default function QuickSteps({ darkMode, lang = 'en', onSave }: QuickStepsProps) {
  const [steps, setSteps] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!steps || parseInt(steps) <= 0) return;
    setIsSaving(true);
    try {
      const parsedSteps = parseInt(steps);
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        steps: parsedSteps
      };

      // Save to localStorage
      const localData = JSON.parse(localStorage.getItem('ratbod_steps_history') || '[]');
      const updatedLocal = [newEntry, ...localData];
      localStorage.setItem('ratbod_steps_history', JSON.stringify(updatedLocal));

      // Save to Firestore if logged in
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreHistory = data.stepsHistory || [];
          const updatedFirestore = [newEntry, ...firestoreHistory];
          await setDoc(docRef, { stepsHistory: updatedFirestore }, { merge: true });
        } else {
          await setDoc(docRef, { stepsHistory: [newEntry] }, { merge: true });
        }
      }

      setSteps('');
      if (onSave) onSave();
      window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
    } catch (e) {
      console.error("Error saving steps:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(
      "h-[66px] sm:h-[74px] px-3.5 sm:px-5 py-2 rounded-2xl sm:rounded-3xl border flex items-center justify-between gap-2.5 sm:gap-4 overflow-hidden relative transition-all",
      darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50"
    )}>
      {/* Left: Icon & Title in one row */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <div className={cn(
          "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all",
          darkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200/60"
        )}>
          <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-black tracking-tight truncate text-gray-900 dark:text-white">
            {lang === 'bn' ? 'সাপ্তাহিক পদক্ষেপ' : 'Weekly Steps'}
          </h3>
          <p className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-semibold hidden xs:block truncate">
            {lang === 'bn' ? 'দৈনিক হাঁটার পরিমাণ' : 'Daily walking log'}
          </p>
        </div>
      </div>

      {/* Right: Input & Save Button in the same row */}
      <form onSubmit={handleSave} className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end max-w-[220px] sm:max-w-xs min-w-0">
        <div className="relative flex-1 min-w-[85px]">
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className={cn(
              "w-full h-8 sm:h-9 border rounded-lg sm:rounded-xl pl-2.5 pr-7 sm:pl-3 sm:pr-9 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
              darkMode ? "bg-black/50 border-white/10 text-white placeholder-gray-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white placeholder-gray-400"
            )}
            placeholder={lang === 'bn' ? '০' : '0'}
          />
          <span className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[9px] sm:text-[11px] font-bold text-gray-400 pointer-events-none">
            {lang === 'bn' ? 'ধাপ' : 'steps'}
          </span>
        </div>
        
        <button
          type="submit"
          disabled={!steps || isSaving}
          className="h-8 sm:h-9 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-md shadow-blue-600/20 shrink-0"
        >
          {isSaving ? <span className="animate-spin text-xs">...</span> : <Save size={13} className="sm:w-3.5 sm:h-3.5" />}
          <span className="inline">{lang === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
        </button>
      </form>
    </div>
  );
}
