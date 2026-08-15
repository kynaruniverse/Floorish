import { describe, it, expect } from 'vitest';
import { roomTemplates, getTemplate } from '$lib/data/roomTemplates.js';
import { furnitureLibrary } from '$lib/data/furnitureLibrary.js';

describe('roomTemplates', () => {
  it('every template has positive width and depth', () => {
    for (const tpl of roomTemplates) {
      expect(tpl.width).toBeGreaterThan(0);
      expect(tpl.depth).toBeGreaterThan(0);
    }
  });

  it('getTemplate returns an exact match when the type exists', () => {
    const tpl = getTemplate('bathroom');
    expect(tpl.type).toBe('bathroom');
  });

  it('getTemplate falls back to the last template for an unknown type', () => {
    const tpl = getTemplate('nonexistent-type');
    expect(tpl).toBe(roomTemplates[roomTemplates.length - 1]);
  });
});

describe('furnitureLibrary', () => {
  it('every entry has a shape recognized by Room3D\'s buildFurnitureGroup switch', () => {
    // Keep this list in sync with the `switch (item.shape)` cases in
    // src/lib/Room3D.svelte — an unrecognized shape silently falls
    // through to the generic box, so this guards against silent drift.
    const knownShapes = ['sofa', 'chair', 'table', 'bed', 'wardrobe', 'lamp', 'plant', 'rug', 'box'];
    for (const tpl of furnitureLibrary) {
      expect(knownShapes).toContain(tpl.shape);
    }
  });

  it('every entry has positive dimensions', () => {
    for (const tpl of furnitureLibrary) {
      expect(tpl.dimensions.width).toBeGreaterThan(0);
      expect(tpl.dimensions.height).toBeGreaterThan(0);
      expect(tpl.dimensions.depth).toBeGreaterThan(0);
    }
  });
});
