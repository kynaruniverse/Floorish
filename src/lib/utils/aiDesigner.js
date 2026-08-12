/**
 * AI Designer module for Floorish
 * Uses WebLLM for local AI inference, falls back to API
 */

import { addToast } from '$stores/app.js';

let mlcEngine = null;
let engineLoaded = false;
let engineLoading = false;

// Interior design system prompt
const SYSTEM_PROMPT = `You are an interior design AI for a room planning app called Floorish.
Given a room description, available furniture items, and style preferences, 
suggest furniture arrangements, color schemes, and decor ideas.

Respond with valid JSON only:
{
  "changes": [
    {
      "type": "move|add|remove|repaint|relight",
      "item": "item name",
      "from": "current position (for moves)",
      "to": "new position",
      "color": "hex color (for repaint)",
      "reason": "brief design reasoning"
    }
  ],
  "styleNotes": "overall style summary",
  "lightingSuggestion": "morning|noon|evening|night"
}`;

/**
 * Load WebLLM engine (uses MLC WebLLM or similar)
 */
export async function loadAIEngine() {
  if (engineLoaded) return mlcEngine;
  if (engineLoading) {
    // Wait for existing load
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (engineLoaded) { clearInterval(check); resolve(mlcEngine); }
      }, 200);
      setTimeout(() => { clearInterval(check); reject(new Error('AI load timeout')); }, 60000);
    });
  }

  engineLoading = true;

  try {
    // Try WebLLM first (local, free, private)
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    
    mlcEngine = await CreateMLCEngine(
      'Llama-3.2-3B-Instruct-q4f16_1-MLC', // Small, fast model
      {
        initProgressCallback: (progress) => {
          console.log('AI model loading:', progress.text, `${progress.progress}%`);
          // Could emit events for UI progress bar
        }
      }
    );

    engineLoaded = true;
    engineLoading = false;
    return mlcEngine;
  } catch (err) {
    console.warn('WebLLM not available, using fallback:', err.message);
    engineLoading = false;
    // Return fallback engine
    return createFallbackEngine();
  }
}

/**
 * Generate interior design suggestions
 * @param {Object} params
 * @param {string} params.prompt - Style description
 * @param {Array} params.roomFurniture - Current furniture in room
 * @param {Array} params.inventory - Available inventory items
 * @param {Array} params.catalogueItems - Available catalogue items
 * @param {Object} params.constraints - Design constraints
 */
export async function generateDesign(params) {
  const { prompt, roomFurniture = [], inventory = [], catalogueItems = [], constraints = {} } = params;

  try {
    const engine = await loadAIEngine();

    const context = buildContext(roomFurniture, inventory, catalogueItems, constraints);
    const fullPrompt = `${SYSTEM_PROMPT}\n\nRoom context:\n${context}\n\nStyle request: ${prompt}\n\nDesign JSON:`;

    let response;
    if (engine.type === 'webllm') {
      // Local inference
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      });
      response = reply.choices[0].message.content;
    } else {
      // Fallback: rule-based design
      response = generateRuleBasedDesign(params);
    }

    return parseAIResponse(response, params);
  } catch (err) {
    console.error('AI design generation failed:', err);
    // Ultimate fallback
    return generateRuleBasedDesign(params);
  }
}

/**
 * Build context string for the AI
 */
function buildContext(roomFurniture, inventory, catalogueItems, constraints) {
  const parts = [];

  if (roomFurniture.length > 0) {
    parts.push('Current room furniture:');
    roomFurniture.forEach(item => {
      parts.push(`- ${item.name} (${item.category}) at position (${item.position?.x?.toFixed(1) || 0}, ${item.position?.z?.toFixed(1) || 0})`);
    });
  }

  if (inventory.length > 0) {
    parts.push('\nAvailable inventory:');
    inventory.forEach(item => {
      parts.push(`- ${item.name} (${item.category}, ${item.dimensions?.width || 1}x${item.dimensions?.depth || 1}m)`);
    });
  }

  if (catalogueItems.length > 0) {
    parts.push('\nAvailable from catalogue:');
    catalogueItems.forEach(item => {
      parts.push(`- ${item.name} (${item.category})`);
    });
  }

  if (Object.keys(constraints).length > 0) {
    parts.push('\nConstraints:');
    if (constraints.keepLayout) parts.push('- Keep existing layout');
    if (constraints.useInventoryOnly) parts.push('- Use only inventory items');
    if (constraints.noRepaint) parts.push('- Do not suggest painting');
    if (constraints.changeLightingOnly) parts.push('- Only suggest lighting changes');
  }

  return parts.join('\n');
}

/**
 * Rule-based fallback designer
 */
