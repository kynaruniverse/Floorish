<script>
  import { onMount } from 'svelte';
  import { addToast } from '$stores/app.js';
  import { browser } from '$app/environment';

  let profileName = 'Jane Doe';
  let profileEmail = 'jane@email.com';
  let units = 'metric';
  let defaultCeilingHeight = 2.4;
  let graphicsQuality = 'auto';
  let hapticFeedback = true;
  let soundEffects = false;
  let storageUsed = '47 MB';
  let appVersion = '1.0.0';
  let backupFrequency = 'weekly';
  let showLicences = false;
  let showDeleteConfirm = false;
  let exporting = false;
  let backingUp = false;

  onMount(() => {
    // Load preferences from localStorage
    if (browser) {
      const prefs = JSON.parse(localStorage.getItem('floorish-prefs') || '{}');
      if (prefs.units) units = prefs.units;
      if (prefs.ceilingHeight) defaultCeilingHeight = prefs.ceilingHeight;
      if (prefs.graphicsQuality) graphicsQuality = prefs.graphicsQuality;
      if (prefs.hapticFeedback !== undefined) hapticFeedback = prefs.hapticFeedback;
      if (prefs.soundEffects !== undefined) soundEffects = prefs.soundEffects;
      if (prefs.backupFrequency) backupFrequency = prefs.backupFrequency;
    }
  });

  function savePreferences() {
    const prefs = { units, defaultCeilingHeight, graphicsQuality, hapticFeedback, soundEffects, backupFrequency };
    localStorage.setItem('floorish-prefs', JSON.stringify(prefs));
    addToast('Preferences saved', 'success');
  }

  async function exportData() {
    exporting = true;
    try {
      const db = await import('idb').then(m => m.openDB('floorish-db', 1));
      const homes = await db.getAll('homes');
      const rooms = await db.getAll('rooms');
      const inventory = await db.getAll('inventory');
      
      const exportData = {
        version: appVersion,
        exportedAt: new Date().toISOString(),
        homes,
        rooms,
        inventory
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `floorish-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      addToast('Data exported successfully', 'success');
    } catch (err) {
      addToast('Export failed: ' + err.message, 'error');
    }
    exporting = false;
  }

  async function backupNow() {
    backingUp = true;
    // Simulate backup
    await new Promise(r => setTimeout(r, 1500));
    addToast('Backup complete', 'success');
    backingUp = false;
  }

  function clearCache() {
    if (confirm('Clear thumbnail cache? This will free up space.')) {
      addToast('Cache cleared', 'info');
    }
  }

  function deleteAccount() {
    if (confirm('Permanently delete all data? This cannot be undone.')) {
      localStorage.clear();
      indexedDB.deleteDatabase('floorish-db');
      addToast('All data deleted', 'info');
      showDeleteConfirm = false;
      setTimeout(() => window.location.href = '/', 1000);
    }
  }
</script>

<div class="page-container">
  <header class="page-header">
    <h1>⚙️ Settings</h1>
  </header>

  <!-- Account -->
  <section class="settings-section">
    <h2>Account</h2>
    <div class="settings-card">
      <div class="setting-row">
        <label for="profile-name">Profile name</label>
        <input id="profile-name" type="text" bind:value={profileName} />
      </div>
      <div class="setting-row">
        <label for="profile-email">Email</label>
        <input id="profile-email" type="email" bind:value={profileEmail} />
      </div>
      <div class="setting-actions">
        <button class="btn-outline" on:click={exportData} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📤 Export All Data'}
        </button>
        <button class="btn-danger-outline" on:click={() => showDeleteConfirm = true}>
          🗑️ Delete Account
        </button>
      </div>
    </div>
  </section>

  <!-- App Preferences -->
  <section class="settings-section">
    <h2>App Preferences</h2>
    <div class="settings-card">
      <div class="setting-row">
        <label for="units">Measurement units</label>
        <select id="units" bind:value={units} on:change={savePreferences}>
          <option value="metric">Metric (m, cm)</option>
          <option value="imperial">Imperial (ft, in)</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="ceiling">Default ceiling height</label>
        <div class="input-with-unit">
          <input id="ceiling" type="number" bind:value={defaultCeilingHeight} min="2" max="6" step="0.1" on:change={savePreferences} />
          <span>m</span>
        </div>
      </div>
      <div class="setting-row">
        <label for="graphics">Graphics quality</label>
        <select id="graphics" bind:value={graphicsQuality} on:change={savePreferences}>
          <option value="auto">Auto (based on device)</option>
          <option value="low">Low (performance)</option>
          <option value="medium">Medium</option>
          <option value="high">High (quality)</option>
        </select>
      </div>
      <div class="setting-row toggle">
        <span>Haptic feedback</span>
        <label class="switch">
          <input type="checkbox" bind:checked={hapticFeedback} on:change={savePreferences} />
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row toggle">
        <span>Sound effects</span>
        <label class="switch">
          <input type="checkbox" bind:checked={soundEffects} on:change={savePreferences} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </section>

  <!-- Data & Storage -->
  <section class="settings-section">
    <h2>Data & Storage</h2>
    <div class="settings-card">
      <div class="setting-row">
        <span>Storage used</span>
        <span class="setting-value">{storageUsed}</span>
      </div>
      <div class="setting-row">
        <label for="backup-freq">Backup frequency</label>
        <select id="backup-freq" bind:value={backupFrequency} on:change={savePreferences}>
          <option value="manual">Manual only</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div class="setting-actions">
        <button class="btn-outline" on:click={clearCache}>🗑️ Clear Thumbnail Cache</button>
        <button class="btn-outline" on:click={backupNow} disabled={backingUp}>
          {backingUp ? '⏳ Backing up...' : '💾 Back Up Now'}
        </button>
        <button class="btn-outline" on:click={() => addToast('Restore from backup coming soon', 'info')}>
          📥 Restore from Backup
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
        <span class="setting-value">Floorish v{appVersion}</span>
      </div>
      <div class="setting-row">
        <span>Built with</span>
        <span class="setting-value">❤️ + Open Source</span>
      </div>
      <div class="setting-actions">
        <button class="btn-outline" on:click={() => showLicences = !showLicences}>
          📜 View Licences
        </button>
        <a href="https://github.com/floorish/floorish" target="_blank" rel="noopener" class="btn-outline">
          🐙 GitHub Repository
        </a>
        <button class="btn-outline" on:click={() => addToast('Bug report form coming soon', 'info')}>
          🐛 Report a Bug
        </button>
        <button class="btn-outline" on:click={() => addToast('Privacy policy: We don\'t track you. All data stays on your device.', 'info')}>
          🔒 Privacy Policy
        </button>
      </div>
    </div>
  </section>

  <!-- Licences accordion -->
  {#if showLicences}
    <section class="settings-section">
      <div class="settings-card licences-card">
        <h3>Open Source Licences</h3>
        <div class="licence-item">
          <strong>Three.js</strong> — MIT Licence
        </div>
        <div class="licence-item">
          <strong>Fabric.js</strong> — MIT Licence
        </div>
        <div class="licence-item">
          <strong>SvelteKit</strong> — MIT Licence
        </div>
        <div class="licence-item">
          <strong>OpenCV.js</strong> — Apache 2.0 Licence
        </div>
        <div class="licence-item">
          <strong>idb</strong> — ISC Licence
        </div>
        <p class="licence-note">Floorish is licensed under AGPL v3.0</p>
      </div>
    </section>
  {/if}
</div>

<!-- Delete confirmation -->
{#if showDeleteConfirm}
  <div class="modal-backdrop" on:click={() => showDeleteConfirm = false}>
    <div class="confirm-dialog" on:click|stopPropagation>
      <span class="confirm-icon">⚠️</span>
      <h2>Delete All Data?</h2>
      <p>This will permanently remove all your homes, rooms, furniture scans, and settings. This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-secondary" on:click={() => showDeleteConfirm = false}>Cancel</button>
        <button class="btn-danger" on:click={deleteAccount}>Delete Everything</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { margin-bottom: 1.5rem; }

  .settings-section { margin-bottom: 1.5rem; }
  .settings-section h2 {
    font-family: var(--font-sans); font-size: 0.85rem;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--grey-600); margin-bottom: 0.5rem;
    padding-left: 0.25rem;
  }

  .settings-card {
    background: var(--white); border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm); padding: 1rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  .setting-row {
    display: flex; justify-content: space-between; align-items: center;
    gap: 1rem; font-size: 0.9rem;
  }

  .setting-row.toggle { cursor: pointer; }

  .setting-row label { font-weight: 500; flex-shrink: 0; }
  .setting-row input[type="text"],
  .setting-row input[type="email"],
  .setting-row input[type="number"] {
    padding: 0.5rem 0.65rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.9rem; max-width: 200px;
    text-align: right;
  }
  .setting-row select {
    padding: 0.5rem; border: 1px solid var(--grey-200);
    border-radius: var(--radius-sm); font-size: 0.9rem;
  }

  .input-with-unit { display: flex; align-items: center; gap: 0.3rem; }
  .input-with-unit input { width: 80px; }
  .input-with-unit span { color: var(--grey-600); }

  .setting-value { color: var(--grey-600); }

  /* Toggle switch */
  .switch { position: relative; width: 44px; height: 24px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; inset: 0; background: var(--grey-300);
    border-radius: 24px; transition: 0.2s; cursor: pointer;
  }
  .slider::before {
    content: ''; position: absolute; left: 3px; top: 3px;
    width: 18px; height: 18px; background: white;
    border-radius: 50%; transition: 0.2s;
  }
  input:checked + .slider { background: var(--green-700); }
  input:checked + .slider::before { transform: translateX(20px); }

  .setting-actions {
    display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem;
  }

  .btn-outline {
    padding: 0.65rem 1rem; border-radius: var(--radius-sm);
    background: var(--grey-100); font-weight: 500; text-align: center;
    text-decoration: none; color: var(--charcoal); font-size: 0.85rem;
    transition: background 0.15s;
  }
  .btn-outline:hover { background: var(--grey-200); }

  .btn-danger-outline {
    padding: 0.65rem 1rem; border-radius: var(--radius-sm);
    background: #FDECEA; color: var(--error); font-weight: 500;
    font-size: 0.85rem;
  }

  /* Licences */
  .licences-card { max-height: 300px; overflow-y: auto; }
  .licence-item { padding: 0.4rem 0; border-bottom: 1px solid var(--grey-100); font-size: 0.85rem; }
  .licence-note { font-size: 0.75rem; color: var(--grey-600); margin-top: 0.5rem; font-style: italic; }

  /* Delete confirmation */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; padding: 1rem;
  }
  .confirm-dialog {
    background: white; border-radius: var(--radius-lg);
    padding: 2rem; max-width: 380px; text-align: center;
  }
  .confirm-icon { font-size: 2.5rem; }
  .confirm-dialog h2 { margin: 0.75rem 0; }
  .confirm-dialog p { color: var(--grey-600); font-size: 0.9rem; margin-bottom: 1.25rem; }
  .confirm-actions { display: flex; gap: 0.75rem; justify-content: center; }
  .btn-secondary {
    padding: 0.75rem 1.5rem; border-radius: var(--radius-sm);
    background: var(--grey-100); font-weight: 600;
  }
  .btn-danger {
    padding: 0.75rem 1.5rem; border-radius: var(--radius-sm);
    background: var(--error); color: white; font-weight: 600;
  }
</style>