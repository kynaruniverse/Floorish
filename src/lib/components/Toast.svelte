<script>
  import { toasts, removeToast } from '$stores/app.js';
</script>

<div class="toast-container" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      role="status"
      in:fly={{ y: 20, duration: 200 }}
      out:fade={{ duration: 150 }}
    >
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
    position: fixed; bottom: 5.5rem; left: 1rem; right: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    z-index: 300; pointer-events: none;
  }
  .toast {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md);
    background: var(--charcoal); color: white;
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    animation: toastIn 0.3s ease;
  }
  .toast-success { border-left: 4px solid var(--success); }
  .toast-error { border-left: 4px solid var(--error); }
  .toast-info { border-left: 4px solid var(--info); }
  .toast-icon { font-weight: bold; flex-shrink: 0; }
  .toast-message { flex: 1; font-size: 0.875rem; }
  .toast-dismiss {
    color: var(--grey-400); font-size: 0.875rem;
    padding: 0.25rem; flex-shrink: 0;
  }
  @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } }
</style>