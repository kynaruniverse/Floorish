<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { addToast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';
  import { browser } from '$app/environment';

  let home;
  let rooms = [];
  let loading = true;
  let canvasEl;
  let fabricCanvas;
  let Fabric; // dynamic import

  // Tool state
  let activeTool = 'select'; // select | wall | door | window | room-label
  let isDrawing = false;
  let drawStartPoint = null;
  let tempLine = null;
  let wallPoints = [];
  let selectedRoom = null;
  let snapAngle = 15; // degrees, snap to every 15°
  let gridSize = 20; // pixels per grid unit

  // Modal states
  let showRoomModal = false;
  let editingRoom = null;
  let roomForm = { name: '', colorTag: '#E8F3E0', floorType: 'wood', ceilingHeight: 2.4 };

  // Canvas dimensions
  let canvasWidth = 1200;
  let canvasHeight = 900;

  onMount(async () => {
    // Load home data
    const homeId = $page.params.id;
    const db = await import('idb').then(m => m.openDB('floorish-db', 1));
    home = await db.get('homes', homeId);
    
    if (!home) {
      addToast('Home not found', 'error');
      loading = false;
      return;
    }

    rooms = home.rooms || [];
    
    // Dynamically import Fabric.js (browser only)
    if (browser) {
      const fabricModule = await import('fabric');
      Fabric = fabricModule.fabric || fabricModule.default;
      initCanvas();
    }
    
    loading = false;
  });

  function initCanvas() {
    if (!canvasEl || !Fabric) return;

    fabricCanvas = new Fabric.Canvas(canvasEl, {
      width: canvasWidth,
      height: canvasHeight,
      selection: false,
      backgroundColor: '#FAF8F5',
      preserveObjectStacking: true
    });

    // Draw grid
    drawGrid();

    // Set up event listeners
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);
    fabricCanvas.on('selection:created', handleSelection);

    // Load existing rooms
    rooms.forEach(room => drawRoom(room));

    // Pinch zoom for mobile
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.2, Math.min(3, zoom));
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  function drawGrid() {
    const gridColor = '#E8E3D8';
    const dotSize = 1;
    const spacing = gridSize;

    for (let x = spacing; x < canvasWidth; x += spacing) {
      for (let y = spacing; y < canvasHeight; y += spacing) {
        const dot = new Fabric.Circle({
          left: x,
          top: y,
          radius: dotSize,
          fill: gridColor,
          selectable: false,
          evented: false,
          excludeFromExport: true
        });
        fabricCanvas.add(dot);
        dot.moveTo(-999); // behind everything
      }
    }
  }

  function handleMouseDown(opt) {
    const pointer = fabricCanvas.getPointer(opt.e);

    if (activeTool === 'wall') {
      isDrawing = true;
      const snapped = snapToGridOrAngle(pointer);
      wallPoints = [snapped];
      
      tempLine = new Fabric.Line([snapped.x, snapped.y, snapped.x, snapped.y], {
        stroke: '#2D5A27',
        strokeWidth: 4,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false
      });
      fabricCanvas.add(tempLine);
    } else if (activeTool === 'select') {
      // Check if a room was clicked
      const target = fabricCanvas.findTarget(opt.e, false);
      if (target && target.roomData) {
        selectRoom(target.roomData);
      }
    }
  }

  function handleMouseMove(opt) {
    if (!isDrawing || !tempLine) return;
    const pointer = fabricCanvas.getPointer(opt.e);
    const snapped = snapToGridOrAngle(pointer);
    tempLine.set({ x2: snapped.x, y2: snapped.y });
    fabricCanvas.renderAll();
  }

  function handleMouseUp(opt) {
    if (!isDrawing) return;

    const pointer = fabricCanvas.getPointer(opt.e);
    const snapped = snapToGridOrAngle(pointer);
    wallPoints.push(snapped);

    // Draw permanent wall segment
    const prev = wallPoints[wallPoints.length - 2];
    const wall = new Fabric.Line([prev.x, prev.y, snapped.x, snapped.y], {
      stroke: '#1A3A1A',
      strokeWidth: 6,
      selectable: true,
      hasControls: false,
      roomData: null,
      wallIndex: wallPoints.length - 1
    });
    fabricCanvas.add(wall);

    // Remove temp line
    fabricCanvas.remove(tempLine);
    tempLine = null;

    // Start new temp line for continuous drawing
    tempLine = new Fabric.Line([snapped.x, snapped.y, snapped.x, snapped.y], {
      stroke: '#2D5A27',
      strokeWidth: 4,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false
    });
    fabricCanvas.add(tempLine);

    fabricCanvas.renderAll();
  }

  function snapToGridOrAngle(pointer) {
    let { x, y } = pointer;

    // Snap to grid
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;

    // Snap to angle if we have previous point
    if (wallPoints.length > 0) {
      const last = wallPoints[wallPoints.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > gridSize) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const snappedAngle = Math.round(angle / snapAngle) * snapAngle;
        const radians = (snappedAngle * Math.PI) / 180;
        x = last.x + dist * Math.cos(radians);
        y = last.y + dist * Math.sin(radians);
      }
    }

    return { x, y };
  }

  function finishRoom() {
    if (wallPoints.length < 3) {
      addToast('A room needs at least 3 walls', 'error');
      return;
    }

    // Remove temp line
    if (tempLine) {
      fabricCanvas.remove(tempLine);
      tempLine = null;
    }

    // Connect last point to first
    const first = wallPoints[0];
    const last = wallPoints[wallPoints.length - 1];
    const closingWall = new Fabric.Line([last.x, last.y, first.x, first.y], {
      stroke: '#1A3A1A',
      strokeWidth: 6,
      selectable: true,
      hasControls: false
    });
    fabricCanvas.add(closingWall);

    // Create room polygon
    const polygon = createRoomPolygon(wallPoints);
    
    // Show room details modal
    editingRoom = null;
    roomForm = { name: `Room ${rooms.length + 1}`, colorTag: getRandomColor(), floorType: 'wood', ceilingHeight: 2.4 };
    showRoomModal = true;

    // Store wall points temporarily
    polygon._wallPoints = wallPoints;
    fabricCanvas._pendingRoom = polygon;

    isDrawing = false;
    wallPoints = [];
    activeTool = 'select';
    fabricCanvas.renderAll();
  }

  function createRoomPolygon(points) {
    const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
    
    const polygon = new Fabric.Polygon(polygonPoints, {
      fill: 'rgba(197, 224, 183, 0.3)',
      stroke: '#2D5A27',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      roomData: null
    });

    fabricCanvas.add(polygon);
    return polygon;
  }

  function drawRoom(room) {
    if (!room.points || room.points.length < 3) return;

    const polygon = new Fabric.Polygon(room.points, {
      fill: room.colorTag + '40', // add transparency
      stroke: room.colorTag || '#2D5A27',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      roomData: room
    });

    // Room label
    const center = getPolygonCenter(room.points);
    const label = new Fabric.Text(room.name, {
      left: center.x - 40,
      top: center.y - 10,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#2D2D2D',
      selectable: false,
      evented: false,
      roomData: room
    });

    fabricCanvas.add(polygon);
    fabricCanvas.add(label);
  }

  function getPolygonCenter(points) {
    let cx = 0, cy = 0;
    points.forEach(p => { cx += p.x; cy += p.y; });
    return { x: cx / points.length, y: cy / points.length };
  }

  function getRandomColor() {
    const colors = ['#E8F3E0', '#F0EBE1', '#E8D5D5', '#D5E0E8', '#E8E0D5', '#D5E8E0'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function handleSelection(opt) {
    const selected = opt.selected?.[0];
    if (selected?.roomData) {
      selectedRoom = selected.roomData;
    }
  }

  function selectRoom(roomData) {
    selectedRoom = roomData;
    if (roomData && roomData.id) {
      window.location.href = `/home/${$page.params.id}/room/${roomData.id}`;
    }
  }

  async function saveRoomFromModal() {
    const polygon = fabricCanvas._pendingRoom;
    if (!polygon) return;

    const roomData = {
      id: crypto.randomUUID(),
      name: roomForm.name,
      colorTag: roomForm.colorTag,
      floorType: roomForm.floorType,
      ceilingHeight: roomForm.ceilingHeight,
      points: polygon._wallPoints || [],
      furniture: []
    };

    polygon.roomData = roomData;
    polygon.set({ fill: roomForm.colorTag + '40', stroke: roomForm.colorTag });
    
    // Add label
    const center = getPolygonCenter(roomData.points);
    const label = new Fabric.Text(roomData.name, {
      left: center.x - 40,
      top: center.y - 10,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#2D2D2D',
      selectable: false,
      evented: false
    });
    fabricCanvas.add(label);

    // Update home data
    rooms = [...rooms, roomData];
    await homes.update($page.params.id, { rooms });
    
    delete fabricCanvas._pendingRoom;
    showRoomModal = false;
    addToast(`"${roomData.name}" added!`, 'success');
    fabricCanvas.renderAll();
  }

  function cancelDrawing() {
    if (tempLine) {
      fabricCanvas.remove(tempLine);
      tempLine = null;
    }
    // Remove any drawn wall segments for this session
    isDrawing = false;
    wallPoints = [];
    activeTool = 'select';
    fabricCanvas.renderAll();
  }

  async function deleteRoom(room) {
    if (!confirm(`Delete "${room.name}"? Furniture placement will be lost.`)) return;
    
    // Remove from canvas
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (obj.roomData?.id === room.id) {
        fabricCanvas.remove(obj);
      }
    });

    // Remove from data
    rooms = rooms.filter(r => r.id !== room.id);
    await homes.update($page.params.id, { rooms });
    selectedRoom = null;
    addToast(`"${room.name}" deleted`, 'info');
    fabricCanvas.renderAll();
  }

  onDestroy(() => {
    if (fabricCanvas) {
      fabricCanvas.dispose();
    }
  });
