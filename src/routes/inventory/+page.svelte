<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { inventory, CATEGORIES } from '$stores/inventory.js';
  import { toast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let searchQuery = '';
  let activeFilter = 'All';
  let sortBy = 'recent';

  // Scan wizard
  let showScanWizard = false;
  let scanStep = 1;
  let capturedImage = null;
  let scanForm = {
    name: '',
    category: 'Other',
    width: 1,
    height: 1,
    depth: 1,
    material: ''
  };

  const allCategories = ['All', ...CATEGORIES];

  function getCategoryEmoji(category) {
    const emojis = {
      Chairs: '🪑',
      Tables: '🪵',
      Storage: '📚',
      Decor: '🖼️',
      Lighting: '💡',
      Plants: '🪴',
      Rugs: '🟫',
      Other: '📦'
    };
    return emojis[category] || '📦';
  }

  onMount(async () => {
    await inventory.load();
    loading = false;
  });

  $: filteredItems = $inventory
    .filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) &&
            !item.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeFilter !== 'All' && item.category !== activeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  function startScan() {
    showScanWizard = true;
    scanStep = 1;
    capturedImage = null;
    scanForm = {
      name: '',
      category: 'Other',
      width: 1,
      height: 1,
      depth: 1,
      material: ''
    };
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      capturedImage = e.target.result;
      scanStep = 2;
      
      // Simulate processing (OpenCV not available yet)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10 + Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setTimeout(() => {
            scanStep = 3;
          }, 400);
        }
      }, 300);
    };
    reader.readAsDataURL(file);
  }

  async function saveScannedItem() {
    if (!scanForm.name.trim()) {
      toast.error('Please name your item');
      return;
    }

    await inventory.add({
      name: scanForm.name.trim(),
      category: scanForm.category,
      dimensions: {
        width: scanForm.width,
        height: scanForm.height,
        depth: scanForm.depth
      },
      thumbnail: capturedImage,
      material: scanForm.material,
      modelData: { type: 'photo', image: capturedImage }
    });

    toast.success(`"${scanForm.name}" added to inventory!`);
    showScanWizard = false;
  }

  async function deleteItem(id, name) {
    if (confirm(`Delete "${name}" from inventory?`)) {
      await inventory.remove(id);
      toast.info(`"${name}" deleted`);
    }
  }
</script>

