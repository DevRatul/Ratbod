/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Wind, Info, Sparkles, CheckCircle, Heart, Activity, Clock, Timer, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Language, translations } from '../utils/translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'completed';

export interface BreathingSessionRecord {
  id: string;
  time: string; // e.g. "10:30 AM"
  date: string; // YYYY-MM-DD
  setsCompleted: number;
  durationSeconds: number;
  timestamp: number;
}

// 4-7-8 Technique Durations in Seconds (Total cycle duration = 19 seconds)
const PATTERN = {
  inhale: 4,
  hold: 7,
  exhale: 8,
};

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

let audioCtx: AudioContext | null = null;

function playSoundTone(type: 'inhale' | 'hold' | 'exhale' | 'finish' | 'tick', duration: number) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'inhale') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(392, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'hold') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime + duration - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'exhale') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.012, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.04);
      return;
    } else if (type === 'finish') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.15);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.8);
      return;
    }
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

interface BreathingTimerProps {
  darkMode: boolean;
  lang?: Language;
}

const bnNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০', '১১', '১২'];

function speakText(text: string, lang: Language) {
  if (typeof window === 'undefined') return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.9;
    utterance.rate = 0.88;
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    
    const voices = synth.getVoices();
    const desiredVoice = voices.find(v => 
      lang === 'bn' 
        ? v.lang.startsWith('bn') || v.lang.startsWith('in')
        : (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('en-US')))
    );
    if (desiredVoice) {
      utterance.voice = desiredVoice;
    }
    synth.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis failed:', e);
  }
}

