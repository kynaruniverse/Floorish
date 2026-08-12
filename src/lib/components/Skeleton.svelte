<script>
  export let width = '100%';
  export let height = '1rem';
  export let borderRadius = 'var(--radius-sm)';
</script>

<div
  class="skeleton"
  style="width: {width}; height: {height}; border-radius: {borderRadius};"
  aria-hidden="true"
></div>

<style>
  .skeleton {
    background: linear-gradient(90deg, var(--grey-200) 25%, var(--grey-100) 50%, var(--grey-200) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>