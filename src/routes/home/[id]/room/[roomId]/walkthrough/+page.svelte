<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { toast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let home = null;
  let room = null;
  let loading = true;

  // Three.js
  let THREE;
  let scene, camera, renderer;
  let containerEl;
  let animationId;

  // Mobile look controls (touch drag)
  let touchStart = null;
  let euler = { x: 0, y: 0 };

  // Movement (joystick)
  let joystickActive = false;
  let joystickOrigin = { x: 0, y: 0 };
  let joystickOffset = { x: 0, y: 0 };
  let moveX = 0;
  let moveZ = 0;

  let viewHeight = 1.7;
  let showViewMenu = false;

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

      if (browser) {
        await initWalkthrough();
      }
    } catch (err) {
      console.error('Failed to load walkthrough:', err);
      toast.error('Error loading walkthrough');
    }

    loading = false;
  });

  async function initWalkthrough() {
    try {
      THREE = await import('three');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB);

      // Camera
      camera = new THREE.PerspectiveCamera(70, containerEl.clientWidth / containerEl.clientHeight, 0.1, 50);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerEl.appendChild(renderer.domElement);

      // Build room
      buildRoom();
      setupLighting();

      // Events
      setupTouchControls();
      window.addEventListener('resize', onResize);

      // Start
      animate();
    } catch (err) {
      console.error('Walkthrough init failed:', err);
      toast.error('3D failed to load');
    }
  }

  function buildRoom() {
    if (!room.points || room.points.length < 3) return;

    const scale = 1 / 20;
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;

    // Calculate center for camera start
    const center = new THREE.Vector2();
    points3D.forEach(p => center.add(p));
    center.divideScalar(points3D.length);
    camera.position.set(center.x, viewHeight, center.y + 1.5);

    // Floor
    const floorGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: getFloorColor(room.floorType),
      roughness: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
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
      side: THREE.BackSide
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.rotation.x = -Math.PI / 2;
    scene.add(walls);

    // Ceiling
    const ceilingGeo = new THREE.ShapeGeometry(shape);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
      transparent: true,
      opacity: 0.5
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.y = height;
    scene.add(ceiling);

    // Furniture
    if (room.furniture) {
      room.furniture.forEach(item => placeFurniture(item, scale));
    }
  }

  function placeFurniture(item, scale) {
    const { width, height, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: getFurnitureColor(item.category),
      roughness: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (item.position?.x || 0) * scale,
      (item.position?.y || 0) * scale + height / 2,
      (item.position?.z || 0) * scale
    );
    mesh.rotation.y = item.rotation || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function getFloorColor(type) {
    const colors = { wood: 0xC4A882, carpet: 0xD5CFC0, tile: 0xE8E4DD, concrete: 0xB0A99F };
    return colors[type] || 0xC4A882;
  }

  function getFurnitureColor(category) {
    const colors = {
      Chairs: 0x8B6F5E, Tables: 0xA0856B, Storage: 0x6B8A7A,
      Decor: 0xC4916E, Lighting: 0xD4A849, Plants: 0x5A7D4A, Rugs: 0xC4A882
    };
    return colors[category] || 0x9E9E9E;
  }

  function hexToNumber(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function setupLighting() {
    const ambient = new THREE.AmbientLight(0x666666, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFF4E0, 1.2);
    sun.position.set(5, 8, 3);
    sun.castShadow = true;
    scene.add(sun);
  }

  function setupTouchControls() {
    // Touch drag to look around
    containerEl.addEventListener('touchstart', onTouchStart, { passive: false });
    containerEl.addEventListener('touchmove', onTouchMove, { passive: false });
    containerEl.addEventListener('touchend', onTouchEnd);

    // Joystick events (elements are outside containerEl)
    const joystickArea = document.querySelector('.joystick-area');
    if (joystickArea) {
      joystickArea.addEventListener('touchstart', onJoystickStart, { passive: false });
      joystickArea.addEventListener('touchmove', onJoystickMove, { passive: false });
      joystickArea.addEventListener('touchend', onJoystickEnd);
      joystickArea.addEventListener('touchcancel', onJoystickEnd);
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onTouchMove(e) {
    if (!touchStart || e.touches.length !== 1) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;

    euler.y -= dx * 0.005;
    euler.x -= dy * 0.005;
    euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x));

    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd() {
    touchStart = null;
  }

  function onJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    const touch = e.touches[0];
    joystickOrigin = { x: touch.clientX, y: touch.clientY };
  }

  function onJoystickMove(e) {
    if (!joystickActive) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - joystickOrigin.x;
    const dy = touch.clientY - joystickOrigin.y;

    // Clamp joystick offset
    const maxOffset = 40;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > maxOffset) {
      joystickOffset = {
        x: (dx / magnitude) * maxOffset,
        y: (dy / magnitude) * maxOffset
      };
    } else {
      joystickOffset = { x: dx, y: dy };
    }

    // Map to movement
    moveX = joystickOffset.x / maxOffset;
    moveZ = joystickOffset.y / maxOffset;
  }

  function onJoystickEnd() {
    joystickActive = false;
    joystickOffset = { x: 0, y: 0 };
    moveX = 0;
    moveZ = 0;
  }

  function changeViewHeight(value) {
    if (value) {
      viewHeight = value;
    } else {
      const custom = prompt('Enter view height (0.5 - 2.5m):', String(viewHeight));
      if (custom) {
        const parsed = parseFloat(custom);
        if (parsed >= 0.5 && parsed <= 2.5) viewHeight = parsed;
      }
    }
    camera.position.y = viewHeight;
    showViewMenu = false;
  }

  function onResize() {
    if (!renderer || !containerEl) return;
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Move camera based on joystick
    const speed = 0.08;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, euler.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, euler.y, 0));

    camera.position.add(forward.multiplyScalar(-moveZ * speed));
    camera.position.add(right.multiplyScalar(moveX * speed));
    camera.position.y = viewHeight;

    // Apply look rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.set(euler.x, euler.y, 0);

    renderer.render(scene, camera);
  }

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    if (renderer) {
      renderer.dispose();
      if (containerEl && renderer.domElement) {
        containerEl.removeChild(renderer.domElement);
      }
    }
  });
