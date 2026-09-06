import { 
  signInWithPopup, 
  signInWithRedirect, 
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Robust Google Sign-in that uses popup by default on all devices (mobile & desktop).
 * 
 * WHY THIS FIXES THE MOBILE / IPHONE ISSUE:
 * On iOS Safari / mobile browsers, signInWithRedirect causes cross-domain redirection
 * between the application domain (*.run.app) and the Firebase auth domain (*.firebaseapp.com).
 * Apple's WebKit ITP (Intelligent Tracking Prevention) blocks third-party storage/cookie
 * access across domains. As a result, when Safari redirects back to the app, the auth token
 * cannot be retrieved by getRedirectResult(), and the app resets to the unauthenticated homepage.
 * 
 * By using signInWithPopup directly, Safari handles authentication in a native sheet/window
 * and delivers the credential directly to the application via window.postMessage without
 * cross-domain storage partitioning. This allows seamless sign-in on iPhone just like on PC/laptop.
 */
export async function loginWithGoogle(forceRedirect: boolean = false): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  // Only use redirect if explicitly requested
  if (forceRedirect) {
    try {
      sessionStorage.setItem('ratbod_auth_in_progress', 'google_redirect');
    } catch {}
    await signInWithRedirect(auth, provider);
    return null;
  }

  // Use signInWithPopup by default for both mobile (iPhone/iPad/Android) and desktop
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result.user;
  } catch (err: any) {
    console.warn('signInWithPopup caught:', err?.code, err?.message);
    throw err;
  }
}
