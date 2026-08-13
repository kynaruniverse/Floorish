<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { homes } from '$lib/stores/homes.js';
  import { toast } from '$lib/stores/app.js';
  import { roomTemplates, getTemplate } from '$lib/data/roomTemplates.js';
  import Modal from '$lib/components/Modal.svelte';
  import Room3D from '$lib/Room3D.svelte';

  let home = null;
  let loading = true;
  let activeFloorId = null;
  let selectedRoom = null;
  let viewMode = '2d'; // '2d' | '3d'

  // Modal states
  let showAddRoomModal = false;
  let showRoomModal = false;
  let editingRoom = null;
  let roomForm = { name: '', type: 'custom', width: 3, depth: 4, color: '#E8F3E0', floorType: 'wood' };

  // Drag state
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };

  const SCALE = 20; // pixels per metre

  $: floors = home?.floors || [];
  $: activeFloor = floors.find(f => f.id === activeFloorId) || floors[0];
  $: rooms = activeFloor?.rooms || [];

  onMount(async () => {
    const homeId = $page.params.id;
    
    try {
      home = await homes.get(homeId);
      
      if (!home) {
        toast.error('Home not found');
        loading = false;
        return;
      }

      if (home.floors?.length > 0) {
        activeFloorId = home.floors[0].id;
      }
    } catch (err) {
      console.error('Failed to load home:', err);
      toast.error('Error loading home');
    }

    loading = false;
  });

  function roomWidth(room) {
    return (room.dimensions?.width || 3) * SCALE;
  }

  function roomDepth(room) {
    return (room.dimensions?.depth || 4) * SCALE;
  }

  // ============ FLOORS ============
  async function addFloor() {
    const floor = await homes.addFloor(home.id);
    activeFloorId = floor.id;
    home = await homes.get(home.id);
    toast.success(`"${floor.name}" added`);
  }

  async function switchFloor(floorId) {
    activeFloorId = floorId;
  }

  // ============ ROOMS ============
  function openAddRoom() {
    roomForm = { name: '', type: 'living', width: 4, depth: 5, color: '#E8F3E0', floorType: 'wood' };
    showAddRoomModal = true;
  }

  function selectTemplate(type) {
    const tpl = getTemplate(type);
    roomForm = {
      name: tpl.label,
      type: tpl.type,
      width: tpl.width,
      depth: tpl.depth,
      color: tpl.color,
      floorType: tpl.floorType
    };
  }

  async function addRoom() {
    const room = await homes.addRoom(home.id, activeFloorId, {
      name: roomForm.name.trim() || 'Room',
      type: roomForm.type,
      dimensions: { width: roomForm.width, depth: roomForm.depth },
      color: roomForm.color,
      floorType: roomForm.floorType,
      position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }
    });

    home = await homes.get(home.id);
    showAddRoomModal = false;
    toast.success(`"${room.name}" added`);
  }

  function openRoom(room) {
    editingRoom = room;
    roomForm = {
      name: room.name,
      type: room.type,
      width: room.dimensions.width,
      depth: room.dimensions.depth,
      color: room.color,
      floorType: room.floorType
    };
    showRoomModal = true;
  }

  async function saveRoom() {
    await homes.updateRoom(home.id, activeFloorId, editingRoom.id, {
      name: roomForm.name.trim() || editingRoom.name,
      dimensions: { width: roomForm.width, depth: roomForm.depth },
      color: roomForm.color,
      floorType: roomForm.floorType
    });
    
    home = await homes.get(home.id);
    showRoomModal = false;
    toast.success('Room updated');
  }

  async function deleteRoom() {
    await homes.removeRoom(home.id, activeFloorId, editingRoom.id);
    home = await homes.get(home.id);
    showRoomModal = false;
    toast.info('Room deleted');
  }

  // ============ DRAG ============
  function startDrag(room, e) {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    dragging = {
      room,
      offsetX: e.clientX - rect.left - (room.position?.x || 0),
      offsetY: e.clientY - rect.top - (room.position?.y || 0)
    };
  }

  function onDrag(e) {
    if (!dragging) return;
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    
    // Update room position
    const room = rooms.find(r => r.id === dragging.room.id);
    if (room) {
      room.position = { x, y };
    }
  }

  function endDrag() {
    if (!dragging) return;
    
    const room = rooms.find(r => r.id === dragging.room.id);
    if (room) {
      homes.updateRoom(home.id, activeFloorId, room.id, {
        position: room.position
      }).then(() => {
        home = homes.get(home.id);
      });
    }
    
    dragging = null;
  }

  // ============ UNDO / REDO ============
  async function undo() {
    const done = await homes.undo();
    if (done) {
      home = await homes.get(home.id);
      toast.info('Undone');
    }
  }

  async function redo() {
    const done = await homes.redo();
    if (done) {
      home = await homes.get(home.id);
      toast.info('Redone');
    }
  }
