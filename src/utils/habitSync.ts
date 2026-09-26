/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface HabitSyncResult {
  updatedLogs: Record<string, string[]>;
  changed: boolean;
}

/**
 * Normalizes date to YYYY-MM-DD local calendar string
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates Dhaka, Bangladesh sunset time dynamically for a given date
 * Lat: 23.8103° N, Long: 90.4125° E (UTC+6)
 */
export function getDhakaSunsetTime(date: Date = new Date()): { hours: number; minutes: number; displayStr: string } {
  try {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    const lat = 23.8103;
    const lng = 90.4125;
    const zenith = 90.833;

    const N1 = Math.floor(275 * m / 9);
    const N2 = Math.floor((m + 9) / 12);
    const N3 = (1 + Math.floor((y - 4 * Math.floor(y / 4) + 2) / 3));
    const N = N1 - (N2 * N3) + d - 30;

    const lngHour = lng / 15;
    const t = N + ((18 - lngHour) / 24);

    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(M * Math.PI / 180)) + (0.020 * Math.sin(2 * M * Math.PI / 180)) + 282.634;
    L = (L + 360) % 360;

    let RA = (180 / Math.PI) * Math.atan(0.91764 * Math.tan(L * Math.PI / 180));
    RA = (RA + 360) % 360;

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin(L * Math.PI / 180);
    const cosDec = Math.cos(Math.asin(sinDec));

    const cosH = (Math.cos(zenith * Math.PI / 180) - (sinDec * Math.sin(lat * Math.PI / 180))) / (cosDec * Math.cos(lat * Math.PI / 180));
    const H = (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH))) / 15;

    const T = H + RA - (0.06571 * t) - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;

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
export function getDhakaLogicalDateKey(now = new Date()): { dateKey: string; isPastSunsetToday: boolean; sunsetStr: string; dhakaTimeStr: string } {
  try {
    const dhakaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    const dhakaNow = new Date(dhakaStr);
    
    const sunset = getDhakaSunsetTime(dhakaNow);
    const dhakaHour = dhakaNow.getHours();
    const dhakaMin = dhakaNow.getMinutes();
    
    const isPastSunsetToday = (dhakaHour > sunset.hours) || (dhakaHour === sunset.hours && dhakaMin >= sunset.minutes);
    
    const logicalDate = new Date(dhakaNow);
    if (isPastSunsetToday) {
      logicalDate.setDate(logicalDate.getDate() + 1);
    }
    
    const yyyy = logicalDate.getFullYear();
    const mm = String(logicalDate.getMonth() + 1).padStart(2, '0');
    const dd = String(logicalDate.getDate()).padStart(2, '0');
    
    const dhakaFormattedTime = dhakaNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      dateKey: `${yyyy}-${mm}-${dd}`,
      isPastSunsetToday,
      sunsetStr: sunset.displayStr,
      dhakaTimeStr: dhakaFormattedTime
    };
  } catch (e) {
    const fallback = getLocalDateString(now);
    return {
      dateKey: fallback,
      isPastSunsetToday: false,
      sunsetStr: '6:36 PM',
      dhakaTimeStr: ''
    };
  }
}

/**
 * Identifies habit IDs for water and reading
 */
export function findMatchingHabitIds(): { waterHabitIds: string[]; readingHabitIds: string[] } {
  const waterHabitIds = new Set<string>(['h3']);
  const readingHabitIds = new Set<string>(['h5']);

  try {
    const savedHabits = localStorage.getItem('ratool_habits_v1') || localStorage.getItem('ratbod_habits_v1');
    if (savedHabits) {
      const habitsList = JSON.parse(savedHabits);
      if (Array.isArray(habitsList)) {
        habitsList.forEach((h: any) => {
          if (!h || !h.id) return;
          const title = String(h.title || '');
          if (h.id === 'h3' || /drink.*water|mineral.*water|পানি/i.test(title)) {
            waterHabitIds.add(h.id);
          }
          if (h.id === 'h5' || /read.*book|reading|বই/i.test(title)) {
            readingHabitIds.add(h.id);
          }
        });
      }
    }
  } catch (e) {
    // Ignore error
  }

  return {
    waterHabitIds: Array.from(waterHabitIds),
    readingHabitIds: Array.from(readingHabitIds)
  };
}

/**
 * Checks if water goal was consumed/reached for a specific date
 */
