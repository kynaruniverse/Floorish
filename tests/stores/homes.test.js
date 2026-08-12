import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homes } from '../../src/lib/stores/homes.js';
import { get } from 'svelte/store';
import 'fake-indexeddb/auto';

describe('Homes Store', () => {
  beforeEach(async () => {
    // Reset store between tests
    await homes.load();
    const currentHomes = get(homes);
    for (const home of currentHomes) {
      await homes.remove(home.id);
    }
  });

  it('should start empty', () => {
    const currentHomes = get(homes);
    expect(currentHomes).toHaveLength(0);
  });

  it('should add a new home', async () => {
    const home = await homes.add({ name: 'Test Home' });
    expect(home.name).toBe('Test Home');
    expect(home.id).toBeDefined();
    expect(home.createdAt).toBeDefined();
    
    const currentHomes = get(homes);
    expect(currentHomes).toHaveLength(1);
    expect(currentHomes[0].name).toBe('Test Home');
  });

  it('should update a home', async () => {
    const home = await homes.add({ name: 'Original Name' });
    await homes.update(home.id, { name: 'Updated Name' });
    
    const currentHomes = get(homes);
    expect(currentHomes[0].name).toBe('Updated Name');
  });

  it('should remove a home', async () => {
    const home = await homes.add({ name: 'To Delete' });
    await homes.remove(home.id);
    
    const currentHomes = get(homes);
    expect(currentHomes).toHaveLength(0);
  });

  it('should sort by most recently updated', async () => {
    const home1 = await homes.add({ name: 'First' });
    await new Promise(r => setTimeout(r, 10));
    const home2 = await homes.add({ name: 'Second' });
    
    const currentHomes = get(homes);
    expect(currentHomes[0].name).toBe('Second');
    expect(currentHomes[1].name).toBe('First');
  });
});