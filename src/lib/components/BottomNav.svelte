<script>
  import { page } from '$app/stores';
  import { inventory } from '$stores/inventory.js';

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠', exact: true },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/catalogue', label: 'Catalogue', icon: '🛋️' },
    { path: '/ai', label: 'AI', icon: '🤖' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  $: activePath = $page.url.pathname;
  $: inventoryCount = $inventory.length;

  function isActive(item) {
    if (item.exact) return activePath === item.path;
    return activePath === item.path || activePath.startsWith(item.path + '/');
  }

  function hapticTap() {
    if (navigator.vibrate) navigator.vibrate(10);
  }
</script>

<nav class="bottom-nav" aria-label="Main navigation">
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
        {#if item.path === '/inventory' && inventoryCount > 0}
          <span class="nav-badge">{inventoryCount}</span>
        {/if}
      </span>
      <span class="nav-label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-top: 1px solid #e8e8e8;
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.4rem 0.6rem;
    border-radius: 12px;
    color: #888;
    text-decoration: none;
    flex: 1;
    transition: all 0.2s;
  }

  .nav-item.active {
    color: #1E3D1E;
    background: #E8F3E0;
    font-weight: 600;
  }

  .nav-icon-wrapper {
    position: relative;
    display: inline-flex;
    line-height: 1;
  }

  .nav-icon {
    font-size: 1.3rem;
  }

  .nav-badge {
    position: absolute;
    top: -6px;
    right: -8px;
    background: #C62828;
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
  }

  .nav-label {
    font-size: 0.62rem;
    font-weight: 500;
    white-space: nowrap;
  }

  @media (min-width: 768px) {
    .bottom-nav {
      top: 0;
      bottom: auto;
      border-top: none;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    .nav-item {
      flex-direction: row;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      flex: 0 1 auto;
    }
    .nav-label {
      font-size: 0.8rem;
    }
  }
</style>