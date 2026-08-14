<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { furnitureLibrary } from '$lib/data/furnitureLibrary.js';

  export let open = false;
  export let roomName = '';

  const dispatch = createEventDispatcher();

  function pick(tpl) {
    dispatch('pick', tpl);
  }

  function close() {
    dispatch('close');
  }
</script>

<Modal {open} title={roomName ? `Furnish ${roomName}` : 'Add Furniture'} on:close={close}>
  <div class="furniture-grid">
    {#each furnitureLibrary as tpl}
      <button class="furniture-card" on:click={() => pick(tpl)}>
        <div class="furniture-preview" style="background: {tpl.color};"></div>
        <span class="furniture-label">{tpl.label}</span>
        <span class="furniture-dims">
          {tpl.dimensions.width}×{tpl.dimensions.depth}m
        </span>
      </button>
    {/each}
  </div>
</Modal>

<style>
  .furniture-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    max-height: 60vh;
    overflow-y: auto;
    padding-bottom: var(--space-2);
  }

  .furniture-card {
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

  .furniture-preview {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
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
</style>
