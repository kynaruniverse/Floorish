import { writable, derived } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'floorish-db';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('homes')) {
        const homesStore = db.createObjectStore('homes', { keyPath: 'id' });
        homesStore.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('rooms')) {
        const roomsStore = db.createObjectStore('rooms', { keyPath: 'id' });
        roomsStore.createIndex('homeId', 'homeId');
      }
    }
  });
}

function createHomesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    async load() {
      const db = await getDB();
      const homes = await db.getAll('homes');
      set(homes.sort((a, b) => b.updatedAt - a.updatedAt));
    },
    async add(home) {
      const db = await getDB();
      const newHome = {
        id: crypto.randomUUID(),
        name: home.name || 'My Home',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rooms: []
      };
      await db.add('homes', newHome);
      update(h => [newHome, ...h]);
      return newHome;
    },
    async update(id, changes) {
      const db = await getDB();
      const home = await db.get('homes', id);
      const updated = { ...home, ...changes, updatedAt: Date.now() };
      await db.put('homes', updated);
      update(homes => homes.map(h => h.id === id ? updated : h));
    },
    async remove(id) {
      const db = await getDB();
      await db.delete('homes', id);
      update(homes => homes.filter(h => h.id !== id));
    }
  };
}

export const homes = createHomesStore();