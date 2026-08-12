<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { addToast } from '$stores/app.js';
  import { browser } from '$app/environment';
  import Modal from '$components/Modal.svelte';
  import EmptyState from '$components/EmptyState.svelte';

  let home;
  let room;
  let loading = true;
  let threeJsLoaded = false;

  // Three.js objects
  let THREE;
  let scene, camera, renderer, controls;
  let containerEl;
  let animationId;

  // Room objects
  let roomObjects = []; // furniture placed in room
  let selectedObject = null;
  let raycaster, mouse;

  // Drawer state
  let drawerOpen = false;
  let drawerTab = 'inventory'; // 'inventory' | 'catalogue' | 'ai'

  // AI state
  let aiPrompt = '';
  let aiGenerating = false;
  let aiSuggestions = [];

  // Property panel
  let showProperties = false;
  let editingObject = null;

  // Measurements
  let measureMode = false;
  let measurePoints = [];
  let measureLine = null;

  // Lighting presets
  let currentLighting = 'noon';
  const lightingPresets = {
    morning: { color: 0xFFF4E0, intensity: 0.8, ambient: 0x4A3F35 },
    noon: { color: 0xFFFFFF, intensity: 1.2, ambient: 0x606060 },
    evening: { color: 0xFFA94D, intensity: 0.6, ambient: 0x3A2F25 },
    night: { color: 0x8899CC, intensity: 0.3, ambient: 0x1A1A2E }
  };

  // Scene objects
  let roomMesh, floorMesh;
  let lights = {};

  onMount(async () => {
    const homeId = $page.params.id;
    const roomId = $page.params.roomId;

    const db = await import('idb').then(m => m.openDB('floorish-db', 1));
    home = await db.get('homes', homeId);
    
    if (!home) {
      addToast('Home not found', 'error');
      loading = false;
      return;
    }

    room = home.rooms?.find(r => r.id === roomId);
    
    if (!room) {
      addToast('Room not found', 'error');
      loading = false;
      return;
    }

    // Load inventory
    await inventory.load();

    // Initialize Three.js
    if (browser) {
      await initThreeJS();
    }

    loading = false;
  });

  async function initThreeJS() {
    THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAF8F5);
    scene.fog = new THREE.Fog(0xFAF8F5, 10, 50);

    // Camera
    const aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 100);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 1, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerEl.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.minPolarAngle = 0.3;
    controls.update();

    // Raycaster for object selection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Build the room
    buildRoomGeometry();
    setupLights(currentLighting);
    setupGridFloor();
    loadPlacedFurniture();

    // Event listeners
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('touchstart', onCanvasTouch, { passive: false });
    window.addEventListener('resize', onResize);

    // Start render loop
    animate();
    threeJsLoaded = true;
  }

  function buildRoomGeometry() {
    if (!room.points || room.points.length < 3) return;

    // Convert 2D floor plan points to 3D
    const points3D = room.points.map(p => new THREE.Vector2(p.x / 20, p.y / 20)); // scale down

    // Build wall shape
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;
    const extrudeSettings = { steps: 1, depth: height, bevelEnabled: false };

    const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: room.colorTag || 0xE8F3E0,
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    roomMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    roomMesh.castShadow = true;
    roomMesh.receiveShadow = true;
    roomMesh.rotation.x = -Math.PI / 2; // Stand up walls
    roomMesh.position.y = 0;
    scene.add(roomMesh);

    // Floor
    const floorGeometry = new THREE.ShapeGeometry(shape);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: getFloorColor(room.floorType),
      roughness: getFloorRoughness(room.floorType),
      metalness: 0.02
    });

    floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.01;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Add subtle wall edges
    const edgeGeometry = new THREE.EdgesGeometry(wallGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCCC, opacity: 0.3, transparent: true });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.rotation.x = -Math.PI / 2;
    scene.add(edges);
  }

  function getFloorColor(type) {
    const colors = { wood: 0xC4A882, carpet: 0xD5CFC0, tile: 0xE8E4DD, concrete: 0xB0A99F };
    return colors[type] || 0xC4A882;
  }

  function getFloorRoughness(type) {
    const roughness = { wood: 0.5, carpet: 0.9, tile: 0.2, concrete: 0.7 };
    return roughness[type] || 0.5;
  }

  function setupLights(preset) {
    // Remove existing lights
    Object.values(lights).forEach(l => scene.remove(l));
    lights = {};

    const config = lightingPresets[preset];

    // Ambient light
    lights.ambient = new THREE.AmbientLight(config.ambient, 0.5);
    scene.add(lights.ambient);

    // Main directional light (sun)
    lights.sun = new THREE.DirectionalLight(config.color, config.intensity);
    lights.sun.position.set(5, 10, 3);
    lights.sun.castShadow = true;
    lights.sun.shadow.mapSize.width = 1024;
    lights.sun.shadow.mapSize.height = 1024;
    lights.sun.shadow.camera.near = 0.5;
    lights.sun.shadow.camera.far = 30;
    lights.sun.shadow.camera.left = -10;
    lights.sun.shadow.camera.right = 10;
    lights.sun.shadow.camera.top = 10;
    lights.sun.shadow.camera.bottom = -10;
    lights.sun.shadow.bias = -0.0005;
    scene.add(lights.sun);

    // Fill light
    lights.fill = new THREE.DirectionalLight(config.color, config.intensity * 0.3);
    lights.fill.position.set(-3, 3, -2);
    scene.add(lights.fill);
  }

  function setupGridFloor() {
    const gridHelper = new THREE.PolarGridHelper(8, 32, 24, 64, 0xCCCCCC, 0xDDDDDD);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);
  }

  function loadPlacedFurniture() {
    if (!room.furniture) return;

    room.furniture.forEach(item => {
      createFurnitureMesh(item);
    });
  }

  function createFurnitureMesh(item) {
    // Create a placeholder box for furniture
    const { width, height, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: item.color || getCategoryColor(item.category),
      roughness: 0.6,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      item.position?.x || 0,
      (item.position?.y || 0) + height / 2,
      item.position?.z || 0
    );
    mesh.rotation.y = item.rotation || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...item, isFurniture: true, id: item.id };

    // Add outline on hover/select
    const edgeGeom = new THREE.EdgesGeometry(geometry);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true });
    const outline = new THREE.LineSegments(edgeGeom, edgeMat);
    mesh.add(outline);

    scene.add(mesh);
    roomObjects.push(mesh);
  }

  function getCategoryColor(category) {
    const colors = {
      Chairs: 0x8B6F5E,
      Tables: 0xA0856B,
      Storage: 0x6B8A7A,
      Decor: 0xC4916E,
      Lighting: 0xD4A849,
      Plants: 0x5A7D4A,
      Other: 0x9E9E9E
    };
    return colors[category] || 0x9E9E9E;
  }

  function onCanvasClick(event) {
    if (measureMode) {
      handleMeasureClick(event);
      return;
    }

    // Calculate mouse position in normalized coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomObjects);

    if (intersects.length > 0) {
      selectFurnitureObject(intersects[0].object);
    } else {
      deselectObject();
    }
  }

  function onCanvasTouch(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      onCanvasClick(event.touches[0]);
    }
  }

  function selectFurnitureObject(obj) {
    deselectObject();
    
    selectedObject = obj;
    editingObject = obj.userData;
    showProperties = true;

    // Highlight selected
    obj.children.forEach(child => {
      if (child.isLineSegments) {
        child.material.color.set(0x2D5A27);
        child.material.opacity = 0.6;
      }
    });

    // Add transform gizmo (simplified - just change material)
    obj.material.emissive = new THREE.Color(0x2D5A27);
    obj.material.emissiveIntensity = 0.3;
  }

  function deselectObject() {
    if (selectedObject) {
      selectedObject.material.emissive = new THREE.Color(0x000000);
      selectedObject.material.emissiveIntensity = 0;
      
      selectedObject.children.forEach(child => {
        if (child.isLineSegments) {
          child.material.color.set(0x000000);
          child.material.opacity = 0.15;
        }
      });
    }
    selectedObject = null;
    editingObject = null;
    showProperties = false;
  }

  function addFurnitureFromInventory(inventoryItem) {
    const newItem = {
      id: crypto.randomUUID(),
      name: inventoryItem.name,
      category: inventoryItem.category,
      dimensions: inventoryItem.dimensions || { width: 1, height: 1, depth: 1 },
      color: inventoryItem.colourVariants?.[0] || null,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0
    };

    createFurnitureMesh(newItem);
    
    // Save to room data
    if (!room.furniture) room.furniture = [];
    room.furniture = [...room.furniture, newItem];
    saveRoom();

    addToast(`${inventoryItem.name} added to room`, 'success');
    drawerOpen = false;
  }

  async function saveRoom() {
    const updatedRooms = home.rooms.map(r => 
      r.id === room.id ? room : r
    );
    await homes.update(home.id, { rooms: updatedRooms });
  }

  function changeLighting(preset) {
    currentLighting = preset;
    setupLights(preset);
  }

  function updateFurniturePosition() {
    if (!selectedObject || !editingObject) return;

    editingObject.position = {
      x: selectedObject.position.x,
      y: selectedObject.position.y - editingObject.dimensions.height / 2,
      z: selectedObject.position.z
    };
    editingObject.rotation = selectedObject.rotation.y;

    room.furniture = room.furniture.map(f => 
      f.id === editingObject.id ? { ...editingObject } : f
    );
    saveRoom();
  }

  function deleteSelectedObject() {
    if (!selectedObject) return;
    
    scene.remove(selectedObject);
    roomObjects = roomObjects.filter(o => o !== selectedObject);
    room.furniture = room.furniture.filter(f => f.id !== editingObject?.id);
    saveRoom();
    
    selectedObject = null;
    editingObject = null;
    showProperties = false;
    addToast('Item removed', 'info');
  }

  function handleMeasureClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floorMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      measurePoints.push(point);

      if (measurePoints.length === 2) {
        // Show distance
        const dist = measurePoints[0].distanceTo(measurePoints[1]);
        addToast(`Distance: ${dist.toFixed(2)}m`, 'info');
        
        // Draw line
        if (measureLine) scene.remove(measureLine);
        const points = measurePoints;
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xFF4444, linewidth: 2 });
        measureLine = new THREE.Line(geometry, material);
        scene.add(measureLine);

        // Reset for next measurement
        measurePoints = [];
        setTimeout(() => {
          if (measureLine) scene.remove(measureLine);
          measureLine = null;
        }, 3000);
      }
    }
  }

  function onResize() {
    if (!containerEl || !renderer) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.removeEventListener('click', onCanvasClick);
      window.removeEventListener('resize', onResize);
    }
    if (containerEl && renderer?.domElement) {
      containerEl.removeChild(renderer.domElement);
    }
  });
