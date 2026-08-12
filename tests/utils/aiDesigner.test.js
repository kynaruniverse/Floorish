import { describe, it, expect } from 'vitest';
import { generateDesign, preloadAI } from '../../src/lib/utils/aiDesigner.js';

describe('AI Designer', () => {
  const mockParams = {
    prompt: 'cozy reading nook with warm lighting',
    roomFurniture: [
      { name: 'Sofa', category: 'Sofas', position: { x: 0, y: 0, z: 0 } }
    ],
    inventory: [
      { name: 'Floor Lamp', category: 'Lighting', dimensions: { width: 0.3, height: 1.5, depth: 0.3 } },
      { name: 'Armchair', category: 'Chairs', dimensions: { width: 0.8, height: 0.9, depth: 0.85 } }
    ],
    catalogueItems: [],
    constraints: { useInventoryOnly: true }
  };

  it('should generate design suggestions', async () => {
    const result = await generateDesign(mockParams);
    
    expect(result).toBeDefined();
    expect(result.changes).toBeInstanceOf(Array);
    expect(result.styleNotes).toBeDefined();
  });

  it('should handle empty prompt gracefully', async () => {
    const result = await generateDesign({ ...mockParams, prompt: '' });
    expect(result.changes).toBeDefined();
  });

  it('should respect keepLayout constraint', async () => {
    const result = await generateDesign({
      ...mockParams,
      constraints: { keepLayout: true }
    });
    
    // Should not suggest moving existing furniture
    const moveChanges = result.changes.filter(c => c.type === 'move');
    expect(moveChanges).toHaveLength(0);
  });

  it('should respect changeLightingOnly constraint', async () => {
    const result = await generateDesign({
      ...mockParams,
      constraints: { changeLightingOnly: true }
    });
    
    // Should only have relight changes
    const nonLightingChanges = result.changes.filter(c => c.type !== 'relight');
    expect(nonLightingChanges).toHaveLength(0);
  });

  it('should preload without errors', () => {
    expect(() => preloadAI()).not.toThrow();
  });
});