import { 
  signInWithPopup, 
  signInWithRedirect, 
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Robust Google Sign-in that handles mobile browsers, popups, and redirect flows.
 * On mobile devices or when popups are blocked by Safari/Chrome, falls back to redirect.
 */
export async function loginWithGoogle(forceRedirect: boolean = false): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                   (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window);
  
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // On mobile browsers when NOT in an iframe, or when forceRedirect is specified:
  // Use redirect mode to avoid mobile popup blockers and tab-switch communication drops.
  if ((isMobile && !isInIframe) || forceRedirect) {
    try {
      sessionStorage.setItem('ratbod_auth_in_progress', 'google_redirect');
    } catch {}
    await signInWithRedirect(auth, provider);
    return null;
  }

  // Inside iframe (e.g. preview environment) or desktop browsers:
  try {
    try {
      sessionStorage.setItem('ratbod_auth_in_progress', 'google_popup');
    } catch {}
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    try {
      sessionStorage.removeItem('ratbod_auth_in_progress');
    } catch {}
    return result.user;
  } catch (err: any) {
    // If popup was blocked or closed on mobile, fall back to redirect if top frame
    const isPopupIssue = 
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.code === 'auth/operation-not-supported-in-this-environment';

    if (isPopupIssue && !isInIframe) {
      console.warn('Popup failed or blocked; falling back to direct redirect sign-in...', err?.code);
      try {
        sessionStorage.setItem('ratbod_auth_in_progress', 'google_redirect');
      } catch {}
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      sessionStorage.removeItem('ratbod_auth_in_progress');
    } catch {}
    throw err;
  }
}
