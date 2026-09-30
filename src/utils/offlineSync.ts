/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getDhakaLogicalDateKey } from './sunsetDate';

export type SyncCollectionKey = 
  | 'waterTracker'
  | 'habits'
  | 'habitLogs'
  | 'salahTracker'
  | 'sleepTracker'
  | 'stepsTracker'
  | 'readingTracker'
  | 'grocery'
  | 'goals'
  | 'history'
  | 'breathing';

const PENDING_KEYS_STORAGE_KEY = 'ratbod_offline_pending_keys';
const PENDING_PREFIX = 'ratbod_pending_data_';
const HAS_UNSYNCED_OFFLINE_DATA_KEY = 'ratbod_has_unsynced_offline_data';

/**
 * Returns whether the device currently has network connectivity.
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Marks that new offline data was saved locally and needs to be pushed to cloud upon reconnect.
 */
export function markHasUnsyncedOfflineData(): void {
  try {
    localStorage.setItem(HAS_UNSYNCED_OFFLINE_DATA_KEY, 'true');
  } catch {}
}

/**
 * Clears the unsynced offline data indicator.
 */
export function clearHasUnsyncedOfflineData(): void {
  try {
    localStorage.removeItem(HAS_UNSYNCED_OFFLINE_DATA_KEY);
  } catch {}
}

/**
 * Returns whether there is offline data waiting to be pushed on reconnect.
 */
