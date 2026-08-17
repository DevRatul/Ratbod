import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

/**
 * A custom hook to sync local state with a Firestore document.
 * It will load from Firestore first, fallback to localStorage if no Firestore data or user is offline,
 * and keep them in sync.
 */
export function useFirestoreSync<T>(
  storageKey: string,
  firestorePath: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [data, setData] = useState<T>(() => {
    // Start with local storage
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialValue;
      }
    }
    return initialValue;
  });
  
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Firestore
  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, firestorePath);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setData(docSnap.data().value);
          }
        } catch (e) {
          // Fallback to local storage silently
        }
      }
      setIsLoaded(true);
    };
    load();
  }, [firestorePath]);

  // Save changes
  const setSyncedData = useCallback((val: T | ((prev: T) => T)) => {
    setData((prev) => {
      const newVal = typeof val === 'function' ? (val as Function)(prev) : val;
      
      // Save locally
      localStorage.setItem(storageKey, JSON.stringify(newVal));
      
      // Save to Firestore
      const user = auth.currentUser;
      if (user && isLoaded) {
        const docRef = doc(db, firestorePath);
        setDoc(docRef, {
          value: newVal,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch((e) => {
          console.error(`Failed to sync ${storageKey} to Firestore`);
        });
      }
      
      return newVal;
    });
  }, [firestorePath, storageKey, isLoaded]);

  return [data, setSyncedData, isLoaded];
}
