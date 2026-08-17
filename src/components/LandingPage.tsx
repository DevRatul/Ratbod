import React from 'react';
import { 
  Activity, 
  Droplets, 
  CalendarCheck, 
  Wind, 
  ShoppingCart,
  ArrowRight,
  ShieldCheck
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
  const features = [
    {
      icon: <Activity size={24} className="text-blue-500" />,
      title: "Body Metrics",
      description: "BMI, BMR, and TDEE calculator for personalized health insights."
    },
    {
      icon: <Droplets size={24} className="text-cyan-500" />,
      title: "Hydration Tracker",
      description: "Smart daily water tracking with customizable goals and reminders."
    },
    {
      icon: <CalendarCheck size={24} className="text-emerald-500" />,
      title: "Habit Forge",
      description: "Build and maintain positive daily routines with streak tracking."
    },
    {
      icon: <Wind size={24} className="text-indigo-500" />,
      title: "Mindful Breathing",
      description: "Guided box breathing exercises for focus and relaxation."
    },
    {
      icon: <ShoppingCart size={24} className="text-orange-500" />,
      title: "Grocery Calculator",
      description: "Manage your shopping lists and track your budget on the go."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">RatBod</span>
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
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Doodles */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <Activity size={80} strokeWidth={1} className="absolute top-[20%] left-[10%] text-blue-400 rotate-12" />
          <Droplets size={60} strokeWidth={1} className="absolute bottom-[20%] left-[15%] text-cyan-400 -rotate-12" />
          <CalendarCheck size={70} strokeWidth={1} className="absolute top-[15%] right-[10%] text-emerald-400 rotate-6" />
          <Wind size={90} strokeWidth={1} className="absolute bottom-[25%] right-[15%] text-indigo-400 -rotate-12" />
          <ShoppingCart size={50} strokeWidth={1} className="absolute top-[50%] right-[5%] text-orange-400 rotate-12 hidden md:block" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck size={14} />
            <span>Secure Cloud Sync</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-tight">
            Your Health & Habits, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              All in One Place.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            RatBod brings together five powerful tools to help you track your body metrics, hydration, daily habits, mindfulness, and even your grocery budget.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-white">Five Tools, One Platform</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Everything you need to optimize your daily routine, accessible from any device.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-8 rounded-3xl bg-[#111111] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} RatBod. Built for a healthier you.
        </p>
      </footer>
    </div>
  );
}
