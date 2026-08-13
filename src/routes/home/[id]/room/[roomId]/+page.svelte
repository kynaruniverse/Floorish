<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { toast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let home = null;
  let room = null;
  let loading = true;
  let threeReady = false;

  let THREE;
  let scene, camera, renderer, controls;
  let containerEl;
  let animationId;
  let raycaster, mouse;
  let roomObjects = [];
  let selectedObject = null;

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
      console.error('Failed:', err);
      toast.error('Error loading room');
    }

    loading = false;
  });

  async function initThree() {
    try {
      THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xFAF8F4);

      camera = new THREE.PerspectiveCamera(55, containerEl.clientWidth / containerEl.clientHeight, 0.1, 50);
      camera.position.set(4, 3, 6);
      camera.lookAt(0, 1, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      containerEl.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1, 0);
      controls.enableDamping = true;
      controls.update();

      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      buildRoom();
      setupLighting();
      loadFurniture();

      renderer.domElement.addEventListener('click', onCanvasClick);
      window.addEventListener('resize', onResize);

      animate();
      threeReady = true;
    } catch (err) {
      console.error('Three.js failed:', err);
      toast.error('3D failed to load');
    }
  }

  function buildRoom() {
    if (!room.points || room.points.length < 3) return;

    const scale = 1 / 20;
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;

    const floorGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xC4A882, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: height, bevelEnabled: false });
    const wallMat = new THREE.MeshStandardMaterial({
      color: parseInt((room.colorTag || '#E8F3E0').replace('#', ''), 16),
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.rotation.x = -Math.PI / 2;
    scene.add(walls);
  }

  function setupLighting() {
    scene.add(new THREE.AmbientLight(0x666666, 0.6));
    const sun = new THREE.DirectionalLight(0xFFFFFF, 1.0);
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
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B6F5E, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(item.position?.x || 0, (item.position?.y || 0) + height / 2, item.position?.z || 0);
    mesh.rotation.y = item.rotation || 0;
    mesh.castShadow = true;
    mesh.userData = { ...item };
    scene.add(mesh);
    roomObjects.push(mesh);
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
    obj.material.emissive = new THREE.Color(0x2D5A27);
    obj.material.emissiveIntensity = 0.3;
  }

  function deselectObject() {
    if (selectedObject) {
      selectedObject.material.emissive = new THREE.Color(0x000000);
      selectedObject.material.emissiveIntensity = 0;
    }
    selectedObject = null;
  }

  function rotateSelected() {
    if (selectedObject) selectedObject.rotation.y += Math.PI / 2;
  }

  function deleteSelected() {
    if (!selectedObject) return;
    scene.remove(selectedObject);
    roomObjects = roomObjects.filter(o => o !== selectedObject);
    selectedObject = null;
    toast.info('Item removed');
  }

  function onResize() {
    if (!containerEl || !renderer) return;
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
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
  <header class="editor-header">
    <a href="/home/{$page.params.id}" class="back-link">←</a>
    <h1>{room?.name || 'Loading...'}</h1>
  </header>

  {#if loading}
    <div class="loading-view">
      <div class="spinner"></div>
      <p>Loading room...</p>
    </div>
  {:else}
    <div class="viewport" bind:this={containerEl}>
      {#if !threeReady}
        <div class="viewport-placeholder">
          <div class="spinner"></div>
          <p>Starting 3D...</p>
        </div>
      {/if}
    </div>

    {#if selectedObject}
      <div class="controls">
        <button on:click={rotateSelected}>↻ Rotate</button>
        <button on:click={deleteSelected}>🗑️ Delete</button>
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
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
  }

  .back-link {
    font-size: 1.1rem;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
  }

  .editor-header h1 {
    flex: 1;
    font-size: 1rem;
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

  .controls {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #fff;
    border-top: 1px solid #e8e8e8;
  }

  .controls button {
    flex: 1;
    padding: 0.65rem;
    border-radius: 8px;
    font-weight: 600;
    background: #f0f0f0;
  }
</style>