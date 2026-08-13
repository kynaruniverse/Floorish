<script>
  import { toasts, removeToast } from '$lib/stores/app.js';
</script>

<div class="toast-container" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}">
      <span class="toast-icon">
        {#if toast.type === 'success'}✓
        {:else if toast.type === 'error'}✕
        {:else}ℹ{/if}
      </span>
      <span class="toast-message">{toast.message}</span>
      <button class="toast-dismiss" on:click={() => removeToast(toast.id)} aria-label="Dismiss">✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom, 0px));
    left: var(--space-4);
    right: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    z-index: 9999;
    pointer-events: none;
    max-width: var(--max-width);
    margin: 0 auto;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    font-size: var(--text-sm);
    animation: slideUp var(--transition-base);
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .toast-success .toast-icon {
    background: var(--success);
    color: #fff;
  }

  .toast-error .toast-icon {
    background: var(--error);
    color: #fff;
  }

  .toast-info .toast-icon {
    background: var(--info);
    color: #fff;
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  .toast-dismiss {
    color: var(--text-muted);
    font-size: var(--text-sm);
    padding: var(--space-1);
    flex-shrink: 0;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>