import { describe, it, expect } from 'vitest';
import { roomTemplates, getTemplate } from '$lib/data/roomTemplates.js';
import { furnitureLibrary, FURNITURE_SHAPES } from '$lib/data/furnitureLibrary.js';

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
    const knownShapes = FURNITURE_SHAPES.map(s => s.value);
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

describe('FURNITURE_SHAPES', () => {
  it('covers every shape Room3D.svelte actually renders as a distinct primitive', () => {
    // Mirrors the `switch (item.shape)` cases in src/lib/Room3D.svelte.
    // This is the list the FurniturePicker's custom-item form offers —
    // if Room3D grows a new case, it needs to be added here too, or
    // users have no way to pick it for a custom item.
    const room3dCases = ['sofa', 'chair', 'table', 'bed', 'wardrobe', 'lamp', 'plant', 'rug'];
    const offeredValues = FURNITURE_SHAPES.map(s => s.value);
    for (const shape of room3dCases) {
      expect(offeredValues).toContain(shape);
    }
  });

  it('every shape has a non-empty label', () => {
    for (const s of FURNITURE_SHAPES) {
      expect(s.value).toBeTruthy();
      expect(s.label).toBeTruthy();
    }
  });
});
