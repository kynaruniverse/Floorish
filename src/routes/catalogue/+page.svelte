<script>
  import { onMount } from 'svelte';
  import { addToast } from '$stores/app.js';
  import { inventory } from '$stores/inventory.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let searchQuery = '';
  let activeCategory = 'Popular';
  let sortBy = 'popular';
  let catalogueItems = [];
  let showUploadModal = false;
  let selectedItem = null;
  let showItemModal = false;

  const categories = ['Popular', 'New', 'Chairs', 'Sofas', 'Shelves', 'Lights', 'Plants', 'Art', 'Misc'];

  // Mock catalogue data
  const mockCatalogue = [
    { id: '1', name: 'Mid-Century Armchair', creator: 'sara_designs', category: 'Chairs', downloads: 1234, hearts: 340, thumbnail: '🪑', licence: 'CC0', dimensions: '0.8×0.9×0.85m', polyCount: '2.4K' },
    { id: '2', name: 'Monstera Deliciosa', creator: 'plant_lover', category: 'Plants', downloads: 2891, hearts: 567, thumbnail: '🪴', licence: 'CC-BY', dimensions: '0.6×1.2×0.6m', polyCount: '5.1K' },
    { id: '3', name: 'Industrial Pendant Light', creator: 'loft_studio', category: 'Lights', downloads: 891, hearts: 234, thumbnail: '💡', licence: 'CC0', dimensions: '0.3×0.5×0.3m', polyCount: '1.2K' },
    { id: '4', name: 'Scandinavian Bookshelf', creator: 'nordic_home', category: 'Shelves', downloads: 1567, hearts: 423, thumbnail: '📚', licence: 'CC-BY-SA', dimensions: '1.2×2.0×0.3m', polyCount: '3.8K' },
    { id: '5', name: 'Vintage Persian Rug', creator: 'textile_art', category: 'Misc', downloads: 2100, hearts: 678, thumbnail: '🟫', licence: 'CC0', dimensions: '2.0×0.01×3.0m', polyCount: '0.8K' },
    { id: '6', name: 'Minimalist Desk Lamp', creator: 'design_daily', category: 'Lights', downloads: 654, hearts: 189, thumbnail: '🔦', licence: 'CC0', dimensions: '0.2×0.4×0.2m', polyCount: '1.5K' },
    { id: '7', name: 'Velvet Sectional Sofa', creator: 'cozy_spaces', category: 'Sofas', downloads: 3456, hearts: 890, thumbnail: '🛋️', licence: 'CC-BY', dimensions: '2.5×0.9×1.5m', polyCount: '8.2K' },
    { id: '8', name: 'Gallery Wall Frame Set', creator: 'art_curator', category: 'Art', downloads: 1789, hearts: 456, thumbnail: '🖼️', licence: 'CC0', dimensions: 'varies', polyCount: '0.6K' }
  ];

  onMount(async () => {
    await inventory.load();
    // Simulate loading catalogue
    await new Promise(r => setTimeout(r, 800));
    catalogueItems = mockCatalogue;
    loading = false;
  });

  $: filteredItems = catalogueItems
    .filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.creator.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeCategory === 'Popular') return true;
      if (activeCategory === 'New') return true; // would sort by date in real app
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads;
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'hearts') return b.hearts - a.hearts;
      return 0;
    });

  function viewItem(item) {
    selectedItem = item;
    showItemModal = true;
  }

  function addToInventory(item) {
    inventory.add({
      name: item.name,
      category: item.category,
      dimensions: parseDimensions(item.dimensions),
      modelData: { type: 'catalogue', sourceId: item.id },
      thumbnail: null
    });
    addToast(`"${item.name}" added to inventory!`, 'success');
  }

  function parseDimensions(dims) {
    const parts = dims.split('×').map(p => parseFloat(p));
    return {
      width: parts[0] || 1,
      height: parts[1] || 1,
      depth: parts[2] || 1
    };
  }

  function openUpload() {
    if ($inventory.length === 0) {
      addToast('Add items to your inventory first before sharing', 'info');
      return;
    }
    showUploadModal = true;
  }

  function shareToCatalogue(inventoryItem) {
    addToast(`"${inventoryItem.name}" shared to catalogue!`, 'success');
    showUploadModal = false;
    // In production: upload model to IPFS/sharing backend
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>🛋️ Catalogue</h1>
    <p class="subtitle">Community-shared furniture & decor</p>
  </header>

  <!-- Search -->
  <div class="search-box">
    <span>🔍</span>
    <input
      type="search"
      bind:value={searchQuery}
      placeholder="Search catalogue..."
      aria-label="Search catalogue"
    />
  </div>

  <!-- Categories -->
  <div class="category-scroll">
    {#each categories as cat}
      <button
        class="cat-chip"
        class:active={activeCategory === cat}
        on:click={() => activeCategory = cat}
      >
        {cat}
      </button>
    {/each}
  </div>

  <!-- Sort -->
  <div class="sort-row">
    <span>{filteredItems.length} items</span>
    <select bind:value={sortBy} aria-label="Sort by">
      <option value="popular">Most Popular</option>
      <option value="newest">Newest</option>
      <option value="hearts">Most Loved</option>
    </select>
  </div>

  <!-- Featured -->
  {#if !searchQuery && activeCategory === 'Popular'}
    <div class="featured-card">
      <div class="featured-badge">🔥 Featured Designer</div>
      <div class="featured-content">
        <span class="featured-emoji">🪑</span>
        <div>
          <h3>Mid-Century Collection</h3>
          <p>by @sara_designs</p>
          <span>⬇ 4.2k · ❤️ 1.1k</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Items grid -->
  {#if loading}
    <div class="skeleton-grid">
      {#each Array(6) as _}
        <Skeleton height="160px" borderRadius="12px" />
      {/each}
    </div>
  {:else if filteredItems.length === 0}
    <EmptyState
      icon="🔍"
      title="No items found"
      description="Try different search terms or browse another category."
    />
  {:else}
    <div class="catalogue-grid">
      {#each filteredItems as item}
        <button class="catalogue-card" on:click={() => viewItem(item)}>
          <div class="card-thumb">
            <span class="thumb-emoji">{item.thumbnail}</span>
          </div>
          <div class="card-body">
            <h3>{item.name}</h3>
            <span class="creator">by @{item.creator}</span>
            <div class="card-stats">
              <span>⬇ {formatNumber(item.downloads)}</span>
              <span>❤️ {formatNumber(item.hearts)}</span>
            </div>
          </div>
          <span class="licence-badge">{item.licence}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Upload FAB -->
  <button class="fab" on:click={openUpload} aria-label="Share to catalogue">
    📤
  </button>
</div>

<!-- Item Detail Modal -->
<Modal open={showItemModal} title={selectedItem?.name || ''} on:close={() => showItemModal = false}>
  {#if selectedItem}
    <div class="item-detail">
      <div class="detail-preview">
        <span class="detail-emoji">{selectedItem.thumbnail}</span>
      </div>
      
      <div class="detail-info">
        <div class="detail-row">
          <span>Creator</span>
          <span>@{selectedItem.creator}</span>
        </div>
        <div class="detail-row">
          <span>Category</span>
          <span>{selectedItem.category}</span>
        </div>
        <div class="detail-row">
          <span>Dimensions</span>
          <span>{selectedItem.dimensions}</span>
        </div>
        <div class="detail-row">
          <span>Poly count</span>
          <span>{selectedItem.polyCount}</span>
        </div>
        <div class="detail-row">
          <span>Licence</span>
          <span class="licence-tag">{selectedItem.licence}</span>
        </div>
        <div class="detail-row">
          <span>Downloads</span>
          <span>{formatNumber(selectedItem.downloads)}</span>
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn-primary" on:click={() => { addToInventory(selectedItem); showItemModal = false; }}>
          📦 Add to My Items
        </button>
        <button class="btn-icon" aria-label="Heart">
          ❤️
        </button>
        <button class="btn-icon report" aria-label="Report">
          ⚠️
        </button>
      </div>
    </div>
  {/if}
</Modal>

<!-- Upload Modal -->
<Modal open={showUploadModal} title="Share to Catalogue" on:close={() => showUploadModal = false}>
  <div class="upload-section">
    <p class="upload-hint">Select an item from your inventory to share with the community.</p>
    
    {#if $inventory.length === 0}
      <EmptyState icon="📦" title="No items to share" description="Scan some furniture first." />
    {:else}
      <div class="upload-list">
        {#each $inventory as item}
          <div class="upload-item">
            <span class="upload-emoji">📦</span>
            <div class="upload-info">
              <strong>{item.name}</strong>
              <span>{item.category}</span>
            </div>
            <div class="upload-licence">
              <select aria-label="Licence for {item.name}">
                <option value="CC0">CC0</option>
                <option value="CC-BY">CC-BY</option>
                <option value="CC-BY-SA">CC-BY-SA</option>
              </select>
            </div>
            <button class="btn-small" on:click={() => shareToCatalogue(item)}>
              Share
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Modal>

<style>
  .page-header { margin-bottom: 1rem; }
  .subtitle { color: var(--grey-600); font-size: 0.9rem; }

  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--white); padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    margin-bottom: 0.75rem;
  }
  .search-box input {
    flex: 1; border: none; font-size: 0.95rem; outline: none;
  }

  .category-scroll {
    display: flex; gap: 0.4rem; overflow-x: auto;
    padding-bottom: 0.5rem; margin-bottom: 0.5rem;
  }
  .cat-chip {
    padding: 0.45rem 0.85rem; border-radius: 20px;
    font-size: 0.78rem; white-space: nowrap;
    background: var(--grey-100); transition: all 0.15s;
  }
  .cat-chip.active { background: var(--green-700); color: white; font-weight: 600; }

  .sort-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.78rem; color: var(--grey-600); margin-bottom: 0.75rem;
  }
  .sort-row select {
    padding: 0.3rem 0.5rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.78rem;
  }

  .featured-card {
    background: linear-gradient(135deg, #E8F3E0, #D4E8C0);
    border-radius: var(--radius-md); padding: 1rem;
    margin-bottom: 1rem;
  }
  .featured-badge {
    font-size: 0.7rem; font-weight: 600; color: var(--green-700);
    margin-bottom: 0.5rem;
  }
  .featured-content {
    display: flex; align-items: center; gap: 0.75rem;
  }
  .featured-emoji { font-size: 2.5rem; }
  .featured-content h3 { font-family: var(--font-sans); font-size: 1rem; }
  .featured-content p { font-size: 0.8rem; color: var(--grey-600); }

  .catalogue-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
  }
  .skeleton-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
  }

  .catalogue-card {
    position: relative; background: var(--white);
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
    overflow: hidden; text-align: left; cursor: pointer;
    transition: box-shadow 0.2s; padding: 0;
  }
  .catalogue-card:hover { box-shadow: var(--shadow-md); }

  .card-thumb {
    height: 100px; background: var(--green-100);
    display: flex; align-items: center; justify-content: center;
  }
  .thumb-emoji { font-size: 2.5rem; }

  .card-body { padding: 0.65rem; }
  .card-body h3 { font-family: var(--font-sans); font-size: 0.82rem; margin-bottom: 0.15rem; }
  .creator { font-size: 0.7rem; color: var(--green-700); }
  .card-stats { display: flex; gap: 0.75rem; font-size: 0.7rem; color: var(--grey-600); margin-top: 0.3rem; }

  .licence-badge {
    position: absolute; top: 0.4rem; right: 0.4rem;
    background: rgba(255,255,255,0.9); padding: 0.15rem 0.4rem;
    border-radius: 8px; font-size: 0.6rem; font-weight: 600;
  }

  .fab {
    position: fixed; bottom: 6rem; right: 1.5rem;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--green-700); color: white;
    font-size: 1.4rem; display: flex; align-items: center;
    justify-content: center; box-shadow: var(--shadow-lg); z-index: 50;
  }

  /* Detail modal */
  .item-detail { display: flex; flex-direction: column; gap: 1rem; }
  .detail-preview {
    height: 180px; background: var(--green-100);
    border-radius: var(--radius-sm); display: flex;
    align-items: center; justify-content: center;
  }
  .detail-emoji { font-size: 4rem; }
  .detail-info { display: flex; flex-direction: column; gap: 0.4rem; }
  .detail-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
  .detail-row span:first-child { color: var(--grey-600); }
  .licence-tag {
    background: var(--green-100); color: var(--green-900);
    padding: 0.15rem 0.5rem; border-radius: 8px; font-weight: 600; font-size: 0.75rem;
  }
  .detail-actions { display: flex; gap: 0.5rem; }
  .detail-actions .btn-primary { flex: 1; }
  .btn-icon {
    width: 44px; height: 44px; border-radius: var(--radius-sm);
    background: var(--grey-100); font-size: 1.2rem;
    display: flex; align-items: center; justify-content: center;
  }
  .btn-icon.report { background: #FDECEA; }

  .btn-primary, .btn-small {
    padding: 0.75rem 1.25rem; border-radius: var(--radius-sm);
    background: var(--green-700); color: white; font-weight: 600;
  }
  .btn-small { padding: 0.4rem 0.75rem; font-size: 0.8rem; }

  /* Upload */
  .upload-hint { color: var(--grey-600); font-size: 0.85rem; margin-bottom: 1rem; }
  .upload-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .upload-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.65rem; background: var(--grey-100); border-radius: var(--radius-sm);
  }
  .upload-emoji { font-size: 1.5rem; }
  .upload-info { flex: 1; }
  .upload-info strong { display: block; font-size: 0.85rem; }
  .upload-info span { font-size: 0.7rem; color: var(--grey-600); }
  .upload-licence select {
    padding: 0.3rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.75rem;
  }

  @media (min-width: 768px) {
    .catalogue-grid { grid-template-columns: repeat(3, 1fr); }
    .fab { bottom: 2rem; }
  }
</style>

<script context="module">
  function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
</script>