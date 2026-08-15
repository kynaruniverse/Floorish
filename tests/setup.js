// Polyfills `indexedDB` globally so src/lib/stores/db.js (and anything
// built on it) works under vitest's jsdom environment exactly as it
// would in a real browser.
import 'fake-indexeddb/auto';
