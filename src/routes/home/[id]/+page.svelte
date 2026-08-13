<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { homes } from '$stores/homes.js';
  import { toast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';
  import { browser } from '$app/environment';

  let home = null;
  let rooms = [];
  let loading = true;
  let canvasEl;
  let fabricCanvas = null;
  let Fabric = null;

  // Drawing state
  let activeTool = 'select';
  let wallPoints = [];
  let tempLines = [];
  let isDrawing = false;

  // Modal
  let showRoomModal = false;
  let roomForm = { name: '', colorTag: '#E8F3E0', floorType: 'wood', ceilingHeight: 2.4 };

  // Canvas size
  let canvasWidth = 800;
  let canvasHeight = 600;

  const GRID_SIZE = 25;

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }

  onMount(async () => {
    const homeId = $page.params.id;
    
    try {
      home = await homes.get(homeId);
      
      if (!home) {
        toast.error('Home not found');
        loading = false;
        return;
      }

      rooms = home.rooms || [];

      if (browser) {
        await initFabric();
      }
    } catch (err) {
      console.error('Failed to load home:', err);
      toast.error('Error loading home');
    }
    
    loading = false;
  });

  async function initFabric() {
    try {
      const fabricModule = await import('fabric');
      Fabric = fabricModule.fabric || fabricModule.default;
      
      const container = canvasEl?.parentElement;
      if (container) {
        canvasWidth = container.clientWidth || 800;
        canvasHeight = 600;
      }

      initCanvas();
    } catch (err) {
      console.error('Fabric.js failed to load:', err);
      toast.error('Could not load drawing engine');
    }
  }

  function initCanvas() {
    if (!canvasEl || !Fabric) return;

    fabricCanvas = new Fabric.Canvas(canvasEl, {
      width: canvasWidth,
      height: canvasHeight,
      selection: false,
      backgroundColor: '#FAF8F4',
      preserveObjectStacking: true,
      allowTouchScrolling: false,
      renderOnAddRemove: true
    });

    drawGrid();

    if (rooms.length > 0) {
      rooms.forEach(room => renderRoom(room));
    }

    setupCanvasEvents();
    fabricCanvas.renderAll();
  }

  function drawGrid() {
    if (!fabricCanvas) return;
    
    const gridColor = '#E8E0D0';
    const spacing = GRID_SIZE;

    for (let x = spacing; x < canvasWidth; x += spacing) {
      const line = new Fabric.Line([x, 0, x, canvasHeight], {
        stroke: gridColor,
        strokeWidth: 0.5,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(line);
      line.moveTo(-999);
    }

    for (let y = spacing; y < canvasHeight; y += spacing) {
      const line = new Fabric.Line([0, y, canvasWidth, y], {
        stroke: gridColor,
        strokeWidth: 0.5,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(line);
      line.moveTo(-999);
    }
  }

  function setupCanvasEvents() {
    if (!canvasEl) return;
    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  function handlePointerDown(e) {
    e.preventDefault();
    
    if (activeTool !== 'wall') return;
    
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const snapped = snapToGrid({ x, y });
    
    wallPoints.push(snapped);
    
    // Draw dot
    const dot = new Fabric.Circle({
      left: snapped.x - 5,
      top: snapped.y - 5,
      radius: 5,
      fill: '#1E3D1E',
      selectable: false,
      evented: false
    });
    fabricCanvas.add(dot);
    tempLines.push(dot);
    
    // Draw line from previous point
    if (wallPoints.length >= 2) {
      const prev = wallPoints[wallPoints.length - 2];
      const line = new Fabric.Line([prev.x, prev.y, snapped.x, snapped.y], {
        stroke: '#1E3D1E',
        strokeWidth: 4,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(line);
      tempLines.push(line);
    }
    
    isDrawing = true;
    fabricCanvas.renderAll();
  }

  function snapToGrid(pointer) {
    return {
      x: Math.round(pointer.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(pointer.y / GRID_SIZE) * GRID_SIZE
    };
  }

  function startWallTool() {
    activeTool = 'wall';
    wallPoints = [];
    clearTempLines();
    isDrawing = false;
    toast.info('Tap on the canvas to place wall corners');
  }

  function clearTempLines() {
    if (!fabricCanvas) return;
    tempLines.forEach(obj => fabricCanvas.remove(obj));
    tempLines = [];
  }

  function cancelDrawing() {
    activeTool = 'select';
    wallPoints = [];
    clearTempLines();
    isDrawing = false;
    fabricCanvas?.renderAll();
  }

  function finishRoom() {
    if (wallPoints.length < 3) {
      toast.error('A room needs at least 3 corner points');
      return;
    }

    const first = wallPoints[0];
    const last = wallPoints[wallPoints.length - 1];
    
    const closingLine = new Fabric.Line([last.x, last.y, first.x, first.y], {
      stroke: '#1E3D1E',
      strokeWidth: 4,
      selectable: false,
      evented: false
    });
    fabricCanvas.add(closingLine);
    tempLines.push(closingLine);

    roomForm = {
      name: `Room ${rooms.length + 1}`,
      colorTag: randomColor(),
      floorType: 'wood',
      ceilingHeight: 2.4
    };
    showRoomModal = true;
    fabricCanvas.renderAll();
  }

  async function saveRoomFromModal() {
    if (!fabricCanvas || wallPoints.length < 3) return;

    const roomData = {
      id: generateId(),
      name: roomForm.name.trim() || `Room ${rooms.length + 1}`,
      colorTag: roomForm.colorTag,
      floorType: roomForm.floorType,
      ceilingHeight: roomForm.ceilingHeight,
      points: wallPoints.map(p => ({ x: p.x, y: p.y })),
      furniture: []
    };

    clearTempLines();
    renderRoom(roomData);

    await homes.addRoom(home.id, roomData);
    
    rooms = [...rooms, roomData];
    
    wallPoints = [];
    isDrawing = false;
    activeTool = 'select';
    showRoomModal = false;
    
    toast.success(`"${roomData.name}" added!`);
    fabricCanvas.renderAll();
  }

  function renderRoom(room) {
    if (!fabricCanvas || !room.points || room.points.length < 3) return;

    const polygon = new Fabric.Polygon(room.points, {
      fill: hexToRgba(room.colorTag || '#E8F3E0', 0.35),
      stroke: room.colorTag || '#2D5A27',
      strokeWidth: 2,
      selectable: true,
      hasControls: false,
      hoverCursor: 'pointer',
      roomData: room
    });

    fabricCanvas.add(polygon);

    const center = getPolygonCenter(room.points);
    const label = new Fabric.Text(room.name || 'Room', {
      left: center.x - 30,
      top: center.y - 10,
      fontSize: 13,
      fontFamily: 'sans-serif',
      fill: '#333',
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false
    });
    fabricCanvas.add(label);

    polygon.on('mousedown', () => {
      if (activeTool === 'select' && room.id) {
        goto(`/home/${home.id}/room/${room.id}`);
      }
    });
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getPolygonCenter(points) {
    let cx = 0, cy = 0;
    points.forEach(p => { cx += p.x; cy += p.y; });
    return { x: cx / points.length, y: cy / points.length };
  }

  function randomColor() {
    const colors = ['#E8F3E0', '#F0EBE1', '#E8D5D5', '#D5E0E8', '#E8E0D5', '#D5E8E0', '#FFE0CC', '#CCE0FF'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async function deleteRoom(room) {
    if (!confirm(`Delete "${room.name}"?`)) return;
    
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (obj.roomData?.id === room.id) {
        fabricCanvas.remove(obj);
      }
    });

    await homes.removeRoom(home.id, room.id);
    rooms = rooms.filter(r => r.id !== room.id);
    toast.info(`"${room.name}" deleted`);
    fabricCanvas.renderAll();
  }

  onDestroy(() => {
    if (canvasEl) {
      canvasEl.removeEventListener('pointerdown', handlePointerDown);
    }
    if (fabricCanvas) {
      fabricCanvas.dispose();
      fabricCanvas = null;
    }
  });
</script>

<div class="floorplan-page">
  <header class="floorplan-header">
    <a href="/" class="back-link">←</a>
    <h1>{home?.name || 'Loading...'}</h1>
    <span class="room-count">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
  </header>

  {#if loading}
    <Skeleton height="400px" />
  {:else}
    <div class="toolbar">
      <button
        class="tool-btn"
        class:active={activeTool === 'select'}
        on:click={cancelDrawing}
      >
        👆 Select
      </button>
      <button
        class="tool-btn"
        class:active={activeTool === 'wall'}
        on:click={startWallTool}
      >
        📏 Draw Walls
      </button>
      {#if activeTool === 'wall'}
        <button class="tool-btn finish" on:click={finishRoom} disabled={wallPoints.length < 3}>
          ✅ Finish
        </button>
        <button class="tool-btn" on:click={cancelDrawing}>
          ✕ Cancel
        </button>
      {/if}
    </div>

    {#if activeTool === 'wall'}
      <div class="draw-hint">
        {wallPoints.length < 3
          ? `Tap to place corner (${wallPoints.length}/3 minimum)`
          : `${wallPoints.length} corners placed — tap Finish when done`}
      </div>
    {/if}

    <div class="canvas-wrapper">
      <canvas
        bind:this={canvasEl}
        id="floorplan-canvas"
        width={canvasWidth}
        height={canvasHeight}
      ></canvas>
    </div>

    {#if rooms.length > 0}
      <section class="room-list-section">
        <h2>Rooms</h2>
        {#each rooms as room}
          <div class="room-card">
            <div class="room-color" style="background: {room.colorTag};"></div>
            <div class="room-info" role="button" tabindex="0" on:click={() => goto(`/home/${home.id}/room/${room.id}`)} on:keydown={(e) => e.key === 'Enter' && goto(`/home/${home.id}/room/${room.id}`)}>
              <h3>{room.name}</h3>
              <span>{room.floorType} · {room.ceilingHeight}m</span>
            </div>
            <button class="delete-btn" on:click={() => deleteRoom(room)}>🗑️</button>
          </div>
        {/each}
      </section>
    {:else if activeTool !== 'wall'}
      <EmptyState
        icon="📐"
        title="Draw your floor plan"
        description="Tap 'Draw Walls' then tap on the canvas to place room corners."
        ctaText="Start Drawing"
        onCta={startWallTool}
      />
    {/if}
  {/if}
</div>

<Modal open={showRoomModal} title="Save Room" on:close={() => showRoomModal = false}>
  <form on:submit|preventDefault={saveRoomFromModal} class="room-form">
    <label for="room-name">Room name</label>
    <input id="room-name" type="text" bind:value={roomForm.name} />

    <span class="form-label">Colour</span>
    <div class="color-row">
      {#each ['#E8F3E0', '#F0EBE1', '#E8D5D5', '#D5E0E8', '#E8E0D5', '#D5E8E0', '#FFE0CC', '#CCE0FF'] as color}
        <button
          type="button"
          class="color-swatch"
          class:selected={roomForm.colorTag === color}
          style="background: {color};"
          on:click={() => roomForm.colorTag = color}
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

    <label for="ceiling">Ceiling height</label>
    <input id="ceiling" type="number" bind:value={roomForm.ceilingHeight} min="2" max="6" step="0.1" />

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => showRoomModal = false}>Cancel</button>
      <button type="submit" class="btn-primary">Save Room</button>
    </div>
  </form>
</Modal>

<style>
  .floorplan-page {
    max-width: 520px;
    margin: 0 auto;
    padding: 0.75rem;
  }

  .floorplan-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .back-link {
    font-size: 1.2rem;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
  }

  .floorplan-header h1 {
    flex: 1;
    font-size: 1.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-count {
    font-size: 0.75rem;
    background: #eee;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    white-space: nowrap;
  }

  .toolbar {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem;
    background: white;
    border-radius: 12px;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .tool-btn {
    padding: 0.55rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    background: #f0f0f0;
    white-space: nowrap;
  }

  .tool-btn.active {
    background: #1E3D1E;
    color: white;
  }

  .tool-btn.finish {
    background: #E8F0E8;
    color: #1E3D1E;
  }

  .tool-btn:disabled {
    opacity: 0.4;
  }

  .draw-hint {
    text-align: center;
    padding: 0.5rem;
    font-size: 0.8rem;
    color: #555;
    background: #FFF9E6;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .canvas-wrapper {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    margin-bottom: 1rem;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
    position: relative;
  }

  #floorplan-canvas {
    width: 100%;
    display: block;
  }

  .room-list-section h2 {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .room-card {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: white;
    padding: 0.7rem 0.85rem;
    border-radius: 10px;
    margin-bottom: 0.4rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .room-color {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    flex-shrink: 0;
  }

  .room-info {
    flex: 1;
    cursor: pointer;
  }

  .room-info h3 {
    font-size: 0.9rem;
  }

  .room-info span {
    font-size: 0.72rem;
    color: #666;
  }

  .delete-btn {
    padding: 0.3rem;
    opacity: 0.5;
  }

  .room-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .room-form label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
  }

  .form-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #555;
  }

  .room-form input,
  .room-form select {
    padding: 0.6rem 0.75rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .color-row {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .color-swatch {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 3px solid transparent;
  }

  .color-swatch.selected {
    border-color: #1E3D1E;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn-secondary {
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    background: #f0f0f0;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.65rem 1.5rem;
    border-radius: 8px;
    background: #1E3D1E;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }
</style>