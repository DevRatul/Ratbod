/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Wind, Info, Sparkles, CheckCircle, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'completed';

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
      osc.frequency.setValueAtTime(260, audioCtx.currentTime); // Middle C-ish
      osc.frequency.linearRampToValueAtTime(392, audioCtx.currentTime + duration); // Ascend to G4
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'hold') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime + duration - 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'exhale') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, audioCtx.currentTime + duration); // Down to A3
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.05);
      return;
    } else if (type === 'finish') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.15); // C#5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.3); // E5
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

import { Language, translations } from '../utils/translations';

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
    synth.cancel(); // Cancel any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.9;
    utterance.rate = 0.85; // Relaxing, slightly slower pace
    
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
  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [targetCycles, setTargetCycles] = useState<number>(4);
  const [soundMode, setSoundMode] = useState<'muted' | 'tones' | 'voice'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ratbod_sound_mode');
      return (saved as 'muted' | 'tones' | 'voice') || 'tones';
    }
    return 'tones';
  });
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Audio API on click if sound active
  const triggerAudioTick = (type: 'inhale' | 'hold' | 'exhale' | 'finish' | 'tick', duration: number) => {
    if (soundMode === 'tones' || soundMode === 'voice') {
      playSoundTone(type, duration);
    }
  };

  const triggerVocalPhase = (phaseName: 'inhale' | 'hold' | 'exhale' | 'finish') => {
    if (soundMode !== 'voice') return;
    if (phaseName === 'inhale') {
      speakText(t.inhale, lang);
    } else if (phaseName === 'hold') {
      speakText(t.hold, lang);
    } else if (phaseName === 'exhale') {
      speakText(t.exhale, lang);
    } else if (phaseName === 'finish') {
      speakText(t.breatheCompletedInst, lang);
    }
  };

  const triggerVocalCount = (countNum: number) => {
    if (soundMode !== 'voice') return;
    const voiceText = lang === 'bn' && countNum < bnNumbers.length ? bnNumbers[countNum] : countNum.toString();
    speakText(voiceText, lang);
  };

  // Sync soundMode with localStorage
  useEffect(() => {
    localStorage.setItem('ratbod_sound_mode', soundMode);
  }, [soundMode]);

  // Cancel any talking when session gets paused
  useEffect(() => {
    if (!isActive) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isActive]);

  useEffect(() => {
    const savedCount = localStorage.getItem('ratbod_breathing_sessions');
    if (savedCount) {
      setCompletedSessionsCount(parseInt(savedCount, 10));
    }
  }, []);

  // Timer Tick management
  useEffect(() => {
    if (!isActive) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      return;
    }

    if (phase === 'idle') {
      // Transition immediately to Inhale phase'
      setPhase('inhale');
      setSecondsRemaining(4);
      triggerAudioTick('inhale', 4);
      triggerVocalPhase('inhale');
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Transition to next phase
          handlePhaseTransition();
          return 0;
        }
        // Tick soft tone
        if (soundMode !== 'muted') {
          triggerAudioTick('tick', 0.05);

          // Vocal Countdown Speech trigger
          const duration = phase === 'inhale' ? 4 : phase === 'hold' ? 7 : phase === 'exhale' ? 8 : 4;
          const currentCount = duration - prev + 2;
          triggerVocalCount(currentCount);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isActive, phase, currentCycle, soundMode]);

  const handlePhaseTransition = () => {
    if (phase === 'inhale') {
      setPhase('hold');
      setSecondsRemaining(7);
      triggerAudioTick('hold', 7);
      triggerVocalPhase('hold');
    } else if (phase === 'hold') {
      setPhase('exhale');
      setSecondsRemaining(8);
      triggerAudioTick('exhale', 8);
      triggerVocalPhase('exhale');
    } else if (phase === 'exhale') {
      if (currentCycle >= targetCycles) {
        // Completed all cycles
        setPhase('completed');
        setIsActive(false);
        triggerAudioTick('finish', 1);
        triggerVocalPhase('finish');
        const newCount = completedSessionsCount + 1;
        setCompletedSessionsCount(newCount);
        localStorage.setItem('ratbod_breathing_sessions', newCount.toString());
      } else {
        // Move to next cycle, starting with inhale
        setCurrentCycle((prev) => prev + 1);
        setPhase('inhale');
        setSecondsRemaining(4);
        triggerAudioTick('inhale', 4);
        triggerVocalPhase('inhale');
      }
    }
  };

  const handleStartPause = () => {
    // Resume audio context
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

    if (phase === 'completed') {
      // Re-initialize for new session
      setPhase('inhale');
      setSecondsRemaining(4);
      setCurrentCycle(1);
      setIsActive(true);
      triggerAudioTick('inhale', 4);
      triggerVocalPhase('inhale');
      return;
    }

    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('idle');
    setSecondsRemaining(4);
    setCurrentCycle(1);
  };

  // Descriptive state text and visual properties
  const getPhaseConfig = () => {
    switch (phase) {
      case 'inhale':
        return {
          title: t.inhale,
          instructions: t.breatheInhaleInst,
          circleScale: 1.5,
          color: 'bg-emerald-500 border-emerald-400',
          textColor: 'text-emerald-500',
          duration: 4,
        };
      case 'hold':
        return {
          title: t.hold,
          instructions: t.breatheHoldInst,
          circleScale: 1.5,
          color: 'bg-sky-500 border-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]',
          textColor: 'text-sky-500',
          duration: 7,
        };
      case 'exhale':
        return {
          title: t.exhale,
          instructions: t.breatheExhaleInst,
          circleScale: 0.9,
          color: 'bg-teal-500 border-teal-400',
          textColor: 'text-teal-500',
          duration: 8,
        };
      case 'completed':
        return {
          title: t.composed,
          instructions: t.breatheCompletedInst,
          circleScale: 1.0,
          color: 'bg-primary border-primary-light',
          textColor: 'text-primary',
          duration: 1,
        };
      default:
        return {
          title: t.ready,
          instructions: t.breatheReady,
          circleScale: 1.0,
          color: 'bg-gray-400 border-gray-300',
          textColor: 'text-gray-400',
          duration: 4,
        };
    }
  };

  const currentConfig = getPhaseConfig();
  const currentRatio = secondsRemaining / currentConfig.duration;

  return (
    <div className={cn(
      "w-full rounded-3xl border shadow-xl p-6 sm:p-8 transition-colors duration-300 relative overflow-hidden",
      darkMode 
        ? "bg-[#0F0F0F]/90 border-white/10 shadow-black/40 text-white" 
        : "bg-white border-black/5 shadow-gray-200/50 text-[#1A1A1A]"
    )}>
      {/* Absolute Decorative Background Elements */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none bg-primary" />
      <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none bg-teal-500" />

      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/5 flex items-center justify-center text-teal-500">
            <Wind size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight font-sans">{t.breathingTitle}</h3>
            <p className="text-xs text-gray-500 font-medium">{t.breathingSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio mode selector */}
          <div className={cn(
            "flex items-center border p-1 rounded-2xl",
            darkMode ? "bg-white/5 border-white/10" : "bg-gray-100 border-black/5"
          )}>
            <button
              onClick={() => setSoundMode('muted')}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                soundMode === 'muted'
                  ? (darkMode ? "bg-white/10 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
              title={t.soundMuted}
            >
              <VolumeX size={14} />
              <span className="hidden sm:inline">{t.soundMuted}</span>
            </button>
            <button
              onClick={() => {
                setSoundMode('tones');
                playSoundTone('tick', 0.05);
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                soundMode === 'tones'
                  ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
              title={t.soundTones}
            >
              <Volume2 size={14} />
              <span className="hidden sm:inline">{t.soundTones}</span>
            </button>
            <button
              onClick={() => {
                setSoundMode('voice');
                speakText(lang === 'bn' ? "ভয়েস কোচ" : "Voice coach", lang);
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                soundMode === 'voice'
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
              title={t.soundCoach}
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">{t.soundCoach}</span>
            </button>
          </div>

          {/* Sessions Counter */}
          <div className={cn(
            "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors",
            darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
          )}>
            <Sparkles size={12} className="text-teal-400" />
            <span>{lang === 'bn' ? `${completedSessionsCount.toString().split('').map(x => bnNumbers[parseInt(x)] || x).join('')} ${t.sessionsToday}` : `${completedSessionsCount} session${completedSessionsCount !== 1 ? 's' : ''} today`}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Core Breathing Timer Panel */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center py-6 sm:py-8 relative">
          
          {/* Animated Circle Container */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Background Svg Pulsing Progress Ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="112"
                className={cn(
                  "stroke-current transition-colors duration-300",
                  darkMode ? "text-white/5" : "text-black/5"
                )}
                strokeWidth="6"
                fill="none"
              />
              {isActive && phase !== 'completed' && (
                <motion.circle
                  cx="128"
                  cy="128"
                  r="112"
                  className={cn(
                    "stroke-current transition-colors duration-500 shadow-xl",
                    phase === 'inhale' ? 'text-emerald-500' : phase === 'hold' ? 'text-sky-500' : 'text-teal-500'
                  )}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 112}
                  strokeDashoffset={2 * Math.PI * 112 * (1 - currentRatio)}
                  strokeLinecap="round"
                  fill="none"
                  animate={{ strokeWidth: phase === 'hold' ? 10 : 8 }}
                  transition={{ ease: "easeInOut", duration: 1 }}
                />
              )}
            </svg>

            {/* Pulser / Breathing core ball */}
            <motion.div
              animate={{
                scale: phase === 'idle' ? 1.0 : currentConfig.circleScale,
                boxShadow: phase === 'hold' ? "0 0 45px rgba(14,165,233,0.4)" : "0 8px 30px rgba(0,0,0,0.12)"
              }}
              transition={{
                duration: phase === 'exhale' ? 8 : phase === 'hold' ? 0.4 : 4,
                ease: phase === 'hold' ? "backOut" : "easeInOut"
              }}
              className={cn(
                "w-44 h-44 rounded-full flex flex-col items-center justify-center transition-colors duration-500 relative cursor-pointer z-10 bg-gradient-to-tr",
                phase === 'inhale' ? "from-emerald-600 to-teal-400 text-white" :
                phase === 'hold' ? "from-sky-600 to-blue-400 text-white" :
                phase === 'exhale' ? "from-teal-600 to-emerald-400 text-white" :
                phase === 'completed' ? "from-primary to-primary-light text-white animate-bounce" :
                "from-gray-300 dark:from-white/10 to-gray-400 dark:to-white/5 text-gray-600 dark:text-gray-300"
              )}
              onClick={handleStartPause}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentConfig.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center p-3 flex flex-col items-center"
                >
                  <span className="text-[10px] font-black tracking-widest uppercase opacity-80 mb-0.5">
                    {isActive ? `${lang === 'bn' ? 'ধাপ' : 'Cycle'} ${formatNum(currentCycle)}/${formatNum(targetCycles)}` : '4-7-8'}
                  </span>
                  
                  <span className="text-3xl font-black tracking-tighter">
                    {phase === 'idle' ? (lang === 'bn' ? 'শুরু' : 'START') : currentConfig.title.toUpperCase()}
                  </span>

                  {phase !== 'completed' && isActive && (
                    <span className="text-4xl font-extrabold tracking-tight font-mono mt-1 drop-shadow-md">
                      {formatNum(secondsRemaining)}s
                    </span>
                  )}

                  {phase === 'completed' && (
                    <CheckCircle size={32} className="text-white mt-1 animate-pulse" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Interactive Guided Instructions Text */}
          <div className="text-center mt-6 max-w-sm px-4">
            <h4 className="text-sm font-extrabold capitalize mb-1 min-h-[20px]">
              {isActive ? currentConfig.instructions : t.breatheClickTip}
            </h4>
            <p className={cn(
              "text-xs font-medium transition-all",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}>
              {phase === 'inhale' && t.quietlyInhale}
              {phase === 'hold' && t.realignCalm}
              {phase === 'exhale' && t.slowWhooshPath}
              {phase === 'completed' && t.oxygenOptimized}
              {phase === 'idle' && t.idleBreatheTip}
            </p>
          </div>

          {/* Controls Actions Row */}
          <div className="flex items-center gap-4 mt-8 relative z-20">
            <button 
              onClick={handleReset}
              disabled={phase === 'idle'}
              className={cn(
                "p-3 rounded-full border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
                darkMode ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-500"
              )}
              title={lang === 'bn' ? "টাইমার রিসেট" : "Reset timer"}
            >
              <RotateCcw size={16} />
            </button>

            <button 
              onClick={handleStartPause}
              className={cn(
                "px-8 py-3 rounded-full text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer",
                isActive 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-teal-500 hover:bg-teal-600 text-white"
              )}
            >
              {isActive ? (
                <>
                  <Pause size={16} fill="currentColor" />
                  {t.breathePauseBtn}
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  {phase === 'completed' ? t.breatheStartOver : t.breatheStartBtn}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configurations, instructions, and benefit guidelines */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Set Configurations card */}
          <div className={cn(
            "p-5 rounded-2xl border relative overflow-hidden transition-colors",
            darkMode ? "bg-white/5 border-white/5 shadow-inner" : "bg-gray-50 border-gray-100 shadow-sm"
          )}>
            <div className="flex items-center gap-2 mb-4 text-teal-500">
              <Sparkles size={16} />
              <h4 className="text-xs uppercase font-extrabold tracking-wider">{t.sessionSettings}</h4>
            </div>

            <div className="space-y-4">
              {/* Set cycles */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={darkMode ? "text-gray-300" : "text-gray-600"}>{t.targetCycles}</span>
                  <span className="text-teal-500 font-extrabold">{formatNum(targetCycles)} {t.sets}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 8, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setTargetCycles(num);
                        if (!isActive) handleReset();
                      }}
                      className={cn(
                        "py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border",
                        targetCycles === num
                          ? "bg-teal-500 border-teal-400 text-white"
                          : (darkMode ? "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
                      )}
                    >
                      {formatNum(num)} {t.sets}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Indicator dots */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t.continuousProgress}</span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: targetCycles }).map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "h-3 rounded-full transition-all duration-500",
                        activeTabDots(i)
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions list */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-500 flex items-center gap-1.5">
              <Info size={14} className="text-teal-500" />
              {t.instructionsTitle}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className={cn(
                "p-3 rounded-xl border text-center transition-colors",
                phase === 'inhale' ? "border-emerald-500 bg-emerald-500/5" : (darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")
              )}>
                <span className="text-lg font-black text-emerald-500">{formatNum(4)}s</span>
                <p className="text-[10px] font-extrabold tracking-tight mt-0.5 uppercase">{t.inhale}</p>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">{lang === 'bn' ? "নাক দিয়ে আলতো করে" : "Silently via nose"}</span>
              </div>
              <div className={cn(
                "p-3 rounded-xl border text-center transition-colors",
                phase === 'hold' ? "border-sky-500 bg-sky-500/5" : (darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")
              )}>
                <span className="text-lg font-black text-sky-500">{formatNum(7)}s</span>
                <p className="text-[10px] font-extrabold tracking-tight mt-0.5 uppercase">{t.hold}</p>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">{lang === 'bn' ? "শ্বাস ধরে রাখুন" : "Seal breath still"}</span>
              </div>
              <div className={cn(
                "p-3 rounded-xl border text-center transition-colors",
                phase === 'exhale' ? "border-teal-500 bg-teal-500/5" : (darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100")
              )}>
                <span className="text-lg font-black text-teal-500">{formatNum(8)}s</span>
                <p className="text-[10px] font-extrabold tracking-tight mt-0.5 uppercase">{t.exhale}</p>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">{lang === 'bn' ? "ফু দিয়ে সম্পূর্ণ বের" : "With whoosh blow"}</span>
              </div>
            </div>
          </div>

          {/* Health Benefits info */}
          <div className={cn(
            "p-4 rounded-xl border flex items-start gap-3 transition-colors",
            darkMode ? "bg-white/[0.02] border-white/5 text-gray-400" : "bg-slate-50 border-slate-100 text-gray-600"
          )}>
            <Heart size={16} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 text-xs">
              <span className={cn("font-bold block", darkMode ? "text-gray-300" : "text-gray-800")}>{t.clinicalFitnessTitle}</span>
              <p className="leading-relaxed font-medium">
                {t.clinicalFitnessText}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  function activeTabDots(index: number) {
    if (phase === 'completed') {
      return "bg-teal-500 w-6";
    }
    const idx = index + 1;
    if (idx < currentCycle) {
      return "bg-teal-500 w-6"; // Completed cycle
    }
    if (idx === currentCycle) {
      if (isActive) {
        if (phase === 'inhale') return "bg-emerald-500 w-7 animate-pulse";
        if (phase === 'hold') return "bg-sky-500 w-7 animate-pulse";
        if (phase === 'exhale') return "bg-teal-500 w-7 animate-pulse";
      }
      return "bg-teal-300 dark:bg-teal-800 w-5";
    }
    return "bg-gray-200 dark:bg-white/10 w-3";
  }
}
