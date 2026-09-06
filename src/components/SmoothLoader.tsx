import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface SmoothLoaderProps {
  darkMode: boolean;
  message?: string;
}

export default function SmoothLoader({ darkMode, message = 'Loading RatboD...' }: SmoothLoaderProps) {
  return (
    <div 
      className={`min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center transition-colors duration-300 ${
        darkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F5] text-gray-900'
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-4">
        {/* Animated Brand Badge */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Ambient Pulse Glow */}
          <motion.div 
            className="absolute w-24 h-24 rounded-full bg-primary/20 blur-xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Icon Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border ${
              darkMode 
                ? 'bg-[#141414] border-white/10 shadow-black/60' 
                : 'bg-white border-black/5 shadow-gray-300/60'
            }`}
          >
            <Activity className="w-8 h-8 text-primary animate-pulse" />
          </motion.div>
        </div>

        {/* Brand Text & Status */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-black tracking-widest uppercase">
            RATBOD
          </span>
          <span className={`text-xs font-medium tracking-wide transition-opacity ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {message}
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className={`w-36 h-1 rounded-full overflow-hidden ${
          darkMode ? 'bg-white/10' : 'bg-gray-200'
        }`}>
          <motion.div 
            className="h-full bg-primary rounded-full"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>
    </div>
  );
}
