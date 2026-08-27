import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { getDB } from './db.js';

// ID generator that works everywhere
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

// Fills in any missing arrays on a home record so older/partially-written
// records (e.g. from a previous version of the app, or an interrupted
// write) can't crash the UI. Self-healing rather than throwing.
function normalizeHome(home) {
  if (!home) return home;
  return {
    ...home,
    floors: (home.floors || []).map(f => ({
      ...f,
      rooms: (f.rooms || []).map(r => ({
        ...r,
        walls: r.walls || [],
        doors: r.doors || [],
        windows: r.windows || [],
        furniture: r.furniture || []
      }))
    }))
  };
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

  async function persist(homesList) {
    if (!browser) return;
    const db = await getDB();
    const tx = db.transaction('homes', 'readwrite');
    await tx.store.clear();
    for (const home of homesList) {
      await tx.store.put(home);
    }
    await tx.done;
  }

  // Applies an update() and returns the resulting array, so callers can
  // await persist(updated) AFTER the synchronous store update completes —
  // never inside it. Firing persist() from inside update() without
  // awaiting let concurrent mutations race each other's clear+rewrite
  // cycles, which could leave a home record partially written (e.g.
  // missing `floors`, matching the "Cannot read properties of undefined
  // (reading 'map')" crash). Every mutator now awaits persist() before
  // resolving, so calls from the UI (which are always awaited) run
  // strictly one at a time.
  function applyUpdate(fn) {
    let result;
    update(homes => {
      result = fn(homes);
      pushHistory(result);
      return result;
    });
    return result;
  }

  return {
    subscribe,

    // ============ LOAD ============
    async load() {
      try {
        const db = await getDB();
        const raw = await db.getAll('homes');
        const sorted = raw.map(normalizeHome).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
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
      const home = await db.get('homes', id);
      return normalizeHome(home);
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

      const updated = applyUpdate(homes => [newHome, ...homes]);
      await persist(updated);

      return newHome;
    },

    // ============ UPDATE HOME ============
    async updateHome(id, changes) {
      let updatedHome = null;

      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === id) {
            updatedHome = { ...h, ...changes, updatedAt: Date.now() };
            return updatedHome;
          }
          return h;
        })
      );
      await persist(updated);

      return updatedHome;
    },

    // ============ DELETE HOME ============
    async removeHome(id) {
      const updated = applyUpdate(homes => homes.filter(h => h.id !== id));
      await persist(updated);
    },

    // ============ FLOORS ============
    async addFloor(homeId, name) {
      let newFloor = null;

      const updated = applyUpdate(homes =>
        homes.map(h => {
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
        })
      );
      await persist(updated);

      return newFloor;
    },

    async removeFloor(homeId, floorId) {
      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: h.floors.filter(f => f.id !== floorId),
              updatedAt: Date.now()
            };
          }
          return h;
        })
      );
      await persist(updated);
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

      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return { ...f, rooms: [...(f.rooms || []), newRoom] };
                }
                return f;
              }),
              updatedAt: Date.now()
            };
          }
          return h;
        })
      );
      await persist(updated);

      return newRoom;
    },

    async updateRoom(homeId, floorId, roomId, changes) {
      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return {
                    ...f,
                    rooms: (f.rooms || []).map(r => {
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
        })
      );
      await persist(updated);
    },

    async removeRoom(homeId, floorId, roomId) {
      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return { ...f, rooms: (f.rooms || []).filter(r => r.id !== roomId) };
                }
                return f;
              }),
              updatedAt: Date.now()
            };
          }
          return h;
        })
      );
      await persist(updated);
    },

    // ============ FURNITURE ============
    async addFurniture(homeId, floorId, roomId, furnitureData = {}) {
      const newItem = {
        id: generateId(),
        refId: furnitureData.refId || null,
        name: furnitureData.name || 'Item',
        shape: furnitureData.shape || 'box',
        category: furnitureData.category || 'Other',
        dimensions: furnitureData.dimensions || { width: 0.6, height: 0.6, depth: 0.6 },
        color: furnitureData.color || '#A89A82',
        position: furnitureData.position || { x: 0, z: 0 },
        rotationY: furnitureData.rotationY || 0,
        createdAt: Date.now()
      };

      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return {
                    ...f,
                    rooms: (f.rooms || []).map(r => {
                      if (r.id === roomId) {
                        return { ...r, furniture: [...(r.furniture || []), newItem] };
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
        })
      );
      await persist(updated);

      return newItem;
    },

    async updateFurniture(homeId, floorId, roomId, furnitureId, changes) {
      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return {
                    ...f,
                    rooms: (f.rooms || []).map(r => {
                      if (r.id === roomId) {
                        return {
                          ...r,
                          furniture: (r.furniture || []).map(item =>
                            item.id === furnitureId ? { ...item, ...changes } : item
                          )
                        };
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
        })
      );
      await persist(updated);
    },

    async removeFurniture(homeId, floorId, roomId, furnitureId) {
      const updated = applyUpdate(homes =>
        homes.map(h => {
          if (h.id === homeId) {
            return {
              ...h,
              floors: (h.floors || []).map(f => {
                if (f.id === floorId) {
                  return {
                    ...f,
                    rooms: (f.rooms || []).map(r => {
                      if (r.id === roomId) {
                        return {
                          ...r,
                          furniture: (r.furniture || []).filter(item => item.id !== furnitureId)
                        };
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
        })
      );
      await persist(updated);
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
      const raw = await db.getAll('homes');
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        homes: raw
      }, null, 2);
    },

    async importData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.homes || !Array.isArray(data.homes)) {
          throw new Error('Invalid data');
        }

        const db = await getDB();
        for (const home of data.homes) {
          await db.put('homes', normalizeHome(home));
        }
        await this.load();
        return true;
      } catch (err) {
        console.error('Import failed:', err);
        return false;
      }
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
    total + (home.floors || []).reduce((floorTotal, floor) =>
      floorTotal + (floor.rooms || []).length, 0), 0)
);
