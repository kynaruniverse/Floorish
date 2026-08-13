<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { homes } from '$stores/homes.js';
  import { inventory } from '$stores/inventory.js';
  import { toast, settings, updateSettings } from '$stores/app.js';
  import { browser } from '$app/environment';
  import Modal from '$components/Modal.svelte';

  let profileName = '';
  let units = 'metric';
  let defaultCeilingHeight = 2.4;
  let graphicsQuality = 'auto';
  let hapticFeedback = true;
  let soundEffects = false;
  let backupFrequency = 'manual';
  let exporting = false;
  let showDeleteModal = false;
  let showLicences = false;
  let storageUsed = '0 MB';

  onMount(async () => {
    if (browser) {
      // Load profile
      profileName = localStorage.getItem('floorish-profile') || '';
      
      // Load settings
      const saved = localStorage.getItem('floorish-settings');
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          units = prefs.units || 'metric';
          defaultCeilingHeight = prefs.defaultCeilingHeight || 2.4;
          graphicsQuality = prefs.graphicsQuality || 'auto';
          hapticFeedback = prefs.hapticFeedback !== undefined ? prefs.hapticFeedback : true;
          soundEffects = prefs.soundEffects || false;
          backupFrequency = prefs.backupFrequency || 'manual';
        } catch {
          // Ignore invalid JSON
        }
      }
      
      // Calculate storage
      try {
        const estimate = await navigator.storage?.estimate?.();
        if (estimate?.usage) {
          storageUsed = formatBytes(estimate.usage);
        }
      } catch {
        // Storage API not available
      }
    }
  });

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function savePreferences() {
    const prefs = { units, defaultCeilingHeight, graphicsQuality, hapticFeedback, soundEffects, backupFrequency };
    localStorage.setItem('floorish-settings', JSON.stringify(prefs));
    localStorage.setItem('floorish-profile', profileName);
    toast.success('Preferences saved');
  }

  async function exportData() {
    exporting = true;
    try {
      const homesData = await homes.load();
      const inventoryData = await inventory.load();
      
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        homes: homesData,
        inventory: inventoryData
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `floorish-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported');
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
    exporting = false;
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.homes) {
        for (const home of data.homes) {
          await homes.add(home);
        }
      }
      
      if (data.inventory) {
        for (const item of data.inventory) {
          await inventory.add(item);
        }
      }
      
      toast.success('Data imported');
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    }
  }

  async function deleteAllData() {
    await homes.resetAll();
    await inventory.removeAll();
    localStorage.clear();
    toast.info('All data deleted');
    showDeleteModal = false;
    setTimeout(() => goto('/'), 500);
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>⚙️ Settings</h1>
  </header>

  <!-- Profile -->
  <section class="settings-section">
    <h2>Profile</h2>
    <div class="settings-card">
      <div class="setting-row">
        <label for="profile-name">Name</label>
        <input id="profile-name" type="text" bind:value={profileName} on:change={savePreferences} placeholder="Your name" />
      </div>
    </div>
  </section>

  <!-- Preferences -->
  <section class="settings-section">
    <h2>Preferences</h2>
    <div class="settings-card">
      <div class="setting-row">
        <label for="units">Units</label>
        <select id="units" bind:value={units} on:change={savePreferences}>
          <option value="metric">Metric (m)</option>
          <option value="imperial">Imperial (ft)</option>
        </select>
      </div>
      
      <div class="setting-row">
        <label for="ceiling">Ceiling height</label>
        <div class="input-with-unit">
          <input id="ceiling" type="number" bind:value={defaultCeilingHeight} min="2" max="6" step="0.1" on:change={savePreferences} />
          <span>m</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label for="graphics">Graphics</label>
        <select id="graphics" bind:value={graphicsQuality} on:change={savePreferences}>
          <option value="auto">Auto</option>
          <option value="low">Performance</option>
          <option value="high">Quality</option>
        </select>
      </div>
      
      <div class="setting-row">
        <span>Haptic feedback</span>
        <label class="switch">
          <input type="checkbox" bind:checked={hapticFeedback} on:change={savePreferences} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </section>

  <!-- Data -->
  <section class="settings-section">
    <h2>Data</h2>
    <div class="settings-card">
      <div class="setting-row">
        <span>Storage used</span>
        <span class="setting-value">{storageUsed}</span>
      </div>
      
      <div class="setting-actions">
        <button class="btn-outline" on:click={exportData} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📤 Export Data'}
        </button>
        
        <label class="btn-outline file-btn">
          📥 Import Data
          <input type="file" accept=".json" on:change={importData} hidden />
        </label>
        
        <button class="btn-danger-outline" on:click={() => showDeleteModal = true}>
          🗑️ Delete All Data
        </button>
      </div>
    </div>
  </section>

  <!-- About -->
  <section class="settings-section">
    <h2>About</h2>
    <div class="settings-card">
      <div class="setting-row">
        <span>Version</span>
        <span class="setting-value">Floorish v1.0.0</span>
      </div>
      
      <div class="setting-row">
        <span>Licence</span>
        <span class="setting-value">AGPL v3</span>
      </div>
      
      <div class="setting-actions">
        <button class="btn-outline" on:click={() => showLicences = !showLicences}>
          📜 {showLicences ? 'Hide' : 'View'} Licences
        </button>
      </div>
      
      {#if showLicences}
        <div class="licence-list">
          <div class="licence-item"><strong>Three.js</strong> — MIT</div>
          <div class="licence-item"><strong>Fabric.js</strong> — MIT</div>
          <div class="licence-item"><strong>SvelteKit</strong> — MIT</div>
          <div class="licence-item"><strong>idb</strong> — ISC</div>
        </div>
      {/if}
    </div>
  </section>
</div>

<!-- Delete confirmation -->
<Modal open={showDeleteModal} title="Delete All Data?" on:close={() => showDeleteModal = false}>
  <p>This permanently removes all homes, rooms, furniture, and settings.</p>
  <p class="warning-text">This cannot be undone.</p>
  <div class="modal-actions">
    <button class="btn-secondary" on:click={() => showDeleteModal = false}>Cancel</button>
    <button class="btn-danger" on:click={deleteAllData}>Delete Everything</button>
  </div>
</Modal>

<style>
  .page-header { margin-bottom: 1.25rem; }

  .settings-section { margin-bottom: 1.25rem; }

  .settings-section h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
    margin-bottom: 0.4rem;
    padding-left: 0.25rem;
  }

  .settings-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.88rem;
  }

  .setting-row label {
    font-weight: 500;
    flex-shrink: 0;
  }

  .setting-row input[type="text"],
  .setting-row input[type="number"] {
    padding: 0.5rem 0.65rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
    max-width: 180px;
    text-align: right;
  }

  .setting-row select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .input-with-unit {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .input-with-unit input {
    width: 70px;
  }

  .setting-value { color: #888; }

  /* Toggle */
  .switch {
    position: relative;
    width: 44px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    inset: 0;
    background: #ddd;
    border-radius: 24px;
    transition: 0.2s;
    cursor: pointer;
  }

  .slider::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 3px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    transition: 0.2s;
  }

  input:checked + .slider {
    background: #1E3D1E;
  }

  input:checked + .slider::before {
    transform: translateX(20px);
  }

  /* Actions */
  .setting-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .btn-outline {
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: #f0f0f0;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    color: #1a1a1a;
    font-size: 0.85rem;
    cursor: pointer;
    display: block;
    width: 100%;
  }

  .file-btn {
    position: relative;
    overflow: hidden;
  }

  .btn-danger-outline {
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: #FDECEA;
    color: #C62828;
    font-weight: 500;
    font-size: 0.85rem;
  }

  .licence-list {
    margin-top: 0.5rem;
    border-top: 1px solid #eee;
    padding-top: 0.5rem;
  }

  .licence-item {
    padding: 0.35rem 0;
    font-size: 0.82rem;
    color: #555;
  }

  .warning-text {
    color: #C62828;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .btn-secondary {
    padding: 0.7rem 1.25rem;
    border-radius: 8px;
    background: #f0f0f0;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .btn-danger {
    padding: 0.7rem 1.5rem;
    border-radius: 8px;
    background: #C62828;
    color: #fff;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>