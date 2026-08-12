import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock browser APIs
global.navigator = {
  ...global.navigator,
  xr: undefined,
  mediaDevices: {
    getUserMedia: vi.fn().mockRejectedValue(new Error('Not implemented'))
  }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock PointerLock
global.document.exitPointerLock = vi.fn();
global.document.pointerLockElement = null;