function generateRuleBasedDesign(params) {
  const { prompt, roomFurniture = [], inventory = [], catalogueItems = [], constraints = {} } = params;
  const changes = [];

  // Analyze prompt for keywords
  const promptLower = prompt.toLowerCase();
  const styleNotes = [];

  // Lighting suggestions based on mood keywords
  if (promptLower.includes('cozy') || promptLower.includes('warm') || promptLower.includes('evening')) {
    changes.push({
      type: 'relight',
      item: 'room lighting',
      to: 'evening',
      reason: 'Warm evening lighting creates a cozy atmosphere'
    });
  } else if (promptLower.includes('bright') || promptLower.includes('airy') || promptLower.includes('morning')) {
    changes.push({
      type: 'relight',
      item: 'room lighting',
      to: 'morning',
      reason: 'Bright morning light makes the space feel open and airy'
    });
  }

  // Plants suggestion
  if (promptLower.includes('plant') || promptLower.includes('green') || promptLower.includes('biophilic')) {
    const plantsInInventory = inventory.filter(i => i.category === 'Plants');
    const plantsInCatalogue = catalogueItems.filter(i => i.category === 'Plants');
    
    if (plantsInInventory.length > 0 && !constraints.changeLightingOnly) {
      changes.push({
        type: 'add',
        item: plantsInInventory[0].name,
        position: 'corner near window',
        source: 'inventory',
        reason: 'Plants add life and connect to biophilic design principles'
      });
      styleNotes.push('Biophilic elements with natural greenery');
    }
  }

  // Reading nook
  if (promptLower.includes('reading') || promptLower.includes('nook') || promptLower.includes('book')) {
    if (!constraints.changeLightingOnly) {
      changes.push({
        type: 'add',
        item: 'Comfortable Chair',
        position: 'near window or corner',
        source: inventory.find(i => i.category === 'Chairs') ? 'inventory' : 'catalogue',
        reason: 'A dedicated reading spot needs a comfortable seat'
      });
      changes.push({
        type: 'add',
        item: 'Side Table',
        position: 'next to chair',
        source: inventory.find(i => i.category === 'Tables') ? 'inventory' : 'catalogue',
        reason: 'A surface for books and drinks completes the reading nook'
      });
      styleNotes.push('Dedicated reading nook with comfortable seating');
    }
  }

  // Minimalist
  if (promptLower.includes('minimal') || promptLower.includes('clean') || promptLower.includes('simple')) {
    if (roomFurniture.length > 2 && !constraints.keepLayout) {
      changes.push({
        type: 'remove',
        item: 'excess furniture',
        reason: 'Minimalist design calls for only essential pieces'
      });
      styleNotes.push('Minimalist approach — less is more');
    }
  }

  // Color suggestions
  if (promptLower.includes('warm')) {
    changes.push({
      type: 'repaint',
      item: 'accent wall',
      color: '#E8D5B7',
      reason: 'Warm beige accent wall adds coziness'
    });
  } else if (promptLower.includes('cool') || promptLower.includes('calm')) {
    changes.push({
      type: 'repaint',
      item: 'walls',
      color: '#D5E0E8',
      reason: 'Cool blue-grey tones create a calming atmosphere'
    });
  }

  if (changes.length === 0) {
    changes.push({
      type: 'add',
      item: 'Decorative Element',
      position: 'as focal point',
      source: 'catalogue',
      reason: 'Adding a focal point enhances the room\'s character'
    });
  }

  return {
    changes,
    styleNotes: styleNotes.join('. ') || `Custom "${prompt}" style applied`,
    lightingSuggestion: promptLower.includes('dark') || promptLower.includes('moody') ? 'night' : 'noon'
  };
}

/**
 * Parse AI response into structured design
 */
function parseAIResponse(response, params) {
  try {
    // Try parsing as JSON
    const parsed = JSON.parse(response);
    return {
      changes: parsed.changes || [],
      styleNotes: parsed.styleNotes || '',
      lightingSuggestion: parsed.lightingSuggestion || 'noon'
    };
  } catch {
    // If parsing fails, use rule-based fallback
    return generateRuleBasedDesign(params);
  }
}

/**
 * Fallback engine using simple pattern matching
 */
function createFallbackEngine() {
  return {
    type: 'fallback',
    async chat() {
      return {
        choices: [{
          message: {
            content: JSON.stringify(generateRuleBasedDesign({
              prompt: '',
              roomFurniture: [],
              inventory: [],
              catalogueItems: [],
              constraints: {}
            }))
          }
        }]
      };
    }
  };
}

/**
 * Preload the AI model in the background
 */
export function preloadAI() {
  if (!engineLoaded && !engineLoading) {
    loadAIEngine().catch(() => {
      // Silent fail — will use fallback when needed
    });
  }
}