export default function BreathingTimer({ darkMode, lang = 'en' }: BreathingTimerProps) {
  const t = translations[lang];
  const formatNum = (num: number) => {
    if (lang === 'bn') {
      return num.toString().split('').map(digit => bnNumbers[parseInt(digit, 10)] !== undefined ? bnNumbers[parseInt(digit, 10)] : digit).join('');
    }
    return num.toString();
  };

  const formatDuration = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m === 0) {
      return lang === 'bn' ? `${formatNum(s)} সেকেন্ড` : `${s}s`;
    }
    if (s === 0) {
      return lang === 'bn' ? `${formatNum(m)} মিনিট` : `${m}m`;
    }
    return lang === 'bn' ? `${formatNum(m)} মি. ${formatNum(s)} সে.` : `${m}m ${s}s`;
  };

  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [targetCycles, setTargetCycles] = useState<number>(4);
  const [soundMode, setSoundMode] = useState<'muted' | 'tones' | 'voice'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ratbod_sound_mode');
      return (saved as 'muted' | 'tones' | 'voice') || 'muted';
    }
    return 'muted';
  });
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [todaySessions, setTodaySessions] = useState<BreathingSessionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ratbod_breathing_today_sessions');
        if (saved) {
          const parsed: BreathingSessionRecord[] = JSON.parse(saved);
          const today = getLocalDateString(new Date());
          return parsed.filter(p => p.date === today);
        }
      } catch (e) {}
    }
    return [];
  });

  // Precision animation state
  const [progress, setProgress] = useState<number>(0); // 0.0 to 1.0 continuously
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PATTERN.inhale);
  const [visualScale, setVisualScale] = useState<number>(1.0);
  const [interactiveRipples, setInteractiveRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Engine refs
  const animationFrameRef = useRef<number | null>(null);
  const phaseStartTimeRef = useRef<number>(0);
  const pausedTimeElapsedRef = useRef<number>(0);
  const lastSecondTickedRef = useRef<number>(-1);

  const getPhaseDuration = useCallback((p: BreathingPhase): number => {
    switch (p) {
      case 'inhale': return PATTERN.inhale;
      case 'hold': return PATTERN.hold;
      case 'exhale': return PATTERN.exhale;
      default: return PATTERN.inhale;
    }
  }, []);

  const triggerAudioTick = useCallback((type: 'inhale' | 'hold' | 'exhale' | 'finish' | 'tick', duration: number) => {
    if (soundMode === 'tones' || soundMode === 'voice') {
      playSoundTone(type, duration);
    }
  }, [soundMode]);

  const triggerVocalPhase = useCallback((phaseName: 'inhale' | 'hold' | 'exhale' | 'finish') => {
    if (soundMode !== 'voice') return;
    if (phaseName === 'inhale') speakText(t.inhale, lang);
    else if (phaseName === 'hold') speakText(t.hold, lang);
    else if (phaseName === 'exhale') speakText(t.exhale, lang);
    else if (phaseName === 'finish') speakText(t.breatheCompletedInst, lang);
  }, [soundMode, lang, t]);

  const triggerVocalCount = useCallback((countNum: number) => {
    if (soundMode !== 'voice') return;
    const voiceText = lang === 'bn' && countNum < bnNumbers.length ? bnNumbers[countNum] : countNum.toString();
    speakText(voiceText, lang);
  }, [soundMode, lang]);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('ratbod_sound_mode', soundMode);
    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'breathing'), { soundMode }, { merge: true }).catch(e => {});
    }
  }, [soundMode, isLoaded]);

  useEffect(() => {
    const loadData = async (userObj = auth.currentUser) => {
      let loadedSessions = null;
      let loadedSoundMode = null;
      let loadedTodaySessions: BreathingSessionRecord[] | null = null;
      
      if (userObj) {
        try {
          const docRef = doc(db, 'users', userObj.uid, 'appData', 'breathing');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.completedSessionsCount !== undefined) loadedSessions = data.completedSessionsCount;
            if (data.soundMode !== undefined) loadedSoundMode = data.soundMode;
            if (Array.isArray(data.todaySessions)) loadedTodaySessions = data.todaySessions;
          }
        } catch (e) {}
      }
      
      if (loadedSessions === null) {
        const savedCount = localStorage.getItem('ratbod_breathing_sessions');
        if (savedCount) loadedSessions = parseInt(savedCount, 10);
      }
      if (loadedSessions !== null) {
        setCompletedSessionsCount(loadedSessions);
      }
      
      if (loadedSoundMode) {
        setSoundMode(loadedSoundMode);
      }

      if (!loadedTodaySessions) {
        try {
          const savedSessions = localStorage.getItem('ratbod_breathing_today_sessions');
          if (savedSessions) {
            loadedTodaySessions = JSON.parse(savedSessions);
          }
        } catch (e) {}
      }

      if (loadedTodaySessions && Array.isArray(loadedTodaySessions)) {
        const todayStr = getLocalDateString(new Date());
        const validToday = loadedTodaySessions.filter(p => p.date === todayStr);
        setTodaySessions(validToday);
      }

      setIsLoaded(true);
    };

    loadData();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) loadData(user);
    });

    return () => unsubscribe();
  }, []);

  // Main High-Precision Sync Animation Loop
  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const durationSec = getPhaseDuration(phase);
    const durationMs = durationSec * 1000;

    const tick = (now: number) => {
      if (!phaseStartTimeRef.current) {
        phaseStartTimeRef.current = now - pausedTimeElapsedRef.current;
      }

      const elapsedMs = now - phaseStartTimeRef.current;
      const rawProgress = Math.min(1, Math.max(0, elapsedMs / durationMs));
      const secsLeft = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));

      setProgress(rawProgress);
      setSecondsRemaining(secsLeft);

      // Sound ticks on second transitions
      if (secsLeft !== lastSecondTickedRef.current && secsLeft > 0) {
        lastSecondTickedRef.current = secsLeft;
        if (soundMode !== 'muted') {
          triggerAudioTick('tick', 0.04);
          const currentCount = durationSec - secsLeft + 1;
          triggerVocalCount(currentCount);
        }
      }

      // Compute smooth synchronized scale
      let scale = 1.0;
      if (phase === 'inhale') {
        // Smooth sine ease in-out expansion from 1.0 to 1.42
        const ease = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
        scale = 1.0 + 0.42 * ease;
      } else if (phase === 'hold') {
        // Subtle organic breathing micro vibration at peak expansion
        const microWave = Math.sin(rawProgress * Math.PI * 6) * 0.015;
        scale = 1.42 + microWave;
      } else if (phase === 'exhale') {
        // Smooth sine contraction from 1.42 down to 0.88
        const ease = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);
        scale = 1.42 - 0.54 * ease;
      }
      setVisualScale(scale);

      // Phase completion check
      if (elapsedMs >= durationMs) {
        advancePhase();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, phase, soundMode, getPhaseDuration, triggerAudioTick, triggerVocalCount]);

  const advancePhase = () => {
    phaseStartTimeRef.current = 0;
    pausedTimeElapsedRef.current = 0;
    lastSecondTickedRef.current = -1;

    let nextPhase: BreathingPhase = 'inhale';

    if (phase === 'inhale') {
      nextPhase = 'hold';
    } else if (phase === 'hold') {
      nextPhase = 'exhale';
    } else if (phase === 'exhale') {
      if (currentCycle >= targetCycles) {
        finishSession();
        return;
      } else {
        setCurrentCycle(prev => prev + 1);
        nextPhase = 'inhale';
      }
    }

    const dur = getPhaseDuration(nextPhase);
    setPhase(nextPhase);
    setSecondsRemaining(dur);
    triggerAudioTick(nextPhase, dur);
    triggerVocalPhase(nextPhase);
  };

  const finishSession = () => {
    setPhase('completed');
    setIsActive(false);
    setVisualScale(1.0);
    setProgress(1);
    triggerAudioTick('finish', 1);
    triggerVocalPhase('finish');
    const newCount = completedSessionsCount + 1;
    setCompletedSessionsCount(newCount);
    localStorage.setItem('ratbod_breathing_sessions', newCount.toString());

    // Record session into today's history
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = getLocalDateString(now);
    const sessionDuration = targetCycles * (PATTERN.inhale + PATTERN.hold + PATTERN.exhale); // 19s per cycle

    const newRecord: BreathingSessionRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      time: timeStr,
      date: dateStr,
      setsCompleted: targetCycles,
      durationSeconds: sessionDuration,
      timestamp: Date.now()
    };

    const updatedSessions = [newRecord, ...todaySessions];
    setTodaySessions(updatedSessions);
    localStorage.setItem('ratbod_breathing_today_sessions', JSON.stringify(updatedSessions));

    const user = auth.currentUser;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'appData', 'breathing'), { 
        completedSessionsCount: newCount,
        todaySessions: updatedSessions
      }, { merge: true }).catch(e => {});
    }

    window.dispatchEvent(new CustomEvent('ratbod_saved_toast'));
  };

  const handleStartPause = (e?: React.MouseEvent) => {
    // Add interactive ripple effect on click
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };
      setInteractiveRipples(prev => [...prev.slice(-3), newRipple]);
    }

    if (typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtx) audioCtx = new AudioContextClass();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {}
    }

    if (phase === 'idle' || phase === 'completed') {
      setPhase('inhale');
      setCurrentCycle(1);
      phaseStartTimeRef.current = 0;
      pausedTimeElapsedRef.current = 0;
      lastSecondTickedRef.current = -1;
      setIsActive(true);
      const dur = PATTERN.inhale;
      triggerAudioTick('inhale', dur);
      triggerVocalPhase('inhale');
      return;
    }

    if (isActive) {
      if (phaseStartTimeRef.current) {
        pausedTimeElapsedRef.current = performance.now() - phaseStartTimeRef.current;
      }
      setIsActive(false);
    } else {
      phaseStartTimeRef.current = 0;
      setIsActive(true);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('idle');
    setSecondsRemaining(PATTERN.inhale);
    setCurrentCycle(1);
    setProgress(0);
    setVisualScale(1.0);
    phaseStartTimeRef.current = 0;
    pausedTimeElapsedRef.current = 0;
    lastSecondTickedRef.current = -1;
  };

  const getPhaseConfig = () => {
    switch (phase) {
      case 'inhale':
        return {
          title: t.inhale,
          instructions: t.breatheInhaleInst,
          colorClass: darkMode ? 'bg-teal-950 border border-teal-800' : 'bg-teal-50 border border-teal-200 shadow-sm',
          badgeBg: darkMode ? 'bg-teal-900/50 border-teal-800 text-teal-200' : 'bg-teal-100 border-teal-200 text-teal-800',
          glowColor: darkMode ? 'rgba(20, 184, 166, 0.25)' : 'rgba(20, 184, 166, 0.15)',
          textColor: darkMode ? 'text-teal-50' : 'text-teal-950',
        };
      case 'hold':
        return {
          title: t.hold,
          instructions: t.breatheHoldInst,
          colorClass: darkMode ? 'bg-sky-950 border border-sky-800' : 'bg-sky-50 border border-sky-200 shadow-sm',
          badgeBg: darkMode ? 'bg-sky-900/50 border-sky-800 text-sky-200' : 'bg-sky-100 border-sky-200 text-sky-800',
          glowColor: darkMode ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.15)',
          textColor: darkMode ? 'text-sky-50' : 'text-sky-950',
        };
      case 'exhale':
        return {
          title: t.exhale,
          instructions: t.breatheExhaleInst,
          colorClass: darkMode ? 'bg-indigo-950 border border-indigo-800' : 'bg-indigo-50 border border-indigo-200 shadow-sm',
          badgeBg: darkMode ? 'bg-indigo-900/50 border-indigo-800 text-indigo-200' : 'bg-indigo-100 border-indigo-200 text-indigo-800',
          glowColor: darkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
          textColor: darkMode ? 'text-indigo-50' : 'text-indigo-950',
        };
      case 'completed':
        return {
          title: t.composed,
          instructions: t.breatheCompletedInst,
          colorClass: darkMode ? 'bg-emerald-950 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200 shadow-sm',
          badgeBg: darkMode ? 'bg-emerald-900/50 border-emerald-800 text-emerald-200' : 'bg-emerald-100 border-emerald-200 text-emerald-800',
          glowColor: darkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
          textColor: darkMode ? 'text-emerald-50' : 'text-emerald-950',
        };
      default:
        return {
          title: t.ready,
          instructions: t.breatheReady,
          colorClass: darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200',
          badgeBg: darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600',
          glowColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          textColor: darkMode ? 'text-gray-200' : 'text-gray-700',
        };
    }
  };

  const currentConfig = getPhaseConfig();

  // SVG ring geometry
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* Header Banner - Ultra Slim & Minimalist */}
      <div className={cn(
        "px-3 py-2 sm:px-4 sm:py-2 rounded-xl border transition-all relative overflow-hidden",
        darkMode ? "bg-gray-900 border-gray-800 shadow-md" : "bg-white border-gray-200 shadow-sm"
      )}>
        <div className={cn("absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-2xl pointer-events-none", darkMode ? "bg-white/5" : "bg-black/5")} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0", darkMode ? "bg-gray-800 border border-gray-700 text-white" : "bg-gray-100 border border-gray-200 text-gray-700")}>
              <Wind size={17} className="animate-pulse opacity-70" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2.5 min-w-0">
              <h2 className={cn("text-sm sm:text-base font-black tracking-tight whitespace-nowrap", darkMode ? "text-white" : "text-gray-900")}>
                {lang === 'bn' ? 'গভীর শ্বাসের ব্যায়াম' : 'Deep Breathing'}
              </h2>
              <span className="hidden sm:inline text-gray-500 dark:text-gray-400 dark:text-gray-600 text-xs">•</span>
              <p className={cn("text-[10px] sm:text-xs font-medium truncate", darkMode ? "text-gray-500 dark:text-gray-400" : "text-gray-500")}>
                {lang === 'bn' ? 'গভীর ঘুম ও প্রশান্তির জন্য বৈজ্ঞানিক চর্চা' : 'Clinical relaxation method for deep calm'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Audio Mode Selector */}
            <div className={cn(
              "flex items-center border p-0.5 rounded-xl text-xs",
              darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
            )}>
              <button
                onClick={() => setSoundMode('muted')}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px]",
                  soundMode === 'muted'
                    ? (darkMode ? "bg-gray-700 text-white shadow-xs" : "bg-white text-gray-900 border border-gray-200 shadow-xs")
                    : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600")
                )}
                title={t.soundMuted}
              >
                <VolumeX size={13} />
                <span className="hidden xs:inline">{t.soundMuted}</span>
              </button>
              <button
                onClick={() => {
                  setSoundMode('tones');
                  playSoundTone('tick', 0.05);
                }}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px]",
                  soundMode === 'tones'
                    ? (darkMode ? "bg-gray-700 text-white shadow-xs" : "bg-white text-gray-900 border border-gray-200 shadow-xs")
                    : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600")
                )}
                title={t.soundTones}
              >
                <Volume2 size={13} />
                <span className="hidden xs:inline">{t.soundTones}</span>
              </button>
              <button
                onClick={() => {
                  setSoundMode('voice');
                  speakText(lang === 'bn' ? "ভয়েস কোচ" : "Voice coach", lang);
                }}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px]",
                  soundMode === 'voice'
                    ? (darkMode ? "bg-gray-700 text-white shadow-xs" : "bg-white text-gray-900 border border-gray-200 shadow-xs")
                    : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600")
                )}
                title={t.soundCoach}
              >
                <Sparkles size={13} />
                <span className="hidden xs:inline">{t.soundCoach}</span>
              </button>
            </div>

            {/* Sessions Counter Badge */}
            <div className={cn(
              "px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 shrink-0",
              darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"
            )}>
              <Sparkles size={12} className={cn("animate-pulse", darkMode ? "text-gray-400" : "text-gray-500")} />
              <span>{formatNum(completedSessionsCount)} {t.sessionsToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clean Layout */}
      <div className={cn(
        "p-6 sm:p-8 rounded-2xl border flex flex-col items-center justify-between gap-6 relative overflow-hidden transition-all",
        darkMode ? "bg-[#0F0F0F] border-white/10 shadow-xl shadow-black/50" : "bg-white border-black/5 shadow-sm"
      )}>
        {/* Ambient Radial Background Glows */}
        <div className={cn("absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full blur-[90px] pointer-events-none", darkMode ? "bg-white opacity-5" : "bg-black opacity-[0.03]")} />
        <div className={cn("absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full blur-[90px] pointer-events-none", darkMode ? "bg-gray-500 opacity-5" : "bg-black opacity-[0.03]")} />

        {/* Phase Header & Cycle Indicator */}
        <div className="w-full flex items-center justify-between z-10 border-b pb-3 border-gray-200/20 dark:border-white/5">
          <span className={cn(
            "px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs",
            currentConfig.badgeBg
          )}>
            <Activity size={13} className="animate-pulse" />
            {currentConfig.title}
          </span>

          <div className="flex items-center gap-3">
            {/* Sets Selector Inline Pill */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold",
              darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"
            )}>
              <span className={cn("font-normal", darkMode ? "text-gray-500" : "text-gray-500")}>{lang === 'bn' ? 'সেট:' : 'Sets:'}</span>
              {[2, 4, 8, 12].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setTargetCycles(num);
                    if (!isActive) handleReset();
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded cursor-pointer transition-all",
                    targetCycles === num
                      ? (darkMode ? "bg-gray-600 text-white font-extrabold" : "bg-white border border-gray-300 text-gray-900 shadow-sm font-extrabold")
                      : (darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600")
                  )}
                >
                  {formatNum(num)}
                </button>
              ))}
            </div>

            <span className={cn("text-xs font-black", darkMode ? "text-gray-500" : "text-gray-400")}>
              {lang === 'bn' ? 'ধাপ' : 'Cycle'} {formatNum(currentCycle)} / {formatNum(targetCycles)}
            </span>
          </div>
        </div>

        {/* Interactive Multi-Layer Synchronized Stage */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2 select-none">
          
          {/* SVG Ring with Smooth Sweep */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
            <defs>
              <linearGradient id="deepCalmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={darkMode ? "#444" : "#e5e7eb"} />
                <stop offset="50%" stopColor={darkMode ? "#888" : "#9ca3af"} />
                <stop offset="100%" stopColor={darkMode ? "#fff" : "#4b5563"} />
              </linearGradient>
            </defs>
            
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className={cn(
                "stroke-current transition-colors duration-300",
                darkMode ? "text-white/10" : "text-black/10"
              )}
              strokeWidth="7"
              fill="none"
            />

            {isActive && phase !== 'completed' && (
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                stroke="url(#deepCalmGradient)"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </svg>

          {/* Synchronized Glowing Ripples */}
          {isActive && (
            <div 
              className="absolute inset-0 rounded-full blur-lg opacity-35 pointer-events-none transition-transform duration-75"
              style={{
                transform: `scale(${visualScale * 1.15})`,
                background: currentConfig.glowColor
              }}
            />
          )}

          {/* Central Interactive Breathing Orb */}
          <div
            onClick={handleStartPause}
            style={{
              transform: `scale(${visualScale})`,
              boxShadow: `0 20px 40px ${currentConfig.glowColor}`,
            }}
            className={cn(
              "w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-transform duration-75 ease-out relative cursor-pointer z-10 overflow-hidden group hover:brightness-110 active:scale-95",
              currentConfig.colorClass,
              currentConfig.textColor
            )}
          >
            {/* Interactive Click Ripples */}
            {interactiveRipples.map((r) => (
              <span
                key={r.id}
                style={{ left: r.x, top: r.y }}
                className="absolute w-4 h-4 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping pointer-events-none"
              />
            ))}

            {/* Glowing Orb Shimmer */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-center p-3 flex flex-col items-center relative z-20 pointer-events-none"
              >
                <span className={cn("text-[10px] font-black tracking-widest uppercase opacity-90 mb-0.5", darkMode ? "text-gray-300" : "text-gray-500")}>
                  DEEP CALM
                </span>
                
                <span className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-xs">
                  {phase === 'idle' ? (lang === 'bn' ? 'শুরু করুন' : 'START') : currentConfig.title.toUpperCase()}
                </span>

                {phase !== 'completed' && isActive && (
                  <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono mt-0.5 drop-shadow-md">
                    {formatNum(secondsRemaining)}s
                  </span>
                )}

                {phase === 'completed' && (
                  <CheckCircle size={36} className="mt-1 animate-bounce" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Guided Phase Description */}
        <div className="text-center max-w-md px-2 z-10">
          <p className={cn(
            "text-xs font-bold transition-all",
            darkMode ? "text-gray-200" : "text-gray-800"
          )}>
            {isActive ? currentConfig.instructions : t.breatheClickTip}
          </p>
          <p className={cn("text-[11px] font-medium mt-0.5", darkMode ? "text-gray-500" : "text-gray-500")}>
            {phase === 'inhale' && t.quietlyInhale}
            {phase === 'hold' && t.realignCalm}
            {phase === 'exhale' && t.slowWhooshPath}
            {phase === 'completed' && t.oxygenOptimized}
            {phase === 'idle' && (lang === 'bn' ? "বৃত্তে চাপ দিন বা প্লে বাটন প্রেস করুন" : "Tap the central orb or press play to start")}
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3 z-10 w-full justify-center pt-1">
          <button 
            onClick={handleReset}
            disabled={phase === 'idle'}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95",
              darkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700"
            )}
            title={lang === 'bn' ? "টাইমার রিসেট" : "Reset timer"}
          >
            <RotateCcw size={18} />
          </button>

          <button 
            onClick={handleStartPause}
            className={cn(
              "px-8 py-3 rounded-xl text-sm font-black tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98",
              isActive 
                ? (darkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900 shadow-none") 
                : (darkMode ? "bg-white hover:bg-gray-100 text-black shadow-white/10" : "bg-gray-900 hover:bg-gray-800 text-white shadow-gray-900/20")
            )}
          >
            {isActive ? (
              <>
                <Pause size={17} fill="currentColor" />
                {t.breathePauseBtn}
              </>
            ) : (
              <>
                <Play size={17} fill="currentColor" />
                {phase === 'completed' ? t.breatheStartOver : t.breatheStartBtn}
              </>
            )}
          </button>
        </div>

        {/* Minimal Breakdown Badges */}
        <div className={cn("w-full pt-4 border-t grid grid-cols-3 gap-2 sm:gap-3 text-center z-10", darkMode ? "border-gray-800" : "border-gray-200")}>
          <div className={cn(
            "p-2.5 rounded-xl border transition-all",
            phase === 'inhale' ? (darkMode ? "border-gray-700 bg-gray-800 shadow-xs" : "border-gray-300 bg-white shadow-sm") : (darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100")
          )}>
            <span className={cn("text-sm font-black", phase === 'inhale' ? (darkMode ? "text-white" : "text-gray-900") : (darkMode ? "text-gray-500" : "text-gray-400"))}>{formatNum(4)}s</span>
            <p className={cn("text-[10px] font-extrabold uppercase", phase === 'inhale' ? (darkMode ? "text-gray-300" : "text-gray-700") : (darkMode ? "text-gray-600" : "text-gray-400"))}>{t.inhale}</p>
          </div>

          <div className={cn(
            "p-2.5 rounded-xl border transition-all",
            phase === 'hold' ? (darkMode ? "border-gray-700 bg-gray-800 shadow-xs" : "border-gray-300 bg-white shadow-sm") : (darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100")
          )}>
            <span className={cn("text-sm font-black", phase === 'hold' ? (darkMode ? "text-white" : "text-gray-900") : (darkMode ? "text-gray-500" : "text-gray-400"))}>{formatNum(7)}s</span>
            <p className={cn("text-[10px] font-extrabold uppercase", phase === 'hold' ? (darkMode ? "text-gray-300" : "text-gray-700") : (darkMode ? "text-gray-600" : "text-gray-400"))}>{t.hold}</p>
          </div>

          <div className={cn(
            "p-2.5 rounded-xl border transition-all",
            phase === 'exhale' ? (darkMode ? "border-gray-700 bg-gray-800 shadow-xs" : "border-gray-300 bg-white shadow-sm") : (darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100")
          )}>
            <span className={cn("text-sm font-black", phase === 'exhale' ? (darkMode ? "text-white" : "text-gray-900") : (darkMode ? "text-gray-500" : "text-gray-400"))}>{formatNum(8)}s</span>
            <p className={cn("text-[10px] font-extrabold uppercase", phase === 'exhale' ? (darkMode ? "text-gray-300" : "text-gray-700") : (darkMode ? "text-gray-600" : "text-gray-400"))}>{t.exhale}</p>
          </div>
        </div>

        {/* Minimal Health Tip Footer */}
        <div className="w-full text-center z-10 pt-1">
          <p className={cn("text-[11px] font-medium flex items-center justify-center gap-1.5", darkMode ? "text-gray-500" : "text-gray-500")}>
            <Heart size={13} className="text-red-500 animate-pulse" />
            <span>{t.clinicalFitnessTitle}: {t.clinicalFitnessText}</span>
          </p>
        </div>
      </div>

      {/* Today's Sessions History Card */}
      <div className={cn(
        "p-4 sm:p-5 rounded-2xl border transition-all",
        darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/40" : "bg-white border-gray-200 shadow-sm"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/40 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
              darkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-600 border-teal-200"
            )}>
              <Clock size={16} />
            </div>
            <div>
              <h3 className={cn("text-sm sm:text-base font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                {lang === 'bn' ? 'আজকের সেশন ইতিহাস' : "Today's Sessions History"}
              </h3>
              <p className={cn("text-[10px] sm:text-xs font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
                {lang === 'bn' ? 'আজকের সম্পন্ন হওয়া শ্বাসচর্চার তালিকা' : 'Completed deep breathing logs for today'}
              </p>
            </div>
          </div>

          {/* Summary Metric Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5",
              darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"
            )}>
              <Timer size={12} className="text-teal-500" />
              <span>{lang === 'bn' ? 'মোট সময়:' : 'Total Time:'} <strong className={darkMode ? "text-white" : "text-gray-900"}>{formatDuration(todaySessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0))}</strong></span>
            </div>
            <div className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5",
              darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"
            )}>
              <Sparkles size={12} className="text-sky-500" />
              <span>{lang === 'bn' ? 'মোট সেট:' : 'Total Sets:'} <strong className={darkMode ? "text-white" : "text-gray-900"}>{formatNum(todaySessions.reduce((acc, s) => acc + (s.setsCompleted || 0), 0))}</strong></span>
            </div>
          </div>
        </div>

        {/* Sessions Content List */}
        {todaySessions.length === 0 ? (
          <div className="py-7 text-center flex flex-col items-center justify-center gap-2">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center border",
              darkMode ? "bg-gray-800/60 border-gray-700 text-gray-500" : "bg-gray-50 border-gray-200 text-gray-400"
            )}>
              <Wind size={16} className="opacity-60" />
            </div>
            <p className={cn("text-xs font-semibold max-w-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
              {lang === 'bn' 
                ? 'আজকে এখনও কোনো সেশন সম্পন্ন করা হয়নি। উপরে একটি সেশন শুরু করুন!' 
                : 'No sessions completed today yet. Complete a breathing cycle above to record your history!'}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {todaySessions.map((session, index) => (
              <div
                key={session.id || index}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all",
                  darkMode ? "bg-black/40 border-white/5 hover:border-white/10" : "bg-gray-50/80 border-gray-200/80 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-emerald-500",
                    darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                  )}>
                    <Check size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-extrabold tracking-tight truncate", darkMode ? "text-white" : "text-gray-900")}>
                        {formatNum(session.setsCompleted)} {lang === 'bn' ? 'সেট ৪-৭-৮ শ্বাসচর্চা' : 'Sets 4-7-8 Breathing'}
                      </span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border tracking-wider",
                        darkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-50 text-teal-700 border-teal-200"
                      )}>
                        {lang === 'bn' ? 'সম্পন্ন' : 'Completed'}
                      </span>
                    </div>
                    <p className={cn("text-[10px] font-medium flex items-center gap-1.5 mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                      <Clock size={10} />
                      <span>{session.time}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={cn("text-xs font-black font-mono", darkMode ? "text-teal-400" : "text-teal-700")}>
                    {formatDuration(session.durationSeconds)}
                  </span>
                  <p className={cn("text-[9px] font-bold uppercase", darkMode ? "text-gray-400" : "text-gray-500")}>
                    {lang === 'bn' ? `${formatNum(session.setsCompleted)} ধাপ` : `${session.setsCompleted} cycles`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
