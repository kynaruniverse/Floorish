<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  export let open = false;
  export let title = '';
  export let size = 'medium'; // small | medium | large | fullscreen
  export let dismissable = true;
  export let showCloseButton = true;
  
  const dispatch = createEventDispatcher();
  let modalEl = null;
  let previouslyFocused = null;

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

  // Lock body scroll when modal is open
  onMount(() => {
    const originalOverflow = document.body.style.overflow;
    
    if (open) {
      document.body.style.overflow = 'hidden';
      previouslyFocused = document.activeElement;
      
      // Focus the modal
      setTimeout(() => {
        modalEl?.focus();
      }, 100);
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="modal-backdrop"
    on:click={close}
    on:touchend={(e) => {
      // Only close if tap was on backdrop, not content
      if (e.target === e.currentTarget && dismissable) close();
    }}
    transition:fade={{ duration: 200 }}
    role="presentation"
  >
    <div
      class="modal-content modal-{size}"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      tabindex="-1"
      bind:this={modalEl}
      on:click|stopPropagation
      on:touchend|stopPropagation
      transition:fly={{ y: 30, duration: 250, easing: (t) => 1 - Math.pow(1 - t, 3) }}
    >
      <!-- Mobile drag handle -->
      <div class="drag-handle" aria-hidden="true">
        <span></span>
      </div>

      <!-- Header -->
      <div class="modal-header">
        {#if title}
          <h2>{title}</h2>
        {:else}
          <span></span>
        {/if}
        
        {#if showCloseButton && dismissable}
          <button
            class="modal-close"
            on:click={close}
            aria-label="Close dialog"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Body -->
      <div class="modal-body">
        <slot />
      </div>

      <!-- Footer slot (optional) -->
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
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 0;
  }

  .modal-content {
    background: #fff;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 560px;
    max-height: 88vh;
    overflow-y: auto;
    padding: 1rem 1.25rem 1.25rem;
    outline: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* Size variants */
  .modal-small { max-width: 360px; }
  .modal-medium { max-width: 560px; }
  .modal-large { max-width: 720px; }
  .modal-fullscreen {
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  /* Drag handle for mobile */
  .drag-handle {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0 0.75rem;
    margin-bottom: 0.25rem;
  }

  .drag-handle span {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    min-height: 32px;
  }

  .modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    color: #666;
    background: #f5f5f5;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .modal-close:hover,
  .modal-close:active {
    background: #e8e8e8;
  }

  .modal-body {
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .modal-footer {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  /* Desktop styles */
  @media (min-width: 768px) {
    .modal-backdrop {
      align-items: center;
      padding: 1.5rem;
    }

    .modal-content {
      border-radius: 16px;
      max-height: 80vh;
    }

    .drag-handle {
      display: none;
    }

    .modal-fullscreen {
      max-width: 90%;
      height: 85vh;
      max-height: 85vh;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop,
    .modal-content {
      animation: none;
      transition: none;
    }
  }
</style>