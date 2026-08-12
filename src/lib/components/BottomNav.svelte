<script>
  import { page } from '$app/stores';
  import { currentRoute } from '$stores/app.js';

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/inventory', label: 'Inventory', icon: '📦' },
    { path: '/catalogue', label: 'Catalogue', icon: '🛋️' },
    { path: '/ai', label: 'AI Design', icon: '🤖' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  $: activePath = $page.url.pathname;
</script>

<nav class="bottom-nav" role="navigation" aria-label="Main navigation">
  {#each navItems as item}
    <a
      href={item.path}
      class="nav-item"
      class:active={activePath === item.path || 
        (item.path !== '/' && activePath.startsWith(item.path))}
      aria-current={activePath === item.path ? 'page' : undefined}
    >
      <span class="nav-icon">{item.icon}</span>
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
    display: flex;
    justify-content: space-around;
    background: var(--white);
    border-top: 1px solid var(--grey-200);
    padding: 0.5rem 0 env(safe-area-inset-bottom, 0.5rem);
    z-index: 100;
  }
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius-sm);
    color: var(--grey-600);
    text-decoration: none;
    transition: color 0.2s;
  }
  .nav-item.active {
    color: var(--green-700);
    background: var(--green-100);
  }
  .nav-icon { font-size: 1.4rem; line-height: 1; }
  .nav-label { font-size: 0.65rem; font-weight: 500; letter-spacing: 0.02em; }

  @media (min-width: 768px) {
    .bottom-nav {
      top: 0; bottom: auto;
      padding: 0.75rem 2rem;
      border-bottom: 1px solid var(--grey-200);
      border-top: none;
      justify-content: center;
      gap: 2rem;
    }
    .nav-label { font-size: 0.8rem; }
  }
</style>