export function hasUnsyncedOfflineData(): boolean {
  try {
    return localStorage.getItem(HAS_UNSYNCED_OFFLINE_DATA_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Subscribe to online/offline network changes.
 */
export function subscribeNetworkStatus(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Gets the set of pending collection keys waiting for cloud sync.
 */
export function getPendingOfflineKeys(): SyncCollectionKey[] {
  try {
    const raw = localStorage.getItem(PENDING_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific section has pending offline changes.
 */
export function hasPendingOfflineChange(key: SyncCollectionKey): boolean {
  const keys = getPendingOfflineKeys();
  return keys.includes(key);
}

/**
 * Records an offline change for a specific section.
 * If offline, marks offline pending flag. If online and authenticated, attempts immediate push.
 */
export function recordOfflineChange(key: SyncCollectionKey, data: any): void {
  const isCurrentlyOnline = isOnline();
  const createdOffline = !isCurrentlyOnline;

  try {
    const keys = new Set(getPendingOfflineKeys());
    keys.add(key);
    localStorage.setItem(PENDING_KEYS_STORAGE_KEY, JSON.stringify(Array.from(keys)));
    localStorage.setItem(`${PENDING_PREFIX}${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
      createdOffline
    }));

    if (createdOffline) {
      markHasUnsyncedOfflineData();
    }
  } catch (e) {
    console.warn(`[OfflineSync] Failed to queue pending change for ${key}:`, e);
  }

  // If currently online and user is authenticated, trigger background push
  // (Pass false so standard online writes do not trigger the offline recovery pop)
  if (isCurrentlyOnline && auth.currentUser) {
    syncPendingOfflineData(false).catch((err) => {
      // If immediate push failed due to network issues, mark as offline data
      markHasUnsyncedOfflineData();
      console.warn(`[OfflineSync] Background push for ${key} deferred:`, err);
    });
  }
}

/**
 * Clears pending sync flag for a specific collection key.
 */
export function clearPendingOfflineChange(key: SyncCollectionKey): void {
  try {
    const keys = new Set(getPendingOfflineKeys());
    keys.delete(key);
    const remaining = Array.from(keys);
    localStorage.setItem(PENDING_KEYS_STORAGE_KEY, JSON.stringify(remaining));
    localStorage.removeItem(`${PENDING_PREFIX}${key}`);
    if (remaining.length === 0) {
      clearHasUnsyncedOfflineData();
    }
  } catch (e) {}
}

/**
 * Deduplicates and sorts water entries by timestamp/id (newest first).
 */
function mergeWaterEntries(localEntries: any[] = [], remoteEntries: any[] = []): any[] {
  let deletedSet = new Set<string>();
  try {
    const rawDel = localStorage.getItem('ratbod_water_deleted_entry_ids');
    if (rawDel) deletedSet = new Set(JSON.parse(rawDel));
  } catch {}

  const map = new Map<string, any>();

  // Add remote entries first (ignoring deleted/undone)
  remoteEntries.forEach((entry) => {
    if (entry && (entry.id || entry.createdAt)) {
      const idKey = String(entry.id || entry.createdAt);
      if (!deletedSet.has(idKey)) {
        map.set(idKey, entry);
      }
    }
  });

  // Add local entries (preserves additions and updates, ignoring deleted/undone)
  localEntries.forEach((entry) => {
    if (entry && (entry.id || entry.createdAt)) {
      const idKey = String(entry.id || entry.createdAt);
      if (!deletedSet.has(idKey)) {
        map.set(idKey, entry);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = Number(a.createdAt || a.id) || 0;
    const timeB = Number(b.createdAt || b.id) || 0;
    return timeB - timeA;
  });
}

/**
 * Merges historical day intake logs without data loss.
 */
function mergeWaterHistory(localHistory: any[] = [], remoteHistory: any[] = []): any[] {
  const map = new Map<string, any>();

  remoteHistory.forEach((item) => {
    if (item && item.date) {
      map.set(item.date, { ...item });
    }
  });

  localHistory.forEach((item) => {
    if (item && item.date) {
      const existing = map.get(item.date);
      if (!existing) {
        map.set(item.date, { ...item });
      } else {
        // Keep the higher consumed amount and latest goal
        map.set(item.date, {
          date: item.date,
          consumedMl: Math.max(Number(existing.consumedMl) || 0, Number(item.consumedMl) || 0),
          goalMl: Number(item.goalMl) || Number(existing.goalMl) || 3000
        });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)).slice(0, 60);
}

/**
 * Main synchronization engine: pushes local offline modifications to Firestore
 * and merges with online cloud data without overwriting or losing records.
 */
let isSyncInProgress = false;

export async function syncPendingOfflineData(isOnlineReconnect: boolean = false): Promise<boolean> {
  if (isSyncInProgress || !isOnline()) return false;
  const user = auth.currentUser;
  if (!user) return false;

  const pendingKeys = getPendingOfflineKeys();
  if (pendingKeys.length === 0) {
    clearHasUnsyncedOfflineData();
    return false;
  }

  // Determine if there is genuine offline-originated data waiting to be pushed
  let hadOfflineData = hasUnsyncedOfflineData();
  if (!hadOfflineData) {
    hadOfflineData = pendingKeys.some((k) => {
      try {
        const raw = localStorage.getItem(`${PENDING_PREFIX}${k}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Boolean(parsed.createdOffline);
        }
      } catch {}
      return false;
    });
  }

  isSyncInProgress = true;
  let hasSyncedAny = false;

  try {
    for (const key of pendingKeys) {
      const rawStored = localStorage.getItem(`${PENDING_PREFIX}${key}`);
      if (!rawStored) {
        clearPendingOfflineChange(key);
        continue;
      }

      let parsedPayload: any = null;
      try {
        parsedPayload = JSON.parse(rawStored);
      } catch {
        clearPendingOfflineChange(key);
        continue;
      }

      const localData = parsedPayload?.data;
      if (!localData) {
        clearPendingOfflineChange(key);
        continue;
      }

      const docRef = doc(db, 'users', user.uid, 'appData', key);

      // SECTION-SPECIFIC MERGE & PUSH LOGIC
      if (key === 'waterTracker') {
        try {
          const snap = await getDoc(docRef);
          let mergedPayload = { ...localData };

          if (snap.exists()) {
            const remoteData = snap.data();
            const currentToday = getDhakaLogicalDateKey().dateKey;

            // Merge today's entries: Combine both offline entries and remote entries
            const isLocalToday = localData.todayDate === currentToday;
            const isRemoteToday = remoteData.todayDate === currentToday;

            let finalEntries: any[] = [];
            if (isLocalToday && isRemoteToday) {
              const localTime = Number(localData.updatedAt) || 0;
              const remoteTime = Number(remoteData.updatedAt) || 0;
              if (localTime >= remoteTime) {
                // Local state is newer, use local entries (preserves undos and deletes)
                let deletedSet = new Set<string>();
                try {
                  const rawDel = localStorage.getItem('ratbod_water_deleted_entry_ids');
                  if (rawDel) deletedSet = new Set(JSON.parse(rawDel));
                } catch {}
                finalEntries = (localData.todayEntries || []).filter((e: any) => e && e.id && !deletedSet.has(String(e.id)));
              } else {
                finalEntries = mergeWaterEntries(localData.todayEntries || [], remoteData.todayEntries || []);
              }
            } else if (isLocalToday) {
              finalEntries = localData.todayEntries || [];
            } else if (isRemoteToday) {
              finalEntries = remoteData.todayEntries || [];
            }

            // Merge history: Keep union of all recorded days
            const finalHistory = mergeWaterHistory(localData.history || [], remoteData.history || []);

            mergedPayload = {
              goalGlasses: localData.goalGlasses || remoteData.goalGlasses || 12,
              glassVolumeMl: localData.glassVolumeMl || remoteData.glassVolumeMl || 250,
              todayEntries: finalEntries,
              todayDate: currentToday,
              history: finalHistory,
              reminderActive: localData.reminderActive !== undefined ? localData.reminderActive : remoteData.reminderActive,
              alertIntervalMinutes: localData.alertIntervalMinutes || remoteData.alertIntervalMinutes || 50,
              isAlertEnabled: localData.isAlertEnabled !== undefined ? localData.isAlertEnabled : remoteData.isAlertEnabled,
              updatedAt: Date.now()
            };
          }

          // Push merged data to Firestore cloud database
          await setDoc(docRef, mergedPayload, { merge: true });

          // Update local cache with merged state
          try {
            localStorage.setItem('ratbod_water_tracker_data', JSON.stringify(mergedPayload));
            localStorage.setItem('ratool_water_tracker_data', JSON.stringify(mergedPayload));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          // Notify WaterTracker component to re-render with merged data
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_water_sync', { detail: mergedPayload }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing waterTracker:', err);
        }
      } 
      else if (key === 'habitLogs') {
        try {
          const snap = await getDoc(docRef);
          let mergedLogs: Record<string, string[]> = { ...(localData.completedLogs || {}) };

          if (snap.exists() && snap.data().completedLogs) {
            const remoteLogs = snap.data().completedLogs;
            const remoteTime = Number(snap.data().updatedAt) || 0;
            const localTime = Number(localData.updatedAt) || 0;
            if (remoteTime > localTime) {
              mergedLogs = remoteLogs;
            } else {
              // Local changes are newer (preserves habit un-checking/unticking)
              mergedLogs = localData.completedLogs || {};
            }
          }

          const payload = { completedLogs: mergedLogs, updatedAt: Date.now() };
          await setDoc(docRef, payload, { merge: true });

          try {
            localStorage.setItem('ratool_habit_logs_v1', JSON.stringify(mergedLogs));
            localStorage.setItem('ratbod_habit_logs_v1', JSON.stringify(mergedLogs));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_habits_sync', { detail: { completedLogs: mergedLogs } }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing habitLogs:', err);
        }
      }
      else if (key === 'habits') {
        try {
          const snap = await getDoc(docRef);
          let finalHabits = localData.habits || [];

          if (snap.exists() && Array.isArray(snap.data().habits)) {
            const remoteHabits = snap.data().habits;
            // Ensure no custom user habits created offline are lost
            const localMap = new Map(finalHabits.map((h: any) => [h.id, h]));
            remoteHabits.forEach((rh: any) => {
              if (!localMap.has(rh.id)) {
                finalHabits.push(rh);
              }
            });
          }

          const payload = { habits: finalHabits, updatedAt: Date.now() };
          await setDoc(docRef, payload, { merge: true });

          try {
            localStorage.setItem('ratool_habits_v1', JSON.stringify(finalHabits));
            localStorage.setItem('ratbod_habits_v1', JSON.stringify(finalHabits));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_habits_sync', { detail: { habits: finalHabits } }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing habits:', err);
        }
      }
      else if (key === 'salahTracker') {
        try {
          const snap = await getDoc(docRef);
          let mergedMap = { ...(localData.recordsMap || {}) };

          if (snap.exists() && snap.data().recordsMap) {
            const remoteMap = snap.data().recordsMap;
            Object.keys(remoteMap).forEach((dKey) => {
              mergedMap[dKey] = { ...(remoteMap[dKey] || {}), ...(mergedMap[dKey] || {}) };
            });
          }

          const payload = { 
            ...localData, 
            recordsMap: mergedMap, 
            updatedAt: Date.now() 
          };
          await setDoc(docRef, payload, { merge: true });

          try {
            localStorage.setItem('ratbod_salah_records_map', JSON.stringify(mergedMap));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_salah_sync', { detail: payload }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing salahTracker:', err);
        }
      }
      else if (key === 'sleepTracker') {
        try {
          const snap = await getDoc(docRef);
          let mergedRecords = [...(localData.sleepRecords || [])];

          if (snap.exists() && Array.isArray(snap.data().sleepRecords)) {
            const remote = snap.data().sleepRecords;
            const seen = new Set(mergedRecords.map((r: any) => r.id || `${r.date}_${r.bedTime}`));
            remote.forEach((r: any) => {
              const rKey = r.id || `${r.date}_${r.bedTime}`;
              if (!seen.has(rKey)) {
                mergedRecords.push(r);
                seen.add(rKey);
              }
            });
          }

          const payload = {
            ...localData,
            sleepRecords: mergedRecords,
            updatedAt: Date.now()
          };
          await setDoc(docRef, payload, { merge: true });

          try {
            localStorage.setItem('ratbod_sleep_records', JSON.stringify(mergedRecords));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_sleep_sync', { detail: payload }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing sleepTracker:', err);
        }
      }
      else if (key === 'stepsTracker') {
        try {
          const snap = await getDoc(docRef);
          let mergedRecords = [...(localData.records || [])];
          let finalSteps = localData.todaySteps || 0;

          if (snap.exists()) {
            const rData = snap.data();
            if (Array.isArray(rData.records)) {
              const seen = new Set(mergedRecords.map((r: any) => r.date));
              rData.records.forEach((r: any) => {
                if (!seen.has(r.date)) {
                  mergedRecords.push(r);
                  seen.add(r.date);
                }
              });
            }
            if (rData.todayDate === localData.todayDate && typeof rData.todaySteps === 'number') {
              finalSteps = Math.max(finalSteps, rData.todaySteps);
            }
          }

          const payload = {
            ...localData,
            todaySteps: finalSteps,
            records: mergedRecords,
            updatedAt: Date.now()
          };
          await setDoc(docRef, payload, { merge: true });

          try {
            localStorage.setItem('ratbod_steps_today', String(finalSteps));
            localStorage.setItem('ratbod_steps_records', JSON.stringify(mergedRecords));
          } catch {}

          clearPendingOfflineChange(key);
          hasSyncedAny = true;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratbod_steps_sync', { detail: payload }));
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing stepsTracker:', err);
        }
      }
      else {
        // Generic fallback sync for grocery, goals, history, etc.
        try {
          await setDoc(docRef, { ...localData, updatedAt: Date.now() }, { merge: true });
          clearPendingOfflineChange(key);
          hasSyncedAny = true;
        } catch (err) {
          console.error(`[OfflineSync] Error syncing ${key}:`, err);
        }
      }
    }

    // 'Updated' pop message only appears when a new offline data saves for the first time
    // after establishing an online connection!
    if (hasSyncedAny && (hadOfflineData || isOnlineReconnect)) {
      clearHasUnsyncedOfflineData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ratbod_offline_sync_success'));
      }
    }
  } finally {
    isSyncInProgress = false;
  }

  return hasSyncedAny;
}

/**
 * Initializes automatic background listeners for offline/online transitions.
 */
export function initOfflineSyncManager(): () => void {
  if (typeof window === 'undefined') return () => {};

  let wasOffline = !isOnline();

  const handleOnline = () => {
    // When coming back online, push any offline pending data
    const cameFromOffline = wasOffline || !isOnline();
    wasOffline = false;

    setTimeout(() => {
      if (isOnline() && auth.currentUser) {
        syncPendingOfflineData(cameFromOffline).catch(() => {});
      }
    }, 600);
  };

  const handleOffline = () => {
    wasOffline = true;
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && isOnline() && auth.currentUser) {
      if (hasUnsyncedOfflineData() && getPendingOfflineKeys().length > 0) {
        syncPendingOfflineData(true).catch(() => {});
      }
    }
  };

  // Heartbeat interval to check pending sync when connected
  const intervalId = setInterval(() => {
    if (isOnline() && auth.currentUser && getPendingOfflineKeys().length > 0) {
      const isOfflineData = hasUnsyncedOfflineData();
      syncPendingOfflineData(isOfflineData).catch(() => {});
    }
  }, 20000);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibility);

  // Initial check on load: If user opened the app online, but has pending offline data from an earlier offline session
  if (isOnline() && auth.currentUser) {
    if (hasUnsyncedOfflineData() && getPendingOfflineKeys().length > 0) {
      setTimeout(() => {
        syncPendingOfflineData(true).catch(() => {});
      }, 1500);
    }
  }

  // Also listen for auth state change in case auth becomes active shortly after load
  const unsubAuth = auth.onAuthStateChanged((u) => {
    if (u && isOnline() && hasUnsyncedOfflineData() && getPendingOfflineKeys().length > 0) {
      setTimeout(() => {
        syncPendingOfflineData(true).catch(() => {});
      }, 1000);
    }
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibility);
    clearInterval(intervalId);
    unsubAuth();
  };
}
