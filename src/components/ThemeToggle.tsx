import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Sunrise, Sunset, Check, Sparkles } from 'lucide-react';
import { 
  ThemeMode, 
  getThemeMode, 
  setThemeMode, 
  getSolarInfo, 
  isDarkModeForMode, 
  applyThemeToDOM 
} from '../utils/theme';

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
  variant = 'compact',
  align = 'right',
  lang = 'en'
}: ThemeToggleProps) {
  const [themeMode, setLocalThemeMode] = useState<ThemeMode>(() => getThemeMode());
  const [isOpen, setIsOpen] = useState(false);
  const [solarInfo, setSolarInfo] = useState(() => getSolarInfo());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep solar times refreshed
  useEffect(() => {
    setSolarInfo(getSolarInfo());
    const interval = setInterval(() => {
      setSolarInfo(getSolarInfo());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setLocalThemeMode(mode);
    const newDark = isDarkModeForMode(mode);
    applyThemeToDOM(newDark);
    if (setDarkMode) {
      setDarkMode(newDark);
    }
    setIsOpen(false);
  };

  // Direct toggle on click: If menu is closed, clicking cycles or opens popover
  const handleQuickCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle popover menu so user can choose or inspect sunset/sunrise times
    setIsOpen(prev => !prev);
  };

  const isAuto = themeMode === 'auto';

  const t = {
    autoTitle: lang === 'bn' ? 'সূর্যাস্ত থেকে সূর্যোদয় (অটো)' : 'Sunset to Sunrise (Auto)',
    autoDesc: lang === 'bn' 
      ? `সকাল ${solarInfo.sunriseStr} এ লাইট, সন্ধ্যা ${solarInfo.sunsetStr} এ ডার্ক`
      : `Light at ${solarInfo.sunriseStr} • Dark at ${solarInfo.sunsetStr}`,
    activeDay: lang === 'bn' ? 'এখন দিন (লাইট মোড)' : 'Currently Day (Light)',
    activeNight: lang === 'bn' ? 'এখন রাত (ডার্ক মোড)' : 'Currently Night (Dark)',
    lightTitle: lang === 'bn' ? 'স্থায়ী লাইট মোড' : 'Always Light',
    lightDesc: lang === 'bn' ? 'সবসময় লাইট মোড থাকবে' : 'Permanent clean light theme',
    darkTitle: lang === 'bn' ? 'স্থায়ী ডার্ক মোড' : 'Always Dark',
    darkDesc: lang === 'bn' ? 'সবসময় ডার্ক মোড থাকবে' : 'Permanent sleek dark theme',
    appearance: lang === 'bn' ? 'ওয়েবসাইট থিম' : 'Website Theme',
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleQuickCycle}
        title={
          isAuto 
            ? `${t.autoTitle} (${solarInfo.isNight ? t.activeNight : t.activeDay})`
            : themeMode === 'dark' ? t.darkTitle : t.lightTitle
        }
        className={`group relative p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
          darkMode 
            ? 'bg-white/5 text-primary hover:bg-white/10 border border-white/10 hover:border-primary/40' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-black/5 hover:border-gray-300'
        }`}
        aria-label="Toggle Theme Schedule"
      >
        {darkMode ? (
          <Moon size={14} className="transition-transform group-hover:scale-110" />
        ) : (
          <Sun size={14} className="transition-transform group-hover:rotate-45" />
        )}

        {/* Subtle indicator for Auto (Sunset-Sunrise) mode */}
        {isAuto && (
          <span 
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-current animate-pulse shadow-sm"
            title="Auto Sunset to Sunrise Active"
          />
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute z-[100] mt-2 w-72 sm:w-80 rounded-2xl p-2 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            darkMode 
              ? 'bg-[#111111]/95 border-white/15 text-white shadow-black/80' 
              : 'bg-white/95 border-gray-200 text-gray-900 shadow-gray-400/50'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 dark:border-white/10 border-gray-100 mb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[11px] font-bold tracking-wider uppercase opacity-75">
                {t.appearance}
              </span>
            </div>
            {isAuto && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                {solarInfo.isNight ? '🌙 Night' : '☀️ Day'}
              </span>
            )}
          </div>

          {/* Option 1: Sunset to Sunrise (Auto) */}
          <button
            type="button"
            onClick={() => handleSelectMode('auto')}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer group ${
              isAuto
                ? (darkMode ? 'bg-white/10 border border-primary/40' : 'bg-primary/10 border border-primary/40')
                : (darkMode ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-gray-100 border border-transparent')
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isAuto ? 'bg-primary text-black' : (darkMode ? 'bg-white/5 text-primary' : 'bg-gray-100 text-gray-700')
            }`}>
              {solarInfo.isNight ? <Sunset size={16} /> : <Sunrise size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1">
                  {t.autoTitle}
                </span>
                {isAuto && <Check size={14} className="text-primary shrink-0" />}
              </div>
              <p className={`text-[10px] mt-0.5 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.autoDesc}
              </p>
              <div className={`mt-1.5 text-[9px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                <span>{solarInfo.isNight ? '🌙' : '☀️'}</span>
                <span>{solarInfo.isNight ? t.activeNight : t.activeDay}</span>
              </div>
            </div>
          </button>

          {/* Option 2: Always Light */}
          <button
            type="button"
            onClick={() => handleSelectMode('light')}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer mt-1 ${
              themeMode === 'light'
                ? (darkMode ? 'bg-white/10 border border-primary/40' : 'bg-primary/10 border border-primary/40')
                : (darkMode ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-gray-100 border border-transparent')
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              themeMode === 'light' ? 'bg-primary text-black' : (darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700')
            }`}>
              <Sun size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{t.lightTitle}</span>
                {themeMode === 'light' && <Check size={14} className="text-primary shrink-0" />}
              </div>
              <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.lightDesc}
              </p>
            </div>
          </button>

          {/* Option 3: Always Dark */}
          <button
            type="button"
            onClick={() => handleSelectMode('dark')}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer mt-1 ${
              themeMode === 'dark'
                ? (darkMode ? 'bg-white/10 border border-primary/40' : 'bg-primary/10 border border-primary/40')
                : (darkMode ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-gray-100 border border-transparent')
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              themeMode === 'dark' ? 'bg-primary text-black' : (darkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700')
            }`}>
              <Moon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{t.darkTitle}</span>
                {themeMode === 'dark' && <Check size={14} className="text-primary shrink-0" />}
              </div>
              <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.darkDesc}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
