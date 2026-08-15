import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  inventory,
  CATEGORIES,
  inventoryCount,
  categoryCounts
} from '$lib/stores/inventory.js';

describe('inventory store', () => {
  beforeEach(async () => {
    // Each test gets a clean slate — indexedDB is shared across tests
    // within a run via fake-indexeddb, so explicitly clear it.
    await inventory.removeAll();
  });

  it('exposes a fixed, non-empty category list', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    expect(CATEGORIES).toContain('Other');
  });

  it('adds an item and auto-guesses its category from the name', async () => {
    const item = await inventory.add({ name: 'Oak Dining Chair' });
    expect(item).not.toBeNull();
    expect(item.category).toBe('Chairs');
    expect(get(inventoryCount)).toBe(1);
  });

  it('falls back to "Other" when no keyword matches', async () => {
    const item = await inventory.add({ name: 'Mystery Object' });
    expect(item.category).toBe('Other');
  });

  it('respects an explicitly provided category over auto-guessing', async () => {
    const item = await inventory.add({ name: 'Table Lamp', category: 'Decor' });
    expect(item.category).toBe('Decor');
  });

  it('updates an item without losing its id or createdAt', async () => {
    const item = await inventory.add({ name: 'Rug' });
    const updated = await inventory.update(item.id, { name: 'Persian Rug' });
    expect(updated.id).toBe(item.id);
    expect(updated.createdAt).toBe(item.createdAt);
    expect(updated.name).toBe('Persian Rug');
  });

  it('removes an item', async () => {
    const item = await inventory.add({ name: 'Bookshelf' });
    const ok = await inventory.remove(item.id);
    expect(ok).toBe(true);
    expect(await inventory.get(item.id)).toBeUndefined();
  });

  it('duplicates a normally-created item', async () => {
    const item = await inventory.add({
      name: 'Armchair',
      material: 'Velvet',
      tags: ['cozy']
    });
    const copy = await inventory.duplicate(item.id);
    expect(copy).not.toBeNull();
    expect(copy.name).toBe('Armchair (Copy)');
    expect(copy.id).not.toBe(item.id);
    expect(copy.tags).toEqual(['cozy']);
  });

  // Regression test: duplicate() used to spread item.colourVariants and
  // item.tags directly without a fallback, which threw on any record
  // missing those fields — e.g. anything brought in via importData()
  // before it normalized incoming records.
  it('duplicates an item missing colourVariants/tags/dimensions without throwing', async () => {
    const bareItem = { id: 'bare-1', name: 'Imported Chair', createdAt: Date.now() };
    await inventory.importData(JSON.stringify({ version: 1, items: [bareItem] }));

    const copy = await inventory.duplicate('bare-1');
    expect(copy).not.toBeNull();
    expect(copy.tags).toEqual([]);
    // importData() normalizes missing dimensions to this default, so
    // duplicate() receives an already-populated object here — the point
    // of this test is that neither step throws on the missing field.
    expect(copy.dimensions).toEqual({ width: 1, height: 1, depth: 1 });
  });

  it("duplicate()'s own fallback handles a record missing fields even when written directly (bypassing importData's normalization)", async () => {
    const { getDB } = await import('$lib/stores/db.js');
    const db = await getDB();
    await db.add('inventory', { id: 'raw-1', name: 'Raw Record', createdAt: Date.now() });

    const copy = await inventory.duplicate('raw-1');
    expect(copy).not.toBeNull();
    expect(copy.tags).toEqual([]);
    expect(copy.dimensions).toEqual({});
  });

  it('search matches name, category, material, and tags', async () => {
    await inventory.add({ name: 'Green Sofa', material: 'Linen', tags: ['living-room'] });
    await inventory.add({ name: 'Kitchen Stool' });

    expect((await inventory.search('linen')).length).toBe(1);
    expect((await inventory.search('living-room')).length).toBe(1);
    expect((await inventory.search('stool')).length).toBe(1);
    expect((await inventory.search('nonexistent')).length).toBe(0);
  });

  it('categoryCounts derived store tracks additions and removals', async () => {
    const a = await inventory.add({ name: 'Chair One' });
    await inventory.add({ name: 'Chair Two' });
    expect(get(categoryCounts).Chairs).toBe(2);

    await inventory.remove(a.id);
    expect(get(categoryCounts).Chairs).toBe(1);
  });

  it('exportData/importData round-trip preserves items', async () => {
    await inventory.add({ name: 'Round Trip Lamp' });
    const exported = await inventory.exportData();

    await inventory.removeAll();
    expect(get(inventoryCount)).toBe(0);

    const ok = await inventory.importData(exported);
    expect(ok).toBe(true);
    expect(get(inventoryCount)).toBe(1);
  });
});
