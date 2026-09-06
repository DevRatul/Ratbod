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

    // Check redirect result first (crucial for mobile devices returning from Google sign-in)
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        try {
          sessionStorage.removeItem('ratbod_auth_in_progress');
        } catch {}
        if (result?.user) {
          setUser(result.user);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        try {
          sessionStorage.removeItem('ratbod_auth_in_progress');
        } catch {}
        console.error('Firebase redirect result error:', err);
        setAuthError(err?.message || 'Google sign-in was not completed.');
        setLoading(false);
      });

    // Listen to onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      setLoading(false);
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
