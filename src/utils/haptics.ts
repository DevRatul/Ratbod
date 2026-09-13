/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HapticType = 'notch' | 'light' | 'medium' | 'heavy' | 'selection';

let lastHapticTime = 0;
let audioCtx: AudioContext | null = null;

/**
 * Produces an ultra-short, subtle tactile tick using Web Audio
 * as a companion/fallback on devices where navigator.vibrate is restricted (e.g. desktop/iOS Safari)
 */
function playTactileTick(pitch = 1400, gainLevel = 0.02) {
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

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.012);
  } catch {
    // Gracefully ignore audio context errors
  }
}

/**
 * Triggers haptic vibration feedback with physical vibration motor and sensory audio fallback
 */
export function triggerHaptic(type: HapticType = 'light', force = false) {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  // Throttle rapid vibrations so they feel discrete like gear notches
  if (!force && now - lastHapticTime < 24) {
    return;
  }
  lastHapticTime = now;

  let vibrationMs = 8;
  let clickPitch = 1400;
  let clickGain = 0.025;

  switch (type) {
    case 'notch':
      vibrationMs = 7;
      clickPitch = 1500;
      clickGain = 0.02;
      break;
    case 'light':
      vibrationMs = 10;
      clickPitch = 1300;
      clickGain = 0.03;
      break;
    case 'selection':
      vibrationMs = 12;
      clickPitch = 1200;
      clickGain = 0.035;
      break;
    case 'medium':
      vibrationMs = 20;
      clickPitch = 900;
      clickGain = 0.05;
      break;
    case 'heavy':
      vibrationMs = 30;
      clickPitch = 700;
      clickGain = 0.06;
      break;
  }

  // 1. Primary: Vibration motor via navigator.vibrate
  let vibrated = false;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      vibrated = navigator.vibrate(vibrationMs);
    } catch {
      vibrated = false;
    }
  }

  // 2. Secondary fallback / tactile tick:
  // If the browser doesn't support physical vibration (desktop or iOS Safari),
  // play a subtle, crisp tactile tick so the feedback is still sensed.
  if (!vibrated) {
    playTactileTick(clickPitch, clickGain);
  }
}
