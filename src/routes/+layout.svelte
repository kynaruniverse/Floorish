<script>
  import { onMount } from 'svelte';
  import BottomNav from '$components/BottomNav.svelte';
  import Toast from '$components/Toast.svelte';
  import { addToast } from '$stores/app.js';
  import '../app.css';

  onMount(() => {
    // App is ready — show welcome toast on first load
    const hasVisited = localStorage.getItem('floorish-visited');
    if (!hasVisited) {
      localStorage.setItem('floorish-visited', 'true');
      setTimeout(() => {
        addToast('Welcome to Floorish! Create a home to get started.', 'info', 4000);
      }, 500);
    }
  });
</script>

<main>
  <slot />
</main>

<BottomNav />
<Toast />