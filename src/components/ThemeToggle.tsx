import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { saveManualTheme, applyThemeToDOM } from '../utils/theme';

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode?: (val: boolean) => void;
  className?: string;
  variant?: 'compact' | 'pill' | 'expanded';
  align?: 'left' | 'right';
  lang?: 'en' | 'bn';
}

export default function ThemeToggle({
  darkMode,
  setDarkMode,
  className = '',
  lang = 'en'
}: ThemeToggleProps) {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDark = !darkMode;
    saveManualTheme(nextDark);
    applyThemeToDOM(nextDark);
    if (setDarkMode) {
      setDarkMode(nextDark);
    }
  };

  const title = darkMode 
    ? (lang === 'bn' ? 'লাইট মোড চালু করুন' : 'Switch to Light Mode')
    : (lang === 'bn' ? 'ডার্ক মোড চালু করুন' : 'Switch to Dark Mode');

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={title}
      aria-label={title}
      className={`group p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 ${
        darkMode 
          ? 'bg-white/5 text-amber-400 hover:bg-white/10 border border-white/10 hover:border-amber-400/40' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-black/5 hover:border-gray-300'
      } ${className}`}
    >
      {darkMode ? (
        <Sun size={14} className="transition-transform group-hover:rotate-45" />
      ) : (
        <Moon size={14} className="transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
}
