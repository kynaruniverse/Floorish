import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { homes } from '$lib/stores/homes.js';
import { inventory } from '$lib/stores/inventory.js';

// Mirrors what src/routes/app/settings/+page.svelte actually does: merge
// both stores' exports into one file, then hand that same file to both
// stores' importData(). Each store only reads its own top-level key
// (`homes` / `items`) and ignores the other, so this only works if
// neither importData throws on the other's data being absent/foreign —
// see the importData-resolves-to-false regression test in homes.test.js.
describe('combined homes + inventory backup (settings page contract)', () => {
  beforeEach(async () => {
    await homes.resetAll();
    await inventory.removeAll();
  });

  it('restores both homes and inventory items from one combined file', async () => {
    await homes.addHome('Backup House');
    await inventory.add({ name: 'Backup Chair' });

    const homesData = JSON.parse(await homes.exportData());
    const inventoryData = JSON.parse(await inventory.exportData());
    const combined = JSON.stringify({
      version: 1,
      homes: homesData.homes,
      items: inventoryData.items
    });

    await homes.resetAll();
    await inventory.removeAll();
    expect(get(homes)).toHaveLength(0);

    const homesOk = await homes.importData(combined);
    const itemsOk = await inventory.importData(combined);

    expect(homesOk).toBe(true);
    expect(itemsOk).toBe(true);
    expect(get(homes)).toHaveLength(1);
    expect(get(homes)[0].name).toBe('Backup House');

    const items = await inventory.exportData();
    expect(JSON.parse(items).items).toHaveLength(1);
    expect(JSON.parse(items).items[0].name).toBe('Backup Chair');
  });

  it("one store's import failing does not block the other's, given one combined file", async () => {
    await inventory.add({ name: 'Solo Item' });
    const inventoryData = JSON.parse(await inventory.exportData());
    // Deliberately missing a valid `homes` key.
    const combined = JSON.stringify({ version: 1, items: inventoryData.items });

    const homesOk = await homes.importData(combined);
    const itemsOk = await inventory.importData(combined);

    expect(homesOk).toBe(false);
    expect(itemsOk).toBe(true);
  });
});
