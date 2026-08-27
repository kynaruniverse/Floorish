import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { homes, totalRooms } from '$lib/stores/homes.js';

describe('homes store', () => {
  beforeEach(async () => {
    await homes.resetAll();
  });

  it('creates a home with a default Ground Floor', async () => {
    const home = await homes.addHome('Test House');
    expect(home.name).toBe('Test House');
    expect(home.floors).toHaveLength(1);
    expect(home.floors[0].name).toBe('Ground Floor');
  });

  it('persists homes across a fresh load() (via the shared IndexedDB connection)', async () => {
    await homes.addHome('Persisted House');
    const loaded = await homes.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Persisted House');
  });

  it('adds a floor to an existing home', async () => {
    const home = await homes.addHome('Two Floor House');
    const floor = await homes.addFloor(home.id, 'First Floor');
    expect(floor.name).toBe('First Floor');
    expect(floor.level).toBe(1);

    const reloaded = await homes.get(home.id);
    expect(reloaded.floors).toHaveLength(2);
  });

  it('adds, updates, and removes a room, keeping totalRooms in sync', async () => {
    const home = await homes.addHome('Room House');
    const floorId = home.floors[0].id;

    const room = await homes.addRoom(home.id, floorId, { name: 'Kitchen', dimensions: { width: 3, depth: 3 } });
    expect(get(totalRooms)).toBe(1);

    await homes.updateRoom(home.id, floorId, room.id, { name: 'Big Kitchen' });
    const afterUpdate = await homes.get(home.id);
    expect(afterUpdate.floors[0].rooms[0].name).toBe('Big Kitchen');

    await homes.removeRoom(home.id, floorId, room.id);
    expect(get(totalRooms)).toBe(0);
  });

  it('adds and removes furniture on a room', async () => {
    const home = await homes.addHome('Furnished House');
    const floorId = home.floors[0].id;
    const room = await homes.addRoom(home.id, floorId, { name: 'Living Room' });

    const item = await homes.addFurniture(home.id, floorId, room.id, { name: 'Sofa', shape: 'sofa' });
    let reloaded = await homes.get(home.id);
    expect(reloaded.floors[0].rooms[0].furniture).toHaveLength(1);

    await homes.removeFurniture(home.id, floorId, room.id, item.id);
    reloaded = await homes.get(home.id);
    expect(reloaded.floors[0].rooms[0].furniture).toHaveLength(0);
  });

  it('undo/redo restores prior state after a room is added', async () => {
    const home = await homes.addHome('Undo House');
    const floorId = home.floors[0].id;
    await homes.addRoom(home.id, floorId, { name: 'Office' });

    expect(homes.canUndo()).toBe(true);
    await homes.undo();
    let current = get(homes).find(h => h.id === home.id);
    expect(current.floors[0].rooms).toHaveLength(0);

    expect(homes.canRedo()).toBe(true);
    await homes.redo();
    current = get(homes).find(h => h.id === home.id);
    expect(current.floors[0].rooms).toHaveLength(1);
  });

  it('normalizes a home missing nested arrays (self-healing old/partial records) on load', async () => {
    // Simulate a record written by an older version of the app, or an
    // interrupted write, that is missing floors/rooms/furniture arrays.
    const home = await homes.addHome('Partial House');
    const partial = { ...home, floors: [{ id: home.floors[0].id, name: 'Ground Floor', level: 0 }] };
    await homes.importData(JSON.stringify({ version: 1, homes: [partial] }));

    const reloaded = await homes.get(home.id);
    expect(reloaded.floors[0].rooms).toEqual([]);
  });

  it('exportData/importData round-trip preserves homes', async () => {
    await homes.addHome('Exportable House');
    const exported = await homes.exportData();

    await homes.resetAll();
    expect(get(homes)).toHaveLength(0);

    const ok = await homes.importData(exported);
    expect(ok).toBe(true);
    expect(get(homes)).toHaveLength(1);
  });

  // Regression: importData() used to throw on invalid data instead of
  // returning false, unlike inventory.importData()'s catch-and-return-
  // boolean pattern. The settings page's combined backup file relies on
  // both stores' importData resolving independently (never throwing) so
  // one store's invalid/missing data can't prevent the other from
  // importing its own part of the same file.
  it('importData resolves to false on invalid data instead of throwing', async () => {
    await expect(homes.importData('not valid json')).resolves.toBe(false);
    await expect(homes.importData(JSON.stringify({ no: 'homes key' }))).resolves.toBe(false);
    expect(get(homes)).toHaveLength(0);
  });
});
