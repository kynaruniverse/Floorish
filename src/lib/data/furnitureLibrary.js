// Furniture templates for the 3D furniture picker.
// Each renders as a simple primitive-shape group in Room3D.svelte —
// no external 3D models, so this works fully offline with zero assets.
// Dimensions in metres: width (x), height (y), depth (z).

export const furnitureLibrary = [
  {
    shape: 'sofa',
    label: 'Sofa',
    category: 'Seating',
    dimensions: { width: 2.0, height: 0.8, depth: 0.9 },
    color: '#9CAF88'
  },
  {
    shape: 'chair',
    label: 'Armchair',
    category: 'Seating',
    dimensions: { width: 0.7, height: 0.85, depth: 0.7 },
    color: '#B08968'
  },
  {
    shape: 'table',
    label: 'Dining Table',
    category: 'Tables',
    dimensions: { width: 1.6, height: 0.75, depth: 0.9 },
    color: '#8B5E3C'
  },
  {
    shape: 'table',
    label: 'Coffee Table',
    category: 'Tables',
    dimensions: { width: 1.0, height: 0.4, depth: 0.6 },
    color: '#8B5E3C'
  },
  {
    shape: 'bed',
    label: 'Double Bed',
    category: 'Bedroom',
    dimensions: { width: 1.5, height: 0.55, depth: 2.0 },
    color: '#C9A98C'
  },
  {
    shape: 'bed',
    label: 'Single Bed',
    category: 'Bedroom',
    dimensions: { width: 0.9, height: 0.55, depth: 1.9 },
    color: '#C9A98C'
  },
  {
    shape: 'wardrobe',
    label: 'Wardrobe',
    category: 'Storage',
    dimensions: { width: 1.2, height: 2.0, depth: 0.6 },
    color: '#7A6248'
  },
  {
    shape: 'wardrobe',
    label: 'Bookshelf',
    category: 'Storage',
    dimensions: { width: 0.9, height: 1.8, depth: 0.3 },
    color: '#7A6248'
  },
  {
    shape: 'lamp',
    label: 'Floor Lamp',
    category: 'Lighting',
    dimensions: { width: 0.4, height: 1.5, depth: 0.4 },
    color: '#E8D9B5'
  },
  {
    shape: 'plant',
    label: 'Potted Plant',
    category: 'Decor',
    dimensions: { width: 0.5, height: 1.1, depth: 0.5 },
    color: '#4A7C3F'
  },
  {
    shape: 'rug',
    label: 'Area Rug',
    category: 'Decor',
    dimensions: { width: 2.0, height: 0.02, depth: 1.4 },
    color: '#C4544A'
  },
  {
    shape: 'box',
    label: 'Custom Box',
    category: 'Other',
    dimensions: { width: 0.6, height: 0.6, depth: 0.6 },
    color: '#A89A82'
  }
];
