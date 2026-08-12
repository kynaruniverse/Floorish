<script>
  import { createEventDispatcher } from 'svelte';
  export let open = false;
  export let title = '';
  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" on:click={close} role="dialog" aria-modal="true" aria-label={title}>
    <div class="modal-content" on:click|stopPropagation>
      {#if title}
        <div class="modal-header">
          <h2>{title}</h2>
          <button class="modal-close" on:click={close} aria-label="Close">✕</button>
        </div>
      {/if}
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }
  .modal-content {
    background: var(--white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    width: 100%; max-width: 600px; max-height: 85vh;
    overflow-y: auto;
    padding: 1.5rem;
    animation: slideUp 0.3s ease;
  }
  .modal-header {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 1rem;
  }
  .modal-close {
    font-size: 1.25rem; color: var(--grey-600);
    padding: 0.5rem; border-radius: 50%;
  }
  @media (min-width: 768px) {
    .modal-backdrop { align-items: center; }
    .modal-content { border-radius: var(--radius-lg); margin: 2rem; }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>