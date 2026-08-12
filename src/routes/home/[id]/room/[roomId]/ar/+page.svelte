<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { addToast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let home;
  let room;
  let loading = true;
  let arSupported = false;
  let arSession = null;
  let arState = 'checking'; // checking | permission-denied | scanning | placing | viewing | unsupported
  let opacity = 0.8;
  let screenshotData = null;
  let showScreenshot = false;
  let errorMessage = '';

  // AR objects
  let THREE;
  let scene, camera, renderer;
  let reticle;
  let placedRoom;
  let hitTestSource = null;
  let hitTestSourceRequested = false;
  let localReferenceSpace = null;
  let containerEl;

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

    loading = false;

    if (browser) {
      await checkARSupport();
    }
  });

  async function checkARSupport() {
    // Check for WebXR support
    if (!navigator.xr) {
      arState = 'unsupported';
      errorMessage = 'WebXR not available on this device. Try the Walkthrough mode instead.';
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      arSupported = supported;
      
      if (supported) {
        arState = 'scanning';
        await startARSession();
      } else {
        arState = 'unsupported';
        errorMessage = 'AR not supported on this device. Try the Walkthrough mode instead.';
      }
    } catch (err) {
      arState = 'unsupported';
      errorMessage = 'Could not initialize AR: ' + err.message;
    }
  }

  async function startARSession() {
    try {
      THREE = await import('three');

      // Request AR session
      arSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay') },
        optionalFeatures: ['light-estimation']
      });

      await setupARScene(arSession);
      arState = 'scanning';

      arSession.addEventListener('end', () => {
        arState = 'ended';
        arSession = null;
      });

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        arState = 'permission-denied';
        errorMessage = 'Camera access denied. Please enable camera permissions to use AR.';
      } else {
        arState = 'unsupported';
        errorMessage = 'AR session failed: ' + err.message;
      }
    }
  }

  async function setupARScene(session) {
    // Create scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true // for screenshots
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');

    // Add reticle for surface detection
    const ringGeometry = new THREE.RingGeometry(0.15, 0.2, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4A8C3F, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    reticle = new THREE.Mesh(ringGeometry, ringMaterial);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Add a subtle grid on the reticle
    const gridHelper = new THREE.GridHelper(0.4, 8, 0x4A8C3F, 0x8CC97A);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    reticle.add(gridHelper);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 5, 3);
    scene.add(directionalLight);

    // Set up hit testing
    session.requestReferenceSpace('local').then((refSpace) => {
      localReferenceSpace = refSpace;
      session.requestHitTestSource({ space: refSpace }).then((source) => {
        hitTestSource = source;
      });
    });

    // Handle select event (tap to place)
    session.addEventListener('select', onSelect);

    // Render loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (!frame) return;
      
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (hitTestSource && referenceSpace && !placedRoom) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }

      renderer.render(scene, camera);
    });

    containerEl.appendChild(renderer.domElement);
  }

  function onSelect() {
    if (!reticle.visible || !reticle.matrix || placedRoom) return;

    // Place the room model at reticle position
    placedRoom = new THREE.Group();
    
    // Copy reticle position and rotation
    placedRoom.matrix.copy(reticle.matrix);
    placedRoom.matrix.decompose(
      placedRoom.position,
      placedRoom.quaternion,
      placedRoom.scale
    );

    // Build room visualization
    buildRoomVisualization(placedRoom);
    
    scene.add(placedRoom);
    reticle.visible = false;
    arState = 'viewing';
  }

  function buildRoomVisualization(parentGroup) {
    if (!room || !room.points || room.points.length < 3) return;

    // Scale factor from floor plan units to real meters
    const scale = 1 / 20; // floor plan units to meters

    // Build walls
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;
    
    const extrudeSettings = { steps: 1, depth: height, bevelEnabled: false };
    const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: room.colorTag || 0xE8F3E0,
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity * 0.7
    });
    
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.rotation.x = -Math.PI / 2;
    walls.position.y = 0;
    parentGroup.add(walls);

    // Floor
    const floorGeometry = new THREE.ShapeGeometry(shape);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xC4A882,
      roughness: 0.5,
      transparent: true,
      opacity: opacity * 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    parentGroup.add(floor);

    // Edge outline
    const edgeGeometry = new THREE.EdgesGeometry(wallGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x2D5A27, 
      transparent: true, 
      opacity: opacity 
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.rotation.x = -Math.PI / 2;
    parentGroup.add(edges);

    // Add placed furniture if any
    if (room.furniture) {
      room.furniture.forEach(item => {
        const { width, height: h, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
        const boxGeometry = new THREE.BoxGeometry(width, h, depth);
        const boxMaterial = new THREE.MeshStandardMaterial({
          color: 0x8B6F5E,
          roughness: 0.6,
          transparent: true,
          opacity: opacity
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(
          (item.position?.x || 0) * scale,
          (item.position?.y || 0) * scale + h / 2,
          (item.position?.z || 0) * scale
        );
        box.rotation.y = item.rotation || 0;
        parentGroup.add(box);
      });
    }
  }

  function updateOpacity(value) {
    opacity = value;
    if (placedRoom) {
      placedRoom.traverse(child => {
        if (child.material && child.material.transparent) {
          child.material.opacity = opacity * (child.material.opacity <= 0.5 ? 0.5 : 0.7);
        }
      });
    }
  }

  function takeScreenshot() {
    if (!renderer) return;
    
    renderer.render(scene, camera);
    screenshotData = renderer.domElement.toDataURL('image/png');
    showScreenshot = true;
    
    // Also try to capture the real world via media stream if available
    addToast('Screenshot captured!', 'success');
  }

  function downloadScreenshot() {
    if (!screenshotData) return;
    const link = document.createElement('a');
    link.download = `floorish-ar-${room.name}-${Date.now()}.png`;
    link.href = screenshotData;
    link.click();
  }

  async function retryAR() {
    arState = 'checking';
    errorMessage = '';
    if (arSession) {
      await arSession.end();
    }
    await checkARSupport();
  }

  onDestroy(() => {
    if (renderer) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (containerEl && renderer.domElement) {
        containerEl.removeChild(renderer.domElement);
      }
    }
    if (arSession) {
      arSession.end();
    }
  });
</script>

<div class="ar-page">
  <!-- AR Viewport -->
  <div class="ar-viewport" bind:this={containerEl}>
    <!-- States -->
    {#if arState === 'checking'}
      <div class="ar-state-overlay">
        <div class="spinner"></div>
        <p>Checking AR support...</p>
      </div>

    {:else if arState === 'permission-denied'}
      <div class="ar-state-overlay error">
        <span class="state-icon">🔒</span>
        <h2>Camera Access Needed</h2>
        <p>{errorMessage}</p>
        <div class="state-actions">
          <button class="btn-primary" on:click={retryAR}>Try Again</button>
          <a href="/home/{$page.params.id}/room/{$page.params.roomId}/walkthrough" class="btn-secondary">
            Use Walkthrough Instead →
          </a>
        </div>
      </div>

    {:else if arState === 'unsupported'}
      <div class="ar-state-overlay">
        <span class="state-icon">📱</span>
        <h2>AR Not Available</h2>
        <p>{errorMessage || 'Your device doesn\'t support AR. Try the walkthrough mode for a similar experience.'}</p>
        <div class="state-actions">
          <button class="btn-primary" on:click={retryAR}>Retry</button>
          <a href="/home/{$page.params.id}/room/{$page.params.roomId}/walkthrough" class="btn-secondary">
            🚶 Walkthrough Mode
          </a>
        </div>
      </div>

    {:else if arState === 'scanning'}
      <div class="ar-hint">
        <div class="scanning-indicator">
          <span class="pulse-ring"></span>
          <span class="scan-icon">📐</span>
        </div>
        <p>Move phone slowly to detect a flat surface...</p>
      </div>

    {:else if arState === 'viewing'}
      <div class="ar-viewing-hint">
        <p>Walk around to see your room from different angles</p>
      </div>

    {:else if arState === 'ended'}
      <div class="ar-state-overlay">
        <span class="state-icon">👋</span>
        <h2>AR Session Ended</h2>
        <button class="btn-primary" on:click={retryAR}>Start Again</button>
      </div>
    {/if}
  </div>

  <!-- AR Overlay for DOM overlay mode -->
  <div id="ar-overlay" style="display: none;"></div>

  <!-- Bottom controls -->
  {#if arState === 'scanning' || arState === 'viewing'}
    <div class="ar-controls">
      {#if arState === 'scanning'}
        <div class="surface-status">
          <span class="status-dot" class:found={reticle?.visible}></span>
          {reticle?.visible ? 'Surface detected! Tap to place room.' : 'Scanning for surface...'}
        </div>
      {/if}

      {#if arState === 'viewing'}
        <div class="opacity-control">
          <label for="opacity-slider">Opacity</label>
          <input
            id="opacity-slider"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            on:input={(e) => updateOpacity(parseFloat(e.target.value))}
          />
          <span>{Math.round(opacity * 100)}%</span>
        </div>
      {/if}

      <div class="ar-actions">
        <button class="ar-btn" on:click={takeScreenshot} aria-label="Take screenshot">
          📸 Screenshot
        </button>
        <button class="ar-btn" on:click={() => arSession?.end()} aria-label="Exit AR">
          ✕ Exit
        </button>
      </div>
    </div>
  {/if}

  <!-- Screenshot preview -->
  {#if showScreenshot && screenshotData}
    <div class="screenshot-overlay" on:click={() => showScreenshot = false}>
      <div class="screenshot-card" on:click|stopPropagation>
        <img src={screenshotData} alt="AR Screenshot" />
        <div class="screenshot-actions">
          <button class="btn-secondary" on:click={() => showScreenshot = false}>Close</button>
          <button class="btn-primary" on:click={downloadScreenshot}>💾 Save</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .ar-page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
    z-index: 500;
  }

  .ar-viewport {
    position: absolute;
    inset: 0;
  }

  .ar-viewport :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* State overlays */
  .ar-state-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    z-index: 10;
  }

  .ar-state-overlay.error {
    background: rgba(30, 10, 10, 0.9);
  }

  .state-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .ar-state-overlay h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
  }

  .ar-state-overlay p {
    color: #ccc;
    max-width: 320px;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .state-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
    width: 100%;
    max-width: 280px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Scanning hint */
  .ar-hint {
    position: absolute;
    bottom: 140px;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    z-index: 10;
    pointer-events: none;
  }

  .scanning-indicator {
    position: relative;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 2px solid rgba(255,255,255,0.8);
    border-radius: 50%;
    animation: pulse 1.5s ease-out infinite;
  }

  .scan-icon {
    font-size: 1.5rem;
    z-index: 1;
  }

  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .ar-hint p {
    color: white;
    background: rgba(0,0,0,0.6);
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    font-size: 0.85rem;
    backdrop-filter: blur(10px);
  }

  /* Viewing hint */
  .ar-viewing-hint {
    position: absolute;
    top: 1rem;
    left: 0;
    right: 0;
    text-align: center;
    z-index: 10;
    pointer-events: none;
  }

  .ar-viewing-hint p {
    display: inline-block;
    color: white;
    background: rgba(0,0,0,0.5);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    backdrop-filter: blur(10px);
  }

  /* Controls */
  .ar-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    z-index: 10;
  }

  .surface-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
    justify-content: center;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff4444;
    transition: background 0.3s;
  }

  .status-dot.found {
    background: #44ff44;
    box-shadow: 0 0 8px #44ff44;
  }

  .opacity-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: white;
    margin-bottom: 0.75rem;
    padding: 0 0.5rem;
  }

  .opacity-control label {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .opacity-control input {
    flex: 1;
    accent-color: var(--green-500);
  }

  .opacity-control span {
    font-size: 0.8rem;
    min-width: 35px;
    text-align: right;
  }

  .ar-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .ar-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    background: rgba(255,255,255,0.15);
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    backdrop-filter: blur(10px);
    transition: background 0.2s;
  }

  .ar-btn:hover, .ar-btn:active {
    background: rgba(255,255,255,0.25);
  }

  .btn-primary, .btn-secondary {
    display: block;
    width: 100%;
    padding: 0.875rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    font-size: 0.95rem;
  }

  .btn-primary {
    background: var(--green-700);
    color: white;
  }

  .btn-secondary {
    background: rgba(255,255,255,0.15);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
  }

  /* Screenshot overlay */
  .screenshot-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .screenshot-card {
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    max-width: 400px;
    width: 100%;
    box-shadow: var(--shadow-lg);
  }

  .screenshot-card img {
    width: 100%;
    display: block;
  }

  .screenshot-actions {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    justify-content: flex-end;
  }

  .screenshot-actions .btn-primary,
  .screenshot-actions .btn-secondary {
    width: auto;
    padding: 0.6rem 1.25rem;
    font-size: 0.85rem;
  }

  .screenshot-actions .btn-secondary {
    background: var(--grey-100);
    color: var(--charcoal);
    border: none;
  }
</style>