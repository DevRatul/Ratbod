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

  const formatNum = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '';
    const str = typeof num === 'number' ? num.toFixed(1) : num.toString();
    if (lang !== 'bn') return str;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit)]);
  };

  const handleSave = async () => {
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
    } catch (e) {
      console.error("Error saving steps:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border border-gray-200 shadow-md shadow-gray-200/50")}>
      <div className="flex items-center gap-2 mb-4 text-lg font-bold">
        <Footprints size={20} className="text-blue-500 opacity-70" /> {lang === 'bn' ? 'সাপ্তাহিক পদক্ষেপ' : 'Weekly Steps'}
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className={cn(
              "w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
              darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white"
            )}
            placeholder={lang === 'bn' ? '০' : '0'}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
            {lang === 'bn' ? 'পদক্ষেপ' : 'steps'}
          </span>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!steps || isSaving}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
        >
          {isSaving ? <span className="animate-spin text-sm">...</span> : <Save size={18} />}
          <span className="hidden sm:inline">{lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
}
