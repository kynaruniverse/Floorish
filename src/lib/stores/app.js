import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// ============ TOASTS ============
export const toasts = writable([]);

let toastId = 0;
const MAX_TOASTS = 4;
const timers = new Map();

/**
 * Add a toast notification
 * @param {string} message - Text to display
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - Milliseconds (0 = persistent, no auto-dismiss)
 * @param {string} action - Optional action button text
 * @param {Function} onAction - Callback when action is clicked
 * @returns {number} Toast ID
 */
export function addToast(message, type = 'info', duration = 3000, action = null, onAction = null) {
  const id = ++toastId;
  
  toasts.update(t => {
    // Remove oldest if exceeding max
    let updated = [...t];
    if (updated.length >= MAX_TOASTS) {
      const removed = updated.shift();
      clearTimer(removed?.id);
    }
    return [...updated, { id, message, type, duration, action, onAction }];
  });
  
  // Auto-dismiss if duration > 0
  if (duration > 0) {
    const timer = setTimeout(() => removeToast(id), duration);
    timers.set(id, timer);
  }
  
  return id;
}

/**
 * Remove a toast by ID
 */
export function removeToast(id) {
  clearTimer(id);
  toasts.update(t => t.filter(toast => toast.id !== id));
}

/**
 * Remove all toasts
 */
export function clearToasts() {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  toasts.set([]);
}

function clearTimer(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
}

// Convenience toast methods
export const toast = {
  success: (message, duration = 3000) => addToast(message, 'success', duration),
  error: (message, duration = 4000) => addToast(message, 'error', duration),
  info: (message, duration = 3000) => addToast(message, 'info', duration),
  warning: (message, duration = 3500) => addToast(message, 'warning', duration),
  action: (message, actionText, onAction, duration = 5000) => 
    addToast(message, 'info', duration, actionText, onAction)
};

// ============ CONNECTIVITY ============
export const isOnline = writable(true);

// Auto-detect online/offline if in browser
if (browser) {
  isOnline.set(navigator.onLine);
  
  window.addEventListener('online', () => isOnline.set(true));
  window.addEventListener('offline', () => {
    isOnline.set(false);
    toast.warning('You are offline. Changes save locally.');
  });
}

// ============ APP STATE ============
export const isAppInstalled = writable(false);
export const isLoading = writable(false);
export const isFirstVisit = writable(false);

// Check if app is installed (PWA)
if (browser) {
  // Check if running in standalone mode
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  
  isAppInstalled.set(isStandalone);
  
  // Check first visit
  const visited = localStorage.getItem('floorish-visited');
  isFirstVisit.set(!visited);
}

/**
 * Mark app as visited
 */
export function markVisited() {
  if (browser) {
    localStorage.setItem('floorish-visited', 'true');
    isFirstVisit.set(false);
  }
}

// ============ SETTINGS ============
export const settings = writable({
  units: 'metric',           // metric | imperial
  defaultCeilingHeight: 2.4, // meters
  graphicsQuality: 'auto',   // auto | low | medium | high
  hapticFeedback: true,
  soundEffects: false
});

// Load saved settings
if (browser) {
  const saved = localStorage.getItem('floorish-settings');
  if (saved) {
    try {
      settings.set({ ...settings, ...JSON.parse(saved) });
    } catch {
      // Invalid JSON, ignore
    }
  }
}

/**
 * Update settings and persist
 */
export function updateSettings(changes) {
  settings.update(current => {
    const updated = { ...current, ...changes };
    if (browser) {
      localStorage.setItem('floorish-settings', JSON.stringify(updated));
    }
    return updated;
  });
}

// ============ DERIVED ============
// Any active toasts?
export const hasToasts = derived(toasts, $toasts => $toasts.length > 0);

// Toast count
export const toastCount = derived(toasts, $toasts => $toasts.length);