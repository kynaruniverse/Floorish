<script>
  import BottomNav from '$lib/components/BottomNav.svelte';
  import Toast from '$lib/components/Toast.svelte';
</script>

<div class="app-shell">
  <main class="app-main">
    <slot />
  </main>
  
  <BottomNav />
  <Toast />
</div>

<style>
  .app-shell {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .app-main {
    flex: 1;
    padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
</style>