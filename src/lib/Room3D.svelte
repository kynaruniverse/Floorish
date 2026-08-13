<script>
  import ThreeCanvas from './ThreeCanvas.svelte';

  export let rooms = [];
  export let selectedRoomId = null;

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
  let group;

  function clearGroup() {
    if (!group || !THREE) return;
    while (group.children.length) {
      const child = group.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      group.remove(child);
    }
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
    }
  }

  function onReady({ scene: s, THREE: t }) {
    THREE = t;
    scene = s;
    buildScene();
  }

  $: if (THREE && scene) {
    rooms;
    selectedRoomId;
    buildScene();
  }
</script>

<ThreeCanvas {onReady} />
