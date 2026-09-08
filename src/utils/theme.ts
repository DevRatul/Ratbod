/**
 * Theme Utility for RaTooL
 * 
 * Rules:
 * - Default mode is "auto" (Sunset to Sunrise).
 * - When in "auto" mode:
 *   - Dark Mode applies automatically from Sunset until Sunrise.
 *   - Light Mode applies automatically from Sunrise until Sunset.
 *   - Uses accurate solar calculations based on day of year & user timezone/location.
 * - Users can also manually choose "light" or "dark" if desired.
 * - The theme applies synchronously to full website (<html>, <body>, <meta theme-color>, colorScheme, etc.).
 */

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface SolarInfo {
  sunriseDecimal: number;
  sunsetDecimal: number;
  sunriseStr: string;
  sunsetStr: string;
  isNight: boolean;
  phase: 'day' | 'night';
}

/**
 * Calculates accurate astronomical sunrise and sunset for the user's location/timezone.
 */
export function getSolarInfo(date: Date = new Date()): SolarInfo {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const rad = Math.PI / 180;
  
  // Solar Declination
  const decl = 23.44 * rad * Math.sin((360 / 365) * (day - 81) * rad);
  
  // Latitude estimation (from cached coords or user timezone)
  let lat = 28; // Default temperate
  if (typeof window !== 'undefined') {
    try {
      const cachedLat = localStorage.getItem('ratool_user_lat') || localStorage.getItem('ratbod_user_lat');
      if (cachedLat) {
        const parsed = parseFloat(cachedLat);
        if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
          lat = parsed;
        }
      } else {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (tz.includes('Dhaka') || tz.includes('Kolkata') || tz.includes('Asia')) lat = 24;
        else if (tz.includes('London') || tz.includes('Europe')) lat = 50;
        else if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('America')) lat = 38;
        else if (tz.includes('Sydney') || tz.includes('Australia')) lat = -33;
      }
    } catch(e) {}
  }
  
  const phi = lat * rad;
  const cosH = -Math.tan(phi) * Math.tan(decl);
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const H = Math.acos(clampedCosH) / rad / 15;
  
  // Equation of time (minutes offset)
  const b = (360 / 365) * (day - 81) * rad;
  const eot = (9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)) / 60;
  const noon = 12 - eot;
  
  const sunriseDecimal = Math.max(0, Math.min(24, noon - H));
  const sunsetDecimal = Math.max(0, Math.min(24, noon + H));
  
  const currentDecimal = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const isNight = currentDecimal < sunriseDecimal || currentDecimal >= sunsetDecimal;
  
  const formatTime = (dec: number) => {
    const h = Math.floor(dec);
    const m = Math.round((dec - h) * 60);
    const normalizedH = m === 60 ? h + 1 : h;
    const normalizedM = m === 60 ? 0 : m;
    const period = normalizedH >= 12 ? 'PM' : 'AM';
    const displayH = ((normalizedH + 11) % 12) + 1;
    return `${displayH}:${normalizedM < 10 ? '0' : ''}${normalizedM} ${period}`;
  };
  
  return {
    sunriseDecimal,
    sunsetDecimal,
    sunriseStr: formatTime(sunriseDecimal),
    sunsetStr: formatTime(sunsetDecimal),
    isNight,
    phase: isNight ? 'night' : 'day'
  };
}

/**
 * Returns true if the current time is after sunset and before sunrise.
 */
export function isSunsetTime(date: Date = new Date()): boolean {
  return getSolarInfo(date).isNight;
}

/**
 * Returns current ThemeMode ('auto' | 'light' | 'dark').
 * Defaults to 'auto' (Sunset to Sunrise).
 */
export function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const mode = localStorage.getItem('ratool_theme_mode') || localStorage.getItem('ratbod_theme_mode');
    if (mode === 'light' || mode === 'dark' || mode === 'auto') {
      return mode;
    }
  } catch (e) {}
  return 'auto';
}

/**
 * Sets and saves the ThemeMode.
 */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ratool_theme_mode', mode);
    localStorage.setItem('ratbod_theme_mode', mode);
    localStorage.removeItem('ratool_theme_manual');
    localStorage.removeItem('ratbod_theme_manual');
  } catch (e) {}
}

/**
 * Computes whether Dark Mode should be active given the ThemeMode.
 */
export function isDarkModeForMode(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return isSunsetTime();
}

/**
 * Initial theme boolean state (true = dark, false = light).
 */
export function getInitialTheme(): boolean {
  return isDarkModeForMode(getThemeMode());
}

/**
 * Backwards-compatibility helper for manual toggle.
 */
export function saveManualTheme(isDark: boolean): void {
  setThemeMode(isDark ? 'dark' : 'light');
}

/**
 * Resets back to automatic Sunset-to-Sunrise mode.
 */
export function clearManualTheme(): void {
  setThemeMode('auto');
}

/**
 * Applies the dark or light theme across the entire webpage:
 * - <html> class 'dark'
 * - <html> style 'colorScheme'
 * - document.documentElement and document.body background colors
 * - <meta name="theme-color">
 * - <meta name="apple-mobile-web-app-status-bar-style">
 */
export function applyThemeToDOM(darkMode: boolean): void {
  if (typeof document === 'undefined') return;

  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';

  const themeColor = darkMode ? '#0A0A0A' : '#F5F5F5';
  const statusBar = darkMode ? 'black-translucent' : 'default';

  document.documentElement.style.backgroundColor = themeColor;
  if (document.body) {
    document.body.style.backgroundColor = themeColor;
  }

  // 1. Update <meta name="theme-color">
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute('content', themeColor);

  // 2. Update Apple Status Bar Style
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleMeta) {
    appleMeta.setAttribute('content', statusBar);
  }
}

/**
 * Optional non-blocking geolocation detection to pin-point sunrise and sunset.
 */
export function tryDetectGeolocation(): void {
  if (typeof window === 'undefined' || !navigator.geolocation) return;
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem('ratool_user_lat', pos.coords.latitude.toFixed(2));
          localStorage.setItem('ratool_user_lng', pos.coords.longitude.toFixed(2));
          localStorage.setItem('ratbod_user_lat', pos.coords.latitude.toFixed(2));
          localStorage.setItem('ratbod_user_lng', pos.coords.longitude.toFixed(2));
        } catch(e) {}
      },
      () => {},
      { timeout: 5000, maximumAge: 86400000 }
    );
  } catch(e) {}
}
