import { writable } from 'svelte/store';
import { openDB } from 'idb';

function createInventoryStore() {
  const { subscribe, set, update } = writable([]);

  async function getDB() {
    return openDB('floorish-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }
      }
    });
  }

  return {
    subscribe,
    async load() {
      const db = await getDB();
      const items = await db.getAll('inventory');
      set(items);
    },
    async add(item) {
      const db = await getDB();
      const newItem = {
        id: crypto.randomUUID(),
        name: item.name,
        category: item.category || 'Other',
        dimensions: item.dimensions || { width: 1, height: 1, depth: 1 },
        modelData: item.modelData || null,
        thumbnail: item.thumbnail || null,
        colourVariants: item.colourVariants || [],
        material: item.material || '',
        createdAt: Date.now()
      };
      await db.add('inventory', newItem);
      update(items => [...items, newItem]);
      return newItem;
    },
    async remove(id) {
      const db = await getDB();
      await db.delete('inventory', id);
      update(items => items.filter(i => i.id !== id));
    }
  };
}

export const inventory = createInventoryStore();