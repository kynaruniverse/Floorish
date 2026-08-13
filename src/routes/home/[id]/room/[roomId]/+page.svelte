<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { toast } from '$stores/app.js';
  import { browser } from '$app/environment';
  import EmptyState from '$components/EmptyState.svelte';

  let home = null;
  let room = null;
  let loading = true;
  let threeReady = false;

  // Three.js
  let THREE;
  let scene, camera, renderer, controls;
  let containerEl;
  let animationId;
  let raycaster, mouse;

  // Room objects
  let roomObjects = [];
  let selectedObject = null;
  let showProperties = false;

  // Drawer
  let drawerOpen = false;

  // Lighting
  let currentLighting = 'noon';
  const lightingPresets = {
    morning: { color: 0xFFF4E0, intensity: 0.8 },
    noon: { color: 0xFFFFFF, intensity: 1.2 },
    evening: { color: 0xFFA94D, intensity: 0.6 },
    night: { color: 0x8899CC, intensity: 0.3 }
  };

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }

  onMount(async () => {
    const homeId = $page.params.id;
    const roomId = $page.params.roomId;

    try {
      home = await homes.get(homeId);
      room = home?.rooms?.find(r => r.id === roomId);

      if (!home || !room) {
        toast.error('Room not found');
        loading = false;
        return;
      }

      await inventory.load();

      if (browser) {
        await initThree();
      }
    } catch (err) {
      console.error('Failed to load room:', err);
      toast.error('Error loading room');
    }

    loading = false;
  });

  async function initThree() {
    try {
      THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xFAF8F4);

      // Camera
      const aspect = containerEl.clientWidth / containerEl.clientHeight;
      camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 50);
      camera.position.set(4, 3, 6);
      camera.lookAt(0, 1, 0);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      containerEl.appendChild(renderer.domElement);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1;
      controls.maxDistance = 12;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controls.update();

      // Raycaster
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // Build room
      buildRoom();
      setupLighting('noon');
      loadFurniture();

      // Events
      renderer.domElement.addEventListener('click', onCanvasClick);
      window.addEventListener('resize', onResize);

      // Animation loop
      animate();
      threeReady = true;
    } catch (err) {
      console.error('Three.js failed:', err);
      toast.error('3D engine failed to load');
    }
  }

  function buildRoom() {
    if (!room.points || room.points.length < 3) return;

    const scale = 1 / 20;
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;

    // Floor
    const floorGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: getFloorColor(room.floorType),
      roughness: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: height,
      bevelEnabled: false
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: hexToNumber(room.colorTag || '#E8F3E0'),
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.rotation.x = -Math.PI / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    scene.add(walls);
  }

  function getFloorColor(type) {
    const colors = { wood: 0xC4A882, carpet: 0xD5CFC0, tile: 0xE8E4DD, concrete: 0xB0A99F };
    return colors[type] || 0xC4A882;
  }

  function hexToNumber(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function setupLighting(preset) {
    // Remove old lights
    scene.children
      .filter(child => child.isLight)
      .forEach(light => scene.remove(light));

    const config = lightingPresets[preset];

    const ambient = new THREE.AmbientLight(0x666666, 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(config.color, config.intensity);
    sun.position.set(5, 8, 3);
    sun.castShadow = true;
    scene.add(sun);
  }

  function loadFurniture() {
    if (!room.furniture) return;
    room.furniture.forEach(item => createFurnitureMesh(item));
  }

  function createFurnitureMesh(item) {
    const { width, height, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
    
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: getCategoryColor(item.category),
      roughness: 0.6
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      item.position?.x || 0,
      (item.position?.y || 0) + height / 2,
      item.position?.z || 0
    );
    mesh.rotation.y = item.rotation || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...item, isFurniture: true };

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
      Rugs: 0xC4A882,
      Other: 0x9E9E9E
    };
    return colors[category] || 0x9E9E9E;
  }

  function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(roomObjects);

    if (intersects.length > 0) {
      selectObject(intersects[0].object);
    } else {
      deselectObject();
    }
  }

  function selectObject(obj) {
    deselectObject();
    selectedObject = obj;
    showProperties = true;
    obj.material.emissive = new THREE.Color(0x2D5A27);
    obj.material.emissiveIntensity = 0.3;
  }

  function deselectObject() {
    if (selectedObject) {
      selectedObject.material.emissive = new THREE.Color(0x000000);
      selectedObject.material.emissiveIntensity = 0;
    }
    selectedObject = null;
    showProperties = false;
  }

  function addFurnitureItem(inventoryItem) {
    const newItem = {
      id: generateId(),
      name: inventoryItem.name,
      category: inventoryItem.category,
      dimensions: inventoryItem.dimensions || { width: 1, height: 1, depth: 1 },
      position: { x: (Math.random() - 0.5) * 2, y: 0, z: (Math.random() - 0.5) * 2 },
      rotation: 0
    };

    createFurnitureMesh(newItem);
    
    if (!room.furniture) room.furniture = [];
    room.furniture = [...room.furniture, newItem];
    saveRoom();
    
    toast.success(`"${inventoryItem.name}" added`);
    drawerOpen = false;
  }

  async function saveRoom() {
    const updatedRooms = (home.rooms || []).map(r =>
      r.id === room.id ? room : r
    );
    await homes.update(home.id, { rooms: updatedRooms });
  }

  function rotateSelected() {
    if (!selectedObject) return;
    selectedObject.rotation.y += Math.PI / 2;
    
    const item = room.furniture.find(f => f.id === selectedObject.userData.id);
    if (item) {
      item.rotation = selectedObject.rotation.y;
      saveRoom();
    }
  }

  function deleteSelected() {
    if (!selectedObject) return;
    
    scene.remove(selectedObject);
    roomObjects = roomObjects.filter(o => o !== selectedObject);
    room.furniture = room.furniture.filter(f => f.id !== selectedObject.userData.id);
    saveRoom();
    
    selectedObject = null;
    showProperties = false;
    toast.info('Item removed');
  }

  function changeLighting(preset) {
    currentLighting = preset;
    setupLighting(preset);
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
      if (containerEl && renderer.domElement) {
        containerEl.removeChild(renderer.domElement);
      }
    }
  });
