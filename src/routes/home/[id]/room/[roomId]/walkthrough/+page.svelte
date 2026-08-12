<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { addToast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let home;
  let room;
  let loading = true;

  // Three.js
  let THREE;
  let scene, camera, renderer;
  let containerEl;
  let animationId;

  // First-person controls
  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let isLocked = false;
  let euler = { x: 0, y: 0 };
  let velocity = { x: 0, z: 0 };
  let direction = { x: 0, z: 0 };
  let moveSpeed = 3;
  let lookSpeed = 0.002;
  let viewHeight = 1.7; // standing eye height
  let showMinimap = true;
  let joystickActive = false;
  let joystickOrigin = { x: 0, y: 0 };
  let joystickOffset = { x: 0, y: 0 };

  // Collision objects
  let collidableObjects = [];

  // View height options
  const viewHeights = [
    { label: 'Standing', value: 1.7 },
    { label: 'Seated', value: 1.1 },
    { label: 'Child', value: 0.9 },
    { label: 'Custom', value: null }
  ];
  let showViewMenu = false;

  onMount(async () => {
    const homeId = $page.params.id;
    const roomId = $page.params.roomId;

    const db = await import('idb').then(m => m.openDB('floorish-db', 1));
    home = await db.get('homes', homeId);
    room = home?.rooms?.find(r => r.id === roomId);

    if (!room) {
      addToast('Room not found', 'error');
      loading = false;
      return;
    }

    if (browser) {
      await initWalkthrough();
    }

    loading = false;
  });

  async function initWalkthrough() {
    THREE = await import('three');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 5, 30);

    // Camera (first person)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50);
    camera.position.set(0, viewHeight, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    containerEl.appendChild(renderer.domElement);

    // Build room
    buildRoomForWalkthrough();
    setupLighting();

    // Event listeners
    setupControls();
    
    // Lock pointer on click/tap
    renderer.domElement.addEventListener('click', lockPointer);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('resize', onResize);

    // Start
    animate();
  }

  function buildRoomForWalkthrough() {
    if (!room.points || room.points.length < 3) return;

    const scale = 1 / 20;
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;

    // Calculate room center for initial position
    const center = new THREE.Vector2();
    points3D.forEach(p => center.add(p));
    center.divideScalar(points3D.length);
    camera.position.set(center.x, viewHeight, center.y + 1);

    // Floor
    const floorGeometry = new THREE.ShapeGeometry(shape);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: getFloorColor(room.floorType),
      roughness: getFloorRoughness(room.floorType),
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls with extrusion
    const extrudeSettings = { steps: 1, depth: height, bevelEnabled: false };
    const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: room.colorTag || 0xE8F3E0,
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.BackSide // Render inside faces
    });
    
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.rotation.x = -Math.PI / 2;
    walls.position.y = 0;
    walls.castShadow = true;
    walls.receiveShadow = true;
    scene.add(walls);
    collidableObjects.push(walls);

    // Ceiling (optional, semi-transparent)
    const ceilingGeometry = new THREE.ShapeGeometry(shape);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.y = height;
    scene.add(ceiling);

    // Baseboards
    const baseboardHeight = 0.1;
    const baseboardGeometry = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: baseboardHeight,
      bevelEnabled: false
    });
    const baseboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.4
    });
    const baseboard = new THREE.Mesh(baseboardGeometry, baseboardMaterial);
    baseboard.rotation.x = -Math.PI / 2;
    baseboard.position.y = 0;
    scene.add(baseboard);

    // Place furniture
    if (room.furniture) {
      room.furniture.forEach(item => {
        placeFurnitureInWalkthrough(item, scale);
      });
    }

    // Add some ambient details
    addRoomDetails(shape, points3D, height);
  }

  function getFloorColor(type) {
    const colors = { wood: 0xC4A882, carpet: 0xD5CFC0, tile: 0xE8E4DD, concrete: 0xB0A99F };
    return colors[type] || 0xC4A882;
  }

  function getFloorRoughness(type) {
    return type === 'carpet' ? 0.9 : type === 'tile' ? 0.2 : 0.5;
  }

  function placeFurnitureInWalkthrough(item, scale) {
    const { width, height, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: getFurnitureColor(item.category),
      roughness: 0.6,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (item.position?.x || 0) * scale,
      (item.position?.y || 0) * scale + height / 2,
      (item.position?.z || 0) * scale
    );
    mesh.rotation.y = item.rotation || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isCollidable: true, name: item.name };
    scene.add(mesh);
    collidableObjects.push(mesh);
  }

  function getFurnitureColor(category) {
    const colors = {
      Chairs: 0x8B6F5E, Tables: 0xA0856B, Storage: 0x6B8A7A,
      Decor: 0xC4916E, Lighting: 0xD4A849, Plants: 0x5A7D4A
    };
    return colors[category] || 0x9E9E9E;
  }

  function addRoomDetails(shape, points, height) {
    // Add a rug if it's a living room
    const rugGeometry = new THREE.CircleGeometry(1.5, 32);
    const rugMaterial = new THREE.MeshStandardMaterial({
      color: 0xC4916E,
      roughness: 0.9
    });
    const rug = new THREE.Mesh(rugGeometry, rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.005;
    rug.receiveShadow = true;
    scene.add(rug);

    // Subtle ambient particles (dust motes)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 50;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 8;
      posArray[i + 1] = Math.random() * height;
      posArray[i + 2] = (Math.random() - 0.5) * 8;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
  }

  function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x606060, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFF4E0, 1.5);
    sunLight.position.set(5, 8, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    scene.add(sunLight);

    // Subtle point light near camera for better visibility
    const pointLight = new THREE.PointLight(0xFFF8E7, 0.5, 5);
    pointLight.position.set(0, viewHeight, 0);
    scene.add(pointLight);
  }

  function setupControls() {
    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Touch joystick
    const joystickArea = containerEl.querySelector('.joystick-area');
    if (joystickArea) {
      joystickArea.addEventListener('touchstart', onJoystickStart, { passive: false });
      joystickArea.addEventListener('touchmove', onJoystickMove, { passive: false });
      joystickArea.addEventListener('touchend', onJoystickEnd);
    }
  }

  function onKeyDown(event) {
    switch(event.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
    }
  }

  function onKeyUp(event) {
    switch(event.code) {
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
    }
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
    joystickOffset = {
      x: touch.clientX - joystickOrigin.x,
      y: touch.clientY - joystickOrigin.y
    };

    const threshold = 10;
    moveForward = joystickOffset.y < -threshold;
    moveBackward = joystickOffset.y > threshold;
    moveLeft = joystickOffset.x < -threshold;
    moveRight = joystickOffset.x > threshold;
  }

  function onJoystickEnd() {
    joystickActive = false;
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    joystickOffset = { x: 0, y: 0 };
  }

  function lockPointer() {
    if (!isLocked) {
      renderer.domElement.requestPointerLock();
    }
  }

  function onPointerLockChange() {
    isLocked = document.pointerLockElement === renderer.domElement;
    if (isLocked) {
      document.addEventListener('mousemove', onMouseMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
    }
  }

  function onMouseMove(event) {
    if (!isLocked) return;

    euler.x -= event.movementY * lookSpeed;
    euler.y -= event.movementX * lookSpeed;

    // Clamp vertical look
    euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x));
  }

  function updateMovement(deltaTime) {
    // Deceleration
    velocity.x -= velocity.x * 10 * deltaTime;
    velocity.z -= velocity.z * 10 * deltaTime;

    // Input
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    const dirLength = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    
    if (dirLength > 0) {
      direction.x /= dirLength;
      direction.z /= dirLength;
    }

    // Apply movement
    velocity.x += direction.x * moveSpeed * deltaTime * 8;
    velocity.z += direction.z * moveSpeed * deltaTime * 8;

    // Clamp velocity
    const maxSpeed = moveSpeed * deltaTime;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    if (speed > maxSpeed) {
      velocity.x = (velocity.x / speed) * maxSpeed;
      velocity.z = (velocity.z / speed) * maxSpeed;
    }

    // Calculate new position
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(0, euler.y, 0)
    );
    const right = new THREE.Vector3(1, 0, 0).applyEuler(
      new THREE.Euler(0, euler.y, 0)
    );

    const newPos = camera.position.clone();
    newPos.add(forward.multiplyScalar(-velocity.z * 5));
    newPos.add(right.multiplyScalar(velocity.x * 5));

    // Simple collision check (raycast downward and forward)
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    raycaster.set(newPos.clone().add(new THREE.Vector3(0, 0.5, 0)), down);
    const hits = raycaster.intersectObjects(collidableObjects);
    
    if (hits.length === 0 || hits[0].distance > 0.3) {
      // Also check horizontal collisions
      const horizDir = new THREE.Vector3(velocity.x, 0, -velocity.z).normalize();
      raycaster.set(newPos, horizDir);
      const horizHits = raycaster.intersectObjects(collidableObjects);
      
      if (horizHits.length === 0 || horizHits[0].distance > 0.5) {
        camera.position.copy(newPos);
      }
    }

    // Keep within room bounds (simple check)
    camera.position.y = viewHeight;
  }

  function changeViewHeight(value) {
    if (value) {
      viewHeight = value;
    } else {
      // Custom height prompt
      const custom = prompt('Enter view height in meters (0.5 - 2.5):', viewHeight.toString());
      if (custom) {
        const parsed = parseFloat(custom);
        if (parsed >= 0.5 && parsed <= 2.5) {
          viewHeight = parsed;
        }
      }
    }
    camera.position.y = viewHeight;
    showViewMenu = false;
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const deltaTime = Math.min(0.1, 1 / 60); // Cap delta
    updateMovement(deltaTime);

    // Apply rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.set(euler.x, euler.y, 0);

    renderer.render(scene, camera);
  }

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('mousemove', onMouseMove);
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
        <p>Preparing walkthrough...</p>
      </div>
    {/if}

    <!-- Initial click prompt -->
    {#if !isLocked && !loading}
      <div class="click-prompt">
        <span>👆</span>
        <p>Tap to explore</p>
        <p class="sub">Drag to look around</p>
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

    <div class="right-controls">
      <button class="view-btn" on:click={() => showViewMenu = !showViewMenu}>
        👁️
      </button>
      <button class="view-btn" on:click={() => showMinimap = !showMinimap}>
        🗺️
      </button>
    </div>
  </div>

  <!-- View height menu -->
  {#if showViewMenu}
    <div class="view-menu">
      {#each viewHeights as option}
        <button 
          class="view-option"
          class:active={viewHeight === option.value}
          on:click={() => changeViewHeight(option.value)}
        >
          {option.label} {option.value ? `(${option.value}m)` : ''}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Minimap (placeholder) -->
  {#if showMinimap && !loading}
    <div class="minimap">
      <div class="minimap-label">📍 {room?.name || ''}</div>
      <div class="minimap-canvas">
        <span>Map view coming soon</span>
      </div>
    </div>
  {/if}

  <!-- Exit button -->
  <a href="/home/{$page.params.id}/room/{$page.params.roomId}" class="exit-btn">
    ✕ Exit
  </a>
</div>

<style>
  .walkthrough-page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
    z-index: 500;
  }

  .viewport {
    position: absolute;
    inset: 0;
  }

  .viewport :global(canvas) {
    display: block;
  }

  /* Loading */
  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: white;
    gap: 1rem;
    z-index: 10;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Click prompt */
  .click-prompt {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    color: white;
    gap: 0.5rem;
    z-index: 10;
    cursor: pointer;
  }

  .click-prompt span {
    font-size: 3rem;
    animation: bounce 2s infinite;
  }

  .click-prompt p {
    font-size: 1.2rem;
    font-weight: 500;
  }

  .click-prompt .sub {
    font-size: 0.85rem;
    opacity: 0.7;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  /* Mobile controls */
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
  }

  .joystick-area {
    pointer-events: auto;
  }

  .joystick-base {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .joystick-thumb {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.4);
    transition: transform 0.05s ease-out;
  }

  .joystick-thumb.active {
    background: rgba(255,255,255,0.6);
  }

  .right-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .view-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.2);
    color: white;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  /* View menu */
  .view-menu {
    position: absolute;
    bottom: 8rem;
    right: 1.5rem;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-md);
    padding: 0.5rem;
    z-index: 20;
  }

  .view-option {
    display: block;
    width: 100%;
    padding: 0.6rem 1rem;
    color: white;
    font-size: 0.85rem;
    border-radius: var(--radius-sm);
    text-align: left;
    transition: background 0.15s;
  }

  .view-option:hover, .view-option.active {
    background: rgba(255,255,255,0.15);
  }

  /* Minimap */
  .minimap {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 100px;
    height: 100px;
    background: rgba(0,0,0,0.6);
    border-radius: var(--radius-sm);
    overflow: hidden;
    z-index: 20;
  }

  .minimap-label {
    padding: 0.3rem 0.5rem;
    font-size: 0.6rem;
    color: white;
    background: rgba(0,0,0,0.4);
  }

  .minimap-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100% - 22px);
    font-size: 0.55rem;
    color: rgba(255,255,255,0.5);
  }

  /* Exit button */
  .exit-btn {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 1.1rem;
    z-index: 20;
    backdrop-filter: blur(5px);
  }
</style>