<div class="page-container">
  <!-- Header -->
  <header class="page-header">
    <h1>📦 Inventory</h1>
    <p class="subtitle">Your furniture warehouse</p>
  </header>

  <!-- Search -->
  <div class="search-box">
    <span>🔍</span>
    <input
      type="search"
      bind:value={searchQuery}
      placeholder="Search items..."
      aria-label="Search inventory"
    />
  </div>

  <!-- Filters -->
  <div class="filter-row">
    <div class="category-scroll">
      {#each allCategories as cat}
        <button
          class="filter-chip"
          class:active={activeFilter === cat}
          on:click={() => activeFilter = cat}
        >
          {cat}
        </button>
      {/each}
    </div>
    
    <select bind:value={sortBy} class="sort-select" aria-label="Sort by">
      <option value="recent">Recent</option>
      <option value="name">A–Z</option>
    </select>
  </div>

  <!-- Content -->
  {#if loading}
    <div class="skeleton-grid">
      {#each Array(6) as _}
        <Skeleton height="140px" borderRadius="12px" />
      {/each}
    </div>

  {:else if filteredItems.length === 0}
    <EmptyState
      icon="📦"
      title={$inventory.length === 0 ? 'No furniture yet' : 'No items match'}
      description={$inventory.length === 0
        ? 'Add furniture pieces to start building your digital warehouse.'
        : 'Try a different search or category.'}
      ctaText={$inventory.length === 0 ? 'Add Item' : ''}
      onCta={$inventory.length === 0 ? startScan : null}
    />

  {:else}
    <div class="item-grid">
      {#each filteredItems as item}
        <div class="item-card">
          <div class="item-thumb">
            {#if item.thumbnail}
              <img src={item.thumbnail} alt={item.name} />
            {:else}
              <span class="item-emoji">{getCategoryEmoji(item.category)}</span>
            {/if}
          </div>
          
          <div class="item-info">
            <h3>{item.name}</h3>
            <span class="item-cat">{item.category}</span>
            <span class="item-dims">
              {item.dimensions?.width || 1}×{item.dimensions?.depth || 1}×{item.dimensions?.height || 1}m
            </span>
          </div>
          
          <button
            class="item-delete"
            on:click={() => deleteItem(item.id, item.name)}
            aria-label="Delete {item.name}"
          >🗑️</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- FAB -->
  <button class="fab" on:click={startScan} aria-label="Add furniture">
    +
  </button>
</div>

<!-- Scan Modal -->
<Modal
  open={showScanWizard}
  title={scanStep === 1 ? 'Add Furniture' : scanStep === 2 ? 'Processing...' : 'Item Details'}
  on:close={() => showScanWizard = false}
>
  {#if scanStep === 1}
    <div class="capture-area">
      <div class="capture-placeholder">
        <span class="capture-icon">📷</span>
        <p>Add a photo of your furniture</p>
      </div>
      
      <label class="upload-btn">
        <input type="file" accept="image/*" capture="environment" on:change={handleFileUpload} hidden />
        📸 Take Photo
      </label>
      
      <label class="upload-btn secondary">
        <input type="file" accept="image/*" on:change={handleFileUpload} hidden />
        🖼️ Choose from Gallery
      </label>
      
      <button class="btn-link" on:click={() => scanStep = 4}>
        Skip photo — manual entry
      </button>
    </div>

  {:else if scanStep === 2}
    <div class="processing-area">
      <img src={capturedImage} alt="Processing" class="processing-preview" />
      <div class="progress-bar">
        <div class="progress-fill" style="width: 100%; animation: progress 2s ease;"></div>
      </div>
      <p class="processing-msg">Processing photo...</p>
    </div>

  {:else if scanStep === 3 || scanStep === 4}
    <form on:submit|preventDefault={saveScannedItem} class="details-form">
      {#if capturedImage}
        <img src={capturedImage} alt="Preview" class="form-preview" />
      {/if}

      <label for="item-name">Item name *</label>
      <input id="item-name" type="text" bind:value={scanForm.name} placeholder="e.g., Green Armchair" required />

      <label for="item-category">Category</label>
      <select id="item-category" bind:value={scanForm.category}>
        {#each CATEGORIES as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>

      <fieldset>
        <legend>Dimensions (metres)</legend>
        <div class="dimension-inputs">
          <div>
            <label for="dim-w">Width</label>
            <input id="dim-w" type="number" bind:value={scanForm.width} min="0.1" max="10" step="0.1" />
          </div>
          <div>
            <label for="dim-h">Height</label>
            <input id="dim-h" type="number" bind:value={scanForm.height} min="0.1" max="10" step="0.1" />
          </div>
          <div>
            <label for="dim-d">Depth</label>
            <input id="dim-d" type="number" bind:value={scanForm.depth} min="0.1" max="10" step="0.1" />
          </div>
        </div>
      </fieldset>

      <label for="item-material">Material</label>
      <input id="item-material" type="text" bind:value={scanForm.material} placeholder="e.g., Velvet, Oak, Metal" />

      <div class="form-actions">
        <button type="button" class="btn-secondary" on:click={() => showScanWizard = false}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={!scanForm.name.trim()}>
          Save Item
        </button>
      </div>
    </form>
  {/if}
</Modal>

<style>
  .page-header { margin-bottom: 1rem; }
  .subtitle { color: #888; font-size: 0.85rem; }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff;
    padding: 0.6rem 0.85rem;
    border-radius: 12px;
    margin-bottom: 0.6rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .search-box input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 0.95rem;
    background: transparent;
  }

  .filter-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .category-scroll {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    flex: 1;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }

  .filter-chip {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    white-space: nowrap;
    background: #f0f0f0;
    transition: all 0.15s;
  }

  .filter-chip.active {
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
  }

  .sort-select {
    padding: 0.4rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  /* Grid */
  .item-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .item-card {
    position: relative;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    overflow: hidden;
    padding-bottom: 0.6rem;
  }

  .item-thumb {
    height: 110px;
    background: #E8F3E0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .item-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-emoji {
    font-size: 2.5rem;
  }

  .item-info {
    padding: 0.5rem 0.6rem 0;
  }

  .item-info h3 {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .item-cat {
    font-size: 0.7rem;
    color: #2D5A27;
    font-weight: 500;
    display: block;
  }

  .item-dims {
    font-size: 0.65rem;
    color: #888;
  }

  .item-delete {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    padding: 0.3rem 0.4rem;
    background: rgba(255,255,255,0.9);
    border-radius: 50%;
    font-size: 0.8rem;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .item-card:active .item-delete {
    opacity: 1;
  }

  .fab {
    position: fixed;
    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
    right: 1.25rem;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #1E3D1E;
    color: #fff;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 50;
  }

  /* Scan wizard */
  .capture-area {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .capture-placeholder {
    text-align: center;
    padding: 1.5rem;
    color: #666;
  }

  .capture-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .upload-btn {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.85rem;
    border-radius: 10px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .upload-btn.secondary {
    background: #f0f0f0;
    color: #1a1a1a;
  }

  .processing-area {
    text-align: center;
  }

  .processing-preview {
    width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .progress-bar {
    height: 8px;
    background: #e8e8e8;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: #1E3D1E;
    border-radius: 4px;
    transform-origin: left;
  }

  @keyframes progress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  .processing-msg {
    color: #666;
    font-size: 0.85rem;
  }

  .form-preview {
    width: 100%;
    max-height: 150px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .details-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .details-form label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
  }

  .details-form input,
  .details-form select {
    padding: 0.6rem 0.75rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
    width: 100%;
  }

  fieldset {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0.6rem;
  }

  legend {
    font-size: 0.75rem;
    font-weight: 600;
    color: #555;
    padding: 0 0.4rem;
  }

  .dimension-inputs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .dimension-inputs label {
    font-size: 0.65rem;
    display: block;
    margin-bottom: 0.15rem;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    background: #f0f0f0;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.65rem 1.5rem;
    border-radius: 8px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary:disabled {
    opacity: 0.5;
  }

  .btn-link {
    color: #666;
    text-decoration: underline;
    font-size: 0.8rem;
    padding: 0.5rem;
  }

  @media (min-width: 768px) {
    .item-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .fab {
      bottom: 2rem;
    }
  }
</style>