</script>

<div class="page-container editor-page">
  <!-- Header -->
  <header class="editor-header">
    <a href="/home/{$page.params.id}" class="back-link">← Floor Plan</a>
    <h1>{room?.name || 'Loading...'}</h1>
    <div class="header-actions">
      <a href="/home/{$page.params.id}/room/{$page.params.roomId}/ar" class="icon-btn" title="AR View">👁️</a>
      <a href="/home/{$page.params.id}/room/{$page.params.roomId}/walkthrough" class="icon-btn" title="Walkthrough">🚶</a>
    </div>
  </header>

  {#if loading}
    <div class="loading-view">
      <div class="spinner"></div>
      <p>Rendering room...</p>
    </div>
  {:else}
    <!-- 3D Viewport -->
    <div class="viewport" bind:this={containerEl}>
      {#if !threeJsLoaded}
        <div class="viewport-placeholder">
          <div class="spinner"></div>
          <p>Loading 3D engine...</p>
        </div>
      {/if}
    </div>

    <!-- Lighting Quick Select -->
    <div class="lighting-bar">
      {#each Object.keys(lightingPresets) as preset}
        <button
          class="light-btn"
          class:active={currentLighting === preset}
          on:click={() => changeLighting(preset)}
        >
          {preset === 'morning' ? '🌅' : preset === 'noon' ? '☀️' : preset === 'evening' ? '🌅' : '🌙'}
          {preset}
        </button>
      {/each}
    </div>

    <!-- Bottom Toolbar -->
    <div class="editor-toolbar">
      <button class="tool-btn" on:click={() => drawerOpen = !drawerOpen} class:active={drawerOpen}>
        📦 Add Furniture
      </button>
      <button class="tool-btn" on:click={() => {/* Paint mode */}}>
        🎨 Paint
      </button>
      <button class="tool-btn" on:click={() => { measureMode = !measureMode; addToast(measureMode ? 'Measure mode on' : 'Measure mode off', 'info'); }} class:active={measureMode}>
        📏 Measure
      </button>
      <button class="tool-btn" on:click={() => {/* Screenshot */}}>
        📸
      </button>
    </div>

    <!-- Furniture Drawer -->
    {#if drawerOpen}
      <div class="drawer" class:open={drawerOpen}>
        <div class="drawer-handle" on:click={() => drawerOpen = false}>
          <span class="handle-bar"></span>
        </div>
        
        <div class="drawer-tabs">
          <button class:active={drawerTab === 'inventory'} on:click={() => drawerTab = 'inventory'}>📦 My Items</button>
          <button class:active={drawerTab === 'catalogue'} on:click={() => drawerTab = 'catalogue'}>🛋️ Catalogue</button>
          <button class:active={drawerTab === 'ai'} on:click={() => drawerTab = 'ai'}>🤖 AI</button>
        </div>

        <div class="drawer-content">
          {#if drawerTab === 'inventory'}
            {#if $inventory.length === 0}
              <EmptyState icon="📦" title="No items yet" description="Scan furniture or browse the catalogue" />
            {:else}
              <div class="item-grid">
                {#each $inventory as item}
                  <button class="item-card" on:click={() => addFurnitureFromInventory(item)}>
                    <div class="item-preview">🪑</div>
                    <span class="item-name">{item.name}</span>
                    <span class="item-category">{item.category}</span>
                  </button>
                {/each}
              </div>
            {/if}
          {:else if drawerTab === 'catalogue'}
            <EmptyState icon="🛋️" title="Community catalogue" description="Browse shared furniture. Coming soon." />
          {:else if drawerTab === 'ai'}
            <div class="ai-panel">
              <textarea
                bind:value={aiPrompt}
                placeholder="Describe a look... e.g., 'cozy reading nook with warm lighting'"
                rows="3"
              ></textarea>
              <div class="ai-chips">
                <button class="chip" on:click={() => aiPrompt = 'Cozy reading nook'}>📚 Cozy Nook</button>
                <button class="chip" on:click={() => aiPrompt = 'Work from home setup'}>💻 WFH Setup</button>
                <button class="chip" on:click={() => aiPrompt = 'Dinner party ready'}>🍽️ Party</button>
              </div>
              <button class="btn-primary" disabled={!aiPrompt.trim() || aiGenerating}>
                {aiGenerating ? 'Generating...' : '✨ Generate'}
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Properties Panel -->
    {#if showProperties && editingObject}
      <div class="properties-panel">
        <h3>{editingObject.name}</h3>
        <div class="prop-row">
          <span>Position:</span>
          <span>{editingObject.position?.x?.toFixed(1)}m, {editingObject.position?.y?.toFixed(1)}m, {editingObject.position?.z?.toFixed(1)}m</span>
        </div>
        <div class="prop-row">
          <span>Rotation:</span>
          <span>{((editingObject.rotation || 0) * 180 / Math.PI).toFixed(0)}°</span>
        </div>
        <div class="prop-actions">
          <button class="btn-small" on:click={() => { selectedObject.rotation.y += Math.PI / 2; updateFurniturePosition(); }}>↻ 90°</button>
          <button class="btn-small btn-danger" on:click={deleteSelectedObject}>🗑️ Delete</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .editor-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    padding: 0;
    max-width: 100%;
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--white);
    border-bottom: 1px solid var(--grey-200);
    flex-shrink: 0;
  }

  .back-link {
    color: var(--green-700);
    font-weight: 500;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .editor-header h1 {
    flex: 1;
    font-family: var(--font-sans);
    font-size: 1.05rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    font-size: 1.3rem;
    padding: 0.3rem;
    text-decoration: none;
  }

  /* Viewport */
  .viewport {
    flex: 1;
    position: relative;
    background: var(--cream);
    overflow: hidden;
    min-height: 300px;
  }

  .viewport canvas {
    display: block;
  }

  .viewport-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--grey-600);
    gap: 0.5rem;
  }

  .loading-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--grey-600);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--grey-200);
    border-top-color: var(--green-700);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Lighting bar */
  .lighting-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--white);
    overflow-x: auto;
    border-top: 1px solid var(--grey-200);
  }

  .light-btn {
    padding: 0.4rem 0.75rem;
    border-radius: 16px;
    font-size: 0.75rem;
    white-space: nowrap;
    background: var(--grey-100);
    transition: all 0.15s;
  }

  .light-btn.active {
    background: var(--green-100);
    color: var(--green-900);
    font-weight: 600;
  }

  /* Editor toolbar */
  .editor-toolbar {
    display: flex;
    justify-content: space-around;
    padding: 0.5rem;
    background: var(--white);
    border-top: 1px solid var(--grey-200);
  }

  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    color: var(--charcoal);
    transition: all 0.15s;
  }

  .tool-btn.active {
    background: var(--green-100);
    color: var(--green-900);
  }

  /* Drawer */
  .drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 55vh;
    background: var(--white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
    z-index: 150;
    display: flex;
    flex-direction: column;
    animation: slideUpDrawer 0.3s ease;
  }

  @keyframes slideUpDrawer {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .drawer-handle {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    cursor: pointer;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: var(--grey-300);
    border-radius: 2px;
  }

  .drawer-tabs {
    display: flex;
    gap: 0;
    padding: 0 1rem;
    border-bottom: 1px solid var(--grey-200);
  }

  .drawer-tabs button {
    flex: 1;
    padding: 0.6rem;
    font-size: 0.85rem;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    color: var(--grey-600);
    transition: all 0.15s;
  }

  .drawer-tabs button.active {
    border-bottom-color: var(--green-700);
    color: var(--green-900);
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    max-height: 40vh;
  }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .item-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.75rem 0.5rem;
    background: var(--grey-100);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
  }

  .item-card:hover, .item-card:active {
    background: var(--green-100);
    transform: translateY(-2px);
  }

  .item-preview {
    font-size: 2rem;
  }

  .item-name {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
  }

  .item-category {
    font-size: 0.65rem;
    color: var(--grey-600);
  }

  /* AI panel */
  .ai-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ai-panel textarea {
    padding: 0.75rem;
    border: 2px solid var(--grey-200);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    resize: vertical;
    font-family: var(--font-sans);
  }

  .ai-panel textarea:focus {
    border-color: var(--green-500);
    outline: none;
  }

  .ai-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    padding: 0.4rem 0.75rem;
    background: var(--green-100);
    color: var(--green-900);
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .chip:hover { background: var(--green-200); }

  .btn-primary {
    padding: 0.75rem;
    background: var(--green-700);
    color: white;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Properties panel */
  .properties-panel {
    position: absolute;
    bottom: 120px;
    left: 1rem;
    right: 1rem;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 1rem;
    z-index: 100;
  }

  .properties-panel h3 {
    font-family: var(--font-sans);
    font-size: 0.95rem;
    margin-bottom: 0.5rem;
  }

  .prop-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    padding: 0.3rem 0;
    color: var(--grey-600);
  }

  .prop-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .btn-small {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    background: var(--grey-100);
    font-weight: 500;
  }

  .btn-danger {
    background: #FDECEA;
    color: var(--error);
  }

  @media (min-width: 768px) {
    .editor-page {
      max-width: 900px;
      margin: 0 auto;
    }
    .drawer {
      max-width: 600px;
      left: 50%;
      transform: translateX(-50%);
    }
    @keyframes slideUpDrawer {
      from { transform: translate(-50%, 100%); }
      to { transform: translate(-50%, 0); }
    }
    .item-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>