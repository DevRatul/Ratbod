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
} {
  try {
    // Get Dhaka time string
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

    return {
      dateKey,
      isPastSunsetToday,
      sunsetStr: sunset.displayStr,
      dhakaTimeStr: dhakaFormattedTime,
      yesterdayDateKey
    };
  } catch (e) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    return {
      dateKey,
      isPastSunsetToday: false,
      sunsetStr: '6:36 PM',
      dhakaTimeStr: '12:00 PM',
      yesterdayDateKey: dateKey
    };
  }
}