</script>

<div class="page-container floorplan-page">
  <!-- Header -->
  <header class="floorplan-header">
    <a href="/" class="back-link">← Home</a>
    <h1>{home?.name || 'Loading...'}</h1>
    <span class="room-count">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
  </header>

  {#if loading}
    <Skeleton height="400px" />
  {:else}
    <!-- Toolbar -->
    <div class="toolbar" role="toolbar" aria-label="Drawing tools">
      <button
        class="tool-btn"
        class:active={activeTool === 'select'}
        on:click={() => { cancelDrawing(); activeTool = 'select'; }}
        aria-pressed={activeTool === 'select'}
      >
        <span>👆</span> Select
      </button>
      <button
        class="tool-btn"
        class:active={activeTool === 'wall'}
        on:click={() => activeTool = 'wall'}
        aria-pressed={activeTool === 'wall'}
      >
        <span>📏</span> Wall
      </button>
      <button class="tool-btn" on:click={finishRoom} disabled={!isDrawing}>
        <span>✅</span> Finish Room
      </button>
      <button class="tool-btn" on:click={cancelDrawing} disabled={!isDrawing}>
        <span>✕</span> Cancel
      </button>
    </div>

    <!-- Canvas -->
    <div class="canvas-wrapper">
      <canvas
        bind:this={canvasEl}
        id="floorplan-canvas"
        width={canvasWidth}
        height={canvasHeight}
      ></canvas>
      
      {#if isDrawing}
        <div class="drawing-hint">
          Tap to place walls. Corners snap to grid. Press "Finish Room" when done.
        </div>
      {/if}
    </div>

    <!-- Room list -->
    {#if rooms.length > 0}
      <section class="room-list-section">
        <h2>Rooms</h2>
        <div class="room-list">
          {#each rooms as room}
            <a href="/home/{$page.params.id}/room/{room.id}" class="room-card">
              <div class="room-color" style="background: {room.colorTag};"></div>
              <div class="room-info">
                <h3>{room.name}</h3>
                <span class="room-meta">{room.floorType} · {room.ceilingHeight}m ceiling</span>
              </div>
              <span class="room-arrow">→</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Empty state for new homes -->
    {#if rooms.length === 0 && !isDrawing}
      <EmptyState
        icon="📐"
        title="Draw your floor plan"
        description="Use the Wall tool to outline each room. Tap corners to place walls, then finish each room."
        ctaText="Start Drawing"
        onCta={() => activeTool = 'wall'}
      />
    {/if}
  {/if}
</div>

<!-- Room Details Modal -->
<Modal open={showRoomModal} title={editingRoom ? 'Edit Room' : 'New Room'} on:close={() => showRoomModal = false}>
  <form on:submit|preventDefault={saveRoomFromModal} class="room-form">
    <label for="room-name">Room name</label>
    <input id="room-name" type="text" bind:value={roomForm.name} required />

    <label for="room-color">Color tag</label>
    <div class="color-picker-row">
      {#each ['#E8F3E0', '#F0EBE1', '#E8D5D5', '#D5E0E8', '#E8E0D5', '#D5E8E0', '#FFE0CC', '#CCE0FF'] as color}
        <button
          type="button"
          class="color-swatch"
          class:selected={roomForm.colorTag === color}
          style="background: {color};"
          on:click={() => roomForm.colorTag = color}
          aria-label="Color {color}"
        ></button>
      {/each}
    </div>

    <label for="floor-type">Floor type</label>
    <select id="floor-type" bind:value={roomForm.floorType}>
      <option value="wood">Wood</option>
      <option value="carpet">Carpet</option>
      <option value="tile">Tile</option>
      <option value="concrete">Concrete</option>
    </select>

    <label for="ceiling-height">Ceiling height (meters)</label>
    <input id="ceiling-height" type="number" bind:value={roomForm.ceilingHeight} min="2" max="6" step="0.1" />

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => showRoomModal = false}>Cancel</button>
      <button type="submit" class="btn-primary">Save Room</button>
    </div>
  </form>
</Modal>

<style>
  .floorplan-page {
    padding-bottom: 1rem;
  }

  .floorplan-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .back-link {
    color: var(--green-700);
    font-weight: 500;
    text-decoration: none;
  }

  .room-count {
    font-size: 0.8rem;
    color: var(--grey-600);
    background: var(--grey-100);
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    margin-bottom: 0.75rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.15s;
    color: var(--charcoal);
  }

  .tool-btn.active {
    background: var(--green-100);
    color: var(--green-900);
    font-weight: 600;
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Canvas */
  .canvas-wrapper {
    position: relative;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    margin-bottom: 1rem;
    touch-action: none;
  }

  #floorplan-canvas {
    width: 100%;
    height: auto;
    display: block;
  }

  .drawing-hint {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--charcoal);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.75rem;
    pointer-events: none;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Room list */
  .room-list-section {
    margin-top: 1rem;
  }

  .room-list-section h2 {
    font-family: var(--font-sans);
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .room-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .room-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--white);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.15s;
  }

  .room-card:active {
    box-shadow: var(--shadow-md);
  }

  .room-color {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .room-info {
    flex: 1;
  }

  .room-info h3 {
    font-family: var(--font-sans);
    font-size: 0.95rem;
  }

  .room-meta {
    font-size: 0.75rem;
    color: var(--grey-600);
  }

  .room-arrow {
    color: var(--grey-400);
    font-size: 1.1rem;
  }

  /* Room form */
  .room-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .room-form label {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--grey-600);
  }

  .room-form input,
  .room-form select {
    padding: 0.65rem 0.75rem;
    border: 2px solid var(--grey-200);
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    background: var(--white);
  }

  .room-form input:focus,
  .room-form select:focus {
    border-color: var(--green-500);
    outline: none;
  }

  .color-picker-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: transform 0.15s;
  }

  .color-swatch.selected {
    border-color: var(--green-700);
    transform: scale(1.15);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    border-radius: var(--radius-sm);
    background: var(--grey-100);
    color: var(--charcoal);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.65rem 1.5rem;
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
</style>