<script>
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠', exact: true },
    { path: '/inventory', label: 'Inventory', icon: '📦', badgeStore: inventory },
    { path: '/catalogue', label: 'Catalogue', icon: '🛋️' },
    { path: '/ai', label: 'AI Design', icon: '🤖' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  $: activePath = $page.url.pathname;

  function isActive(item) {
    if (item.exact) {
      return activePath === item.path;
    }
    return activePath === item.path || activePath.startsWith(item.path + '/');
  }

  function getBadgeCount(item) {
    if (item.badgeStore) {
      return item.badgeStore ? $item.badgeStore.length : 0;
    }
    return null;
  }

  function hapticTap() {
    // Subtle haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
</script>

<nav class="bottom-nav" aria-label="Main navigation">
  <div class="nav-inner">
    {#each navItems as item}
      <a
        href={item.path}
        class="nav-item"
        class:active={isActive(item)}
        aria-current={isActive(item) ? 'page' : undefined}
        on:click={hapticTap}
      >
        <span class="nav-icon-wrapper">
          <span class="nav-icon">{item.icon}</span>
          {#if getBadgeCount(item) > 0}
            <span class="nav-badge">{getBadgeCount(item)}</span>
          {/if}
        </span>
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--white, #fff);
    border-top: 1px solid var(--grey-200, #e8e8e8);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
  }

  .nav-inner {
    display: flex;
    justify-content: space-around;
    align-items: stretch;
    max-width: 520px;
    margin: 0 auto;
    padding: 0.4rem 0.5rem;
    gap: 0.25rem;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.35rem 0.6rem;
    border-radius: 12px;
    color: var(--grey-500, #888);
    text-decoration: none;
    transition: all 0.2s ease;
    flex: 1;
    min-width: 0;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item:hover {
    color: var(--grey-700, #444);
    background: var(--grey-100, #f5f5f5);
  }

  .nav-item:active {
    transform: scale(0.94);
  }

  .nav-item.active {
    color: var(--green-700, #2D5A27);
    background: var(--green-100, #E8F3E0);
    font-weight: 600;
  }

  /* Icon */
  .nav-icon-wrapper {
    position: relative;
    display: inline-flex;
    line-height: 1;
  }

  .nav-icon {
    font-size: 1.35rem;
    transition: transform 0.2s ease;
  }

  .nav-item.active .nav-icon {
    transform: translateY(-1px);
  }

  /* Badge */
  .nav-badge {
    position: absolute;
    top: -6px;
    right: -8px;
    background: var(--error, #C62828);
    color: #fff;
    font-size: 0.6rem;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    line-height: 1;
  }

  /* Label */
  .nav-label {
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* Desktop: become top bar */
  @media (min-width: 768px) {
    .bottom-nav {
      top: 0;
      bottom: auto;
      border-top: none;
      border-bottom: 1px solid var(--grey-200, #e8e8e8);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      padding-bottom: 0;
    }

    .nav-inner {
      max-width: 760px;
      padding: 0.5rem 1rem;
      gap: 0.5rem;
      justify-content: center;
    }

    .nav-item {
      flex-direction: row;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      flex: 0 1 auto;
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    .nav-label {
      font-size: 0.8rem;
    }
  }

  /* Very small screens: hide labels, show icons only */
  @media (max-width: 350px) {
    .nav-label {
      display: none;
    }

    .nav-item {
      padding: 0.5rem;
    }

    .nav-icon {
      font-size: 1.5rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .nav-item,
    .nav-icon {
      transition: none;
    }
    .nav-item:active {
      transform: none;
    }
  }
</style>