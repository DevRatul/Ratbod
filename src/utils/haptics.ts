/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HapticType = 'notch' | 'light' | 'medium' | 'heavy' | 'selection';

let lastHapticTime = 0;
let audioCtx: AudioContext | null = null;

/**
 * Pre-warms or resumes the AudioContext on an explicit user gesture (e.g. pointerdown/touchstart)
 * to bypass autoplay policies on mobile Safari (iOS) and modern browsers.
 */
export function initHapticAudio() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // Ignore audio context initializations errors
  }
}

/**
 * Produces an ultra-short, crisp mechanical clock/rotary detent tick using Web Audio.
 * Mimics high-end mechanical timepiece rotaries and Apple Watch crown haptics.
 */
function playTactileTick(pitch = 1800, gainLevel = 0.04) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Fast high-pitch click impulse
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, now + 0.015);

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.016);
  } catch {
    // Gracefully ignore audio context errors
  }
}

/**
 * Triggers sensory haptic feedback:
 * 1. Physical vibration motor via navigator.vibrate with tuned millisecond pulses
 * 2. Synchronized crisp mechanical dial tick for multisensory tactile confirmation
 */
export function triggerHaptic(type: HapticType = 'light', force = false) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  // Throttle rapid vibrations so they feel discrete like mechanical gear notches
  if (!force && now - lastHapticTime < 24) {
    return;
  }
  lastHapticTime = now;

  let vibrationPattern: number | number[] = 22;
  let clickPitch = 1800;
  let clickGain = 0.035;

  switch (type) {
    case 'notch':
      // Distinct gear notch tick for every 5-minute rotational step
      vibrationPattern = 22;
      clickPitch = 2100;
      clickGain = 0.03;
      break;
    case 'light':
      // Releasing dial or slight adjustment
      vibrationPattern = 28;
      clickPitch = 1700;
      clickGain = 0.035;
      break;
    case 'selection':
      // Grabbing a knob or tapping preset
      vibrationPattern = 35;
      clickPitch = 1450;
      clickGain = 0.045;
      break;
    case 'medium':
      // Hour mark crossing or AM/PM flip
      vibrationPattern = [30, 20, 30];
      clickPitch = 1100;
      clickGain = 0.06;
      break;
    case 'heavy':
      // Prime zone snap, save sleep action
      vibrationPattern = [45, 25, 45];
      clickPitch = 850;
      clickGain = 0.08;
      break;
  }

  // 1. Physical vibration motor (Android, Chrome, PWAs)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(vibrationPattern);
    } catch {
      // Ignore vibration permissions or hardware errors
    }
  }

  // 2. Synchronized mechanical tactile tick
  playTactileTick(clickPitch, clickGain);
}
