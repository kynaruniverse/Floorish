<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { homes } from '$stores/homes.js';
  import { toast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let home = null;
  let room = null;
  let loading = true;
  let arState = 'checking'; // checking | unsupported | permission-denied | scanning | viewing | ended
  let errorMessage = '';
  let containerEl;

  // Three.js
  let THREE;
  let scene, camera, renderer;
  let reticle, placedRoom;
  let hitTestSource = null;
  let arSession = null;
  let opacity = 0.8;

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
    } catch (err) {
      toast.error('Error loading room');
      loading = false;
      return;
    }

    loading = false;

    if (browser) {
      await checkAR();
    }
  });

  async function checkAR() {
    // Most mobile browsers don't support WebXR AR yet
    if (!navigator.xr || !navigator.xr.isSessionSupported) {
      arState = 'unsupported';
      errorMessage = 'AR is not supported on this device or browser.';
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (supported) {
        arState = 'scanning';
        await startAR();
      } else {
        arState = 'unsupported';
        errorMessage = 'AR is not supported on this device.';
      }
    } catch (err) {
      arState = 'unsupported';
      errorMessage = 'Could not start AR: ' + err.message;
    }
  }

  async function startAR() {
    try {
      THREE = await import('three');

      arSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation']
      });

      await setupScene(arSession);
      arState = 'scanning';

      arSession.addEventListener('end', () => {
        arState = 'ended';
        arSession = null;
      });

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        arState = 'permission-denied';
        errorMessage = 'Camera permission was denied.';
      } else {
        arState = 'unsupported';
        errorMessage = 'AR session failed: ' + err.message;
      }
    }
  }

  async function setupScene(session) {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    containerEl.appendChild(renderer.domElement);

    // Reticle
    const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4A8C3F,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    reticle = new THREE.Mesh(ringGeo, ringMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(0, 5, 3);
    scene.add(sun);

    // Hit testing
    session.requestReferenceSpace('local').then((refSpace) => {
      session.requestHitTestSource({ space: refSpace }).then((source) => {
        hitTestSource = source;
      });
    });

    session.addEventListener('select', onSelect);

    // Render loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (!frame) return;

      const refSpace = renderer.xr.getReferenceSpace();
      const xrSession = renderer.xr.getSession();

      if (hitTestSource && refSpace && !placedRoom) {
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(refSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }

      renderer.render(scene, camera);
    });
  }

  function onSelect() {
    if (!reticle?.visible || !reticle?.matrix || placedRoom) return;

    placedRoom = new THREE.Group();
    placedRoom.matrix.copy(reticle.matrix);
    placedRoom.matrix.decompose(placedRoom.position, placedRoom.quaternion, placedRoom.scale);

    buildRoomVisualization(placedRoom);
    scene.add(placedRoom);
    reticle.visible = false;
    arState = 'viewing';
  }

  function buildRoomVisualization(group) {
    if (!room.points || room.points.length < 3) return;

    const scale = 1 / 20;
    const points3D = room.points.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const shape = new THREE.Shape(points3D);
    const height = room.ceilingHeight || 2.4;

    // Walls
    const wallGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: height, bevelEnabled: false });
    const wallMat = new THREE.MeshStandardMaterial({
      color: hexToNumber(room.colorTag || '#E8F3E0'),
      roughness: 0.7,
      transparent: true,
      opacity: opacity * 0.7,
      side: THREE.DoubleSide
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.rotation.x = -Math.PI / 2;
    group.add(walls);

    // Floor
    const floorGeo = new THREE.ShapeGeometry(shape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xC4A882,
      roughness: 0.5,
      transparent: true,
      opacity: opacity * 0.5
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    group.add(floor);

    // Furniture
    if (room.furniture) {
      room.furniture.forEach(item => {
        const { width, height: h, depth } = item.dimensions || { width: 1, height: 1, depth: 1 };
        const boxGeo = new THREE.BoxGeometry(width, h, depth);
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0x8B6F5E,
          roughness: 0.6,
          transparent: true,
          opacity
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(
          (item.position?.x || 0) * scale,
          (item.position?.y || 0) * scale + h / 2,
          (item.position?.z || 0) * scale
        );
        box.rotation.y = item.rotation || 0;
        group.add(box);
      });
    }
  }

  function hexToNumber(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function updateOpacity(value) {
    opacity = value;
    if (placedRoom) {
      placedRoom.traverse(child => {
        if (child.material?.transparent) {
          child.material.opacity = opacity * 0.7;
        }
      });
    }
  }

  async function retry() {
    arState = 'checking';
    errorMessage = '';
    if (arSession) await arSession.end();
    await checkAR();
  }

  onDestroy(() => {
    if (renderer) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (containerEl && renderer.domElement) {
        containerEl.removeChild(renderer.domElement);
      }
    }
    if (arSession) arSession.end();
  });
</script>

<div class="ar-page">
  <div class="ar-viewport" bind:this={containerEl}>
    {#if arState === 'checking'}
      <div class="overlay">
        <div class="spinner"></div>
        <p>Checking AR support...</p>
      </div>

    {:else if arState === 'unsupported'}
      <div class="overlay">
        <span class="big-icon">📱</span>
        <h2>AR Not Available</h2>
        <p>{errorMessage}</p>
        <a href="/home/{$page.params.id}/room/{$page.params.roomId}/walkthrough" class="btn">
          🚶 Use Walkthrough Mode
        </a>
        <button class="btn-link" on:click={retry}>Retry</button>
      </div>

    {:else if arState === 'permission-denied'}
      <div class="overlay">
        <span class="big-icon">🔒</span>
        <h2>Camera Access Needed</h2>
        <p>{errorMessage}</p>
        <button class="btn" on:click={retry}>Try Again</button>
      </div>

    {:else if arState === 'scanning'}
      <div class="scan-hint">
        <span class="pulse"></span>
        <p>Move phone slowly to find a flat surface...</p>
      </div>

    {:else if arState === 'viewing'}
      <div class="view-hint">
        <p>Room placed! Walk around to explore.</p>
      </div>

    {:else if arState === 'ended'}
      <div class="overlay">
        <span class="big-icon">👋</span>
        <h2>AR Ended</h2>
        <button class="btn" on:click={retry}>Start Again</button>
      </div>
    {/if}
  </div>

  {#if arState === 'viewing'}
    <div class="controls">
      <label for="opacity-slider">Opacity</label>
      <input type="range" min="0.1" max="1" step="0.05" value={opacity} on:input={(e) => updateOpacity(parseFloat(e.target.value))} />
      <button class="exit" on:click={() => arSession?.end()}>✕</button>
    </div>
  {/if}

  <a href="/home/{$page.params.id}/room/{$page.params.roomId}" class="back-btn">←</a>
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

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    background: #1a1a1a;
    color: #fff;
    z-index: 10;
  }

  .big-icon {
    font-size: 3rem;
  }

  .overlay h2 {
    font-size: 1.3rem;
  }

  .overlay p {
    color: #aaa;
    font-size: 0.9rem;
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

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    background: #1E3D1E;
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
  }

  .btn-link {
    color: #888;
    text-decoration: underline;
    font-size: 0.8rem;
  }

  .scan-hint {
    position: absolute;
    bottom: 120px;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 10;
  }

  .pulse {
    width: 50px;
    height: 50px;
    border: 3px solid #4A8C3F;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  .scan-hint p {
    color: #fff;
    background: rgba(0,0,0,0.6);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
  }

  .view-hint {
    position: absolute;
    top: 1rem;
    left: 0;
    right: 0;
    text-align: center;
    z-index: 10;
  }

  .view-hint p {
    display: inline-block;
    color: #fff;
    background: rgba(0,0,0,0.5);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
  }

  .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    z-index: 10;
  }

  .controls label {
    color: #fff;
    font-size: 0.8rem;
  }

  .controls input {
    flex: 1;
  }

  .exit {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    color: #fff;
    font-size: 1.1rem;
  }

  .back-btn {
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
    z-index: 20;
  }
</style>