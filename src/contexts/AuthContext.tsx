import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getRedirectResult, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let redirectResolved = false;
    const wasRedirect = typeof window !== 'undefined' && (
      localStorage.getItem('ratool_auth_in_progress') === 'google_redirect' ||
      localStorage.getItem('ratbod_auth_in_progress') === 'google_redirect' ||
      window.location.href.includes('apiKey=') ||
      window.location.hash.includes('access_token')
    );

    // If returning from Google redirect, keep loading spinner active while credentials are retrieved
    if (wasRedirect) {
      console.log('Detected return from Google OAuth redirect, waiting for credential retrieval...');
    }

    // Check redirect result (if returning from redirect)
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        redirectResolved = true;
        try {
          localStorage.removeItem('ratool_auth_in_progress');
          sessionStorage.removeItem('ratool_auth_in_progress');
          localStorage.removeItem('ratbod_auth_in_progress');
          sessionStorage.removeItem('ratbod_auth_in_progress');
        } catch {}
        
        if (result?.user) {
          console.log('Google redirect sign-in successful for:', result.user.email);
          setUser(result.user);
          setLoading(false);
        } else if (wasRedirect) {
          // If wasRedirect was true but result was null, let onAuthStateChanged have a moment
          setTimeout(() => {
            if (!isMounted) return;
            if (auth.currentUser) {
              setUser(auth.currentUser);
            } else {
              setAuthError('iOS Safari blocked the redirect credential. For the smoothest experience on iPhone PWA, please use Email sign-in or set a password from your laptop.');
            }
            setLoading(false);
          }, 1200);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        redirectResolved = true;
        try {
          localStorage.removeItem('ratool_auth_in_progress');
          sessionStorage.removeItem('ratool_auth_in_progress');
          localStorage.removeItem('ratbod_auth_in_progress');
          sessionStorage.removeItem('ratbod_auth_in_progress');
        } catch {}
        console.warn('Firebase redirect result error:', err?.message || err);
        if (wasRedirect) {
          setAuthError(err.message || 'Google sign-in was interrupted. Please try again or use Email.');
          setLoading(false);
        }
      });

    // Listen to onAuthStateChanged (authoritative session state)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // If not returning from redirect, immediately finish loading
        if (!wasRedirect || redirectResolved) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (e: any) {
      console.error('Error signing out:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
