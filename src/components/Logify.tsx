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
        {/* Tab Content Area: comfortable bottom padding on mobile (pb-36) and right padding on desktop so fixed nav never overlaps */}
        <div id={`logify_content_${activeTab}`} className="flex-1 min-w-0 w-full pb-36 md:pb-6 md:pr-32 xl:pr-0">
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

        {/* Desktop Navigation: Aligned center right to the whole screen, sticky as user scrolls up/down */}
        <aside className="hidden md:flex flex-col shrink-0 fixed right-3 lg:right-5 xl:right-7 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <nav 
            aria-label="Logify Desktop Navigation"
            className={cn(
              "flex flex-col gap-1 text-[11px] font-bold p-1 rounded-2xl border backdrop-blur-2xl backdrop-saturate-180 transition-all w-28",
              darkMode 
                ? "bg-[#1c1c1e]/75 border-white/[0.14] text-white shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]" 
                : "bg-[#f2f2f7]/80 border-black/[0.08] text-gray-900 shadow-[0_12px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
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
                    "relative w-full px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2 select-none text-left active:scale-[0.96]",
                    isSelected
                      ? (darkMode ? "text-white font-black" : "text-neutral-900 font-black")
                      : (darkMode ? "text-neutral-400 hover:text-white hover:bg-white/[0.06]" : "text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]")
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeSubTabIndicatorDesktop"
                      className={cn(
                        "absolute inset-0 rounded-xl",
                        darkMode 
                          ? "bg-white/[0.22] backdrop-blur-xl border border-white/35 shadow-[0_4px_18px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]" 
                          : "bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_3px_12px_rgba(0,0,0,0.12),inset_0_1px_0.5px_rgba(255,255,255,1)]"
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
                      "relative z-10 shrink-0 transition-all duration-200", 
                      isSelected 
                        ? (darkMode ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" : "text-neutral-950 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]")
                        : "opacity-75"
                    )} 
                  />
                  <span className={cn(
                    "relative z-10 truncate tracking-tight transition-colors duration-200",
                    isSelected 
                      ? (darkMode ? "font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "font-black text-neutral-900")
                      : "font-medium"
                  )}>
                    {isBn ? tab.labelBn : tab.labelEn}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Mobile 5-Tab Navigation: Floating capsule docked above mobile bottom bar with iPhone/iOS frosted glass pill */}
      <div 
        id="logify_mobile_subnav_wrapper"
        style={{ bottom: `${mobileNavHeight + 6}px` }}
        className="fixed left-0 right-0 z-40 md:hidden flex justify-center px-4 pointer-events-none transition-all duration-300"
      >
        <div 
          id="logify_mobile_subnav"
          className={cn(
            "pointer-events-auto w-full max-w-[315px] xs:max-w-[330px] grid grid-cols-5 py-1.5 px-1.5 rounded-full border backdrop-blur-2xl backdrop-saturate-180 transition-all gap-1",
            darkMode 
              ? "bg-[#1c1c1e]/80 border-white/[0.14] text-white shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]" 
              : "bg-[#f2f2f7]/85 border-black/[0.08] text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
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
                  "relative flex items-center justify-center gap-1 py-2 px-0.5 rounded-full min-h-[32px] cursor-pointer select-none text-center min-w-0 w-full transition-all duration-200 active:scale-[0.95]",
                  isSelected
                    ? (darkMode ? "text-white font-black" : "text-neutral-900 font-black")
                    : (darkMode ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-neutral-900")
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeSubTabIndicatorMobile"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      darkMode 
                        ? "bg-white/[0.22] backdrop-blur-xl border border-white/35 shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]" 
                        : "bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.12),inset_0_1px_0.5px_rgba(255,255,255,1)]"
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
                    "relative z-10 shrink-0 transition-all duration-200", 
                    isSelected 
                      ? (darkMode ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" : "text-neutral-950 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]") 
                      : "opacity-75"
                  )} 
                />
                <span className={cn(
                  "relative z-10 truncate tracking-tight leading-none text-[10px] transition-all duration-200", 
                  isSelected 
                    ? (darkMode ? "font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "font-black text-neutral-900") 
                    : "font-semibold"
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
