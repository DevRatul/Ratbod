import React from 'react';
import { 
  Activity, 
  Droplet, 
  Wind, 
  Footprints,
  ArrowRight,
  Target,
  History as HistoryIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div 
      style={{ colorScheme: 'dark' }}
      className="dark min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden"
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter">RATBOD</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-400">
            <a href="#health" className="hover:text-white transition-colors">Health & Habits</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </nav>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors hidden sm:block"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="health" className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">Your All-In-One Health Hub</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
              Master your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
                daily routines.
              </span>
            </h1>
            
            <p className="text-lg text-gray-400 leading-relaxed max-w-xl font-medium">
              A comprehensive toolkit for Health, Habits, Water intake, Step entries, and Breathing exercises—all in one unified platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button 
                onClick={onLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-white/5"
              >
                Start Tracking Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 rounded-[40px] blur-3xl" />
            
            {/* Bento Grid Preview */}
            <div className="relative grid grid-cols-2 gap-4">
               <div className="col-span-2 p-6 rounded-3xl border bg-[#0F0F0F] border-blue-500/30 shadow-2xl shadow-blue-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Activity className="text-blue-500" size={32} />
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase tracking-wider text-gray-500 mb-1">Health Metrics</div>
                      <div className="text-3xl font-black tracking-tighter text-white">BMI 22.4</div>
                    </div>
                  </div>
               </div>

               <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4">
                    Water Intake <Droplet size={14} className="text-cyan-500" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tighter text-cyan-500">5</span>
                      <span className="text-sm font-bold text-gray-500">/ 8</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500">Glasses today</div>
                  </div>
               </div>

               <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-orange-500/30 shadow-2xl shadow-orange-500/10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4">
                    Step Entries <Footprints size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tighter text-orange-500">8k</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500">Steps taken</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 border-t border-white/5 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-white">Five Tools, One Platform</h2>
            <p className="text-gray-400 max-w-xl mx-auto font-medium">Everything you need to optimize your daily routine, accessible from any device.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                <Activity size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Health</h3>
              <p className="text-gray-400 leading-relaxed font-medium">BMI, BMR, and TDEE calculator for personalized health insights and goal tracking.</p>
            </div>
            
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <HistoryIcon size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Habits</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Build and maintain positive daily routines with streak tracking and historical charts.</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Droplet size={24} className="text-cyan-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Water Intake</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Smart daily water tracking with customizable goals and visual progress indicators.</p>
            </div>
            
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
                <Footprints size={24} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Step Entries</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Keep track of your daily walking targets and view long-term step history.</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Wind size={24} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Breathing Exercise</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Guided box breathing exercises for focus, stress relief, and relaxation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Matches Logged-in Footer Layout) */}
      <footer className="max-w-5xl mx-auto px-6 py-6 border-t border-white/5 mt-12 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-1.5 opacity-60">
            <Activity size={14} className="text-[#b4a8a8]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#b4a8a8]">RATBOD</span>
          </div>

          {/* Policy Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-semibold text-gray-500">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Contact Support</a>
          </div>

          {/* Copyright */}
          <p className="text-[9px] font-extrabold uppercase tracking-widest transition-colors opacity-40 text-gray-500">
            © 2026 CRAFTED BY <a href="https://www.facebook.com/iamratulashiq" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">RATUL BIN ZAHANGIR</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
