<script>
  import BottomNav from '$components/BottomNav.svelte';
  import Toast from '$components/Toast.svelte';
  import '../app.css';
</script>

<main>
  <slot />
</main>

<BottomNav />
<Toast />