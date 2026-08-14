import { openDB } from 'idb';

// Single shared database for the whole app. Previously homes.js and
// inventory.js each opened 'floorish-db' with DIFFERENT version numbers
// (1 vs 2) — IndexedDB throws a VersionError if a store requests a lower
// version than the database already has, so whichever store initialized
// second would start silently failing. One shared connection + one
// upgrade() covering every object store avoids that entirely.

const DB_NAME = 'floorish-db';
const DB_VERSION = 2;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('homes')) {
          const homesStore = db.createObjectStore('homes', { keyPath: 'id' });
          homesStore.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('category', 'category');
          inventoryStore.createIndex('createdAt', 'createdAt');
        }
      }
    });
  }
  return dbPromise;
}
