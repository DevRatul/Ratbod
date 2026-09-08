import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { loginWithGoogle } from '../../utils/auth';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  KeyRound, 
  LogIn, 
  UserPlus 
} from 'lucide-react';
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
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetFormState = (newMode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(newMode);
    setError(null);
    clearAuthError();
    setSuccessMessage(null);
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    clearAuthError();
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
        // Successful signup automatically signs user in via onAuthStateChanged
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        // Successful signin automatically updates AuthContext
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please try again or reset your password.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email. Click "Create Account" below to register.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Access temporarily disabled due to many failed attempts. Please reset password or try again later.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email or Gmail address to receive a password reset link.');
      return;
    }

    setError(null);
    clearAuthError();
    setSuccessMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMessage(`Password reset link sent to ${cleanEmail}! Please check your email inbox.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      const code = err?.code;
      if (code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (code === 'auth/invalid-email') {
        setError('Please provide a valid email address.');
      } else {
        setError(err.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    clearAuthError();
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle(false);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError(null);
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
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      )}

      {/* Top right Theme Toggle */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} align="right" />
      </div>

      <div className={cn(
        "w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all my-auto",
        darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5"
      )}>
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
            {authMode === 'forgot' ? (
              <KeyRound size={24} />
            ) : authMode === 'signup' ? (
              <UserPlus size={24} />
            ) : (
              <LogIn size={24} />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {authMode === 'forgot'
              ? 'Reset Password'
              : authMode === 'signup'
              ? 'Create an Account'
              : 'Sign In to RaTooL'}
          </h2>
          <p className={cn("text-xs sm:text-sm mt-1", darkMode ? "text-gray-400" : "text-gray-500")}>
            {authMode === 'forgot'
              ? 'Enter your email to receive a password reset link'
              : authMode === 'signup'
              ? 'Register with email or Google to track health & streaks'
              : 'Access your health calculators, streaks & cloud data'}
          </p>
        </div>

        {/* Tab switch for Sign In / Create Account */}
        {authMode !== 'forgot' && (
          <div className={cn(
            "flex p-1 rounded-xl mb-5 border",
            darkMode ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200"
          )}>
            <button
              type="button"
              onClick={() => resetFormState('signin')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                authMode === 'signin'
                  ? (darkMode ? "bg-white text-black shadow-sm" : "bg-white text-gray-900 shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => resetFormState('signup')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                authMode === 'signup'
                  ? (darkMode ? "bg-white text-black shadow-sm" : "bg-white text-gray-900 shadow-sm")
                  : (darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")
              )}
            >
              Create Account
            </button>
          </div>
        )}

        {activeError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{activeError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* Google One-Click Sign In (visible in signin / signup modes) */}
        {authMode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className={cn(
                "w-full py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.98]",
                darkMode 
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white hover:border-white/20" 
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800 hover:border-gray-300"
              )}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="my-5 relative">
              <div className="absolute inset-0 flex items-center">
                <div className={cn("w-full border-t", darkMode ? "border-white/10" : "border-gray-200")}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={cn(
                  "px-3 text-[10px] font-bold uppercase tracking-widest", 
                  darkMode ? "bg-[#0F0F0F] text-gray-500" : "bg-white text-gray-400"
                )}>
                  or with email & password
                </span>
              </div>
            </div>
          </>
        )}

        {/* Form: Email & Password for Sign In / Sign Up */}
        {authMode !== 'forgot' ? (
          <form onSubmit={handleEmailPasswordAuth} className="space-y-3.5">
            <div className="space-y-1">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm",
                    darkMode ? "bg-black/50 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                  )}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>
                  Password
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => resetFormState('forgot')}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={authMode === 'signup' ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm",
                    darkMode ? "bg-black/50 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                  )}
                  placeholder={authMode === 'signup' ? "Min. 6 characters" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />}
                  <span>{authMode === 'signup' ? 'Create Account' : 'Sign In with Email'}</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>
                Email / Gmail Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm",
                    darkMode ? "bg-black/50 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                  )}
                  placeholder="Enter your Gmail or email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => resetFormState('signin')}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        {authMode !== 'forgot' && (
          <div className="mt-5 text-center">
            {authMode === 'signin' ? (
              <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => resetFormState('signup')}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => resetFormState('signin')}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
