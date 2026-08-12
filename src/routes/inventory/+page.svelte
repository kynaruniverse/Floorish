<script>
  import { onMount } from 'svelte';
  import { inventory } from '$stores/inventory.js';
  import { addToast } from '$stores/app.js';
  import EmptyState from '$components/EmptyState.svelte';
  import Skeleton from '$components/Skeleton.svelte';
  import Modal from '$components/Modal.svelte';
  import { processFurnitureImage, generate3DData, loadOpenCV } from '$utils/opencvProcessor.js';


  let loading = true;
  let searchQuery = '';
  let activeFilter = 'All';
  let sortBy = 'recent';

  // Scan wizard
  let showScanWizard = false;
  let scanStep = 1; // 1: capture, 2: process, 3: review, 4: details
  let capturedImage = null;
  let scanPreview = null;
  let processingProgress = 0;
  let processingMessage = '';
  let scanForm = {
    name: '',
    category: 'Other',
    width: 1,
    height: 1,
    depth: 1,
    colourVariants: [],
    material: ''
  };

  const categories = ['All', 'Chairs', 'Tables', 'Storage', 'Decor', 'Lighting', 'Plants', 'Other'];
  const processingMessages = [
    'Measuring pixels...',
    'Detecting edges...',
    'Extruding shapes...',
    'Wrapping textures...',
    'Building 3D model...'
  ];

  onMount(async () => {
    await inventory.load();
    loading = false;
  });

  $: filteredItems = $inventory
    .filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeFilter !== 'All' && item.category !== activeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return b.createdAt - a.createdAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  async function startScan() {
    showScanWizard = true;
    scanStep = 1;
    capturedImage = null;
    scanForm = {
      name: '',
      category: 'Other',
      width: 1,
      height: 1,
      depth: 1,
      colourVariants: [],
      material: ''
    };

    // Request camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // In a real app, we'd display the camera stream
      // For now, we'll simulate with a file input
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      addToast('Camera access needed for scanning', 'error');
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      capturedImage = e.target.result;
      scanStep = 2;
      simulateProcessing();
    };
    reader.readAsDataURL(file);
  }


