<script>
  import { fly, fade } from 'svelte/transition';
  import { toasts, removeToast } from '$stores/app.js';

  export let position = 'bottom'; // bottom | top | top-right

  function getToastIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }

  function getToastColor(type) {
    switch (type) {
      case 'success': return '#2E7D32';
      case 'error': return '#C62828';
      case 'warning': return '#E65100';
      default: return '#1565C0';
    }
  }
</script>

<div class="toast-container toast-{position}" aria-live="polite" role="region" aria-label="Notifications">
  {#each $toasts as toast, index (toast.id)}
    <div
      class="toast toast-{toast.type}"
      role="status"
      in:fly={{ y: 20, duration: 200, delay: index * 50 }}
      out:fade={{ duration: 150 }}
    >
      <!-- Coloured icon -->
      <span class="toast-icon" style="background: {getToastColor(toast.type)};">
        {getToastIcon(toast.type)}
      </span>
      
      <!-- Message -->
      <span class="toast-message">{toast.message}</span>
      
      <!-- Optional action button -->
      {#if toast.action}
        <button
          class="toast-action"
          on:click={() => {
            toast.onAction?.();
            removeToast(toast.id);
          }}
        >
          {toast.action}
        </button>
      {/if}
      
      <!-- Dismiss -->
      <button
        class="toast-dismiss"
        on:click={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
      
      <!-- Progress bar -->
      {#if toast.duration > 0}
        <div
          class="toast-progress"
          style="
            background: {getToastColor(toast.type)};
            animation-duration: {toast.duration}ms;
          "
        ></div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    left: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 9999;
    pointer-events: none;
    max-width: 420px;
    margin: 0 auto;
  }

  /* Positions */
  .toast-bottom {
    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }

  .toast-top {
    top: calc(1rem + env(safe-area-inset-top, 0px));
  }

  .toast-top-right {
    top: calc(1rem + env(safe-area-inset-top, 0px));
    right: 1rem;
    left: auto;
  }

  /* Toast */
  .toast {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    background: #fff;
    color: #1a1a1a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06);
    pointer-events: auto;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    max-width: 100%;
  }

  /* Coloured left border */
  .toast::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  .toast-success::before { background: #2E7D32; }
  .toast-error::before { background: #C62828; }
  .toast-warning::before { background: #E65100; }
  .toast-info::before { background: #1565C0; }

  /* Icon */
  .toast-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  /* Message */
  .toast-message {
    flex: 1;
    font-size: 0.85rem;
    line-height: 1.4;
    font-weight: 500;
    min-width: 0;
    word-wrap: break-word;
  }

  /* Action button */
  .toast-action {
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #f0f0f0;
    color: #1a1a1a;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .toast-action:hover {
    background: #e0e0e0;
  }

  /* Dismiss */
  .toast-dismiss {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 0.8rem;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .toast-dismiss:hover {
    background: #f0f0f0;
    color: #555;
  }

  /* Progress bar */
  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    transform-origin: left;
    animation-name: toastProgress;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  @keyframes toastProgress {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .toast {
      background: #2a2a2a;
      color: #f5f5f5;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
    .toast-action {
      background: #3a3a3a;
      color: #f5f5f5;
    }
    .toast-dismiss {
      color: #888;
    }
    .toast-dismiss:hover {
      background: #3a3a3a;
      color: #ccc;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toast-progress {
      animation: none;
    }
  }
</style>