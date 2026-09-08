import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/Auth/AuthScreen";
import LandingPage from "./components/LandingPage";
import SmoothLoader from "./components/SmoothLoader";
import { 
  getInitialTheme, 
  getThemeMode, 
  isSunsetTime, 
  applyThemeToDOM, 
  tryDetectGeolocation 
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

  // Periodic ticker to check if sunset occurred or sunrise arrived
  useEffect(() => {
    // Attempt non-intrusive geolocation detection for pinpoint solar precision
    tryDetectGeolocation();

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

  const handleToggleTheme = (val: boolean) => {
    setDarkMode(val);
    applyThemeToDOM(val);
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
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </React.StrictMode>
);
