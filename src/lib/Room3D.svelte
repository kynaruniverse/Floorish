<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import ThreeCanvas from './ThreeCanvas.svelte';

  export let rooms = [];
  export let selectedRoomId = null;
  export let selectedFurnitureId = null;

  const dispatch = createEventDispatcher();

  const SCALE = 20; // must match the 2D plan-canvas px-per-metre
  const WALL_HEIGHT = 2.4;
  const WALL_THICKNESS = 0.1;

  const FLOOR_COLORS = {
    wood: 0xC8A165,
    carpet: 0xB0A090,
    tile: 0xD8D4CC,
    concrete: 0xA8A8A8
  };

  let THREE;
  let scene;
  let camera;
  let renderer;
  let group;

  function clearGroup() {
    if (!group || !THREE) return;
    while (group.children.length) {
      const child = group.children.pop();
      disposeDeep(child);
      group.remove(child);
    }
  }

  function disposeDeep(obj) {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose?.());
    } else {
      obj.material?.dispose?.();
    }
    obj.children?.forEach(disposeDeep);
  }

  // ============ FURNITURE SHAPE BUILDERS ============
  function buildFurnitureGroup(item) {
    const { width: w = 0.6, height: h = 0.6, depth: d = 0.6 } = item.dimensions || {};
    const baseColor = item.color || '#A89A82';
    const fg = new THREE.Group();

    const mat = (c) => new THREE.MeshStandardMaterial({ color: c ?? baseColor, roughness: 0.75 });

    const addBox = (bw, bh, bd, x, y, z, c) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      fg.add(mesh);
      return mesh;
    };

    const addCylinder = (rTop, rBottom, ch, x, y, z, c, segments = 12) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, ch, segments), mat(c));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      fg.add(mesh);
      return mesh;
    };

    switch (item.shape) {
      case 'sofa': {
        const seatH = h * 0.45;
        addBox(w, seatH, d, 0, seatH / 2, 0);
        addBox(w, h - seatH, d * 0.18, 0, seatH + (h - seatH) / 2, -d / 2 + d * 0.09);
        addBox(w * 0.12, h * 0.8, d, -w / 2 + w * 0.06, h * 0.4, 0);
        addBox(w * 0.12, h * 0.8, d, w / 2 - w * 0.06, h * 0.4, 0);
        break;
      }
      case 'chair': {
        const seatH = h * 0.5;
        addBox(w, seatH * 0.15, d, 0, seatH, 0);
        addBox(w, h - seatH, d * 0.15, 0, seatH + (h - seatH) / 2, -d / 2 + d * 0.075);
        const legR = Math.min(w, d) * 0.05;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          addCylinder(legR, legR, seatH, sx * (w / 2 - legR * 2), seatH / 2, sz * (d / 2 - legR * 2), '#5A4632', 8);
        }
        break;
      }
      case 'table': {
        const topH = Math.min(0.05, h * 0.1);
        addBox(w, topH, d, 0, h - topH / 2, 0);
        const legR = Math.min(w, d) * 0.04;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          addCylinder(legR, legR, h - topH, sx * (w / 2 - legR * 2), (h - topH) / 2, sz * (d / 2 - legR * 2), '#5A4632', 8);
        }
        break;
      }
      case 'bed': {
        const frameH = h * 0.3;
        addBox(w, frameH, d, 0, frameH / 2, 0, '#5A4632');
        addBox(w * 0.96, h * 0.25, d * 0.96, 0, frameH + (h * 0.25) / 2, 0, '#F5F0E8');
        addBox(w, h * 0.4, d * 0.08, 0, frameH + (h * 0.4) / 2, -d / 2 + d * 0.04);
        break;
      }
      case 'wardrobe': {
        addBox(w, h, d, 0, h / 2, 0);
        addBox(w * 0.02, h * 0.9, 0.02, 0, h / 2, d / 2 + 0.01, '#3A3028');
        break;
      }
      case 'lamp': {
        addCylinder(w / 2, w / 2, h * 0.05, 0, h * 0.025, 0, '#3A3A3A', 16);
        const poleR = Math.min(w, d) * 0.06;
        addCylinder(poleR, poleR, h * 0.8, 0, h * 0.05 + h * 0.4, 0, '#3A3A3A', 8);
        const shade = new THREE.Mesh(
          new THREE.ConeGeometry(w / 2 * 0.9, h * 0.2, 16, 1, true),
          mat(baseColor)
        );
        shade.position.set(0, h * 0.85 + h * 0.1, 0);
        fg.add(shade);
        break;
      }
      case 'plant': {
        addCylinder(w / 2 * 0.8, w / 2, h * 0.3, 0, h * 0.15, 0, '#8B5A3C', 12);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 12, 10), mat(baseColor));
        foliage.position.set(0, h * 0.3 + (w / 2) * 0.7, 0);
        foliage.scale.set(1, 1.3, 1);
        foliage.castShadow = true;
        fg.add(foliage);
        break;
      }
      case 'rug': {
        const rug = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), mat(baseColor));
        rug.position.set(0, 0.01, 0);
        rug.receiveShadow = true;
        fg.add(rug);
        break;
      }
      default: {
        addBox(w, h, d, 0, h / 2, 0);
      }
    }

    // Selection ring
    if (item.id === selectedFurnitureId) {
      const r = Math.max(w, d) / 2;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.6, r * 0.72, 24),
        new THREE.MeshBasicMaterial({ color: 0x1e3d1e, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005;
      fg.add(ring);
    }

    return fg;
  }

  function buildScene() {
    if (!THREE || !scene) return;
    clearGroup();

    if (!group) {
      group = new THREE.Group();
      scene.add(group);
    }

    if (rooms.length === 0) return;

    // Centre the whole floor: compute bounding box in metres from px positions
    const bounds = rooms.reduce((acc, r) => {
      const x0 = (r.position?.x || 0) / SCALE;
      const y0 = (r.position?.y || 0) / SCALE;
      const x1 = x0 + (r.dimensions?.width || 3);
      const y1 = y0 + (r.dimensions?.depth || 4);
      return {
        minX: Math.min(acc.minX, x0),
        minZ: Math.min(acc.minZ, y0),
        maxX: Math.max(acc.maxX, x1),
        maxZ: Math.max(acc.maxZ, y1)
      };
    }, { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity });

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;

    // Lighting (once)
    if (!scene.userData.lit) {
      const hemi = new THREE.HemisphereLight(0xffffff, 0xddd0c0, 0.9);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(6, 10, 4);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -10;
      sun.shadow.camera.right = 10;
      sun.shadow.camera.top = 10;
      sun.shadow.camera.bottom = -10;
      scene.add(sun);
      scene.userData.lit = true;
    }

    for (const room of rooms) {
      const w = room.dimensions?.width || 3;
      const d = room.dimensions?.depth || 4;
      const x = (room.position?.x || 0) / SCALE - cx + w / 2;
      const z = (room.position?.y || 0) / SCALE - cz + d / 2;
      const isSelected = room.id === selectedRoomId;

      // Floor
      const floorColor = FLOOR_COLORS[room.floorType] ?? 0xC8A165;
      const floorGeo = new THREE.BoxGeometry(w, 0.05, d);
      const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.8 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(x, -0.025, z);
      floor.receiveShadow = true;
      floor.userData = { isFloor: true, roomId: room.id };
      group.add(floor);

      // Walls (low, so the room reads from above/orbit)
      const wallMat = new THREE.MeshStandardMaterial({
        color: room.color || '#E8F3E0',
        roughness: 0.9,
        transparent: isSelected,
        opacity: isSelected ? 1 : 0.85
      });

      const addWall = (ww, wd, wx, wz) => {
        const geo = new THREE.BoxGeometry(ww, WALL_HEIGHT, wd);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(wx, WALL_HEIGHT / 2, wz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      };

      addWall(w, WALL_THICKNESS, x, z - d / 2);
      addWall(w, WALL_THICKNESS, x, z + d / 2);
      addWall(WALL_THICKNESS, d, x - w / 2, z);
      addWall(WALL_THICKNESS, d, x + w / 2, z);

      // Selected-room outline
      if (isSelected) {
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.02, d));
        const outline = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x1e3d1e })
        );
        outline.position.set(x, 0.02, z);
        group.add(outline);
      }

      // Furniture
      for (const item of room.furniture || []) {
        const fGroup = buildFurnitureGroup(item);
        fGroup.position.set(x + (item.position?.x || 0), 0, z + (item.position?.z || 0));
        fGroup.rotation.y = (item.rotationY || 0) * (Math.PI / 180);
        fGroup.userData = { furnitureId: item.id, roomId: room.id };
        group.add(fGroup);
      }
    }
  }

  // ============ SELECTION (tap-to-select) ============
  let raycaster;
  let pointerDownPos = null;

  function onPointerDown(e) {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (!pointerDownPos) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    pointerDownPos = null;
    // Ignore drags (orbit gestures) — only treat near-stationary taps as selection
    if (Math.hypot(dx, dy) > 6) return;
    handleTap(e.clientX, e.clientY);
  }

  function handleTap(clientX, clientY) {
    if (!THREE || !camera || !renderer || !group) return;

    if (!raycaster) raycaster = new THREE.Raycaster();

    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(group.children, true);

    for (const hit of intersects) {
      let obj = hit.object;
      while (obj && !obj.userData?.furnitureId && !obj.userData?.isFloor) {
        obj = obj.parent;
      }
      if (obj?.userData?.furnitureId) {
        dispatch('selectFurniture', { roomId: obj.userData.roomId, furnitureId: obj.userData.furnitureId });
        return;
      }
      if (obj?.userData?.isFloor) {
        dispatch('selectRoom', { roomId: obj.userData.roomId });
        return;
      }
    }
    dispatch('deselect');
  }

  function onReady(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    camera = ctx.camera;
    renderer = ctx.renderer;
    buildScene();

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
  }

  onDestroy(() => {
    if (renderer?.domElement) {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
    }
  });

  $: if (THREE && scene) {
    rooms;
    selectedRoomId;
    selectedFurnitureId;
    buildScene();
  }
</script>

<ThreeCanvas {onReady} />
