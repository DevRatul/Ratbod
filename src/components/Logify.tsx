/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Droplet, Moon, Footprints, BookOpen, PenLine } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WaterTracker from './WaterTracker';
import SleepTracker from './SleepTracker';
import StepsTracker from './StepsTracker';
import ReadingTracker from './ReadingTracker';
import WritingTracker from './WritingTracker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type LogifyTab = 'water' | 'sleep' | 'steps' | 'reading' | 'writing';

interface LogifyProps {
  darkMode: boolean;
  lang?: string;
  unit?: 'metric' | 'imperial';
  isLogifyActive?: boolean;
}

interface TabConfig {
  id: LogifyTab;
  labelEn: string;
  labelEnShort: string;
  labelBn: string;
  labelBnShort: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  {
    id: 'sleep',
    labelEn: 'Sleep',
    labelEnShort: 'Sleep',
    labelBn: 'ঘুম',
    labelBnShort: 'ঘুম',
    icon: Moon
  },
  {
    id: 'steps',
    labelEn: 'Steps',
    labelEnShort: 'Steps',
    labelBn: 'পদক্ষেপ',
    labelBnShort: 'কদম',
    icon: Footprints
  },
  {
    id: 'water',
    labelEn: 'Water',
    labelEnShort: 'Water',
    labelBn: 'পানি',
    labelBnShort: 'পানি',
    icon: Droplet
  },
  {
    id: 'reading',
    labelEn: 'Reading',
    labelEnShort: 'Read',
    labelBn: 'পড়া',
    labelBnShort: 'পড়া',
    icon: BookOpen
  },
  {
    id: 'writing',
    labelEn: 'Writing',
    labelEnShort: 'Write',
    labelBn: 'লেখা',
    labelBnShort: 'লেখা',
    icon: PenLine
  }
];

export default function Logify({ darkMode, lang = 'en', isLogifyActive }: LogifyProps) {
  const [activeTab, setActiveTab] = useState<LogifyTab>('water');

  useEffect(() => {
    if (isLogifyActive) {
      setActiveTab('water');
    }
  }, [isLogifyActive]);

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

  const handleTabChange = (tab: LogifyTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('ratool_logify_subtab', tab);
    } catch (e) {}
  };

  const isBn = lang === 'bn';

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Desktop Navigation: Positioned at top for md: screens and above, styled identically to top header */}
      <div className="hidden md:flex justify-center w-full mb-6">
        <nav 
          aria-label="Logify Desktop Navigation"
          className={cn(
            "flex items-center gap-1 text-[11px] font-bold p-1 rounded-xl border transition-colors",
            darkMode 
              ? "bg-white/5 border-white/5" 
              : "bg-gray-100/60 border-black/5"
          )}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`logify_tab_desktop_${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-3.5 pt-[10px] pb-[8px] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 select-none",
                  isSelected
                    ? (darkMode ? "bg-white/10 text-white font-bold" : "bg-white text-gray-900 shadow-sm font-bold")
                    : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-700 hover:text-gray-900")
                )}
              >
                <Icon size={13} className={cn("shrink-0", isSelected ? (darkMode ? "text-white" : "text-gray-900") : "opacity-75")} />
                <span>{isBn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Area: bottom padding on mobile (pb-28) for smooth scroll clearance */}
      <div id={`logify_content_${activeTab}`} className="min-h-[200px] w-full pb-28 md:pb-6">
        <div className={activeTab === 'water' ? 'block' : 'hidden'}>
          <WaterTracker darkMode={darkMode} lang={lang === 'bn' ? 'bn' : 'en'} />
        </div>

        <div className={activeTab === 'sleep' ? 'block' : 'hidden'}>
          <SleepTracker darkMode={darkMode} lang={lang === 'bn' ? 'bn' : 'en'} />
        </div>

        <div className={activeTab === 'steps' ? 'block' : 'hidden'}>
          <StepsTracker darkMode={darkMode} lang={lang === 'bn' ? 'bn' : 'en'} />
        </div>

        <div className={activeTab === 'reading' ? 'block' : 'hidden'}>
          <ReadingTracker darkMode={darkMode} lang={lang === 'bn' ? 'bn' : 'en'} />
        </div>

        <div className={activeTab === 'writing' ? 'block' : 'hidden'}>
          <WritingTracker darkMode={darkMode} lang={lang === 'bn' ? 'bn' : 'en'} />
        </div>
      </div>

      {/* Mobile 5-Tab Navigation: Floating directly above mobile menu, NO glass effect, tiny space for mobile view only */}
      <div 
        id="logify_mobile_subnav"
        style={{ bottom: `${mobileNavHeight}px` }}
        className="fixed left-0 right-0 z-40 md:hidden flex justify-center px-1.5 pb-1 pointer-events-none"
      >
        <div className={cn(
          "pointer-events-auto w-full max-w-sm grid grid-cols-5 p-0.5 rounded-lg border shadow-md transition-colors gap-0.5 text-[10px] font-bold",
          darkMode 
            ? "bg-[#181818] border-white/10 text-white shadow-black/40" 
            : "bg-[#f4f4f5] border-black/10 text-gray-900 shadow-gray-300/40"
        )}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`logify_tab_${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1 px-0.5 rounded-md transition-colors cursor-pointer select-none text-center min-w-0 w-full",
                  isSelected
                    ? (darkMode ? "bg-white/15 text-white font-bold" : "bg-white text-gray-900 shadow-xs font-bold")
                    : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                )}
              >
                <Icon size={11} className={cn("shrink-0", isSelected ? (darkMode ? "text-white" : "text-gray-900") : "opacity-75")} />
                <span className="truncate tracking-tight leading-none text-[9.5px]">{isBn ? tab.labelBnShort : tab.labelEnShort}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
