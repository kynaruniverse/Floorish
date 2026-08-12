<script>
  export let icon = '🏠';
  export let title = 'Nothing here yet';
  export let description = '';
  export let ctaText = '';
  export let onCta = null;
</script>

<div class="empty-state">
  <span class="empty-icon">{icon}</span>
  <h3>{title}</h3>
  {#if description}
    <p>{description}</p>
  {/if}
  {#if ctaText && onCta}
    <button class="btn-primary" on:click={onCta}>{ctaText}</button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
    gap: 0.75rem;
  }
  .empty-icon { font-size: 3.5rem; margin-bottom: 0.5rem; }
  h3 { color: var(--charcoal); }
  p { color: var(--grey-600); max-width: 280px; line-height: 1.5; }
  .btn-primary {
    margin-top: 0.75rem;
    background: var(--green-700);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    transition: background 0.2s;
  }
  .btn-primary:hover, .btn-primary:active { background: var(--green-900); }
</style>