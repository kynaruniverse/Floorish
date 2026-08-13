<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { homes } from '$stores/homes.js';
  import { addToast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';

  let loading = true;
  let showNewHomeModal = false;
  let showDeleteModal = false;
  let homeToDelete = null;
  let newHomeName = '';
  let isFirstVisit = false;

  onMount(async () => {
    await homes.load();
    loading = false;
    
    // Check if first visit
    const visited = localStorage.getItem('floorish-visited');
    if (!visited) {
      isFirstVisit = true;
    }
  });

  async function createHome() {
    const name = newHomeName.trim();
    if (!name) return;
    
    const home = await homes.add({ name });
    addToast(`"${home.name}" created!`, 'success');
    newHomeName = '';
    showNewHomeModal = false;
    
    // Use SvelteKit navigation instead of hard reload
    await goto(`/home/${home.id}`);
  }

  function confirmDelete(id, name) {
    homeToDelete = { id, name };
    showDeleteModal = true;
  }

  async function deleteHome() {
    if (!homeToDelete) return;
    await homes.remove(homeToDelete.id);
    addToast(`"${homeToDelete.name}" deleted`, 'info');
    showDeleteModal = false;
    homeToDelete = null;
  }

  async function duplicateHome(home) {
    const newHome = await homes.add({
      name: `${home.name} (Copy)`,
      rooms: home.rooms ? JSON.parse(JSON.stringify(home.rooms)) : []
    });
    addToast(`"${newHome.name}" created!`, 'success');
  }

  function dismissWelcome() {
    isFirstVisit = false;
    localStorage.setItem('floorish-visited', 'true');
  }

  function formatDate(ts) {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  function getRoomCount(home) {
    return home.rooms?.length || 0;
  }

  function getRoomSummary(home) {
    const count = getRoomCount(home);
    if (count === 0) return 'No rooms yet';
    const names = home.rooms.slice(0, 3).map(r => r.name).join(', ');
    return count > 3 ? `${names} +${count - 3} more` : names;
  }
</script>

<div class="page-container">
  <!-- Header -->
  <header class="page-header">
    <div>
      <h1>🌿 Floorish</h1>
      <p class="subtitle">Your home, reimagined</p>
    </div>
    <button class="header-btn" on:click={() => showNewHomeModal = true} aria-label="Create new home">
      +
    </button>
  </header>

  {#if loading}
    <div class="skeleton-list">
      <Skeleton height="90px" borderRadius="16px" />
      <Skeleton height="90px" borderRadius="16px" />
    </div>

  {:else if isFirstVisit}
    <!-- Welcome guide for first-time users -->
    <div class="welcome-card">
      <div class="welcome-icon">🏡</div>
      <h2>Welcome to Floorish</h2>
      <p>Design your home in 3 easy steps:</p>
      
      <div class="steps">
        <div class="step">
          <span class="step-num">1</span>
          <div>
            <strong>Name your home</strong>
            <p>Give it a name like "My Apartment"</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <div>
            <strong>Draw your floor plan</strong>
            <p>Tap to place walls for each room</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <div>
            <strong>Arrange furniture</strong>
            <p>See your rooms in 3D</p>
          </div>
        </div>
      </div>

      <div class="welcome-actions">
        <button class="btn-primary" on:click={() => { dismissWelcome(); showNewHomeModal = true; }}>
          Create Your First Home
        </button>
        <button class="btn-link" on:click={dismissWelcome}>
          Skip for now
        </button>
      </div>
    </div>

  {:else if $homes.length === 0}
    <EmptyState
      icon="🏠"
      title="No homes yet"
      description="Create a home to start designing your space."
      ctaText="Create Home"
      onCta={() => showNewHomeModal = true}
    />

  {:else}
    <div class="home-grid">
      {#each $homes as home, i}
        <div class="home-card-wrapper" style="animation-delay: {i * 60}ms">
          <a href="/home/{home.id}" class="home-card">
            <div class="card-preview">
              {#if home.rooms && home.rooms.length > 0}
                <!-- Mini floor plan preview -->
                <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
                  {#each home.rooms.slice(0, 4) as room, ri}
                    <rect
                      x={8 + (ri % 2) * 22}
                      y={8 + Math.floor(ri / 2) * 22}
                      width="18"
                      height="18"
                      rx="2"
                      fill={room.colorTag || '#C5E0B7'}
                      stroke="#2D5A27"
                      stroke-width="1"
                      opacity="0.7"
                    />
                  {/each}
                </svg>
              {:else}
                <span class="card-icon">🏡</span>
              {/if}
            </div>
            
            <div class="card-info">
              <h3>{home.name}</h3>
              <span class="card-meta">{getRoomSummary(home)}</span>
              <span class="card-time">Edited {formatDate(home.updatedAt)}</span>
            </div>
            
            <span class="card-arrow">→</span>
          </a>
          
          <div class="card-actions">
            <button
              class="action-btn"
              on:click={() => duplicateHome(home)}
              aria-label="Duplicate {home.name}"
              title="Duplicate"
            >📋</button>
            <button
              class="action-btn danger"
              on:click={() => confirmDelete(home.id, home.name)}
              aria-label="Delete {home.name}"
              title="Delete"
            >🗑️</button>
          </div>
        </div>
      {/each}
    </div>

    <button class="fab" on:click={() => showNewHomeModal = true} aria-label="Create new home">
      +
    </button>
  {/if}
</div>

<!-- New Home Modal -->
<Modal open={showNewHomeModal} title="New Home" on:close={() => showNewHomeModal = false}>
  <form on:submit|preventDefault={createHome} class="new-home-form">
    <label for="home-name">Home name</label>
    <input
      id="home-name"
      type="text"
      bind:value={newHomeName}
      placeholder="e.g. My Apartment, Beach House..."
    />
    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => showNewHomeModal = false}>Cancel</button>
      <button type="submit" class="btn-primary" disabled={!newHomeName.trim()}>Create Home</button>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal open={showDeleteModal} title="Delete Home?" on:close={() => showDeleteModal = false}>
  <div class="delete-content">
    <p>Are you sure you want to delete <strong>"{homeToDelete?.name}"</strong>?</p>
    <p class="delete-warning">This can't be undone. All rooms and furniture layouts will be lost.</p>
    <div class="form-actions">
      <button class="btn-secondary" on:click={() => showDeleteModal = false}>Cancel</button>
      <button class="btn-danger" on:click={deleteHome}>Delete</button>
    </div>
  </div>
</Modal>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .subtitle {
    color: var(--grey-600);
    font-size: 0.9rem;
    margin-top: 0.2rem;
  }

  .header-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--green-700);
    color: white;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: transform 0.2s;
  }

  .header-btn:active { transform: scale(0.9); }

  /* Skeleton */
  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Welcome card */
  .welcome-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 2rem 1.5rem;
    box-shadow: var(--shadow-md);
    text-align: center;
  }

  .welcome-icon {
    font-size: 3.5rem;
    margin-bottom: 0.75rem;
  }

  .welcome-card h2 {
    margin-bottom: 0.5rem;
  }

  .welcome-card > p {
    color: var(--grey-600);
    margin-bottom: 1.5rem;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
    margin-bottom: 1.5rem;
  }

  .step {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--green-100);
    color: var(--green-900);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 0.85rem;
  }

  .step strong {
    font-size: 0.9rem;
    display: block;
  }

  .step p {
    font-size: 0.8rem;
    color: var(--grey-600);
    margin-top: 0.15rem;
  }

  .welcome-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-link {
    color: var(--grey-600);
    font-size: 0.85rem;
    text-decoration: underline;
  }

  /* Home grid */
  .home-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .home-card-wrapper {
    animation: fadeInUp 0.4s ease forwards;
    opacity: 0;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .home-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--white);
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .home-card:active {
    box-shadow: var(--shadow-md);
    transform: scale(0.98);
  }

  .card-preview {
    width: 52px;
    height: 52px;
    background: var(--green-100);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .card-icon { font-size: 1.6rem; }

  .card-info {
    flex: 1;
    min-width: 0;
  }

  .card-info h3 {
    font-size: 0.95rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    font-size: 0.78rem;
    color: var(--grey-600);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-time {
    font-size: 0.7rem;
    color: var(--grey-400);
  }

  .card-arrow {
    color: var(--grey-400);
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .card-actions {
    display: flex;
    gap: 0.35rem;
    padding: 0 1rem 0.5rem;
  }

  .action-btn {
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: var(--grey-100);
    font-size: 0.8rem;
    transition: background 0.15s;
  }

  .action-btn:hover { background: var(--grey-200); }
  .action-btn.danger:hover { background: #FDECEA; }

  /* FAB */
  .fab {
    position: fixed;
    bottom: 5.5rem;
    right: 1.25rem;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--green-700);
    color: white;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
    z-index: 50;
    transition: transform 0.2s;
  }

  .fab:active { transform: scale(0.9); }

  /* Forms */
  .new-home-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .new-home-form label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--grey-600);
  }

  .new-home-form input {
    padding: 0.75rem 1rem;
    border: 2px solid var(--grey-200);
    border-radius: var(--radius-sm);
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .new-home-form input:focus {
    border-color: var(--green-500);
    outline: none;
  }

  .form-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-secondary {
    padding: 0.7rem 1.25rem;
    border-radius: var(--radius-sm);
    background: var(--grey-100);
    color: var(--charcoal);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.7rem 1.5rem;
    border-radius: var(--radius-sm);
    background: var(--green-700);
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-danger {
    padding: 0.7rem 1.5rem;
    border-radius: var(--radius-sm);
    background: var(--error);
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* Delete modal */
  .delete-content p {
    margin-bottom: 0.5rem;
  }

  .delete-warning {
    color: var(--error);
    font-size: 0.85rem;
  }

  @media (min-width: 768px) {
    .fab { bottom: 2rem; }
    .home-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
  }
</style>