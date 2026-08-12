<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let scene = null;
  export let camera = null;
  export let renderer = null;
  export let controls = null;
  export let backgroundColor = 0xFAF8F5;
  export let shadows = true;
  export let antialias = true;
  export let pixelRatio = 2;
  export let onReady = null;
  export let onRender = null;

  let containerEl;
  let THREE;
  let animationId;
  let isReady = false;

  onMount(async () => {
    if (!browser) return;

    THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

    initScene(THREE, OrbitControls);
    startRenderLoop();
    isReady = true;

    if (onReady) onReady({ scene, camera, renderer, controls, THREE });
  });

  function initScene(THREE, OrbitControls) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 10, 50);

    // Camera
    const aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 100);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 1, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
      antialias,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
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

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (!containerEl || !renderer) return;
      const w = containerEl.clientWidth;
      const h = containerEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(containerEl);

    // Store for cleanup
    containerEl._resizeObserver = resizeObserver;

    // Touch handling for mobile
    renderer.domElement.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    renderer.domElement.addEventListener('touchmove', preventDefaultTouch, { passive: false });
  }

  function preventDefaultTouch(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
    }
  }

  function startRenderLoop() {
    function animate() {
      animationId = requestAnimationFrame(animate);
      
      if (controls) controls.update();
      
      if (onRender) {
        onRender({ scene, camera, renderer, controls, THREE, delta: 0.016 });
      }
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
    animate();
  }

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    
    if (containerEl) {
      if (containerEl._resizeObserver) {
        containerEl._resizeObserver.disconnect();
      }
      if (renderer?.domElement) {
        renderer.domElement.removeEventListener('touchstart', preventDefaultTouch);
        renderer.domElement.removeEventListener('touchmove', preventDefaultTouch);
        containerEl.removeChild(renderer.domElement);
      }
    }
    
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    
    scene = null;
    camera = null;
    controls = null;
  });
</script>

<div class="three-container" bind:this={containerEl}>
  {#if !isReady}
    <div class="three-loading">
      <div class="spinner"></div>
      <p>Loading 3D engine...</p>
    </div>
  {/if}
</div>

<style>
  .three-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: var(--cream);
  }

  .three-container :global(canvas) {
    display: block;
  }

  .three-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--grey-600);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--grey-200);
    border-top-color: var(--green-700);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>