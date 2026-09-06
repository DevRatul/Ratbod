/**
 * Theme Utility for RatboD
 * 
 * Default rule:
 * - Default theme is LIGHT MODE for all web apps.
 * - When sunset time is occurring (evening/night: 18:00 - 06:00), the theme changes to DARK MODE.
 * - Otherwise (06:00 - 18:00), it is always defaultly LIGHT MODE.
 * - Users can manually toggle the theme anytime via the Sun/Moon button.
 */

export function isSunsetTime(): boolean {
  if (typeof window === 'undefined') return false;
  const currentHour = new Date().getHours();
  // Sunset occurs in the evening (from 18:00 / 6:00 PM until 06:00 / 6:00 AM)
  return currentHour >= 18 || currentHour < 6;
}

export function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const manual = localStorage.getItem('ratbod_theme_manual');
    if (manual === 'dark') return true;
    if (manual === 'light') return false;
  } catch (e) {}
  
  // By default: light mode during daytime, dark mode when sunset occurs
  return isSunsetTime();
}

export function saveManualTheme(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ratbod_theme_manual', isDark ? 'dark' : 'light');
  } catch (e) {}
}

export function clearManualTheme(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('ratbod_theme_manual');
  } catch (e) {}
}

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
