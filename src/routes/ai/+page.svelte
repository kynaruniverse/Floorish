<script>
  import { onMount } from 'svelte';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { addToast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Modal from '$components/Modal.svelte';

  let homesList = [];
  let loading = true;
  let prompt = '';
  let aiGenerating = false;
  let selectedTarget = null; // 'current' | 'all' | specific room id
  let results = null;
  let showResults = false;

  // Constraints
  let useInventoryOnly = true;
  let includeCatalogue = false;
  let repaintWalls = false;
  let keepLayout = true;
  let changeLightingOnly = false;

  const vibePresets = [
    { icon: '🌿', label: 'Biophilic', prompt: 'Plants everywhere, natural materials, earthy tones, lots of daylight' },
    { icon: '🏮', label: 'Japandi', prompt: 'Minimalist Japanese-Scandinavian blend, neutral palette, natural wood, clean lines' },
    { icon: '🎨', label: 'Maximalist', prompt: 'Bold colors, gallery wall, mixed patterns, collected treasures, cozy chaos' },
    { icon: '🪴', label: 'Cottagecore', prompt: 'Vintage floral, soft pastels, cozy textiles, whimsical clutter, dried flowers' },
    { icon: '🏢', label: 'Minimalist', prompt: 'Clean open spaces, monochrome palette, hidden storage, nothing unnecessary' },
    { icon: '🧪', label: 'Retro Lab', prompt: 'Mid-century furniture, atomic age decor, teak and brass, geometric patterns' },
    { icon: '🌇', label: 'Cyberpunk Loft', prompt: 'Neon accents, industrial materials, exposed brick, moody lighting, tech details' },
    { icon: '☕', label: 'Cosy Café', prompt: 'Warm lighting, comfortable seating nooks, bookshelves, soft textures, lived-in feel' }
  ];

  onMount(async () => {
    await homes.load();
    await inventory.load();
    homesList = $homes;
    loading = false;
  });

  function selectVibe(vibe) {
    prompt = vibe.prompt;
  }

  async function generateDesign() {
    if (!prompt.trim()) {
      addToast('Describe the look you want first', 'error');
      return;
    }

    if ($inventory.length === 0 && useInventoryOnly) {
      addToast('Add items to your inventory first, or uncheck "Use only my inventory"', 'error');
      return;
    }

    aiGenerating = true;
    results = null;

    // Simulate AI generation (in production, this would call an API or run local model)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate mock results
    results = {
      prompt,
      changes: [
        { type: 'moved', item: 'Sofa', from: 'center', to: 'against north wall' },
        { type: 'added', item: 'Floor Lamp', position: 'corner near window', source: 'inventory' },
        { type: 'added', item: 'Cushion Set', position: 'on sofa', source: 'catalogue' },
        { type: 'repaint', wall: 'accent wall', color: '#E8D5B7' },
        { type: 'added', item: 'Rug', position: 'under coffee table', source: 'inventory' }
      ],
      roomPreview: null,
      itemsUsed: 3,
      itemsSuggested: 2
    };

    aiGenerating = false;
    showResults = true;
    addToast('Design generated!', 'success');
  }

  function applyDesign() {
    addToast('Design applied to room! Check the 3D view.', 'success');
    showResults = false;
    results = null;
    // In production: actually update room.furniture array and navigate to 3D view
  }

  function discardDesign() {
    results = null;
    showResults = false;
    prompt = '';
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>🤖 AI Designer</h1>
    <p class="subtitle">Describe a vibe, redesign your space</p>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading your homes...</p>
    </div>
  {:else if $homes.length === 0}
    <EmptyState
      icon="🏠"
      title="Create a home first"
      description="You need at least one home with rooms before the AI can work its magic."
      ctaText="Create Your First Home"
      onCta={() => window.location.href = '/'}
    />
  {:else}
    <!-- Prompt area -->
    <div class="prompt-section">
      <label for="ai-prompt" class="prompt-label">What should your room feel like?</label>
      <textarea
        id="ai-prompt"
        bind:value={prompt}
        placeholder="Describe your dream room... e.g., 'bright and airy with lots of plants, a cozy reading corner, and warm wooden furniture'"
        rows="3"
      ></textarea>

      <!-- Quick vibes -->
      <div class="vibe-chips">
        {#each vibePresets as vibe}
          <button class="vibe-chip" on:click={() => selectVibe(vibe)}>
            <span>{vibe.icon}</span> {vibe.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Target selection -->
    <div class="target-section">
      <h3>Apply to:</h3>
      <div class="target-options">
        <label class="radio-card" class:selected={selectedTarget === 'current'}>
          <input type="radio" bind:group={selectedTarget} value="current" />
          <span>Current room</span>
        </label>
        <label class="radio-card" class:selected={selectedTarget === 'all'}>
          <input type="radio" bind:group={selectedTarget} value="all" />
          <span>All rooms</span>
        </label>
      </div>
      
      {#if homesList.length > 0}
        <select class="home-select" aria-label="Select home">
          {#each homesList as home}
            <option value={home.id}>{home.name}</option>
          {/each}
        </select>
      {/if}
    </div>

    <!-- Constraints -->
    <div class="constraints-section">
      <h3>Constraints:</h3>
      <div class="constraint-list">
        <label class="toggle-row">
          <input type="checkbox" bind:checked={useInventoryOnly} />
          <span>Use only my inventory</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={includeCatalogue} />
          <span>Include catalogue items</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={repaintWalls} />
          <span>Suggest wall paint changes</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={keepLayout} />
          <span>Keep existing furniture layout</span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" bind:checked={changeLightingOnly} />
          <span>Change lighting only</span>
        </label>
      </div>
    </div>

    <!-- Generate button -->
    <button
      class="generate-btn"
      on:click={generateDesign}
      disabled={!prompt.trim() || aiGenerating}
    >
      {#if aiGenerating}
        <span class="spinner-small"></span>
        Exploring arrangements...
      {:else}
        ✨ Generate Design
      {/if}
    </button>

    <!-- Previous generations -->
    <div class="history-section">
      <h3>Previous generations</h3>
      <p class="history-empty">Designs you generate will appear here.</p>
    </div>
  {/if}
</div>

<!-- Results Modal -->
<Modal open={showResults} title="Your AI Design" on:close={discardDesign}>
  {#if results}
    <div class="results-content">
      <div class="results-prompt">
        <strong>Prompt:</strong> "{results.prompt}"
      </div>

      <div class="changes-list">
        <h3>Changes ({results.changes.length})</h3>
        {#each results.changes as change}
          <div class="change-item change-{change.type}">
            <span class="change-icon">
              {#if change.type === 'added'}+
              {:else if change.type === 'moved'}↔
              {:else if change.type === 'repaint'}🎨
              {:else if change.type === 'removed'}−
              {/if}
            </span>
            <span class="change-desc">
              <strong>{change.item}</strong>
              {change.type === 'moved' ? ` moved from ${change.from} to ${change.to}` : ''}
              {change.type === 'added' ? ` added ${change.position}` : ''}
              {change.type === 'repaint' ? ` repainted ${change.wall}` : ''}
            </span>
            {#if change.source}
              <span class="change-source">from {change.source}</span>
            {/if}
            {#if change.color}
              <span class="color-dot" style="background: {change.color};"></span>
            {/if}
          </div>
        {/each}
      </div>

      <div class="results-summary">
        <span>📦 {results.itemsUsed} items from inventory</span>
        <span>🛋️ {results.itemsSuggested} suggestions from catalogue</span>
      </div>

      <div class="results-actions">
        <button class="btn-secondary" on:click={discardDesign}>Discard</button>
        <button class="btn-primary" on:click={applyDesign}>Apply Design</button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .page-header { margin-bottom: 1.5rem; }
  .subtitle { color: var(--grey-600); font-size: 0.9rem; margin-top: 0.25rem; }

  .loading-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 1rem; padding: 3rem; color: var(--grey-600);
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--grey-200); border-top-color: var(--green-700);
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Prompt section */
  .prompt-section { margin-bottom: 1.25rem; }
  .prompt-label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem; }
  
  textarea {
    width: 100%; padding: 0.875rem;
    border: 2px solid var(--grey-200); border-radius: var(--radius-md);
    font-size: 0.95rem; font-family: var(--font-sans);
    resize: vertical; min-height: 80px;
    transition: border-color 0.2s;
  }
  textarea:focus { border-color: var(--green-500); outline: none; }

  .vibe-chips {
    display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;
  }
  .vibe-chip {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.5rem 0.85rem;
    background: var(--white); border: 1px solid var(--grey-200);
    border-radius: 20px; font-size: 0.8rem;
    cursor: pointer; transition: all 0.15s;
  }
  .vibe-chip:hover { border-color: var(--green-500); background: var(--green-100); }

  /* Target section */
  .target-section {
    background: var(--white); padding: 1rem;
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    margin-bottom: 1rem;
  }
  .target-section h3 { font-family: var(--font-sans); font-size: 0.85rem; margin-bottom: 0.5rem; }
  .target-options { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  
  .radio-card {
    flex: 1; padding: 0.6rem; text-align: center;
    border: 2px solid var(--grey-200); border-radius: var(--radius-sm);
    cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
  }
  .radio-card.selected { border-color: var(--green-700); background: var(--green-100); }
  .radio-card input { display: none; }

  .home-select {
    width: 100%; padding: 0.6rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.9rem;
  }

  /* Constraints */
  .constraints-section {
    background: var(--white); padding: 1rem;
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    margin-bottom: 1.25rem;
  }
  .constraints-section h3 { font-family: var(--font-sans); font-size: 0.85rem; margin-bottom: 0.5rem; }
  .constraint-list { display: flex; flex-direction: column; gap: 0.5rem; }
  
  .toggle-row {
    display: flex; align-items: center; gap: 0.6rem;
    font-size: 0.85rem; cursor: pointer;
  }
  .toggle-row input[type="checkbox"] {
    width: 20px; height: 20px; accent-color: var(--green-700);
  }

  /* Generate button */
  .generate-btn {
    width: 100%; padding: 1rem;
    background: var(--green-700); color: white;
    border-radius: var(--radius-md); font-size: 1.05rem;
    font-weight: 600; display: flex; align-items: center;
    justify-content: center; gap: 0.5rem;
    transition: all 0.2s; margin-bottom: 1.5rem;
  }
  .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .generate-btn:not(:disabled):hover { background: var(--green-900); }
  .spinner-small {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
    border-radius: 50%; animation: spin 0.6s linear infinite;
  }

  /* History */
  .history-section { margin-top: 1rem; }
  .history-section h3 { font-family: var(--font-sans); font-size: 0.9rem; margin-bottom: 0.5rem; }
  .history-empty { color: var(--grey-400); font-size: 0.85rem; font-style: italic; }

  /* Results modal */
  .results-content { display: flex; flex-direction: column; gap: 1rem; }
  .results-prompt { background: var(--green-100); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.9rem; }

  .changes-list h3 { font-family: var(--font-sans); font-size: 0.85rem; margin-bottom: 0.5rem; }
  
  .change-item {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.5rem 0; border-bottom: 1px solid var(--grey-200);
    font-size: 0.85rem;
  }
  .change-icon {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 0.9rem; flex-shrink: 0;
  }
  .change-added .change-icon { background: #E8F5E9; color: var(--success); }
  .change-moved .change-icon { background: #E3F2FD; color: var(--info); }
  .change-repaint .change-icon { background: #FFF3E0; color: #E65100; }
  .change-removed .change-icon { background: #FDECEA; color: var(--error); }
  .change-desc { flex: 1; }
  .change-source { font-size: 0.7rem; color: var(--grey-600); background: var(--grey-100); padding: 0.15rem 0.5rem; border-radius: 10px; }
  .color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px var(--grey-300); flex-shrink: 0; }

  .results-summary {
    display: flex; gap: 1rem; font-size: 0.8rem; color: var(--grey-600);
    background: var(--grey-100); padding: 0.6rem 0.75rem; border-radius: var(--radius-sm);
  }

  .results-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .btn-secondary {
    padding: 0.75rem 1.25rem; border-radius: var(--radius-sm);
    background: var(--grey-100); font-weight: 600;
  }
  .btn-primary {
    padding: 0.75rem 1.5rem; border-radius: var(--radius-sm);
    background: var(--green-700); color: white; font-weight: 600;
  }
</style>