// Replace the simulateProcessing function with:
  async function processWithOpenCV() {
    processingProgress = 10;
    processingMessage = 'Loading OpenCV...';

    try {
      // Load OpenCV.js
      await loadOpenCV();
      processingProgress = 25;
      processingMessage = 'Analyzing image...';
  
      // Create image from captured data
      const img = new Image();
      img.src = capturedImage;
      await new Promise((resolve) => { img.onload = resolve; });
  
      processingProgress = 40;
      processingMessage = 'Detecting edges...';
  
      // Process with OpenCV
      const result = await processFurnitureImage(img, {
        cannyThreshold1: 45,
        cannyThreshold2: 150,
        blurKernelSize: 5,
        minContourArea: 1000
      });
  
      processingProgress = 70;
      processingMessage = 'Generating 3D model...';
  
      // Generate 3D data
      const modelData = generate3DData(result);
  
      processingProgress = 90;
      processingMessage = 'Finalizing...';
  
      // Store for later use
      if (result.estimatedDimensions) {
        scanForm.width = parseFloat(result.estimatedDimensions.width.toFixed(2));
        scanForm.height = parseFloat(result.estimatedDimensions.height.toFixed(2));
        scanForm.depth = parseFloat(result.estimatedDimensions.depth.toFixed(2));
      }
  
      if (result.edgeImage) {
        // Convert edge image for preview
        const edgeCanvas = document.createElement('canvas');
        cv.imshow(edgeCanvas, result.edgeImage);
        scanPreview = edgeCanvas.toDataURL();
      }
  
      processingProgress = 100;
      processingMessage = 'Model generated!';
  
      setTimeout(() => scanStep = 3, 500);
  
    } catch (err) {
      console.error('OpenCV processing failed:', err);
      addToast('Processing failed. Using estimate instead.', 'error');
      // Fall back to simple estimate
      scanForm.width = 1;
      scanForm.height = 1;
      scanForm.depth = 1;
      scanStep = 3;
    }
  }

  function generatePreview() {
    // In production, this would use OpenCV.js edge detection
    // and create a real 3D model from the photo
    scanPreview = capturedImage;
  }

  async function saveScannedItem() {
    if (!scanForm.name.trim()) {
      addToast('Please name your item', 'error');
      return;
    }

    await inventory.add({
      name: scanForm.name.trim(),
      category: scanForm.category,
      dimensions: {
        width: scanForm.width,
        height: scanForm.height,
        depth: scanForm.depth
      },
      thumbnail: capturedImage,
      colourVariants: scanForm.colourVariants,
      material: scanForm.material,
      modelData: { type: 'scanned', image: capturedImage }
    });

    addToast(`"${scanForm.name}" added to inventory!`, 'success');
    showScanWizard = false;
  }

  async function deleteItem(id, name) {
    if (confirm(`Delete "${name}" from inventory?`)) {
      await inventory.remove(id);
      addToast(`"${name}" deleted`, 'info');
    }
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>📦 My Inventory</h1>
    <p class="subtitle">Your furniture warehouse</p>
  </header>

  <!-- Search and filter -->
  <div class="controls-bar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search items..."
        aria-label="Search inventory"
      />
    </div>
    
    <div class="filter-row">
      <div class="category-filters">
        {#each categories as cat}
          <button
            class="filter-chip"
            class:active={activeFilter === cat}
            on:click={() => activeFilter = cat}
          >
            {cat}
          </button>
        {/each}
      </div>
      
      <select bind:value={sortBy} class="sort-select" aria-label="Sort by">
        <option value="recent">Most Recent</option>
        <option value="name">A–Z</option>
      </select>
    </div>
  </div>

  <!-- Items grid -->
  {#if loading}
    <div class="skeleton-grid">
      {#each Array(6) as _}
        <Skeleton height="140px" borderRadius="12px" />
      {/each}
    </div>
  {:else if filteredItems.length === 0}
    <EmptyState
      icon="📦"
      title={$inventory.length === 0 ? 'Your inventory is empty' : 'No items match'}
      description={$inventory.length === 0 
        ? 'Scan your first piece of furniture to start building your digital warehouse.' 
        : 'Try a different search or filter.'}
      ctaText={$inventory.length === 0 ? 'Scan Furniture' : ''}
      onCta={$inventory.length === 0 ? startScan : null}
    />
  {:else}
    <div class="item-grid">
      {#each filteredItems as item}
        <div class="item-card">
          <a href="/inventory/{item.id}" class="item-link">
            <div class="item-thumb">
              {#if item.thumbnail}
                <img src={item.thumbnail} alt={item.name} />
              {:else}
                <span class="item-emoji">{getCategoryEmoji(item.category)}</span>
              {/if}
            </div>
            <div class="item-info">
              <h3>{item.name}</h3>
              <span class="item-cat">{item.category}</span>
              <span class="item-dims">
                {item.dimensions?.width}m × {item.dimensions?.depth}m × {item.dimensions?.height}m
              </span>
            </div>
          </a>
          <button
            class="item-delete"
            on:click={() => deleteItem(item.id, item.name)}
            aria-label="Delete {item.name}"
          >🗑️</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- FAB for scanning -->
  <button class="fab" on:click={startScan} aria-label="Scan new furniture">
    📷
  </button>
</div>

<!-- Scan Wizard Modal -->
<Modal 
  open={showScanWizard} 
  title={scanStep === 1 ? 'Scan Furniture' : scanStep === 2 ? 'Processing...' : scanStep === 3 ? 'Review Model' : 'Item Details'}
  on:close={() => showScanWizard = false}
>
  <div class="scan-wizard">
    <!-- Step 1: Capture -->
    {#if scanStep === 1}
      <div class="capture-area">
        <div class="capture-placeholder">
          <span class="capture-icon">📷</span>
          <p>Take a photo of your furniture on a flat surface with good lighting</p>
        </div>
        <label class="upload-btn">
          <input type="file" accept="image/*" capture="environment" on:change={handleFileUpload} hidden />
          📸 Take Photo
        </label>
        <label class="upload-btn secondary">
          <input type="file" accept="image/*" on:change={handleFileUpload} hidden />
          🖼️ Choose from Gallery
        </label>
        <div class="scan-tips">
          <h4>Tips for best results:</h4>
          <ul>
            <li>Use a plain, uncluttered background</li>
            <li>Ensure even, natural lighting</li>
            <li>Capture the item from a slight angle</li>
            <li>Include a reference object for scale (optional)</li>
          </ul>
        </div>
      </div>

    <!-- Step 2: Processing -->
    {:else if scanStep === 2}
      <div class="processing-area">
        <img src={capturedImage} alt="Captured furniture" class="processing-preview" />
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: {processingProgress}%"></div>
          </div>
          <span class="progress-text">{processingProgress.toFixed(0)}%</span>
        </div>
        <p class="processing-msg">{processingMessage}</p>
      </div>

    <!-- Step 3: Review -->
    {:else if scanStep === 3}
      <div class="review-area">
        <div class="review-preview">
          <img src={scanPreview} alt="Generated 3D preview" />
          <span class="preview-badge">3D Model Preview</span>
        </div>
        <p class="review-hint">Model generated! Add details below.</p>
        <button class="btn-primary" on:click={() => scanStep = 4}>
          Continue to Details →
        </button>
      </div>

    <!-- Step 4: Details -->
    {:else if scanStep === 4}
      <form on:submit|preventDefault={saveScannedItem} class="details-form">
        <label for="item-name">Item name *</label>
        <input id="item-name" type="text" bind:value={scanForm.name} placeholder="e.g., Green Armchair" required />

        <label for="item-category">Category</label>
        <select id="item-category" bind:value={scanForm.category}>
          {#each categories.filter(c => c !== 'All') as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>

        <fieldset>
          <legend>Dimensions (meters)</legend>
          <div class="dimension-inputs">
            <div>
              <label for="dim-w">Width</label>
              <input id="dim-w" type="number" bind:value={scanForm.width} min="0.1" max="10" step="0.1" />
            </div>
            <div>
              <label for="dim-h">Height</label>
              <input id="dim-h" type="number" bind:value={scanForm.height} min="0.1" max="10" step="0.1" />
            </div>
            <div>
              <label for="dim-d">Depth</label>
              <input id="dim-d" type="number" bind:value={scanForm.depth} min="0.1" max="10" step="0.1" />
            </div>
          </div>
        </fieldset>

        <label for="item-material">Material</label>
        <input id="item-material" type="text" bind:value={scanForm.material} placeholder="e.g., Velvet, Oak, Metal" />

        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => scanStep = 3}>← Back</button>
          <button type="submit" class="btn-primary" disabled={!scanForm.name.trim()}>
            Save to Inventory
          </button>
        </div>
      </form>
    {/if}
  </div>
</Modal>

<style>
  .page-header { margin-bottom: 1rem; }
  .subtitle { color: var(--grey-600); font-size: 0.9rem; margin-top: 0.25rem; }

  /* Controls */
  .controls-bar { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }

  .search-box {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--white); padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
  }
  .search-icon { font-size: 1rem; }
  .search-box input {
    flex: 1; border: none; font-size: 0.95rem; outline: none; background: transparent;
  }

  .filter-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .category-filters { display: flex; gap: 0.4rem; overflow-x: auto; flex: 1; padding-bottom: 0.25rem; }
  
  .filter-chip {
    padding: 0.4rem 0.75rem; border-radius: 20px;
    font-size: 0.78rem; white-space: nowrap;
    background: var(--grey-100); color: var(--charcoal);
    transition: all 0.15s;
  }
  .filter-chip.active { background: var(--green-700); color: white; font-weight: 600; }

  .sort-select {
    padding: 0.4rem 0.5rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.8rem;
    background: var(--white); flex-shrink: 0;
  }

  /* Item grid */
  .item-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .item-card {
    position: relative;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .item-card:hover { box-shadow: var(--shadow-md); }

  .item-link {
    text-decoration: none; color: inherit; display: block;
  }

  .item-thumb {
    width: 100%; height: 120px;
    background: var(--green-100);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .item-thumb img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .item-emoji { font-size: 3rem; }

  .item-info { padding: 0.75rem; }
  .item-info h3 { font-family: var(--font-sans); font-size: 0.9rem; margin-bottom: 0.2rem; }
  .item-cat { font-size: 0.7rem; color: var(--green-700); font-weight: 500; display: block; }
  .item-dims { font-size: 0.7rem; color: var(--grey-600); }

  .item-delete {
    position: absolute; top: 0.4rem; right: 0.4rem;
    padding: 0.3rem 0.4rem; background: rgba(255,255,255,0.9);
    border-radius: 50%; font-size: 0.9rem; opacity: 0;
    transition: opacity 0.15s;
  }
  .item-card:hover .item-delete { opacity: 1; }

  .skeleton-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }

  .fab {
    position: fixed; bottom: 6rem; right: 1.5rem;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--green-700); color: white;
    font-size: 1.5rem; display: flex; align-items: center;
    justify-content: center; box-shadow: var(--shadow-lg);
    z-index: 50;
  }

  /* Scan wizard */
  .scan-wizard { min-height: 300px; }

  .capture-area { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .capture-placeholder {
    text-align: center; padding: 2rem; color: var(--grey-600);
  }
  .capture-icon { font-size: 4rem; display: block; margin-bottom: 0.75rem; }

  .upload-btn {
    display: block; width: 100%; text-align: center;
    padding: 0.875rem; border-radius: var(--radius-md);
    background: var(--green-700); color: white; font-weight: 600;
    cursor: pointer; font-size: 1rem;
  }
  .upload-btn.secondary {
    background: var(--grey-100); color: var(--charcoal);
  }

  .scan-tips { background: var(--green-100); padding: 0.75rem 1rem; border-radius: var(--radius-sm); }
  .scan-tips h4 { font-size: 0.85rem; margin-bottom: 0.4rem; }
  .scan-tips ul { padding-left: 1.25rem; font-size: 0.8rem; color: var(--grey-600); }
  .scan-tips li { margin-bottom: 0.2rem; }

  /* Processing */
  .processing-area { text-align: center; }
  .processing-preview { width: 100%; max-height: 200px; object-fit: contain; border-radius: var(--radius-sm); margin-bottom: 1rem; }
  .progress-container { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
  .progress-bar { flex: 1; height: 8px; background: var(--grey-200); border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--green-700); transition: width 0.3s; border-radius: 4px; }
  .progress-text { font-weight: 600; font-size: 0.9rem; min-width: 40px; }
  .processing-msg { color: var(--grey-600); font-size: 0.9rem; }

  /* Review */
  .review-area { text-align: center; }
  .review-preview { position: relative; margin-bottom: 1rem; }
  .review-preview img { width: 100%; border-radius: var(--radius-sm); }
  .preview-badge {
    position: absolute; bottom: 0.5rem; right: 0.5rem;
    background: var(--green-700); color: white;
    padding: 0.3rem 0.6rem; border-radius: 12px; font-size: 0.75rem;
  }
  .review-hint { color: var(--grey-600); margin-bottom: 1rem; }

  /* Details form */
  .details-form { display: flex; flex-direction: column; gap: 0.75rem; }
  .details-form label { font-weight: 600; font-size: 0.8rem; color: var(--grey-600); }
  .details-form input,
  .details-form select {
    padding: 0.65rem; border: 2px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.95rem;
  }
  .details-form input:focus,
  .details-form select:focus { border-color: var(--green-500); outline: none; }

  fieldset { border: 1px solid var(--grey-200); border-radius: var(--radius-sm); padding: 0.75rem; }
  legend { font-weight: 600; font-size: 0.8rem; color: var(--grey-600); padding: 0 0.5rem; }
  .dimension-inputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
  .dimension-inputs label { font-size: 0.7rem; display: block; margin-bottom: 0.2rem; }
  .dimension-inputs input { width: 100%; }

  .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
  .btn-secondary {
    padding: 0.75rem 1.25rem; border-radius: var(--radius-sm);
    background: var(--grey-100); font-weight: 600;
  }
  .btn-primary {
    padding: 0.75rem 1.5rem; border-radius: var(--radius-sm);
    background: var(--green-700); color: white; font-weight: 600;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (min-width: 768px) {
    .item-grid { grid-template-columns: repeat(3, 1fr); }
    .fab { bottom: 2rem; }
  }
</style>

<script context="module">
  function getCategoryEmoji(category) {
    const emojis = {
      Chairs: '🪑', Tables: '🪵', Storage: '📚',
      Decor: '🖼️', Lighting: '💡', Plants: '🪴', Other: '📦'
    };
    return emojis[category] || '📦';
  }
</script>