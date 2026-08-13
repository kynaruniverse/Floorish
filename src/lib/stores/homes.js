import { writable, derived } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'floorish-db';
const DB_VERSION = 2; // Bumped for schema change

// Simple UUID generator that works everywhere
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Create homes store if needed
      if (!db.objectStoreNames.contains('homes')) {
        const homesStore = db.createObjectStore('homes', { keyPath: 'id' });
        homesStore.createIndex('updatedAt', 'updatedAt');
        homesStore.createIndex('name', 'name', { unique: false });
      }
      
      // Migration: if we had a separate rooms store, merge into homes
      if (oldVersion < 2 && db.objectStoreNames.contains('rooms')) {
        // Rooms are now stored inside the home object
        // Old rooms store is kept for backward compatibility
      }
    }
  });
}

function createHomesStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    
    // Load all homes
    async load() {
      try {
        const db = await getDB();
        const homes = await db.getAll('homes');
        // Sort by most recently updated
        set(homes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
        return homes;
      } catch (err) {
        console.error('Failed to load homes:', err);
        set([]);
        return [];
      }
    },

    // Get single home by ID
    async get(id) {
      try {
        const db = await getDB();
        return await db.get('homes', id);
      } catch (err) {
        console.error(`Failed to get home ${id}:`, err);
        return null;
      }
    },

    // Create new home
    async add(home = {}) {
      try {
        const db = await getDB();
        
        // Check for duplicate names
        const existing = await db.getAll('homes');
        let name = home.name?.trim() || 'My Home';
        let count = 1;
        let finalName = name;
        
        while (existing.some(h => h.name === finalName)) {
          count++;
          finalName = `${name} (${count})`;
        }
        
        const newHome = {
          id: generateId(),
          name: finalName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          rooms: home.rooms || [],
          coverColor: home.coverColor || randomColor()
        };
        
        await db.add('homes', newHome);
        update(homes => [newHome, ...homes]);
        return newHome;
      } catch (err) {
        console.error('Failed to create home:', err);
        throw err;
      }
    },

    // Update home details
    async update(id, changes) {
      try {
        const db = await getDB();
        const home = await db.get('homes', id);
        
        if (!home) {
          console.error(`Home ${id} not found`);
          return null;
        }
        
        const updated = {
          ...home,
          ...changes,
          id: home.id, // Ensure ID never changes
          createdAt: home.createdAt, // Preserve original creation
          updatedAt: Date.now()
        };
        
        await db.put('homes', updated);
        update(homes => homes.map(h => h.id === id ? updated : h));
        return updated;
      } catch (err) {
        console.error(`Failed to update home ${id}:`, err);
        return null;
      }
    },

    // Delete home and all its rooms
    async remove(id) {
      try {
        const db = await getDB();
        await db.delete('homes', id);
        update(homes => homes.filter(h => h.id !== id));
        return true;
      } catch (err) {
        console.error(`Failed to delete home ${id}:`, err);
        return false;
      }
    },

    // Add room to a home
    async addRoom(homeId, room) {
      try {
        const db = await getDB();
        const home = await db.get('homes', homeId);
        
        if (!home) return null;
        
        const newRoom = {
          id: generateId(),
          name: room.name || `Room ${(home.rooms?.length || 0) + 1}`,
          colorTag: room.colorTag || randomColor(),
          floorType: room.floorType || 'wood',
          ceilingHeight: room.ceilingHeight || 2.4,
          points: room.points || [],
          furniture: room.furniture || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        const updatedHome = {
          ...home,
          rooms: [...(home.rooms || []), newRoom],
          updatedAt: Date.now()
        };
        
        await db.put('homes', updatedHome);
        update(homes => homes.map(h => h.id === homeId ? updatedHome : h));
        return newRoom;
      } catch (err) {
        console.error(`Failed to add room to home ${homeId}:`, err);
        return null;
      }
    },

    // Update a room
    async updateRoom(homeId, roomId, changes) {
      try {
        const db = await getDB();
        const home = await db.get('homes', homeId);
        
        if (!home) return null;
        
        const rooms = (home.rooms || []).map(room =>
          room.id === roomId
            ? { ...room, ...changes, id: roomId, updatedAt: Date.now() }
            : room
        );
        
        const updatedHome = {
          ...home,
          rooms,
          updatedAt: Date.now()
        };
        
        await db.put('homes', updatedHome);
        update(homes => homes.map(h => h.id === homeId ? updatedHome : h));
        
        return rooms.find(r => r.id === roomId);
      } catch (err) {
        console.error(`Failed to update room ${roomId}:`, err);
        return null;
      }
    },

    // Remove a room
    async removeRoom(homeId, roomId) {
      try {
        const db = await getDB();
        const home = await db.get('homes', homeId);
        
        if (!home) return false;
        
        const updatedHome = {
          ...home,
          rooms: (home.rooms || []).filter(r => r.id !== roomId),
          updatedAt: Date.now()
        };
        
        await db.put('homes', updatedHome);
        update(homes => homes.map(h => h.id === homeId ? updatedHome : h));
        return true;
      } catch (err) {
        console.error(`Failed to remove room ${roomId}:`, err);
        return false;
      }
    },

    // Get room by ID
    getRoom(homeId, roomId) {
      return new Promise(async (resolve) => {
        const db = await getDB();
        const home = await db.get('homes', homeId);
        if (!home) return resolve(null);
        const room = (home.rooms || []).find(r => r.id === roomId);
        resolve(room || null);
      });
    },

    // Duplicate a home
    async duplicate(homeId) {
      const home = await this.get(homeId);
      if (!home) return null;
      
      return this.add({
        name: `${home.name} (Copy)`,
        rooms: home.rooms ? JSON.parse(JSON.stringify(home.rooms)) : []
      });
    },

    // Export all data as JSON
    async exportData() {
      const db = await getDB();
      const homes = await db.getAll('homes');
      return JSON.stringify({
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        homes
      }, null, 2);
    },

    // Import data from JSON
    async importData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.homes || !Array.isArray(data.homes)) {
          throw new Error('Invalid data format');
        }
        
        const db = await getDB();
        for (const home of data.homes) {
          await db.put('homes', {
            ...home,
            id: home.id || generateId()
          });
        }
        
        await this.load();
        return true;
      } catch (err) {
        console.error('Import failed:', err);
        return false;
      }
    },

    // Delete all data
    async resetAll() {
      const db = await getDB();
      await db.clear('homes');
      set([]);
    }
  };
}

// Helper: random room color from a curated palette
function randomColor() {
  const colors = [
    '#E8F3E0', '#F0EBE1', '#E8D5D5', 
    '#D5E0E8', '#E8E0D5', '#D5E8E0',
    '#FFE0CC', '#CCE0FF', '#F0E0F0'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Create the store instance
export const homes = createHomesStore();

// Derived store: always sorted by most recent
export const sortedHomes = derived(homes, $homes => 
  [...$homes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
);

// Derived store: total room count
export const totalRooms = derived(homes, $homes =>
  $homes.reduce((total, home) => total + (home.rooms?.length || 0), 0)
);

// Derived store: total furniture count
export const totalFurniture = derived(homes, $homes =>
  $homes.reduce((total, home) => {
    const rooms = home.rooms || [];
    return total + rooms.reduce((roomTotal, room) => 
      roomTotal + (room.furniture?.length || 0), 0);
  }, 0)
);