</script>

<svelte:head>
  <title>{home?.name || 'Floor Plan'} — Floorish</title>
</svelte:head>

<div class="floorplan-page">
  {#if loading}
    <div class="loading-view">
      <div class="spinner"></div>
    </div>

  {:else}
    <!-- Header -->
    <header class="page-header">
      <a href="/app" class="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </a>
      
      <h1>{home.name}</h1>
      
      <div class="header-actions">
        {#if viewMode === '2d'}
          <button on:click={undo} aria-label="Undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button on:click={redo} aria-label="Redo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>
        {/if}
        <button
          class="view-toggle"
          on:click={() => viewMode = viewMode === '2d' ? '3d' : '2d'}
          aria-label="Toggle 2D/3D view"
        >
          {viewMode === '2d' ? '3D' : '2D'}
        </button>
      </div>
    </header>

    <!-- Floor tabs -->
    <div class="floor-tabs">
      {#each floors as floor, i}
        <button
          class="floor-tab"
          class:active={floor.id === activeFloorId}
          on:click={() => switchFloor(floor.id)}
        >
          {floor.name}
        </button>
      {/each}
      
      <button class="floor-add" on:click={addFloor} aria-label="Add floor">
        +
      </button>
    </div>

    <!-- Floor plan canvas -->
    {#if viewMode === '2d'}
      <div
        class="plan-canvas"
        on:pointermove={onDrag}
        on:pointerup={endDrag}
        on:pointerleave={endDrag}
      >
        {#if rooms.length === 0}
          <div class="plan-empty">
            <p>No rooms on this floor yet</p>
            <button class="btn btn-primary btn-sm" on:click={openAddRoom}>
              Add First Room
            </button>
          </div>
        {:else}
          {#each rooms as room}
            <div
              class="room-block"
              style="
                left: {room.position?.x || 0}px;
                top: {room.position?.y || 0}px;
                width: {roomWidth(room)}px;
                height: {roomDepth(room)}px;
                background: {room.color};
              "
              on:click={() => openRoom(room)}
              on:pointerdown={(e) => startDrag(room, e)}
              role="button"
              tabindex="0"
              aria-label="{room.name}"
            >
              <span class="room-name">{room.name}</span>
              <span class="room-size">{room.dimensions.width}m × {room.dimensions.depth}m</span>
            </div>
          {/each}
        {/if}
      </div>
    {:else}
      <div class="plan-canvas plan-canvas-3d">
        {#if rooms.length === 0}
          <div class="plan-empty">
            <p>No rooms on this floor yet</p>
            <button class="btn btn-primary btn-sm" on:click={openAddRoom}>
              Add First Room
            </button>
          </div>
        {:else}
          <Room3D {rooms} selectedRoomId={editingRoom?.id ?? null} />
        {/if}
      </div>
    {/if}

    <!-- Add room button -->
    <button class="add-room-btn" on:click={openAddRoom}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Room
    </button>
  {/if}
</div>

<!-- Add Room Modal -->
<Modal open={showAddRoomModal} title="Add Room" on:close={() => showAddRoomModal = false}>
  <div class="template-grid">
    {#each roomTemplates as tpl}
      <button
        class="template-card"
        class:selected={roomForm.type === tpl.type}
        on:click={() => selectTemplate(tpl.type)}
      >
        <div class="template-preview" style="background: {tpl.color};">
          <span>{tpl.width}×{tpl.depth}m</span>
        </div>
        <span class="template-label">{tpl.label}</span>
      </button>
    {/each}
  </div>

  <div class="template-form">
    <label class="form-label">Room name</label>
    <input class="input" type="text" bind:value={roomForm.name} />
  </div>

  <div class="form-actions">
    <button class="btn btn-secondary" on:click={() => showAddRoomModal = false}>Cancel</button>
    <button class="btn btn-primary" on:click={addRoom}>Add Room</button>
  </div>
</Modal>

<!-- Edit Room Modal -->
<Modal open={showRoomModal} title="Edit Room" on:close={() => showRoomModal = false}>
  <div class="room-form">
    <label class="form-label">Room name</label>
    <input class="input" type="text" bind:value={roomForm.name} />

    <label class="form-label">Width (m)</label>
    <input class="input" type="number" bind:value={roomForm.width} min="1" max="20" step="0.5" />

    <label class="form-label">Depth (m)</label>
    <input class="input" type="number" bind:value={roomForm.depth} min="1" max="20" step="0.5" />

    <label class="form-label">Floor type</label>
    <select class="input" bind:value={roomForm.floorType}>
      <option value="wood">Wood</option>
      <option value="carpet">Carpet</option>
      <option value="tile">Tile</option>
      <option value="concrete">Concrete</option>
    </select>

    <div class="form-actions">
      <button class="btn btn-danger" on:click={deleteRoom}>Delete</button>
      <button class="btn btn-primary" on:click={saveRoom}>Save</button>
    </div>
  </div>
</Modal>

<style>
  .floorplan-page {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .back-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .page-header h1 {
    flex: 1;
    font-size: var(--text-lg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .header-actions button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .view-toggle {
    width: auto !important;
    padding: 0 var(--space-3);
    border-radius: var(--radius-full) !important;
    font-size: var(--text-xs);
    font-weight: 700;
    color: #fff !important;
    background: var(--primary) !important;
  }

  /* Floor tabs */
  .floor-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: var(--space-1);
  }

  .floor-tab {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
    background: var(--surface);
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .floor-tab.active {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }

  .floor-add {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px dashed var(--border);
    color: var(--text-secondary);
    font-size: var(--text-base);
    flex-shrink: 0;
  }

  /* Canvas */
  .plan-canvas {
    flex: 1;
    position: relative;
    background: var(--surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    min-height: 400px;
    overflow: hidden;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .plan-canvas-3d {
    padding: 0;
  }

  .plan-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  /* Room blocks */
  .room-block {
    position: absolute;
    border-radius: var(--radius-sm);
    border: 2px solid rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    cursor: pointer;
    touch-action: none;
    transition: box-shadow var(--transition-fast);
  }

  .room-block:active {
    box-shadow: var(--shadow-md);
    z-index: 10;
  }

  .room-name {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text);
    text-align: center;
    pointer-events: none;
  }

  .room-size {
    font-size: 0.65rem;
    color: var(--text-secondary);
    pointer-events: none;
  }

  /* Add room button */
  .add-room-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3);
    margin-top: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--primary-light);
    color: var(--primary);
    font-weight: 600;
    font-size: var(--text-sm);
    border: 2px dashed var(--primary);
  }

  /* Loading */
  .loading-view {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
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

  /* Templates */
  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .template-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 2px solid transparent;
    transition: all var(--transition-fast);
  }

  .template-card.selected {
    border-color: var(--primary);
    background: var(--primary-light);
  }

  .template-preview {
    height: 50px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    color: var(--text-secondary);
  }

  .template-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-align: center;
  }

  /* Forms */
  .template-form,
  .room-form {
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