export function isWaterGoalMetForDate(dateKey: string): boolean {
  try {
    const rawWater = localStorage.getItem('ratbod_water_tracker_data') || localStorage.getItem('ratool_water_tracker_data');
    if (!rawWater) return false;
    const parsed = JSON.parse(rawWater);
    
    const goalGlasses = Number(parsed.goalGlasses) || 12;
    const glassVolumeMl = Number(parsed.glassVolumeMl) || 250;
    const goalMl = goalGlasses * glassVolumeMl;
    if (goalMl <= 0) return false;

    const localToday = getLocalDateString();
    const dhakaToday = getDhakaLogicalDateKey().dateKey;

    // Check today's live entries if matching dateKey or today
    if (
      parsed.todayDate === dateKey ||
      (dateKey === localToday && parsed.todayDate === localToday) ||
      (dateKey === dhakaToday && (parsed.todayDate === localToday || parsed.todayDate === dhakaToday))
    ) {
      if (Array.isArray(parsed.todayEntries)) {
        const todayTotal = parsed.todayEntries.reduce((acc: number, cur: any) => acc + (Number(cur?.amountMl) || 0), 0);
        if (todayTotal >= goalMl) return true;
      }
    }

    // Check history logs for the date
    if (Array.isArray(parsed.history)) {
      const dayHist = parsed.history.find((h: any) => h.date === dateKey);
      if (dayHist && dayHist.consumedMl && dayHist.goalMl) {
        if (Number(dayHist.consumedMl) >= Number(dayHist.goalMl)) return true;
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return false;
}

/**
 * Checks if a reading session was logged for a specific date
 */
export function isReadingLoggedForDate(dateKey: string): boolean {
  try {
    const rawReading = localStorage.getItem('ratbod_reading_records') || localStorage.getItem('ratool_reading_records');
    if (!rawReading) return false;
    const records = JSON.parse(rawReading);
    if (!Array.isArray(records)) return false;

    return records.some((r: any) => {
      if (r.date === dateKey) {
        const pages = Number(r.pages) || 0;
        const minutes = Number(r.minutes) || 0;
        return pages > 0 || minutes > 0;
      }
      return false;
    });
  } catch (e) {
    // Ignore storage parse error
  }
  return false;
}

/**
 * Directly marks the "Drink Mineral Water" habit as ticked/completed.
 * Covers target date or current Dhaka logical today.
 */
export function markWaterHabitCompleted(targetDate?: string): void {
  try {
    const savedLogs = localStorage.getItem('ratool_habit_logs_v1') || localStorage.getItem('ratbod_habit_logs_v1');
    let logs: Record<string, string[]> = {};
    if (savedLogs) {
      try {
        logs = JSON.parse(savedLogs) || {};
      } catch (e) {}
    }

    const { waterHabitIds } = findMatchingHabitIds();
    const dKey = targetDate || getDhakaLogicalDateKey().dateKey;

    let changed = false;
    const currentList = logs[dKey] || [];
    const toAdd = waterHabitIds.filter(id => !currentList.includes(id));
    if (toAdd.length > 0) {
      logs[dKey] = [...currentList, ...toAdd];
      changed = true;
    }

    if (changed) {
      const json = JSON.stringify(logs);
      localStorage.setItem('ratool_habit_logs_v1', json);
      localStorage.setItem('ratbod_habit_logs_v1', json);

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'), { completedLogs: logs }, { merge: true }).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('ratbod_habit_logs_updated', { detail: { completedLogs: logs } }));
    }
  } catch (e) {
    console.error('Error marking water habit completed:', e);
  }
}

/**
 * Directly marks the "Read a Book" habit as ticked/completed for a reading session.
 * Ticked strictly on that particular date only when a log is entered for that date!
 */
export function markReadingHabitCompleted(targetDate?: string): void {
  try {
    const savedLogs = localStorage.getItem('ratool_habit_logs_v1') || localStorage.getItem('ratbod_habit_logs_v1');
    let logs: Record<string, string[]> = {};
    if (savedLogs) {
      try {
        logs = JSON.parse(savedLogs) || {};
      } catch (e) {}
    }

    const { readingHabitIds } = findMatchingHabitIds();
    // Only mark that particular date!
    const dateKeyToMark = targetDate || getDhakaLogicalDateKey().dateKey;

    let changed = false;
    const currentList = logs[dateKeyToMark] || [];
    const toAdd = readingHabitIds.filter(id => !currentList.includes(id));
    if (toAdd.length > 0) {
      logs[dateKeyToMark] = [...currentList, ...toAdd];
      changed = true;
    }

    if (changed) {
      const json = JSON.stringify(logs);
      localStorage.setItem('ratool_habit_logs_v1', json);
      localStorage.setItem('ratbod_habit_logs_v1', json);

      const user = auth.currentUser;
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'), { completedLogs: logs }, { merge: true }).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent('ratbod_habit_logs_updated', { detail: { completedLogs: logs } }));
    }
  } catch (e) {
    console.error('Error marking reading habit completed:', e);
  }
}

/**
 * Scans Water & Reading logs and automatically ensures:
 * 1. "Drink Mineral Water" habit is ticked on any day the targeted water goal is met
 * 2. "Read a Book" habit is ticked on that particular date ONLY if a reading book log exists for that date!
 *    When date changes or no reading log exists for a date, it is NOT ticked!
 */
export function syncHabitsWithTrackers(currentLogs?: Record<string, string[]>): HabitSyncResult {
  try {
    // 1. Get current habit logs
    let logs: Record<string, string[]> = {};
    if (currentLogs) {
      logs = { ...currentLogs };
    } else {
      const savedLogs = localStorage.getItem('ratool_habit_logs_v1') || localStorage.getItem('ratbod_habit_logs_v1');
      if (savedLogs) {
        try {
          logs = JSON.parse(savedLogs) || {};
        } catch (e) {
          logs = {};
        }
      }
    }

    // 2. Identify Water Habit IDs and Reading Habit IDs
    const { waterHabitIds, readingHabitIds } = findMatchingHabitIds();
    let changed = false;

    const dhakaToday = getDhakaLogicalDateKey().dateKey;

    // 3. Scan Water tracker data
    const rawWater = localStorage.getItem('ratbod_water_tracker_data') || localStorage.getItem('ratool_water_tracker_data');
    if (rawWater) {
      try {
        const parsed = JSON.parse(rawWater);
        const goalGlasses = Number(parsed.goalGlasses) || 12;
        const glassVolumeMl = Number(parsed.glassVolumeMl) || 250;
        const goalMl = goalGlasses * glassVolumeMl;

        if (goalMl > 0) {
          // Check today's entries
          if (parsed.todayDate && Array.isArray(parsed.todayEntries)) {
            const todayTotal = parsed.todayEntries.reduce((acc: number, cur: any) => acc + (Number(cur?.amountMl) || 0), 0);
            if (todayTotal >= goalMl) {
              const currentList = logs[parsed.todayDate] || [];
              const toAdd = waterHabitIds.filter(id => !currentList.includes(id));
              if (toAdd.length > 0) {
                logs[parsed.todayDate] = [...currentList, ...toAdd];
                changed = true;
              }
            }
          }

          // Check history entries
          if (Array.isArray(parsed.history)) {
            parsed.history.forEach((h: any) => {
              if (h && h.date && Number(h.consumedMl) >= Number(h.goalMl) && Number(h.goalMl) > 0) {
                const currentList = logs[h.date] || [];
                const toAdd = waterHabitIds.filter(id => !currentList.includes(id));
                if (toAdd.length > 0) {
                  logs[h.date] = [...currentList, ...toAdd];
                  changed = true;
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    // 4. Scan Reading tracker records
    // Logic: Read a book habit is ticked on that particular date ONLY when a reading book log exists for that date!
    const rawReading = localStorage.getItem('ratbod_reading_records') || localStorage.getItem('ratool_reading_records');
    const datesWithReading = new Set<string>();
    if (rawReading) {
      try {
        const records = JSON.parse(rawReading);
        if (Array.isArray(records)) {
          records.forEach((r: any) => {
            if (r && r.date && ((Number(r.pages) || 0) > 0 || (Number(r.minutes) || 0) > 0)) {
              datesWithReading.add(r.date);
            }
          });
        }
      } catch (e) {}
    }

    // Ensure reading habit is ticked on dates that actually have reading logged
    datesWithReading.forEach((dKey) => {
      const currentList = logs[dKey] || [];
      const toAdd = readingHabitIds.filter(id => !currentList.includes(id));
      if (toAdd.length > 0) {
        logs[dKey] = [...currentList, ...toAdd];
        changed = true;
      }
    });

    // Remove reading habit from dates that DO NOT have any reading records logged
    // (Prevents auto-ticking on date change or rollover when no reading has taken place yet)
    Object.keys(logs).forEach((dKey) => {
      if (!datesWithReading.has(dKey)) {
        const currentList = logs[dKey] || [];
        const filtered = currentList.filter(id => !readingHabitIds.includes(id));
        if (filtered.length !== currentList.length) {
          logs[dKey] = filtered;
          changed = true;
        }
      }
    });

    // 5. Persist if changes occurred
    if (changed) {
      try {
        const json = JSON.stringify(logs);
        localStorage.setItem('ratool_habit_logs_v1', json);
        localStorage.setItem('ratbod_habit_logs_v1', json);
        
        const user = auth.currentUser;
        if (user) {
          setDoc(doc(db, 'users', user.uid, 'appData', 'habitLogs'), { completedLogs: logs }, { merge: true }).catch(() => {});
        }

        window.dispatchEvent(new CustomEvent('ratbod_habit_logs_updated', { detail: { completedLogs: logs } }));
      } catch (e) {}
    }

    return { updatedLogs: logs, changed };
  } catch (e) {
    return { updatedLogs: currentLogs || {}, changed: false };
  }
}
