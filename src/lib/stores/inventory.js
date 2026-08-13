import { writable, derived } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'floorish-db';
const DB_VERSION = 2; // Matches homes store

// Categories
export const CATEGORIES = [
  'Chairs',
  'Tables',
  'Storage',
  'Decor',
  'Lighting',
  'Plants',
  'Rugs',
  'Other'
];

// Keyword → category mapping for auto-detection
const KEYWORD_CATEGORIES = [
  { keywords: ['chair', 'stool', 'sofa', 'couch', 'armchair', 'bench', 'seat'], category: 'Chairs' },
  { keywords: ['table', 'desk', 'coffee', 'dining'], category: 'Tables' },
  { keywords: ['shelf', 'cabinet', 'wardrobe', 'drawer', 'bookcase', 'storage'], category: 'Storage' },
  { keywords: ['lamp', 'light', 'pendant', 'chandelier'], category: 'Lighting' },
  { keywords: ['plant', 'tree', 'flower', 'succulent', 'cactus'], category: 'Plants' },
  { keywords: ['rug', 'carpet', 'mat'], category: 'Rugs' },
  { keywords: ['art', 'frame', 'mirror', 'clock', 'vase', 'cushion', 'pillow', 'throw'], category: 'Decor' }
];

// Safe ID generator
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

// Auto-detect category from item name
function guessCategory(name) {
  const lower = (name || '').toLowerCase();
  for (const { keywords, category } of KEYWORD_CATEGORIES) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('inventory')) {
        const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
        inventoryStore.createIndex('category', 'category');
        inventoryStore.createIndex('createdAt', 'createdAt');
      }
    }
  });
}

function createInventoryStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,

    // ============ LOAD ============
    async load() {
      try {
        const db = await getDB();
        const items = await db.getAll('inventory');
        // Sort by most recently added
        set(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        return items;
      } catch (err) {
        console.error('Failed to load inventory:', err);
        set([]);
        return [];
      }
    },

    // ============ GET ============
    async get(id) {
      try {
        const db = await getDB();
        return await db.get('inventory', id);
      } catch (err) {
        console.error(`Failed to get item ${id}:`, err);
        return null;
      }
    },

    async getByCategory(category) {
      try {
        const db = await getDB();
        const index = db.transaction('inventory').store.index('category');
        return await index.getAll(category);
      } catch (err) {
        console.error(`Failed to get items in category ${category}:`, err);
        return [];
      }
    },

    // ============ ADD ============
    async add(item = {}) {
      try {
        const db = await getDB();
        
        const name = item.name?.trim() || 'Untitled Item';
        const newItem = {
          id: generateId(),
          name,
          category: item.category || guessCategory(name),
          dimensions: item.dimensions || { width: 1, height: 1, depth: 1 },
          modelData: item.modelData || null,
          thumbnail: item.thumbnail || null,
          colourVariants: item.colourVariants || [],
          material: item.material || '',
          tags: item.tags || [],
          notes: item.notes || '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await db.add('inventory', newItem);
        update(items => [newItem, ...items]);
        return newItem;
      } catch (err) {
        console.error('Failed to add inventory item:', err);
        return null;
      }
    },

    // ============ UPDATE ============
    async update(id, changes) {
      try {
        const db = await getDB();
        const item = await db.get('inventory', id);
        
        if (!item) {
          console.error(`Item ${id} not found`);
          return null;
        }
        
        const updated = {
          ...item,
          ...changes,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: Date.now()
        };
        
        await db.put('inventory', updated);
        update(items => items.map(i => i.id === id ? updated : i));
        return updated;
      } catch (err) {
        console.error(`Failed to update item ${id}:`, err);
        return null;
      }
    },

    // ============ REMOVE ============
    async remove(id) {
      try {
        const db = await getDB();
        await db.delete('inventory', id);
        update(items => items.filter(i => i.id !== id));
        return true;
      } catch (err) {
        console.error(`Failed to remove item ${id}:`, err);
        return false;
      }
    },

    // ============ DUPLICATE ============
    async duplicate(id) {
      const item = await this.get(id);
      if (!item) return null;
      
      return this.add({
        name: `${item.name} (Copy)`,
        category: item.category,
        dimensions: { ...item.dimensions },
        modelData: item.modelData,
        thumbnail: item.thumbnail,
        colourVariants: [...item.colourVariants],
        material: item.material,
        tags: [...item.tags]
      });
    },

    // ============ SEARCH ============
    async search(query) {
      const items = await this.load();
      const lower = query.toLowerCase();
      return items.filter(item =>
        item.name.toLowerCase().includes(lower) ||
        (item.category || '').toLowerCase().includes(lower) ||
        (item.material || '').toLowerCase().includes(lower) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(lower))
      );
    },

    // ============ BULK ============
    async addMultiple(itemsArray) {
      const results = [];
      for (const item of itemsArray) {
        const result = await this.add(item);
        if (result) results.push(result);
      }
      return results;
    },

    async removeAll() {
      const db = await getDB();
      await db.clear('inventory');
      set([]);
    },

    // ============ IMPORT/EXPORT ============
    async exportData() {
      const db = await getDB();
      const items = await db.getAll('inventory');
      return JSON.stringify({
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        items
      }, null, 2);
    },

    async importData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid inventory data');
        }
        
        const db = await getDB();
        for (const item of data.items) {
          await db.put('inventory', {
            ...item,
            id: item.id || generateId()
          });
        }
        
        await this.load();
        return true;
      } catch (err) {
        console.error('Import failed:', err);
        return false;
      }
    }
  };
}

// Create the store
export const inventory = createInventoryStore();

// ============ DERIVED STORES ============
// Total items
export const inventoryCount = derived(inventory, $inventory => $inventory.length);

// Items by category
export const inventoryByCategory = derived(inventory, $inventory => {
  const categories = {};
  for (const item of $inventory) {
    const cat = item.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  }
  return categories;
});

// Category list with counts
export const categoryCounts = derived(inventory, $inventory => {
  const counts = {};
  for (const item of $inventory) {
    const cat = item.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
});