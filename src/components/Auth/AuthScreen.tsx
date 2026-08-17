import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuthScreenProps {
  darkMode: boolean;
  onBack?: () => void;
}

export default function AuthScreen({ darkMode, onBack }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4 transition-colors relative", darkMode ? "bg-[#050505] text-white" : "bg-gray-50 text-gray-900")}>
      {onBack && (
        <button 
          onClick={onBack}
          className={cn("absolute top-6 left-6 p-2 rounded-full hover:bg-gray-500/10 transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium", darkMode ? "text-gray-400" : "text-gray-600")}
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back to Home</span>
        </button>
      )}
      
      <div className={cn("w-full max-w-md p-8 rounded-3xl shadow-2xl border relative z-10", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5")}>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <UserIcon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">RatBod</h1>
          <p className={cn("text-sm mt-2", darkMode ? "text-gray-400" : "text-gray-500")}>
            {isLogin ? 'Sign in to sync your progress' : 'Create an account to sync your progress'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-500/90">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className={cn("w-full border-t", darkMode ? "border-white/10" : "border-gray-200")}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={cn("px-2 text-xs font-bold uppercase tracking-widest", darkMode ? "bg-[#0F0F0F] text-gray-500" : "bg-white text-gray-400")}>
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className={cn(
            "mt-6 w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer border",
            darkMode ? "bg-white text-gray-900 hover:bg-gray-100 border-transparent" : "bg-white hover:bg-gray-50 text-gray-900 border-gray-200 shadow-sm"
          )}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Google</span>
        </button>

        <p className="mt-8 text-center text-sm">
          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-600 dark:text-orange-400">
          <strong>Note:</strong> To use Email/Password sign in, ensure it is enabled in your Firebase Console under Authentication &gt; Sign-in method.
        </div>
      </div>
    </div>
  );
}
