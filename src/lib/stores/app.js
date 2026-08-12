import { writable } from 'svelte/store';

export const toasts = writable([]);
let toastId = 0;

export function addToast(message, type = 'info', duration = 3000) {
  const id = ++toastId;
  toasts.update(t => [...t, { id, message, type, duration }]);
  setTimeout(() => removeToast(id), duration);
}

export function removeToast(id) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export const isOnline = writable(true);
export const isAppInstalled = writable(false);
export const currentRoute = writable('/');