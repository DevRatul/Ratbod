const fs = require('fs');

const content = `
import React from 'react';
import { 
  Activity, 
  Droplet, 
  CalendarCheck, 
  Wind, 
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Scale,
  TrendingDown,
  TrendingUp,
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 font-sans overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-tight">RatBod</span>
          </div>
          <button 
            onClick={onLogin}
            className="px-5 py-2 text-sm font-bold bg-white text-black rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck size={14} />
                <span>Secure Cloud Sync</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight">
                Your Health & Habits, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  All in One Place.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
                RatBod brings together five powerful tools to help you track your body metrics, hydration, daily habits, mindfulness, and grocery budget.
              </p>
              <div className="pt-4 flex items-center gap-4">
                <button 
                  onClick={onLogin}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
                >
                  <span>Start Tracking Now</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Right Graphics - Demo Data Mockup */}
            <div className="relative w-full h-[500px] hidden md:block">
               {/* Background blur effects */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
               <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

               {/* Mockup Card 1: Goal Progress */}
               <div className="absolute top-[10%] right-[10%] w-72 p-5 rounded-3xl border bg-[#0F0F0F] border-green-500/30 shadow-2xl shadow-green-500/10 rotate-3 hover:rotate-0 transition-transform duration-500 z-20">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4">
                    Goal Progress <Target size={14} className="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-2xl font-black text-emerald-500">
                      75% <TrendingDown size={20} className="text-emerald-500" />
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden bg-white/10">
                       <div className="h-full bg-emerald-500 w-[75%]" />
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold mt-1">Target: 75.0 kg</div>
                  </div>
               </div>

               {/* Mockup Card 2: History Entry */}
               <div className="absolute bottom-[20%] left-[5%] w-[340px] p-4 rounded-3xl border bg-[#111111] border-white/5 shadow-2xl z-30 -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <CalendarCheck size={16} />
                      </div>
                      <div>
                        <div className="font-black text-sm text-white">Today, 08:53 AM</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-500">
                        <TrendingDown size={12} />
                        0.7
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl flex flex-col justify-center bg-[#1A1A1A]">
                       <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                         <Scale size={10} /> WEIGHT
                       </div>
                       <div className="text-xl font-black text-white">
                         122.5 <span className="text-xs font-bold text-gray-500">kg</span>
                       </div>
                    </div>
                    <div className="p-3 rounded-2xl flex flex-col justify-center bg-[#1A1A1A]">
                       <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">
                         BMI
                       </div>
                       <div className="text-xl font-black text-white">
                         37.7 <span className="text-[10px] font-bold text-gray-500">kg/m²</span>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Mockup Card 3: Water Tracker */}
               <div className="absolute top-[35%] left-[25%] w-48 p-5 rounded-3xl border bg-[#0F0F0F] border-blue-500/30 shadow-2xl shadow-blue-500/10 z-10 animate-pulse">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4">
                    Hydration <Droplet size={14} className="text-blue-500" />
                  </div>
                  <div className="text-3xl font-black text-blue-500 mb-1">6 / 8</div>
                  <div className="text-xs font-bold text-gray-500">Glasses today</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#0A0A0A]">
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
              <h3 className="text-xl font-black text-white mb-3">Body Metrics</h3>
              <p className="text-gray-400 leading-relaxed font-medium">BMI, BMR, and TDEE calculator for personalized health insights and goal tracking.</p>
            </div>
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <Droplet size={24} className="text-cyan-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Hydration Tracker</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Smart daily water tracking with customizable goals and visual progress indicators.</p>
            </div>
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <HistoryIcon size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Habitor History</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Build and maintain positive daily routines with streak tracking and historical charts.</p>
            </div>
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Wind size={24} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Mindful Breathing</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Guided box breathing exercises for focus, stress relief, and relaxation.</p>
            </div>
            <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
                <ShoppingCart size={24} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Grocery Calculator</h3>
              <p className="text-gray-400 leading-relaxed font-medium">Manage your shopping lists and track your budget on the go with real-time totals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          © {new Date().getFullYear()} RatBod. Built for a healthier you.
        </p>
      </footer>
    </div>
  );
}
`;

fs.writeFileSync('src/components/LandingPage.tsx', content);
