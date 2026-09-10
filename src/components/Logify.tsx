/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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

export type LogifyTab = 'writing' | 'reading' | 'water' | 'sleep' | 'steps';

interface LogifyProps {
  darkMode: boolean;
  lang?: string;
  unit?: 'metric' | 'imperial';
  isLogifyActive?: boolean;
  activeTab?: LogifyTab;
  onTabChange?: (tab: LogifyTab) => void;
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
    id: 'writing',
    labelEn: 'Writing',
    labelEnShort: 'Write',
    labelBn: 'লেখা',
    labelBnShort: 'লেখা',
    icon: PenLine
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
    id: 'water',
    labelEn: 'Water',
    labelEnShort: 'Water',
    labelBn: 'পানি',
    labelBnShort: 'পানি',
    icon: Droplet
  },
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
  }
];

export default function Logify({ 
  darkMode, 
  lang = 'en', 
  activeTab: propActiveTab, 
  onTabChange 
}: LogifyProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<LogifyTab>(() => {
    try {
      const saved = localStorage.getItem('ratool_logify_subtab') as LogifyTab;
      if (saved && ['writing', 'reading', 'water', 'sleep', 'steps'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'writing';
  });

  const activeTab = propActiveTab || internalActiveTab;

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
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
    try {
      localStorage.setItem('ratool_logify_subtab', tab);
    } catch (e) {}
  };

  const isBn = lang === 'bn';

  return (
    <div className="w-full max-w-full">
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-3.5 lg:gap-4 w-full">
        {/* Tab Content Area: comfortable bottom padding on mobile (pb-36) */}
        <div id={`logify_content_${activeTab}`} className="flex-1 min-w-0 w-full pb-36 md:pb-6">
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

        {/* Desktop Navigation: Compact vertical style docked on the right side, sticky as user scrolls */}
        <aside className="hidden md:flex flex-col shrink-0 sticky top-20 z-20">
          <nav 
            aria-label="Logify Desktop Navigation"
            className={cn(
              "flex flex-col gap-0.5 text-[11px] font-bold p-1 rounded-xl border backdrop-blur-2xl transition-all shadow-md w-28",
              darkMode 
                ? "bg-[#141414]/90 border-white/10 text-white shadow-black/50" 
                : "bg-white/90 border-black/10 text-gray-900 shadow-gray-300/40"
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
                    "relative w-full px-2.5 py-2 rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none text-left",
                    isSelected
                      ? "text-white font-bold"
                      : (darkMode ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeSubTabIndicatorDesktop"
                      className={cn(
                        "absolute inset-0 rounded-lg",
                        darkMode 
                          ? "bg-black border border-white/20 shadow-md shadow-black/60" 
                          : "bg-gray-900 shadow-md shadow-black/25"
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
                      "relative z-10 shrink-0 transition-colors duration-200", 
                      isSelected 
                        ? "text-white"
                        : "opacity-75"
                    )} 
                  />
                  <span className="relative z-10 font-bold truncate tracking-tight">{isBn ? tab.labelBn : tab.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Mobile 5-Tab Navigation: Floating capsule docked above mobile bottom bar with slightly increased bottom padding and water-themed active tab */}
      <div 
        id="logify_mobile_subnav_wrapper"
        style={{ bottom: `${mobileNavHeight + 6}px` }}
        className="fixed left-0 right-0 z-40 md:hidden flex justify-center px-4 pointer-events-none transition-all duration-300"
      >
        <div 
          id="logify_mobile_subnav"
          className={cn(
            "pointer-events-auto w-full max-w-[315px] xs:max-w-[330px] grid grid-cols-5 py-1.5 px-1.5 rounded-full border backdrop-blur-2xl backdrop-saturate-150 transition-all gap-1 shadow-lg",
            darkMode 
              ? "bg-[#121212]/85 border-white/15 text-white shadow-black/50" 
              : "bg-white/85 border-black/10 text-gray-900 shadow-gray-400/25"
          )}
        >
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
                  "relative flex items-center justify-center gap-1 py-2 px-0.5 rounded-full min-h-[32px] cursor-pointer select-none text-center min-w-0 w-full transition-colors duration-200",
                  isSelected
                    ? "text-white"
                    : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeSubTabIndicatorMobile"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      darkMode 
                        ? "bg-black border border-white/20 shadow-md shadow-black/60" 
                        : "bg-gray-900 shadow-md shadow-black/25"
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
                    "relative z-10 shrink-0 transition-colors duration-200", 
                    isSelected 
                      ? "text-white" 
                      : "opacity-75"
                  )} 
                />
                <span className={cn(
                  "relative z-10 truncate tracking-tight leading-none text-[10px] transition-all duration-200", 
                  isSelected ? "font-black text-white" : "font-bold"
                )}>
                  {isBn ? tab.labelBnShort : tab.labelEnShort}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
