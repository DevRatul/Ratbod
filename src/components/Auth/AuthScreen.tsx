import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { loginWithGoogle } from '../../utils/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowLeft, Smartphone, CheckCircle2, KeyRound } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ThemeToggle from '../ThemeToggle';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuthScreenProps {
  darkMode: boolean;
  setDarkMode?: (val: boolean) => void;
  onBack?: () => void;
}

export default function AuthScreen({ darkMode, setDarkMode, onBack }: AuthScreenProps) {
  const { authError, clearAuthError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRedirectOption, setShowRedirectOption] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Check iOS & PWA standalone status
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = ('standalone' in window.navigator && Boolean((window.navigator as any).standalone)) || 
                         window.matchMedia('(display-mode: standalone)').matches;
      setIsIOS(ios);
      setIsStandalone(standalone);
      if (ios) {
        setShowRedirectOption(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearAuthError();
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        setError('Incorrect password or account signed up with Google. Use the "Forgot / Set Password" option below to access your account.');
      } else if (err?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in or use "Forgot / Set Password".');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address above to receive a password setup link.');
      return;
    }
    setError(null);
    clearAuthError();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetEmailSent(true);
      setSuccessMessage(`Password setup link sent to ${email.trim()}! Open it on your iPhone to set a password.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (forceRedirect: boolean = false) => {
    setError(null);
    clearAuthError();
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle(forceRedirect);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        if (isIOS || isStandalone) {
          setShowRedirectOption(true);
          setError('Google popup was closed or detached by iOS. If you are in the iPhone PWA, use Direct Mobile Sign-In below or sign in with your Email & Password.');
        } else {
          setError(null);
        }
      } else if (err?.code === 'auth/popup-blocked') {
        setShowRedirectOption(true);
        setError('The Google sign-in pop-up was blocked by Safari. Please use Direct Mobile Sign-In below or allow pop-ups.');
      } else {
        setError(err.message || 'An error occurred during Google sign in.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const activeError = error || authError;

  return (
    <div 
      style={{ colorScheme: darkMode ? 'dark' : 'light' }}
      className={cn(
        "fixed inset-0 overflow-y-auto flex flex-col sm:justify-center items-center p-4 pt-16 sm:pt-4 transition-colors", 
        darkMode ? "dark bg-[#050505] text-white" : "bg-gray-50 text-gray-900"
      )}
    >
      {onBack && (
        <button 
          onClick={onBack}
          className={cn(
            "absolute top-6 left-6 p-2 rounded-full hover:bg-gray-500/10 transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium", 
            darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back to Home</span>
        </button>
      )}

      {/* Theme Toggle (Sunset to Sunrise) */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} align="right" />
      </div>
      
      <div className={cn(
        "w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border relative z-10 my-auto", 
        darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5"
      )}>
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary/20 text-primary border border-primary/30 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-primary/20">
            <UserIcon size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">RaTooL</h1>
          <p className={cn("text-xs sm:text-sm mt-1 font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
            {isLogin ? 'Sign in to sync your body metrics & logs across devices' : 'Create an account to save your health metrics'}
          </p>

          {isStandalone && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold">
              <Smartphone size={12} />
              <span>iPhone PWA Installed</span>
            </div>
          )}
        </div>

        {activeError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm text-red-500/95 font-medium leading-relaxed">
              {activeError}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm text-emerald-500 font-medium leading-relaxed">
              {successMessage}
            </div>
          </div>
        )}

        {/* Primary Google Sign In */}
        <button
          onClick={() => handleGoogleSignIn(false)}
          disabled={googleLoading || loading}
          type="button"
          className={cn(
            "w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer border shadow-sm active:scale-[0.98]",
            darkMode 
              ? "bg-white text-gray-900 hover:bg-gray-100 border-transparent shadow-black/40" 
              : "bg-white hover:bg-gray-50 text-gray-900 border-gray-200 shadow-gray-200/60"
          )}
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{googleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
        </button>

        {/* Dedicated Mobile Direct Redirect Option */}
        {showRedirectOption && (
          <button
            onClick={() => handleGoogleSignIn(true)}
            disabled={googleLoading}
            type="button"
            className="mt-2.5 w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone size={15} />
            <span>Direct Mobile Sign-In (Redirect)</span>
          </button>
        )}

        <div className="my-5 relative">
          <div className="absolute inset-0 flex items-center">
            <div className={cn("w-full border-t", darkMode ? "border-white/10" : "border-gray-200")}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={cn("px-3 text-[10px] font-bold uppercase tracking-widest", darkMode ? "bg-[#0F0F0F] text-gray-500" : "bg-white text-gray-400")}>
              Or sign in with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Forgot / Set Password
                </button>
              )}
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm",
                  darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                )}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In with Email' : 'Create Account')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs">
          <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              clearAuthError();
              setSuccessMessage(null);
            }}
            className="font-bold text-primary hover:underline transition-colors cursor-pointer"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

      </div>
    </div>
  );
}
