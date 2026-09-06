import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/Auth/AuthScreen";
import LandingPage from "./components/LandingPage";
import SmoothLoader from "./components/SmoothLoader";
import { getInitialTheme, saveManualTheme, isSunsetTime, applyThemeToDOM } from "./utils/theme";

function AppRoot() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => getInitialTheme());

  // Apply theme to DOM
  useEffect(() => {
    applyThemeToDOM(darkMode);
  }, [darkMode]);

  // Periodic ticker to check if sunset occurred or sunrise arrived (every 30s)
  useEffect(() => {
    const checkSunset = () => {
      try {
        const manual = localStorage.getItem('ratbod_theme_manual');
        if (manual === null) {
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

    const interval = setInterval(checkSunset, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTheme = (val: boolean) => {
    setDarkMode(val);
    saveManualTheme(val);
    applyThemeToDOM(val);
  };
  
  if (loading) {
    return <SmoothLoader darkMode={darkMode} message="Loading RatboD..." />;
  }
  
  if (!user) {
    if (showAuth) {
      return <AuthScreen darkMode={darkMode} onBack={() => setShowAuth(false)} />;
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
