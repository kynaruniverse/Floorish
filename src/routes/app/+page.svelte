<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { homes } from '$lib/stores/homes.js';
  import { toast, isFirstVisit, markVisited } from '$lib/stores/app.js';
  import Modal from '$lib/components/Modal.svelte';

  let loading = true;
  let showNewHomeModal = false;
  let newHomeName = '';
  let showDeleteModal = false;
  let homeToDelete = null;
  let showOnboarding = false;

  onMount(async () => {
    await homes.load();
    loading = false;
    
    // Show onboarding on first visit
    if ($isFirstVisit) {
      showOnboarding = true;
    }
  });

  async function createHome() {
    const name = newHomeName.trim() || 'My Home';
    const home = await homes.addHome(name);
    toast.success(`"${home.name}" created`);
    newHomeName = '';
    showNewHomeModal = false;
    markVisited();
    showOnboarding = false;
    await goto(`/app/home/${home.id}`);
  }

  function confirmDelete(home) {
    homeToDelete = home;
    showDeleteModal = true;
  }

  async function deleteHome() {
    if (!homeToDelete) return;
    await homes.removeHome(homeToDelete.id);
    toast.info(`"${homeToDelete.name}" deleted`);
    showDeleteModal = false;
    homeToDelete = null;
  }

  function dismissOnboarding() {
    showOnboarding = false;
    markVisited();
  }

  function formatDate(ts) {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function getRoomCount(home) {
    return home.floors?.reduce((total, floor) => total + (floor.rooms?.length || 0), 0) || 0;
  }

  function getFloorCount(home) {
    return home.floors?.length || 0;
  }
</script>

<svelte:head>
  <title>My Homes — Floorish</title>
</svelte:head>

<div class="homes-page">
  <!-- Header -->
  <header class="page-header">
    <div>
      <h1>My Homes</h1>
      <p class="header-sub">{loading ? 'Loading...' : `${$homes.length} home${$homes.length !== 1 ? 's' : ''}`}</p>
    </div>
    <button class="add-btn" on:click={() => showNewHomeModal = true} aria-label="Create new home">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
    </div>

  {:else if $homes.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </div>
      <h2>Create your first home</h2>
      <p>Name it, add floors, and start drawing rooms.</p>
      <button class="btn btn-primary" on:click={() => showNewHomeModal = true}>
        Create Home
      </button>
    </div>

  {:else}
    <div class="homes-list">
      {#each $homes as home}
        <a href="/app/home/{home.id}" class="home-card">
          <div class="home-thumb">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          
          <div class="home-info">
            <h3>{home.name}</h3>
            <span class="home-meta">
              {getFloorCount(home)} floor{getFloorCount(home) !== 1 ? 's' : ''} · 
              {getRoomCount(home)} room{getRoomCount(home) !== 1 ? 's' : ''}
            </span>
            <span class="home-time">Edited {formatDate(home.updatedAt)}</span>
          </div>
          
          <button
            class="delete-btn"
            on:click|preventDefault={() => confirmDelete(home)}
            aria-label="Delete {home.name}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </a>
      {/each}
    </div>
  {/if}
</div>

<!-- Onboarding -->
{#if showOnboarding}
  <Modal open={showOnboarding} title="Welcome to Floorish" on:close={dismissOnboarding}>
    <div class="onboarding">
      <p>Here's how to get started:</p>
      
      <div class="ob-step">
        <span class="ob-num">1</span>
        <div>
          <strong>Create a home</strong>
          <p>Give it a name like "My House"</p>
        </div>
      </div>
      
      <div class="ob-step">
        <span class="ob-num">2</span>
        <div>
          <strong>Add floors</strong>
          <p>Ground floor, first floor, etc.</p>
        </div>
      </div>
      
      <div class="ob-step">
        <span class="ob-num">3</span>
        <div>
          <strong>Draw rooms</strong>
          <p>Drag room blocks onto the floor plan</p>
        </div>
      </div>
      
      <button class="btn btn-primary btn-block" on:click={dismissOnboarding}>
        Got it
      </button>
    </div>
  </Modal>
{/if}

<!-- New Home Modal -->
<Modal open={showNewHomeModal} title="New Home" on:close={() => showNewHomeModal = false}>
  <form on:submit|preventDefault={createHome} class="new-home-form">
    <label for="home-name" class="form-label">Home name</label>
    <input
      id="home-name"
      type="text"
      class="input"
      bind:value={newHomeName}
      placeholder="e.g. My Apartment"
    />
    
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" on:click={() => showNewHomeModal = false}>
        Cancel
      </button>
      <button type="submit" class="btn btn-primary">
        Create
      </button>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation -->
<Modal open={showDeleteModal} title="Delete Home?" on:close={() => showDeleteModal = false}>
  <p>Delete <strong>"{homeToDelete?.name}"</strong>? This can't be undone.</p>
  
  <div class="form-actions">
    <button class="btn btn-secondary" on:click={() => showDeleteModal = false}>Cancel</button>
    <button class="btn btn-danger" on:click={deleteHome}>Delete</button>
  </div>
</Modal>

<style>
  .homes-page {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-4);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
  }

  .page-header h1 {
    font-size: var(--text-xl);
  }

  .header-sub {
    color: var(--text-muted);
    font-size: var(--text-sm);
    margin-top: 0.1rem;
  }

  .add-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: transform var(--transition-fast);
  }

  .add-btn:active { transform: scale(0.92); }

  /* Loading */
  .loading-state {
    display: flex;
    justify-content: center;
    padding: var(--space-6);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Empty */
  .empty-state {
    text-align: center;
    padding: var(--space-6) var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--primary-light);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-2);
  }

  .empty-state h2 {
    font-size: var(--text-lg);
  }

  .empty-state p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    max-width: 260px;
  }

  /* Homes list */
  .homes-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .home-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    text-decoration: none;
    color: inherit;
    transition: box-shadow var(--transition-fast);
  }

  .home-card:active {
    box-shadow: var(--shadow-md);
  }

  .home-thumb {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    background: var(--primary-light);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .home-info {
    flex: 1;
    min-width: 0;
  }

  .home-info h3 {
    font-size: var(--text-base);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .home-meta {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    display: block;
  }

  .home-time {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .delete-btn {
    color: var(--text-muted);
    padding: var(--space-2);
    opacity: 0.6;
    flex-shrink: 0;
  }

  .delete-btn:active {
    color: var(--error);
    opacity: 1;
  }

  /* Onboarding */
  .onboarding {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .onboarding > p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .ob-step {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .ob-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    font-weight: 700;
    font-size: var(--text-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ob-step strong {
    font-size: var(--text-sm);
    display: block;
  }

  .ob-step p {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    margin-top: 0.1rem;
  }

  /* Forms */
  .new-home-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .form-label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .form-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    margin-top: var(--space-2);
  }
</style>