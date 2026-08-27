<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import { furnitureLibrary, FURNITURE_SHAPES } from '$lib/data/furnitureLibrary.js';
  import { inventory } from '$lib/stores/inventory.js';
  import { toast } from '$lib/stores/app.js';

  export let open = false;
  export let roomName = '';

  const dispatch = createEventDispatcher();

  let showAddForm = false;
  let formName = '';
  let formShape = 'box';
  let formColor = '#A89A82';
  let formWidth = 0.6;
  let formHeight = 0.6;
  let formDepth = 0.6;

  onMount(() => {
    inventory.load();
  });

  // Catalogue items already carry {label, shape, category, dimensions, color}.
  // Inventory items use {name, shape, category, dimensions, color} — map
  // `name` to `label` so both sources hand the parent page an identical
  // shape via the `pick` event.
  function pickCatalogue(tpl) {
    dispatch('pick', tpl);
  }

  function pickInventoryItem(item) {
    dispatch('pick', {
      label: item.name,
      shape: item.shape || 'box',
      category: item.category,
      dimensions: item.dimensions,
      color: item.color
    });
  }

  async function removeInventoryItem(e, item) {
    e.stopPropagation();
    await inventory.remove(item.id);
    toast.success(`"${item.name}" removed from your items`);
  }

  function openAddForm() {
    formName = '';
    formShape = 'box';
    formColor = '#A89A82';
    formWidth = 0.6;
    formHeight = 0.6;
    formDepth = 0.6;
    showAddForm = true;
  }

  async function submitAddForm() {
    if (!formName.trim()) return;
    const item = await inventory.add({
      name: formName.trim(),
      shape: formShape,
      color: formColor,
      dimensions: { width: formWidth, height: formHeight, depth: formDepth }
    });
    showAddForm = false;
    if (item) toast.success(`"${item.name}" added to your items`);
  }

  function close() {
    showAddForm = false;
    dispatch('close');
  }
</script>

<Modal {open} title={roomName ? `Furnish ${roomName}` : 'Add Furniture'} on:close={close}>
  {#if showAddForm}
    <div class="add-form">
      <label class="form-label" for="custom-item-name">Item name</label>
      <input id="custom-item-name" class="input" type="text" bind:value={formName} placeholder="e.g. Grandma's rocking chair" />

      <label class="form-label" for="custom-item-shape">Shape</label>
      <select id="custom-item-shape" class="input" bind:value={formShape}>
        {#each FURNITURE_SHAPES as s}
          <option value={s.value}>{s.label}</option>
        {/each}
      </select>

      <label class="form-label" for="custom-item-color">Colour</label>
      <input id="custom-item-color" class="input input-color" type="color" bind:value={formColor} />

      <div class="dims-row">
        <div>
          <label class="form-label" for="custom-item-width">Width (m)</label>
          <input id="custom-item-width" class="input" type="number" bind:value={formWidth} min="0.1" max="10" step="0.1" />
        </div>
        <div>
          <label class="form-label" for="custom-item-height">Height (m)</label>
          <input id="custom-item-height" class="input" type="number" bind:value={formHeight} min="0.1" max="10" step="0.1" />
        </div>
        <div>
          <label class="form-label" for="custom-item-depth">Depth (m)</label>
          <input id="custom-item-depth" class="input" type="number" bind:value={formDepth} min="0.1" max="10" step="0.1" />
        </div>
      </div>

      <div class="form-actions">
        <button class="btn btn-secondary" on:click={() => showAddForm = false}>Cancel</button>
        <button class="btn btn-primary" on:click={submitAddForm} disabled={!formName.trim()}>Save item</button>
      </div>
    </div>
  {:else}
    <div class="section-header">
      <h3>Your items</h3>
      <button class="add-btn" on:click={openAddForm} aria-label="Add custom item">+</button>
    </div>

    {#if $inventory.length === 0}
      <p class="empty-hint">No custom items yet — tap + to add your own furniture.</p>
    {:else}
      <div class="furniture-grid">
        {#each $inventory as item (item.id)}
          <button class="furniture-card" on:click={() => pickInventoryItem(item)}>
            <button class="remove-btn" on:click={(e) => removeInventoryItem(e, item)} aria-label="Remove {item.name}">×</button>
            {#if item.thumbnail}
              <img class="furniture-thumb" src={item.thumbnail} alt="" />
            {:else}
              <div class="furniture-preview" style="background: {item.color || '#A89A82'};"></div>
            {/if}
            <span class="furniture-label">{item.name}</span>
            <span class="furniture-dims">
              {item.dimensions?.width ?? '?'}×{item.dimensions?.depth ?? '?'}m
            </span>
          </button>
        {/each}
      </div>
    {/if}

    <h3 class="section-title">Catalogue</h3>
    <div class="furniture-grid">
      {#each furnitureLibrary as tpl}
        <button class="furniture-card" on:click={() => pickCatalogue(tpl)}>
          <div class="furniture-preview" style="background: {tpl.color};"></div>
          <span class="furniture-label">{tpl.label}</span>
          <span class="furniture-dims">
            {tpl.dimensions.width}×{tpl.dimensions.depth}m
          </span>
        </button>
      {/each}
    </div>
  {/if}
</Modal>

<style>
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .section-header h3,
  .section-title {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .section-title {
    margin: var(--space-4) 0 var(--space-2);
  }

  .add-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: white;
    font-size: var(--text-lg);
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-btn:active {
    transform: scale(0.92);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--text-muted);
    padding: var(--space-2) 0 var(--space-4);
  }

  .furniture-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    max-height: 40vh;
    overflow-y: auto;
    padding-bottom: var(--space-2);
  }

  .furniture-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 2px solid transparent;
    transition: all var(--transition-fast);
  }

  .furniture-card:active {
    border-color: var(--primary);
    background: var(--primary-light);
  }

  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-full);
    background: var(--surface);
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
    font-size: 12px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .furniture-preview {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
  }

  .furniture-thumb {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    object-fit: cover;
  }

  .furniture-label {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text);
    text-align: center;
  }

  .furniture-dims {
    font-size: 10px;
    color: var(--text-secondary);
  }

  /* Add-custom-item form */
  .add-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-label {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-secondary);
    margin-top: var(--space-2);
  }

  .input-color {
    height: 40px;
    padding: var(--space-1);
  }

  .dims-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .form-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .form-actions .btn {
    flex: 1;
  }
</style>
