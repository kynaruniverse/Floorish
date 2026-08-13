<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let open = false;
  export let title = '';
  export let showCloseButton = true;
  export let dismissable = true;

  const dispatch = createEventDispatcher();

  function close() {
    if (dismissable) {
      dispatch('close');
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && dismissable) {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="modal-backdrop"
    on:click={close}
    transition:fade={{ duration: 150 }}
    role="presentation"
  >
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      on:click|stopPropagation
      transition:fly={{ y: 40, duration: 250 }}
    >
      <!-- Drag handle -->
      <div class="drag-handle" aria-hidden="true"></div>

      <!-- Header -->
      <div class="modal-header">
        {#if title}
          <h2>{title}</h2>
        {:else}
          <span></span>
        {/if}
        
        {#if showCloseButton && dismissable}
          <button class="modal-close" on:click={close} aria-label="Close">
            ✕
          </button>
        {/if}
      </div>

      <!-- Content -->
      <div class="modal-body">
        <slot />
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--surface);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    width: 100%;
    max-width: var(--max-width);
    max-height: 85vh;
    overflow-y: auto;
    padding: var(--space-4);
    padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .drag-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 0 auto var(--space-3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
    min-height: 32px;
  }

  .modal-header h2 {
    font-size: var(--text-lg);
    font-weight: 700;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: var(--surface-hover);
    font-size: var(--text-sm);
    flex-shrink: 0;
  }

  .modal-body {
    font-size: var(--text-base);
    line-height: 1.5;
  }

  .modal-footer {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  @media (min-width: 768px) {
    .modal-backdrop {
      align-items: center;
      padding: var(--space-5);
    }

    .modal-content {
      border-radius: var(--radius-lg);
      max-height: 75vh;
    }

    .drag-handle {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop,
    .modal-content {
      animation: none;
      transition: none;
    }
  }
</style>