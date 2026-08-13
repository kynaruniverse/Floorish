<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { toast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let prompt = '';
  let aiGenerating = false;
  let results = null;
  let showResults = false;

  const vibePresets = [
    { icon: '🌿', label: 'Biophilic', prompt: 'Plants everywhere, natural materials, earthy tones, lots of daylight' },
    { icon: '🏮', label: 'Japandi', prompt: 'Minimalist Japanese-Scandinavian blend, neutral palette, natural wood, clean lines' },
    { icon: '🎨', label: 'Maximalist', prompt: 'Bold colors, gallery wall, mixed patterns, collected treasures, cozy chaos' },
    { icon: '🪴', label: 'Cottagecore', prompt: 'Vintage floral, soft pastels, cozy textiles, whimsical clutter, dried flowers' },
    { icon: '🏢', label: 'Minimalist', prompt: 'Clean open spaces, monochrome palette, hidden storage, nothing unnecessary' },
    { icon: '☕', label: 'Cosy Café', prompt: 'Warm lighting, comfortable seating nooks, bookshelves, soft textures' }
  ];

  onMount(async () => {
    await homes.load();
    await inventory.load();
    loading = false;
  });

  function selectVibe(vibe) {
    prompt = vibe.prompt;
  }

  async function generateDesign() {
    if (!prompt.trim()) {
      toast.error('Describe the look you want first');
      return;
    }

    aiGenerating = true;

    // Simulate AI thinking (will be replaced with real AI later)
    await new Promise(r => setTimeout(r, 1500));

    // Generate suggestions based on prompt keywords
    const changes = generateSuggestions(prompt);

    results = {
      prompt,
      changes,
      itemsUsed: changes.filter(c => c.source === 'inventory').length,
      itemsSuggested: changes.filter(c => c.source === 'catalogue').length
    };

    aiGenerating = false;
    showResults = true;
  }

  function generateSuggestions(prompt) {
    const lower = prompt.toLowerCase();
    const changes = [];

    // Lighting
    if (lower.includes('warm') || lower.includes('cozy') || lower.includes('cosy')) {
      changes.push({ type: 'relight', item: 'Lighting', to: 'warm evening', reason: 'Warm lighting creates a cozy feel' });
    } else if (lower.includes('bright') || lower.includes('airy') || lower.includes('daylight')) {
      changes.push({ type: 'relight', item: 'Lighting', to: 'bright morning', reason: 'Bright light makes space feel open' });
    }

    // Plants
    if (lower.includes('plant') || lower.includes('green') || lower.includes('natural')) {
      changes.push({ type: 'add', item: 'Plant', position: 'near window', source: $inventory.some(i => i.category === 'Plants') ? 'inventory' : 'catalogue', reason: 'Plants add life and connect to nature' });
    }

    // Seating
    if (lower.includes('cozy') || lower.includes('comfortable') || lower.includes('reading')) {
      changes.push({ type: 'add', item: 'Comfortable Chair', position: 'corner', source: $inventory.some(i => i.category === 'Chairs') ? 'inventory' : 'catalogue', reason: 'A dedicated reading spot needs seating' });
    }

    // Minimalist
    if (lower.includes('minimal') || lower.includes('clean') || lower.includes('nothing unnecessary')) {
      changes.push({ type: 'remove', item: 'Excess items', reason: 'Minimalist design calls for only essentials' });
    }

    // Color
    if (lower.includes('warm')) {
      changes.push({ type: 'repaint', item: 'Accent wall', color: '#E8D5B7', reason: 'Warm beige adds coziness' });
    } else if (lower.includes('neutral')) {
      changes.push({ type: 'repaint', item: 'Walls', color: '#D5E0E8', reason: 'Neutral tones create calm' });
    }

    // Books
    if (lower.includes('book') || lower.includes('reading')) {
      changes.push({ type: 'add', item: 'Bookshelf', position: 'against wall', source: $inventory.some(i => i.category === 'Storage') ? 'inventory' : 'catalogue', reason: 'Storage for books completes the reading nook' });
    }

    if (changes.length === 0) {
      changes.push({ type: 'add', item: 'Decorative Element', position: 'focal point', source: 'catalogue', reason: 'Adds character to the space' });
    }

    return changes;
  }

  function applyDesign() {
    toast.success('Design saved! Apply it in the 3D editor.');
    showResults = false;
    results = null;
  }

  function discardDesign() {
    results = null;
    showResults = false;
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>🤖 AI Designer</h1>
    <p class="subtitle">Get style suggestions for your space</p>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

  {:else if $homes.length === 0}
    <EmptyState
      icon="🏠"
      title="Create a home first"
      description="You need at least one home before the AI can suggest designs."
      ctaText="Create Home"
      onCta={() => goto('/')}
    />

  {:else}
    <!-- Prompt -->
    <div class="prompt-section">
      <label for="ai-prompt">What style do you want?</label>
      <textarea id="ai-prompt" bind:value={prompt} placeholder="e.g., 'bright and airy with lots of plants and cozy seating'" rows="3"></textarea>

      <div class="vibe-chips">
        {#each vibePresets as vibe}
          <button class="vibe-chip" on:click={() => selectVibe(vibe)}>
            {vibe.icon} {vibe.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Generate -->
    <button class="generate-btn" on:click={generateDesign} disabled={!prompt.trim() || aiGenerating}>
      {#if aiGenerating}
        <span class="spinner-small"></span> Thinking...
      {:else}
        ✨ Get Suggestions
      {/if}
    </button>

    <p class="hint">Suggestions are based on your prompt and available furniture.</p>
  {/if}
</div>

<!-- Results -->
<Modal open={showResults} title="Design Suggestions" on:close={discardDesign}>
  {#if results}
    <div class="results-content">
      <div class="results-prompt">"{results.prompt}"</div>

      <div class="changes-list">
        {#each results.changes as change, i}
          <div class="change-item">
            <span class="change-icon">
              {#if change.type === 'add'}+
              {:else if change.type === 'remove'}−
              {:else if change.type === 'repaint'}🎨
              {:else if change.type === 'relight'}💡
              {:else}↔{/if}
            </span>
            <div class="change-info">
              <strong>{change.item}</strong>
              {#if change.position}<span> → {change.position}</span>{/if}
              {#if change.to}<span> → {change.to}</span>{/if}
              {#if change.reason}<p class="reason">{change.reason}</p>{/if}
            </div>
            {#if change.color}<span class="color-dot" style="background: {change.color};"></span>{/if}
          </div>
        {/each}
      </div>

      <div class="results-actions">
        <button class="btn-secondary" on:click={discardDesign}>Discard</button>
        <button class="btn-primary" on:click={applyDesign}>Save Suggestions</button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .page-header { margin-bottom: 1.25rem; }
  .subtitle { color: #888; font-size: 0.85rem; }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem;
    color: #888;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e0e0e0;
    border-top-color: #1E3D1E;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .prompt-section { margin-bottom: 1rem; }

  .prompt-section label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
  }

  textarea {
    width: 100%;
    padding: 0.8rem;
    border: 2px solid #ddd;
    border-radius: 12px;
    font-size: 0.95rem;
    resize: vertical;
    min-height: 80px;
    outline: none;
  }

  textarea:focus { border-color: #1E3D1E; }

  .vibe-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .vibe-chip {
    padding: 0.45rem 0.8rem;
    border-radius: 20px;
    font-size: 0.78rem;
    background: #f0f0f0;
    transition: all 0.15s;
  }

  .vibe-chip:active { background: #E8F3E0; }

  .generate-btn {
    width: 100%;
    padding: 0.9rem;
    background: #1E3D1E;
    color: #fff;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .generate-btn:disabled { opacity: 0.5; }

  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .hint {
    text-align: center;
    font-size: 0.75rem;
    color: #aaa;
    margin-top: 0.75rem;
  }

  /* Results */
  .results-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .results-prompt {
    background: #E8F3E0;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-style: italic;
  }

  .changes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .change-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    font-size: 0.85rem;
  }

  .change-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    background: #f0f0f0;
    flex-shrink: 0;
  }

  .change-info { flex: 1; }
  .change-info span { color: #888; }
  .reason { font-size: 0.72rem; color: #aaa; margin-top: 0.15rem; }

  .color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px #ddd;
    flex-shrink: 0;
  }

  .results-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    background: #f0f0f0;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .btn-primary {
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>