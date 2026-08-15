import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// ============ TOASTS ============
export const toasts = writable([]);

let toastId = 0;
const MAX_TOASTS = 3;
const timers = new Map();

export function addToast(message, type = 'info', duration = 2500) {
  const id = ++toastId;
  
  toasts.update(t => {
    let updated = [...t];
    if (updated.length >= MAX_TOASTS) {
      const removed = updated.shift();
      clearTimer(removed?.id);
    }
    return [...updated, { id, message, type }];
  });
  
  if (duration > 0) {
    const timer = setTimeout(() => removeToast(id), duration);
    timers.set(id, timer);
  }
  
  return id;
}

export function removeToast(id) {
  clearTimer(id);
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export function clearToasts() {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  toasts.set([]);
}

function clearTimer(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
}

export const toast = {
  success: (msg, duration) => addToast(msg, 'success', duration),
  error: (msg, duration) => addToast(msg, 'error', duration),
  info: (msg, duration) => addToast(msg, 'info', duration)
};

// ============ APP STATE ============
export const isAppInstalled = writable(false);
export const isFirstVisit = writable(false);
export const isOnline = writable(true);

if (browser) {
  // Check if installed
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    /** @type {any} */ (window.navigator).standalone === true; // iOS Safari-only, non-standard
  isAppInstalled.set(isStandalone);
  
  // Check first visit
  const visited = localStorage.getItem('floorish-visited');
  isFirstVisit.set(!visited);
  
  // Online status
  isOnline.set(navigator.onLine);
  window.addEventListener('online', () => isOnline.set(true));
  window.addEventListener('offline', () => isOnline.set(false));
}

export function markVisited() {
  if (browser) {
    localStorage.setItem('floorish-visited', 'true');
    isFirstVisit.set(false);
  }
}