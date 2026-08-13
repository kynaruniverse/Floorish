/**
 * AI Designer module for Floorish
 * Rule-based design suggestions (WebLLM integration comes later)
 */

/**
 * Generate interior design suggestions based on prompt keywords
 * @param {Object} params
 * @param {string} params.prompt - Style description
 * @param {Array} params.roomFurniture - Current furniture in room
 * @param {Array} params.inventory - Available inventory items
 * @param {Array} params.catalogueItems - Available catalogue items
 * @param {Object} params.constraints - Design constraints
 */
export function generateDesign(params) {
  const {
    prompt = '',
    roomFurniture = [],
    inventory = [],
    catalogueItems = [],
    constraints = {}
  } = params;

  return generateRuleBasedDesign({
    prompt,
    roomFurniture,
    inventory,
    catalogueItems,
    constraints
  });
}

/**
 * Rule-based design generator
 */
function generateRuleBasedDesign({ prompt, roomFurniture = [], inventory = [], catalogueItems = [], constraints = {} }) {
  const changes = [];
  const styleNotes = [];
  const promptLower = (prompt || '').toLowerCase();

  // === LIGHTING ===
  if (promptLower.includes('cozy') || promptLower.includes('warm') || promptLower.includes('evening') || promptLower.includes('moody')) {
    changes.push({
      type: 'relight',
      item: 'Room lighting',
      to: 'warm evening',
      reason: 'Warm lighting creates a cozy atmosphere'
    });
  } else if (promptLower.includes('bright') || promptLower.includes('airy') || promptLower.includes('daylight') || promptLower.includes('morning')) {
    changes.push({
      type: 'relight',
      item: 'Room lighting',
      to: 'bright morning',
      reason: 'Bright light makes the space feel open and airy'
    });
  } else if (promptLower.includes('dark') || promptLower.includes('moody') || promptLower.includes('intimate')) {
    changes.push({
      type: 'relight',
      item: 'Room lighting',
      to: 'night',
      reason: 'Low lighting creates intimacy'
    });
  }

  // === PLANTS ===
  if (promptLower.includes('plant') || promptLower.includes('green') || promptLower.includes('biophilic') || promptLower.includes('natural')) {
    const hasPlants = inventory.some(i => i.category === 'Plants');
    changes.push({
      type: 'add',
      item: 'Plant',
      position: 'near window',
      source: hasPlants ? 'inventory' : 'catalogue',
      reason: 'Plants add life and connect to nature'
    });
    styleNotes.push('Biophilic with natural greenery');
  }

  // === SEATING / READING ===
  if (promptLower.includes('reading') || promptLower.includes('nook') || promptLower.includes('book') || promptLower.includes('cozy corner')) {
    const hasChairs = inventory.some(i => i.category === 'Chairs');
    changes.push({
      type: 'add',
      item: 'Comfortable Chair',
      position: 'corner',
      source: hasChairs ? 'inventory' : 'catalogue',
      reason: 'A dedicated spot needs comfortable seating'
    });
    
    if (!constraints.changeLightingOnly) {
      changes.push({
        type: 'add',
        item: 'Side Table',
        position: 'next to chair',
        source: inventory.some(i => i.category === 'Tables') ? 'inventory' : 'catalogue',
        reason: 'Surface for books and drinks'
      });
    }
    styleNotes.push('Reading nook');
  }

  // === MINIMALIST ===
  if (promptLower.includes('minimal') || promptLower.includes('clean') || promptLower.includes('simple') || promptLower.includes('uncluttered')) {
    if (roomFurniture.length > 2 && !constraints.keepLayout) {
      changes.push({
        type: 'remove',
        item: 'Excess furniture',
        reason: 'Minimalist design calls for only essentials'
      });
    }
    styleNotes.push('Minimalist — less is more');
  }

  // === MAXIMALIST ===
  if (promptLower.includes('maximal') || promptLower.includes('bold') || promptLower.includes('gallery wall') || promptLower.includes('patterns')) {
    changes.push({
      type: 'add',
      item: 'Art Piece',
      position: 'on wall',
      source: inventory.some(i => i.category === 'Decor') ? 'inventory' : 'catalogue',
      reason: 'Bold art creates visual interest'
    });
    styleNotes.push('Maximalist with bold elements');
  }

  // === STORAGE ===
  if (promptLower.includes('storage') || promptLower.includes('organize') || promptLower.includes('shelf') || promptLower.includes('tidy')) {
    const hasStorage = inventory.some(i => i.category === 'Storage');
    changes.push({
      type: 'add',
      item: 'Shelf Unit',
      position: 'against wall',
      source: hasStorage ? 'inventory' : 'catalogue',
      reason: 'Storage keeps the space organized'
    });
  }

  // === COLOURS ===
  if (promptLower.includes('warm')) {
    changes.push({
      type: 'repaint',
      item: 'Accent wall',
      color: '#E8D5B7',
      reason: 'Warm beige adds coziness'
    });
  } else if (promptLower.includes('cool') || promptLower.includes('calm') || promptLower.includes('serene')) {
    changes.push({
      type: 'repaint',
      item: 'Walls',
      color: '#D5E0E8',
      reason: 'Cool tones create calm'
    });
  } else if (promptLower.includes('neutral')) {
    changes.push({
      type: 'repaint',
      item: 'Walls',
      color: '#E8E0D5',
      reason: 'Neutral tones are versatile'
    });
  }

  // === JAPANDI ===
  if (promptLower.includes('japandi') || promptLower.includes('japanese') || promptLower.includes('scandi')) {
    changes.push({
      type: 'add',
      item: 'Natural Wood Element',
      position: 'focal point',
      source: 'catalogue',
      reason: 'Natural wood is central to Japandi style'
    });
    changes.push({
      type: 'repaint',
      item: 'Walls',
      color: '#F0EBE1',
      reason: 'Neutral palette with warm undertones'
    });
    styleNotes.push('Japandi — Japanese-Scandinavian blend');
  }

  // === COTTAGECORE ===
  if (promptLower.includes('cottage') || promptLower.includes('floral') || promptLower.includes('vintage')) {
    changes.push({
      type: 'add',
      item: 'Floral Cushion',
      position: 'on seating',
      source: 'catalogue',
      reason: 'Soft florals add cottage charm'
    });
    styleNotes.push('Cottagecore with vintage touches');
  }

  // === DEFAULT ===
  if (changes.length === 0) {
    changes.push({
      type: 'add',
      item: 'Decorative Element',
      position: 'focal point',
      source: 'catalogue',
      reason: 'Adds character to the space'
    });
  }

  return {
    changes,
    styleNotes: styleNotes.join(' · ') || `Custom "${prompt}" style`,
    lightingSuggestion: getLightingSuggestion(promptLower)
  };
}

function getLightingSuggestion(promptLower) {
  if (promptLower.includes('dark') || promptLower.includes('moody')) return 'night';
  if (promptLower.includes('cozy') || promptLower.includes('warm')) return 'evening';
  if (promptLower.includes('bright') || promptLower.includes('airy')) return 'morning';
  return 'noon';
}

/**
 * Parse AI response (kept for future WebLLM integration)
 */
function parseAIResponse(response, params) {
  try {
    const parsed = JSON.parse(response);
    return {
      changes: parsed.changes || [],
      styleNotes: parsed.styleNotes || '',
      lightingSuggestion: parsed.lightingSuggestion || 'noon'
    };
  } catch {
    return generateRuleBasedDesign(params);
  }
}

/**
 * Preload — no-op for now (WebLLM comes later)
 */
export function preloadAI() {
  // Future: load WebLLM in background
  console.log('AI engine ready (rule-based mode)');
}