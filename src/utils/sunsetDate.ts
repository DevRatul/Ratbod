/**
 * Sunset-based logical date calculations for RaTooL (Habitor, Reading, Sleep)
 * Based on Dhaka astronomical sunset time.
 * When sunset time has passed for the day, the active tracking date automatically
 * advances to the next day's cycle.
 */

/**
 * Calculates Dhaka, Bangladesh sunset time dynamically for a given date
 * Lat: 23.8103° N, Long: 90.4125° E (UTC+6)
 */
export function getDhakaSunsetTime(date: Date = new Date()): { hours: number; minutes: number; displayStr: string } {
  try {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    // NOAA Astronomical Sunrise/Sunset Algorithm for Dhaka
    const lat = 23.8103;
    const lng = 90.4125;
    const zenith = 90.833;

    const N1 = Math.floor((275 * m) / 9);
    const N2 = Math.floor((m + 9) / 12);
    const N3 = 1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3);
    const N = N1 - N2 * N3 + d - 30;

    const lngHour = lng / 15;
    const t = N + (18 - lngHour) / 24;

    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin((M * Math.PI) / 180) + 0.02 * Math.sin((2 * M * Math.PI) / 180) + 282.634;
    L = (L + 360) % 360;

    let RA = (180 / Math.PI) * Math.atan(0.91764 * Math.tan((L * Math.PI) / 180));
    RA = (RA + 360) % 360;

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin((L * Math.PI) / 180);
    const cosDec = Math.cos(Math.asin(sinDec));

    const cosH = (Math.cos((zenith * Math.PI) / 180) - sinDec * Math.sin((lat * Math.PI) / 180)) / (cosDec * Math.cos((lat * Math.PI) / 180));
    const H = (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH))) / 15;

    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;

    // Dhaka local time = UTC + 6
    let localSunset = UT + 6.0;
    localSunset = (localSunset + 24) % 24;

    const hours = Math.floor(localSunset);
    const minutes = Math.floor((localSunset - hours) * 60);

    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayStr = `${displayHours}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;

    return { hours, minutes, displayStr };
  } catch (e) {
    return { hours: 18, minutes: 36, displayStr: '6:36 PM' };
  }
}

export interface DhakaLogicalDateInfo {
  date: Date;
  dateKey: string;
  isPastSunsetToday: boolean;
  sunsetStr: string;
  dhakaTimeStr: string;
  yesterdayDateKey: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  isFriday: boolean;
}

/**
 * Returns current date key and rich date information formatted according to Dhaka Sunset Reset rule.
 * If current Dhaka time is after sunset, date shifts to the next date cycle!
 */
export function getDhakaLogicalDate(now = new Date()): DhakaLogicalDateInfo {
  try {
    const dhakaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    const dhakaNow = new Date(dhakaStr);
    
    const sunset = getDhakaSunsetTime(dhakaNow);
    const dhakaHour = dhakaNow.getHours();
    const dhakaMin = dhakaNow.getMinutes();
    
    const isPastSunsetToday = (dhakaHour > sunset.hours) || (dhakaHour === sunset.hours && dhakaMin >= sunset.minutes);
    
    const logicalDate = new Date(dhakaNow);
    if (isPastSunsetToday) {
      // Shifting to next day after sunset
      logicalDate.setDate(logicalDate.getDate() + 1);
    }
    
    const yyyy = logicalDate.getFullYear();
    const mm = String(logicalDate.getMonth() + 1).padStart(2, '0');
    const dd = String(logicalDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const prevDate = new Date(logicalDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevYyyy = prevDate.getFullYear();
    const prevMm = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevDd = String(prevDate.getDate()).padStart(2, '0');
    const yesterdayDateKey = `${prevYyyy}-${prevMm}-${prevDd}`;
    
    const dhakaFormattedTime = dhakaNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dayOfWeek = logicalDate.getDay();

    return {
      date: logicalDate,
      dateKey,
      isPastSunsetToday,
      sunsetStr: sunset.displayStr,
      dhakaTimeStr: dhakaFormattedTime,
      yesterdayDateKey,
      dayOfWeek,
      isFriday: dayOfWeek === 5
    };
  } catch (e) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const dayOfWeek = now.getDay();
    return {
      date: now,
      dateKey,
      isPastSunsetToday: false,
      sunsetStr: '6:36 PM',
      dhakaTimeStr: '12:00 PM',
      yesterdayDateKey: dateKey,
      dayOfWeek,
      isFriday: dayOfWeek === 5
    };
  }
}

/**
 * Returns current date key formatted according to Dhaka Sunset Reset rule.
 * If current Dhaka time is after sunset, date shifts to the next date cycle!
 */
export function getDhakaLogicalDateKey(now = new Date()): {
  dateKey: string;
  isPastSunsetToday: boolean;
  sunsetStr: string;
  dhakaTimeStr: string;
  yesterdayDateKey: string;
  dayOfWeek?: number;
  isFriday?: boolean;
} {
  const info = getDhakaLogicalDate(now);
  return {
    dateKey: info.dateKey,
    isPastSunsetToday: info.isPastSunsetToday,
    sunsetStr: info.sunsetStr,
    dhakaTimeStr: info.dhakaTimeStr,
    yesterdayDateKey: info.yesterdayDateKey,
    dayOfWeek: info.dayOfWeek,
    isFriday: info.isFriday
  };
}

/**
 * Calculates remaining days from the current logical date to target date.
 * Automatically decrements after sunset when the logical date rolls over.
 */
export function getLogicalDaysRemaining(targetDateStr?: string | null): number | null {
  if (!targetDateStr) return null;
  try {
    const targetDate = new Date(targetDateStr);
    if (isNaN(targetDate.getTime())) return null;

    const { date: logicalDate } = getDhakaLogicalDate();
    const logicalMidnight = new Date(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()).getTime();
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

    const diffMs = targetMidnight - logicalMidnight;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
}

/**
 * Calculates day difference from a past entry date to current logical date.
 * 0 = today, 1 = yesterday (or 1 day ago), etc.
 */
export function getLogicalDiffDays(pastDateStr?: string | null): number {
  if (!pastDateStr) return 0;
  try {
    const entryDate = new Date(pastDateStr);
    if (isNaN(entryDate.getTime())) return 0;

    const { date: logicalDate } = getDhakaLogicalDate();
    const entryMidnight = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
    const logicalMidnight = new Date(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()).getTime();

    return Math.round((logicalMidnight - entryMidnight) / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 0;
  }
}

/**
 * Resolves the logical Date object and day information for any history entry.
 * If the entry was logged after sunset (or has a post-sunset dateKey), it correctly reflects the post-sunset date.
 */
export function getEntryLogicalDate(entryDateStr: string, entryDateKey?: string): {
  date: Date;
  dateKey: string;
  dayOfWeek: number;
} {
  try {
    if (entryDateKey && /^\d{4}-\d{2}-\d{2}$/.test(entryDateKey)) {
      const [y, m, d] = entryDateKey.split('-').map(Number);
      const logicalDate = new Date(y, m - 1, d);
      return {
        date: logicalDate,
        dateKey: entryDateKey,
        dayOfWeek: logicalDate.getDay()
      };
    }
    const rawDate = new Date(entryDateStr);
    if (!isNaN(rawDate.getTime())) {
      const logicalInfo = getDhakaLogicalDate(rawDate);
      return {
        date: logicalInfo.date,
        dateKey: logicalInfo.dateKey,
        dayOfWeek: logicalInfo.dayOfWeek
      };
    }
  } catch (e) {}

  const fallback = new Date(entryDateStr);
  return {
    date: fallback,
    dateKey: '',
    dayOfWeek: fallback.getDay()
  };
}

/**
 * Global subscriber for sunset date changes.
 * Dispatches and listens to real-time sunset date rollover events across the website.
 * Only notifies subscribers when the logical dateKey actually changes!
 */
export function subscribeToSunsetDateChange(callback: (info: DhakaLogicalDateInfo) => void): () => void {
  let prevDateKey = getDhakaLogicalDate().dateKey;

  const checkAndNotify = () => {
    const info = getDhakaLogicalDate();
    if (info.dateKey !== prevDateKey) {
      prevDateKey = info.dateKey;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ratool_sunset_day_reset', { detail: info }));
        window.dispatchEvent(new CustomEvent('ratbod_sunset_day_reset', { detail: info }));
      }
      callback(info);
    }
  };

  const handleCustomEvent = (e: any) => {
    const info = e?.detail || getDhakaLogicalDate();
    if (info.dateKey !== prevDateKey) {
      prevDateKey = info.dateKey;
      callback(info);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('ratool_sunset_day_reset', handleCustomEvent);
    window.addEventListener('ratbod_sunset_day_reset', handleCustomEvent);
    window.addEventListener('focus', checkAndNotify);
    document.addEventListener('visibilitychange', checkAndNotify);
  }

  const intervalId = setInterval(checkAndNotify, 10000);

  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('ratool_sunset_day_reset', handleCustomEvent);
      window.removeEventListener('ratbod_sunset_day_reset', handleCustomEvent);
      window.removeEventListener('focus', checkAndNotify);
      document.removeEventListener('visibilitychange', checkAndNotify);
    }
  };
}
