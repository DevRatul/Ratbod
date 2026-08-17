import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/Auth/AuthScreen";
import LandingPage from "./components/LandingPage";

function AppRoot() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  }
  
  if (!user) {
    if (showAuth) {
      return <AuthScreen darkMode={true} onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onLogin={() => setShowAuth(true)} />;
  }
  
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  </React.StrictMode>
);