</script>

<div class="walkthrough-page">
  <div class="viewport" bind:this={containerEl}>
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading walkthrough...</p>
      </div>
    {/if}
  </div>

  <!-- Mobile controls -->
  <div class="mobile-controls">
    <div class="joystick-area">
      <div class="joystick-base">
        <div
          class="joystick-thumb"
          class:active={joystickActive}
          style="transform: translate({joystickOffset.x}px, {joystickOffset.y}px);"
        ></div>
      </div>
    </div>

    <button class="view-btn" on:click={() => showViewMenu = !showViewMenu}>
      👁️
    </button>
  </div>

  <!-- View menu -->
  {#if showViewMenu}
    <div class="view-menu">
      <button class="view-option" class:active={viewHeight === 1.7} on:click={() => changeViewHeight(1.7)}>Standing (1.7m)</button>
      <button class="view-option" class:active={viewHeight === 1.1} on:click={() => changeViewHeight(1.1)}>Seated (1.1m)</button>
      <button class="view-option" class:active={viewHeight === 0.9} on:click={() => changeViewHeight(0.9)}>Child (0.9m)</button>
    </div>
  {/if}

  <!-- Exit -->
  <a href="/home/{$page.params.id}/room/{$page.params.roomId}" class="exit-btn">✕</a>
</div>

<style>
  .walkthrough-page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
    z-index: 500;
    touch-action: none;
  }

  .viewport {
    position: absolute;
    inset: 0;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: #fff;
    gap: 0.75rem;
    z-index: 10;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .mobile-controls {
    position: absolute;
    bottom: 2rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 1.5rem;
    pointer-events: none;
    z-index: 20;
  }

  .joystick-area {
    pointer-events: auto;
  }

  .joystick-base {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 2px solid rgba(255,255,255,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .joystick-thumb {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transition: transform 0.05s;
  }

  .joystick-thumb.active {
    background: rgba(255,255,255,0.65);
  }

  .view-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 2px solid rgba(255,255,255,0.25);
    color: #fff;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .view-menu {
    position: absolute;
    bottom: 8rem;
    right: 1.5rem;
    background: rgba(0,0,0,0.85);
    border-radius: 10px;
    padding: 0.4rem;
    z-index: 30;
  }

  .view-option {
    display: block;
    width: 100%;
    padding: 0.6rem 1rem;
    color: #fff;
    font-size: 0.8rem;
    border-radius: 6px;
    text-align: left;
  }

  .view-option.active {
    background: rgba(255,255,255,0.2);
  }

  .exit-btn {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 1.1rem;
    z-index: 20;
  }
</style>