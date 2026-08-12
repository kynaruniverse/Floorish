<script>
  import { onMount } from 'svelte';
  import { homes } from '$stores/homes.js';
  import { addToast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let showNewHomeModal = false;
  let newHomeName = '';

  onMount(async () => {
    await homes.load();
    loading = false;
  });

  async function createHome() {
    if (!newHomeName.trim()) return;
    const home = await homes.add({ name: newHomeName.trim() });
    addToast(`"${home.name}" created!`, 'success');
    newHomeName = '';
    showNewHomeModal = false;
    window.location.href = `/home/${home.id}`;
  }

  async function deleteHome(id, name) {
    if (confirm(`Delete "${name}"? This can't be undone.`)) {
      await homes.remove(id);
      addToast(`"${name}" deleted`, 'info');
    }
  }

  function formatDate(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>🌿 Floorish</h1>
    <p class="subtitle">Your home, reimagined</p>
  </header>

  {#if loading}
    <div class="skeleton-list">
      <Skeleton height="80px" />
      <Skeleton height="80px" />
    </div>
  {:else if $homes.length === 0}
    <EmptyState
      icon="🏠"
      title="Welcome to Floorish"
      description="Map your home, arrange furniture in 3D, and preview it all in AR. Create your first home to get started."
      ctaText="Create Your First Home"
      onCta={() => showNewHomeModal = true}
    />
  {:else}
    <div class="home-grid">
      {#each $homes as home}
        <a href="/home/{home.id}" class="home-card">
          <div class="card-preview">
            <span class="card-icon">🏡</span>
          </div>
          <div class="card-info">
            <h3>{home.name}</h3>
            <span class="card-meta">
              {home.rooms?.length || 0} room{(home.rooms?.length || 0) !== 1 ? 's' : ''} · {formatDate(home.updatedAt)}
            </span>
          </div>
          <button
            class="card-delete"
            on:click|preventDefault={() => deleteHome(home.id, home.name)}
            aria-label="Delete {home.name}"
          >🗑️</button>
        </a>
      {/each}
    </div>

    <button class="fab" on:click={() => showNewHomeModal = true} aria-label="Create new home">
      +
    </button>
  {/if}
</div>

<Modal open={showNewHomeModal} title="New Home" on:close={() => showNewHomeModal = false}>
  <form on:submit|preventDefault={createHome} class="new-home-form">
    <label for="home-name">Home name</label>
    <input
      id="home-name"
      type="text"
      bind:value={newHomeName}
      placeholder="e.g. My Apartment, Beach House..."
      autofocus
    />
    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => showNewHomeModal = false}>Cancel</button>
      <button type="submit" class="btn-primary" disabled={!newHomeName.trim()}>Create</button>
    </div>
  </form>
</Modal>

<style>
  .page-header { margin-bottom: 1.5rem; }
  .subtitle { color: var(--grey-600); margin-top: 0.25rem; }
  .skeleton-list { display: flex; flex-direction: column; gap: 1rem; }
  .home-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .home-card {
    display: flex; align-items: center; gap: 1rem;
    background: var(--white); padding: 1rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    text-decoration: none; color: inherit;
    transition: box-shadow 0.2s; position: relative;
  }
  .home-card:hover, .home-card:active { box-shadow: var(--shadow-md); }
  .card-preview {
    width: 56px; height: 56px;
    background: var(--green-100); border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
  }
  .card-icon { font-size: 1.75rem; }
  .card-info { flex: 1; }
  .card-info h3 { font-size: 1rem; font-family: var(--font-sans); }
  .card-meta { font-size: 0.8rem; color: var(--grey-600); }
  .card-delete {
    padding: 0.5rem; opacity: 0.4; font-size: 1rem;
    transition: opacity 0.2s;
  }
  .card-delete:hover { opacity: 1; }
  .fab {
    position: fixed; bottom: 6rem; right: 1.5rem;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--green-700); color: white;
    font-size: 1.75rem; display: flex; align-items: center;
    justify-content: center; box-shadow: var(--shadow-lg);
    z-index: 50; transition: transform 0.2s;
  }
  .fab:active { transform: scale(0.95); }
  .new-home-form { display: flex; flex-direction: column; gap: 1rem; }
  .new-home-form label { font-weight: 600; font-size: 0.875rem; }
  .new-home-form input {
    padding: 0.75rem; border: 2px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 1rem;
  }
  .new-home-form input:focus { border-color: var(--green-500); outline: none; }
  .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
  .btn-secondary {
    padding: 0.75rem 1.25rem; border-radius: var(--radius-sm);
    background: var(--grey-100); color: var(--charcoal); font-weight: 600;
  }
  .btn-primary {
    padding: 0.75rem 1.5rem; border-radius: var(--radius-sm);
    background: var(--green-700); color: white; font-weight: 600;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (min-width: 768px) { .fab { bottom: 2rem; } }
</style>