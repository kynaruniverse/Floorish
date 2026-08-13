<script>
  export let icon = '🏠';
  export let title = 'Nothing here yet';
  export let description = '';
  export let subtitle = '';
  export let ctaText = '';
  export let onCta = null;
  export let secondaryCtaText = '';
  export let onSecondaryCta = null;
  export let mode = 'centered'; // centered | inline | compact
  export let animateIcon = true;
</script>

<div class="empty-state empty-{mode}">
  <div class="empty-icon-wrapper" class:animated={animateIcon}>
    <span class="empty-icon">{icon}</span>
  </div>
  
  <h3>{title}</h3>
  
  {#if description}
    <p class="empty-desc">{description}</p>
  {/if}
  
  {#if subtitle}
    <p class="empty-subtitle">{subtitle}</p>
  {/if}
  
  {#if ctaText && onCta}
    <button class="btn-primary" on:click={onCta}>
      {ctaText}
    </button>
  {/if}
  
  {#if secondaryCtaText && onSecondaryCta}
    <button class="btn-link" on:click={onSecondaryCta}>
      {secondaryCtaText}
    </button>
  {/if}
  
  <!-- Custom content slot -->
  <slot />
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2.5rem 1.5rem;
    gap: 0.6rem;
    width: 100%;
  }

  /* Modes */
  .empty-centered {
    min-height: 300px;
  }

  .empty-inline {
    min-height: 150px;
    padding: 1.5rem 1rem;
    flex-direction: row;
    text-align: left;
    gap: 1rem;
  }

  .empty-inline .empty-icon-wrapper {
    flex-shrink: 0;
  }

  .empty-inline .empty-icon {
    font-size: 2rem;
  }

  .empty-compact {
    min-height: 80px;
    padding: 1rem;
    gap: 0.3rem;
  }

  .empty-compact .empty-icon {
    font-size: 1.5rem;
  }

  /* Icon */
  .empty-icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(30, 61, 30, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .empty-compact .empty-icon-wrapper {
    width: 50px;
    height: 50px;
    margin-bottom: 0;
  }

  .empty-icon {
    font-size: 2.5rem;
    line-height: 1;
  }

  /* Animation */
  .animated .empty-icon {
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  /* Text */
  h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  .empty-desc {
    color: #666;
    max-width: 300px;
    line-height: 1.5;
    font-size: 0.88rem;
    margin: 0;
  }

  .empty-subtitle {
    color: #999;
    font-size: 0.78rem;
    margin: 0;
  }

  /* Buttons */
  .btn-primary {
    margin-top: 0.75rem;
    background: #1E3D1E;
    color: #fff;
    padding: 0.7rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s, transform 0.15s;
  }

  .btn-primary:hover {
    background: #0F1F0F;
  }

  .btn-primary:active {
    transform: scale(0.96);
  }

  .btn-link {
    margin-top: 0.4rem;
    color: #666;
    font-size: 0.82rem;
    text-decoration: underline;
    background: none;
  }

  .btn-link:hover {
    color: #333;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .animated .empty-icon {
      animation: none;
    }
  }
</style>