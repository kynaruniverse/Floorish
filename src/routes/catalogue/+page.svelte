<script>
  import { onMount } from 'svelte';
  import { toast } from '$stores/app.js';
  import { inventory } from '$stores/inventory.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let searchQuery = '';
  let activeCategory = 'Popular';
  let sortBy = 'popular';
  let catalogueItems = [];
  let selectedItem = null;
  let showItemModal = false;
  let showUploadModal = false;

  const categories = ['Popular', 'Chairs', 'Sofas', 'Shelves', 'Lights', 'Plants', 'Art', 'Misc'];

  const mockCatalogue = [
    { id: '1', name: 'Mid-Century Armchair', creator: 'sara_designs', category: 'Chairs', downloads: 1234, hearts: 340, thumbnail: '🪑', licence: 'CC0', dims: { width: 0.8, height: 0.9, depth: 0.85 } },
    { id: '2', name: 'Monstera Deliciosa', creator: 'plant_lover', category: 'Plants', downloads: 2891, hearts: 567, thumbnail: '🪴', licence: 'CC-BY', dims: { width: 0.6, height: 1.2, depth: 0.6 } },
    { id: '3', name: 'Industrial Pendant Light', creator: 'loft_studio', category: 'Lights', downloads: 891, hearts: 234, thumbnail: '💡', licence: 'CC0', dims: { width: 0.3, height: 0.5, depth: 0.3 } },
    { id: '4', name: 'Scandinavian Bookshelf', creator: 'nordic_home', category: 'Shelves', downloads: 1567, hearts: 423, thumbnail: '📚', licence: 'CC-BY-SA', dims: { width: 1.2, height: 2.0, depth: 0.3 } },
    { id: '5', name: 'Vintage Persian Rug', creator: 'textile_art', category: 'Misc', downloads: 2100, hearts: 678, thumbnail: '🟫', licence: 'CC0', dims: { width: 2.0, height: 0.01, depth: 3.0 } },
    { id: '6', name: 'Minimalist Desk Lamp', creator: 'design_daily', category: 'Lights', downloads: 654, hearts: 189, thumbnail: '🔦', licence: 'CC0', dims: { width: 0.2, height: 0.4, depth: 0.2 } },
    { id: '7', name: 'Velvet Sectional Sofa', creator: 'cozy_spaces', category: 'Sofas', downloads: 3456, hearts: 890, thumbnail: '🛋️', licence: 'CC-BY', dims: { width: 2.5, height: 0.9, depth: 1.5 } },
    { id: '8', name: 'Gallery Wall Frame Set', creator: 'art_curator', category: 'Art', downloads: 1789, hearts: 456, thumbnail: '🖼️', licence: 'CC0', dims: { width: 0.5, height: 0.7, depth: 0.05 } }
  ];

  function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  function formatDims(dims) {
    if (!dims) return '—';
    return `${dims.width}×${dims.height}×${dims.depth}m`;
  }

  onMount(async () => {
    await inventory.load();
    await new Promise(r => setTimeout(r, 500));
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
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.downloads - a.downloads;
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
      dimensions: item.dims,
      modelData: { type: 'catalogue', sourceId: item.id }
    });
    toast.success(`"${item.name}" added to inventory!`);
  }

  function openUpload() {
    if ($inventory.length === 0) {
      toast.info('Add items to your inventory first');
      return;
    }
    showUploadModal = true;
  }

  function shareToCatalogue(item) {
    toast.success(`"${item.name}" shared!`);
    showUploadModal = false;
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>🛋️ Catalogue</h1>
    <p class="subtitle">Community furniture</p>
  </header>

  <!-- Search -->
  <div class="search-box">
    <span>🔍</span>
    <input type="search" bind:value={searchQuery} placeholder="Search..." aria-label="Search catalogue" />
  </div>

  <!-- Categories -->
  <div class="category-scroll">
    {#each categories as cat}
      <button class="cat-chip" class:active={activeCategory === cat} on:click={() => activeCategory = cat}>
        {cat}
      </button>
    {/each}
  </div>

  <!-- Sort -->
  <div class="sort-row">
    <span>{filteredItems.length} items</span>
    <select bind:value={sortBy} aria-label="Sort">
      <option value="popular">Popular</option>
      <option value="hearts">Loved</option>
    </select>
  </div>

  <!-- Grid -->
  {#if loading}
    <div class="skeleton-grid">
      {#each Array(6) as _}
        <Skeleton height="150px" borderRadius="12px" />
      {/each}
    </div>

  {:else if filteredItems.length === 0}
    <EmptyState
      icon="🔍"
      title="No items found"
      description="Try a different search."
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
            <span class="creator">@{item.creator}</span>
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

  <!-- FAB -->
  <button class="fab" on:click={openUpload} aria-label="Share">📤</button>
</div>

<!-- Item Modal -->
<Modal open={showItemModal} title={selectedItem?.name || ''} on:close={() => showItemModal = false}>
  {#if selectedItem}
    <div class="item-detail">
      <div class="detail-preview">
        <span class="detail-emoji">{selectedItem.thumbnail}</span>
      </div>

      <div class="detail-row"><span>Creator</span><span>@{selectedItem.creator}</span></div>
      <div class="detail-row"><span>Category</span><span>{selectedItem.category}</span></div>
      <div class="detail-row"><span>Dimensions</span><span>{formatDims(selectedItem.dims)}</span></div>
      <div class="detail-row"><span>Licence</span><span class="tag">{selectedItem.licence}</span></div>

      <button class="btn-primary btn-block" on:click={() => { addToInventory(selectedItem); showItemModal = false; }}>
        📦 Add to My Items
      </button>
    </div>
  {/if}
</Modal>

<!-- Upload Modal -->
<Modal open={showUploadModal} title="Share to Catalogue" on:close={() => showUploadModal = false}>
  <p class="upload-hint">Select an item to share:</p>

  {#if $inventory.length === 0}
    <EmptyState mode="compact" icon="📦" title="No items" />
  {:else}
    <div class="upload-list">
      {#each $inventory as item}
        <div class="upload-item">
          <span>📦</span>
          <div class="upload-info">
            <strong>{item.name}</strong>
            <span>{item.category}</span>
          </div>
          <button class="btn-small" on:click={() => shareToCatalogue(item)}>Share</button>
        </div>
      {/each}
    </div>
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
  }

  .category-scroll {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    padding-bottom: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .cat-chip {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    white-space: nowrap;
    background: #f0f0f0;
  }

  .cat-chip.active {
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
  }

  .sort-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #888;
    margin-bottom: 0.75rem;
  }

  .catalogue-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .catalogue-card {
    position: relative;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    text-align: left;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .card-thumb {
    height: 100px;
    background: #E8F3E0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumb-emoji { font-size: 2.5rem; }

  .card-body { padding: 0.6rem; }
  .card-body h3 { font-size: 0.82rem; margin-bottom: 0.1rem; }
  .creator { font-size: 0.7rem; color: #2D5A27; }
  .card-stats { font-size: 0.68rem; color: #888; margin-top: 0.25rem; display: flex; gap: 0.6rem; }

  .licence-badge {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    background: rgba(255,255,255,0.9);
    padding: 0.15rem 0.4rem;
    border-radius: 8px;
    font-size: 0.6rem;
    font-weight: 600;
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
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 50;
  }

  .item-detail {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .detail-preview {
    height: 140px;
    background: #E8F3E0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-emoji { font-size: 3.5rem; }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .detail-row span:first-child { color: #888; }

  .tag {
    background: #E8F3E0;
    color: #1E3D1E;
    padding: 0.15rem 0.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .btn-primary {
    padding: 0.75rem;
    border-radius: 10px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    width: 100%;
  }

  .upload-hint { color: #888; font-size: 0.85rem; }

  .upload-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .upload-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem;
    background: #f5f5f5;
    border-radius: 10px;
  }

  .upload-info { flex: 1; }
  .upload-info strong { font-size: 0.85rem; }
  .upload-info span { font-size: 0.7rem; color: #888; }

  .btn-small {
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.75rem;
  }

  @media (min-width: 768px) {
    .catalogue-grid { grid-template-columns: repeat(3, 1fr); }
    .fab { bottom: 2rem; }
  }
</style>