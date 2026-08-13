import { writable, derived } from 'svelte/store';
import { openDB } from 'idb';
import { browser } from '$app/environment';

const DB_NAME = 'floorish-db';
const DB_VERSION = 1;

// ID generator that works everywhere
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('homes')) {
        const store = db.createObjectStore('homes', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    }
  });
}

// ============ UNDO/REDO ============
const MAX_HISTORY = 50;
let history = [];
let historyIndex = -1;
let isRestoring = false;

function pushHistory(snapshot) {
  if (isRestoring) return;
  
  // Truncate forward history
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(snapshot));
  
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  
  historyIndex = history.length - 1;
}

// ============ STORE ============
function createHomesStore() {
  const { subscribe, set, update } = writable([]);

  function snapshot(homes) {
    return JSON.parse(JSON.stringify(homes));
  }

  async function persist(homes) {
    if (!browser) return;
    const db = await getDB();
    const tx = db.transaction('homes', 'readwrite');
    await tx.store.clear();
    for (const home of homes) {
      await tx.store.put(home);
    }
    await tx.done;
  }

  return {
    subscribe,

    // ============ LOAD ============
    async load() {
      try {
        const db = await getDB();
        const homes = await db.getAll('homes');
        const sorted = homes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        set(sorted);
        pushHistory(sorted);
        return sorted;
      } catch (err) {
        console.error('Failed to load homes:', err);
        set([]);
        return [];
      }
    },

    // ============ GET ============
    async get(id) {
      const db = await getDB();
      return await db.get('homes', id);
    },

    // ============ CREATE HOME ============
    async addHome(name = 'My Home') {
      const newHome = {
        id: generateId(),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        floors: [
          {
            id: generateId(),
            name: 'Ground Floor',
            level: 0,
            rooms: []
          }
        ]
      };

      update(homes => {
        const updated = [newHome, ...homes];
        persist(updated);
        pushHistory(updated);
        return updated;
      });

      return newHome;
    },

    // ============ UPDATE HOME ============
    async updateHome(id, changes) {
      let updatedHome = null;
      
      update(homes => {
        const updated = homes.map(h => {
          if (h.id === id) {
            updatedHome = { ...h, ...changes, updatedAt: Date.now() };
            return updatedHome;
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });

      return updatedHome;
    },

    // ============ DELETE HOME ============
    async removeHome(id) {
      update(homes => {
        const updated = homes.filter(h => h.id !== id);
        persist(updated);
        pushHistory(updated);
        return updated;
      });
    },

    // ============ FLOORS ============
    async addFloor(homeId, name) {
      let newFloor = null;
      
      update(homes => {
        const updated = homes.map(h => {
          if (h.id === homeId) {
            newFloor = {
              id: generateId(),
              name: name || `Floor ${h.floors.length + 1}`,
              level: h.floors.length,
              rooms: []
            };
            return { ...h, floors: [...h.floors, newFloor], updatedAt: Date.now() };
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });

      return newFloor;
    },

    async removeFloor(homeId, floorId) {
      update(homes => {
        const updated = homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: h.floors.filter(f => f.id !== floorId),
              updatedAt: Date.now()
            };
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });
    },

    // ============ ROOMS ============
    async addRoom(homeId, floorId, roomData) {
      const newRoom = {
        id: generateId(),
        name: roomData.name || 'Room',
        type: roomData.type || 'custom',
        position: roomData.position || { x: 50, y: 50 },
        dimensions: roomData.dimensions || { width: 3, depth: 4 },
        height: roomData.height || 2.4,
        color: roomData.color || '#E8F3E0',
        floorType: roomData.floorType || 'wood',
        walls: [],
        doors: [],
        windows: [],
        furniture: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      update(homes => {
        const updated = homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: h.floors.map(f => {
                if (f.id === floorId) {
                  return { ...f, rooms: [...f.rooms, newRoom] };
                }
                return f;
              }),
              updatedAt: Date.now()
            };
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });

      return newRoom;
    },

    async updateRoom(homeId, floorId, roomId, changes) {
      update(homes => {
        const updated = homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: h.floors.map(f => {
                if (f.id === floorId) {
                  return {
                    ...f,
                    rooms: f.rooms.map(r => {
                      if (r.id === roomId) {
                        return { ...r, ...changes, updatedAt: Date.now() };
                      }
                      return r;
                    })
                  };
                }
                return f;
              }),
              updatedAt: Date.now()
            };
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });
    },

    async removeRoom(homeId, floorId, roomId) {
      update(homes => {
        const updated = homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: h.floors.map(f => {
                if (f.id === floorId) {
                  return { ...f, rooms: f.rooms.filter(r => r.id !== roomId) };
                }
                return f;
              }),
              updatedAt: Date.now()
            };
          }
          return h;
        });
        persist(updated);
        pushHistory(updated);
        return updated;
      });
    },

    // ============ UNDO / REDO ============
    async undo() {
      if (historyIndex <= 0) return false;
      
      isRestoring = true;
      historyIndex--;
      const prev = JSON.parse(history[historyIndex]);
      set(prev);
      await persist(prev);
      isRestoring = false;
      
      return true;
    },

    async redo() {
      if (historyIndex >= history.length - 1) return false;
      
      isRestoring = true;
      historyIndex++;
      const next = JSON.parse(history[historyIndex]);
      set(next);
      await persist(next);
      isRestoring = false;
      
      return true;
    },

    canUndo() {
      return historyIndex > 0;
    },

    canRedo() {
      return historyIndex < history.length - 1;
    },

    // ============ EXPORT ============
    async exportData() {
      const db = await getDB();
      const homes = await db.getAll('homes');
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        homes
      }, null, 2);
    },

    async importData(jsonString) {
      const data = JSON.parse(jsonString);
      if (!data.homes || !Array.isArray(data.homes)) {
        throw new Error('Invalid data');
      }
      
      const db = await getDB();
      for (const home of data.homes) {
        await db.put('homes', home);
      }
      await this.load();
    },

    // ============ RESET ============
    async resetAll() {
      const db = await getDB();
      await db.clear('homes');
      set([]);
      history = [];
      historyIndex = -1;
    }
  };
}

export const homes = createHomesStore();

// Derived: total rooms
export const totalRooms = derived(homes, $homes =>
  $homes.reduce((total, home) =>
    total + home.floors.reduce((floorTotal, floor) =>
      floorTotal + floor.rooms.length, 0), 0)
);