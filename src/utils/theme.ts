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
 * Returns whether the "Sunrise to Sunset" automatic setting is enabled.
 */
export function isSunriseToSunsetEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const setting = localStorage.getItem('ratool_sunrise_sunset') || localStorage.getItem('ratbod_sunrise_sunset');
    if (setting !== null) {
      return setting === 'true';
    }
    // Backward compatibility: if mode was explicitly 'auto', but check if manually disabled
    const mode = localStorage.getItem('ratool_theme_mode') || localStorage.getItem('ratbod_theme_mode');
    return mode === 'auto';
  } catch (e) {
    return false;
  }
}

/**
 * Returns current ThemeMode ('auto' | 'light' | 'dark').
 */
export function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  if (isSunriseToSunsetEnabled()) return 'auto';
  try {
    const mode = localStorage.getItem('ratool_theme_mode') || localStorage.getItem('ratbod_theme_mode');
    if (mode === 'light' || mode === 'dark') {
      return mode;
    }
    const isDark = localStorage.getItem('ratool_darkmode') || localStorage.getItem('ratbod_darkmode');
    if (isDark === 'true') return 'dark';
    if (isDark === 'false') return 'light';
  } catch (e) {}
  return 'light';
}

/**
 * Sets and saves the ThemeMode.
 */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ratool_theme_mode', mode);
    localStorage.setItem('ratbod_theme_mode', mode);
    if (mode === 'auto') {
      localStorage.setItem('ratool_sunrise_sunset', 'true');
      localStorage.setItem('ratbod_sunrise_sunset', 'true');
    } else {
      localStorage.setItem('ratool_sunrise_sunset', 'false');
      localStorage.setItem('ratbod_sunrise_sunset', 'false');
      localStorage.setItem('ratool_darkmode', (mode === 'dark').toString());
      localStorage.setItem('ratbod_darkmode', (mode === 'dark').toString());
    }
  } catch (e) {}
}

/**
 * Enables Sunrise-to-Sunset mode.
 * Location permission will occur ONLY ONCE for a user when this option is turned on.
 * When off, no location permission is ever called.
 */
export function enableSunriseToSunset(onThemeCalculated?: (isDark: boolean) => void): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.setItem('ratool_sunrise_sunset', 'true');
    localStorage.setItem('ratbod_sunrise_sunset', 'true');
    localStorage.setItem('ratool_theme_mode', 'auto');
    localStorage.setItem('ratbod_theme_mode', 'auto');

    // Only request geolocation ONCE when the user turns on this setting
    const hasRequestedGeo = localStorage.getItem('ratool_geo_requested') === 'true' || 
                            localStorage.getItem('ratbod_geo_requested') === 'true';

    if (!hasRequestedGeo && navigator.geolocation) {
      localStorage.setItem('ratool_geo_requested', 'true');
      localStorage.setItem('ratbod_geo_requested', 'true');
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            try {
              localStorage.setItem('ratool_user_lat', pos.coords.latitude.toFixed(2));
              localStorage.setItem('ratool_user_lng', pos.coords.longitude.toFixed(2));
              localStorage.setItem('ratbod_user_lat', pos.coords.latitude.toFixed(2));
              localStorage.setItem('ratbod_user_lng', pos.coords.longitude.toFixed(2));
              
              // Recalculate with newly saved coordinates
              const newDark = isSunsetTime();
              applyThemeToDOM(newDark);
              if (onThemeCalculated) onThemeCalculated(newDark);
            } catch (e) {}
          },
          () => {},
          { timeout: 8000, maximumAge: 86400000 }
        );
      } catch (e) {}
    }

    const isDark = isSunsetTime();
    applyThemeToDOM(isDark);
    if (onThemeCalculated) onThemeCalculated(isDark);
  } catch (e) {}
  return true;
}

/**
 * Disables Sunrise-to-Sunset mode and locks in the current manual theme.
 */
export function disableSunriseToSunset(currentDarkMode: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ratool_sunrise_sunset', 'false');
    localStorage.setItem('ratbod_sunrise_sunset', 'false');
    const mode = currentDarkMode ? 'dark' : 'light';
    localStorage.setItem('ratool_theme_mode', mode);
    localStorage.setItem('ratbod_theme_mode', mode);
    localStorage.setItem('ratool_darkmode', currentDarkMode.toString());
    localStorage.setItem('ratbod_darkmode', currentDarkMode.toString());
  } catch (e) {}
}

/**
 * Toggles Sunrise-to-Sunset mode. Returns the new state (true if enabled, false if disabled).
 */
export function toggleSunriseSunset(
  currentDarkMode: boolean,
  onThemeCalculated?: (isDark: boolean) => void
): boolean {
  const currentlyEnabled = isSunriseToSunsetEnabled();
  if (currentlyEnabled) {
    disableSunriseToSunset(currentDarkMode);
    return false;
  } else {
    enableSunriseToSunset(onThemeCalculated);
    return true;
  }
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
 * Manual toggle triggered from header icon.
 * Saves manual choice and sets mode to 'dark' or 'light'.
 */
export function saveManualTheme(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const mode = isDark ? 'dark' : 'light';
    localStorage.setItem('ratool_theme_mode', mode);
    localStorage.setItem('ratbod_theme_mode', mode);
    localStorage.setItem('ratool_darkmode', isDark.toString());
    localStorage.setItem('ratbod_darkmode', isDark.toString());
    // Manual click in header sets manual theme
    localStorage.setItem('ratool_sunrise_sunset', 'false');
    localStorage.setItem('ratbod_sunrise_sunset', 'false');
  } catch (e) {}
}

/**
 * Resets back to automatic Sunset-to-Sunrise mode.
 */
export function clearManualTheme(): void {
  enableSunriseToSunset();
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