</script>

<div class="editor-page">
  <!-- Header -->
  <header class="editor-header">
    <a href="/home/{$page.params.id}" class="back-link">←</a>
    <h1>{room?.name || 'Loading...'}</h1>
    <span class="room-badge">{room?.furniture?.length || 0} items</span>
  </header>

  {#if loading}
    <div class="loading-view">
      <div class="spinner"></div>
      <p>Loading room...</p>
    </div>
  {:else}
    <!-- 3D Viewport -->
    <div class="viewport" bind:this={containerEl}>
      {#if !threeReady}
        <div class="viewport-placeholder">
          <div class="spinner"></div>
          <p>Starting 3D engine...</p>
        </div>
      {/if}
    </div>

    <!-- Lighting -->
    <div class="lighting-bar">
      {#each Object.keys(lightingPresets) as preset}
        <button
          class="light-btn"
          class:active={currentLighting === preset}
          on:click={() => changeLighting(preset)}
        >
          {preset === 'morning' ? '🌅' : preset === 'noon' ? '☀️' : preset === 'evening' ? '🌇' : '🌙'}
        </button>
      {/each}
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="tool-btn" class:active={drawerOpen} on:click={() => drawerOpen = !drawerOpen}>
        📦 Add
      </button>
      {#if selectedObject}
        <button class="tool-btn" on:click={rotateSelected}>↻ Rotate</button>
        <button class="tool-btn danger" on:click={deleteSelected}>🗑️</button>
      {/if}
    </div>

    <!-- Furniture drawer -->
    {#if drawerOpen}
      <div class="drawer">
        <button class="drawer-handle" on:click={() => drawerOpen = false} aria-label="Close drawer">
          <span></span>
        </div>
        <h3>Add Furniture</h3>
        
        {#if $inventory.length === 0}
          <EmptyState
            mode="compact"
            icon="📦"
            title="No furniture yet"
            description="Add items in the Inventory tab first."
          />
        {:else}
          <div class="item-grid">
            {#each $inventory as item}
              <button class="item-card" on:click={() => addFurnitureItem(item)}>
                <span class="item-emoji">🪑</span>
                <span class="item-name">{item.name}</span>
                <span class="item-cat">{item.category}</span>
              </button>
            {/each}
          </div>
        {/if}
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
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;
  }

  .back-link {
    font-size: 1.1rem;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
  }

  .editor-header h1 {
    flex: 1;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-badge {
    font-size: 0.7rem;
    background: #E8F3E0;
    color: #1E3D1E;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    white-space: nowrap;
  }

  .loading-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #666;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e0e0e0;
    border-top-color: #1E3D1E;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .viewport {
    flex: 1;
    position: relative;
    background: #FAF8F4;
    overflow: hidden;
    min-height: 250px;
  }

  .viewport-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
    gap: 0.5rem;
  }

  .lighting-bar {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: #fff;
    border-top: 1px solid #e8e8e8;
  }

  .light-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 1.1rem;
    background: #f0f0f0;
    transition: all 0.15s;
  }

  .light-btn.active {
    background: #E8F3E0;
    border: 2px solid #1E3D1E;
  }

  .toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #fff;
    border-top: 1px solid #e8e8e8;
  }

  .tool-btn {
    flex: 1;
    padding: 0.65rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    background: #f0f0f0;
    transition: all 0.15s;
  }

  .tool-btn.active {
    background: #1E3D1E;
    color: #fff;
  }

  .tool-btn.danger {
    background: #FDECEA;
    color: #C62828;
  }

  .drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    z-index: 150;
    padding: 1rem;
    max-height: 50vh;
    overflow-y: auto;
    animation: slideUp 0.25s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .drawer-handle {
    display: flex;
    justify-content: center;
    padding: 0.5rem;
    cursor: pointer;
  }

  .drawer-handle span {
    width: 40px;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
  }

  .drawer h3 {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .item-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .item-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    background: #f5f5f5;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .item-card:active {
    background: #E8F3E0;
    transform: scale(0.95);
  }

  .item-emoji {
    font-size: 1.75rem;
  }

  .item-name {
    font-size: 0.7rem;
    font-weight: 600;
    text-align: center;
  }

  .item-cat {
    font-size: 0.6rem;
    color: #888;
  }

  @media (min-width: 768px) {
    .editor-page {
      max-width: 600px;
      margin: 0 auto;
    }
    .item-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>