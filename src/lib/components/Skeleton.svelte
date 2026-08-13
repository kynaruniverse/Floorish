<script>
  export let width = '100%';
  export let height = '1rem';
  export let borderRadius = '8px';
  export let variant = 'rect'; // rect | text | circle | card | button
  export let lines = 1;
  export let gap = '0.5rem';
  export let animated = true;

  // Preset variants
  function getVariantStyles() {
    switch (variant) {
      case 'circle':
        return { width: width === '100%' ? '40px' : width, height: height === '1rem' ? '40px' : height, borderRadius: '50%' };
      case 'card':
        return { width: width === '100%' ? '100%' : width, height: height === '1rem' ? '120px' : height, borderRadius: '12px' };
      case 'button':
        return { width: width === '100%' ? '120px' : width, height: height === '1rem' ? '40px' : height, borderRadius: '20px' };
      case 'text':
        return { width: width === '100%' ? '90%' : width, height: height === '1rem' ? '0.9rem' : height, borderRadius: '4px' };
      default:
        return { width, height, borderRadius };
    }
  }

  $: styles = getVariantStyles();
</script>

{#if lines > 1}
  <div class="skeleton-group" style="gap: {gap};" role="status" aria-busy="true" aria-label="Loading">
    {#each Array(lines) as _, i}
      <div
        class="skeleton"
        class:animated
        style="
          width: {i === lines - 1 && lines > 2 ? '70%' : styles.width};
          height: {styles.height};
          border-radius: {styles.borderRadius};
        "
        aria-hidden="true"
      ></div>
    {/each}
  </div>
{:else}
  <div
    class="skeleton"
    class:animated
    style="
      width: {styles.width};
      height: {styles.height};
      border-radius: {styles.borderRadius};
    "
    role="status"
    aria-busy="true"
    aria-label="Loading"
  ></div>
{/if}

<style>
  .skeleton-group {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .skeleton {
    background: #e8e8e8;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* Shimmer effect */
  .skeleton.animated::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.5),
      transparent
    );
    transform: translateX(-100%);
    animation: shimmer 1.6s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .skeleton {
      background: #333;
    }
    .skeleton.animated::after {
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton.animated::after {
      animation: none;
      display: none;
    }
    .skeleton.animated {
      background: #e0e0e0;
    }
  }
</style>