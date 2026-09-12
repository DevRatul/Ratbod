import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/Auth/AuthScreen";
import LandingPage from "./components/LandingPage";
import SmoothLoader from "./components/SmoothLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { db } from "./lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  getInitialTheme, 
  getThemeMode, 
  isSunsetTime, 
  applyThemeToDOM,
  saveManualTheme,
  saveAutoTheme
} from "./utils/theme";

function AppRoot() {
  const { user, loading, authError } = useAuth();
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === '1' || params.get('auth') === 'true') return true;
      if (localStorage.getItem('ratool_auth_in_progress') || localStorage.getItem('ratbod_auth_in_progress')) return true;
    }
    return false;
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => getInitialTheme());
  const isSyncingFromRemoteRef = useRef(false);

  // Automatically keep Auth Screen visible if an auth error or redirect attempt occurred
  useEffect(() => {
    if (authError && !user) {
      setShowAuth(true);
    }
  }, [authError, user]);

  // Apply theme to DOM on mount and changes
  useEffect(() => {
    applyThemeToDOM(darkMode);
  }, [darkMode]);

  // Real-time synchronization of dark mode and theme across all devices of the logged-in user
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isRemoteSunrise = data.isSunriseToSunset !== undefined 
          ? Boolean(data.isSunriseToSunset) 
          : (data.themeMode === 'auto');

        if (data.isSunriseToSunset !== undefined) {
          try {
            localStorage.setItem('ratool_sunrise_sunset', isRemoteSunrise.toString());
            localStorage.setItem('ratbod_sunrise_sunset', isRemoteSunrise.toString());
            if (isRemoteSunrise) {
              localStorage.setItem('ratool_theme_mode', 'auto');
              localStorage.setItem('ratbod_theme_mode', 'auto');
            }
          } catch (e) {}
        }

        if (data.darkMode !== undefined) {
          const remoteDark = Boolean(data.darkMode);
          setDarkMode((prev) => {
            if (prev !== remoteDark) {
              isSyncingFromRemoteRef.current = true;
              if (isRemoteSunrise) {
                saveAutoTheme(remoteDark);
              } else {
                saveManualTheme(remoteDark);
              }
              applyThemeToDOM(remoteDark);
              setTimeout(() => {
                isSyncingFromRemoteRef.current = false;
              }, 300);
              return remoteDark;
            }
            return prev;
          });
        }
      }
    }, (err) => {
      console.warn("Real-time theme sync onSnapshot:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Periodic ticker to check if sunset occurred or sunrise arrived (only if sunrise-to-sunset is enabled)
  useEffect(() => {
    const checkSunset = () => {
      try {
        const mode = getThemeMode();
        if (mode === 'auto') {
          const shouldBeDark = isSunsetTime();
          setDarkMode(prev => {
            if (prev !== shouldBeDark) {
              applyThemeToDOM(shouldBeDark);
              return shouldBeDark;
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    // Check immediately on mount
    checkSunset();

    // Recheck every 15 seconds to catch sunset or sunrise minute-by-minute
    const interval = setInterval(checkSunset, 15000);

    // Recheck when tab becomes visible or user returns to device
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSunset();
      }
    };
    window.addEventListener('focus', checkSunset);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSunset);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleToggleTheme = (val: boolean, isManual = true) => {
    setDarkMode(val);
    applyThemeToDOM(val);
    if (isManual) {
      saveManualTheme(val);
    } else {
      saveAutoTheme(val);
    }
    if (user && !isSyncingFromRemoteRef.current) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, {
        darkMode: val,
        themeMode: isManual ? (val ? 'dark' : 'light') : 'auto',
        isSunriseToSunset: isManual ? false : true,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch((err) => {
        console.warn("Failed to update theme in Firestore:", err);
      });
    }
  };
  
  if (loading) {
    return <SmoothLoader darkMode={darkMode} message="Loading RaTooL..." />;
  }
  
  if (!user) {
    if (showAuth) {
      return <AuthScreen darkMode={darkMode} setDarkMode={handleToggleTheme} onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage darkMode={darkMode} setDarkMode={handleToggleTheme} onLogin={() => setShowAuth(true)} />;
  }
  
  return <App darkMode={darkMode} setDarkMode={handleToggleTheme} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
