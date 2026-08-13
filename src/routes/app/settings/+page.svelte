<script>
  import { onMount } from 'svelte';
  import { homes } from '$lib/stores/homes.js';
  import { toast } from '$lib/stores/app.js';
  import Modal from '$lib/components/Modal.svelte';

  let storageUsed = '0 KB';
  let showDeleteModal = false;
  let exporting = false;

  onMount(async () => {
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (estimate?.usage) {
        storageUsed = formatBytes(estimate.usage);
      }
    } catch {
      // Storage API not available
    }
  });

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function exportData() {
    exporting = true;
    try {
      const data = await homes.exportData();
      const blob = new Blob([data], { type: 'application/json' });
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
      toast.error('Export failed');
    }
    exporting = false;
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await homes.importData(text);
      toast.success('Data imported');
    } catch (err) {
      toast.error('Import failed: invalid file');
    }
  }

  async function deleteAllData() {
    await homes.resetAll();
    toast.info('All data deleted');
    showDeleteModal = false;
  }
</script>

<svelte:head>
  <title>Settings — Floorish</title>
</svelte:head>

<div class="settings-page">
  <header class="page-header">
    <h1>Settings</h1>
  </header>

  <!-- Storage -->
  <section class="settings-section">
    <h2>Storage</h2>
    <div class="card">
      <div class="setting-row">
        <span>Space used</span>
        <span class="setting-value">{storageUsed}</span>
      </div>
      
      <div class="setting-actions">
        <button class="btn btn-secondary btn-block" on:click={exportData} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Data'}
        </button>
        
        <label class="btn btn-secondary btn-block">
          Import Data
          <input type="file" accept=".json" on:change={importData} hidden />
        </label>
        
        <button class="btn btn-danger btn-block" on:click={() => showDeleteModal = true}>
          Delete All Data
        </button>
      </div>
    </div>
  </section>

  <!-- About -->
  <section class="settings-section">
    <h2>About</h2>
    <div class="card">
      <div class="setting-row">
        <span>Version</span>
        <span class="setting-value">1.0.0</span>
      </div>
      <div class="setting-row">
        <span>Licence</span>
        <span class="setting-value">AGPL v3</span>
      </div>
      <div class="setting-row">
        <span>Built with</span>
        <span class="setting-value">SvelteKit + Three.js</span>
      </div>
    </div>
  </section>
</div>

<!-- Delete confirmation -->
<Modal open={showDeleteModal} title="Delete All Data?" on:close={() => showDeleteModal = false}>
  <p>This permanently removes all homes, floors, and rooms. This cannot be undone.</p>
  
  <div class="form-actions">
    <button class="btn btn-secondary" on:click={() => showDeleteModal = false}>Cancel</button>
    <button class="btn btn-danger" on:click={deleteAllData}>Delete Everything</button>
  </div>
</Modal>

<style>
  .settings-page {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-4);
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    font-size: var(--text-xl);
  }

  .settings-section {
    margin-bottom: var(--space-4);
  }

  .settings-section h2 {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: var(--space-2);
    padding-left: var(--space-1);
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    font-size: var(--text-sm);
  }

  .setting-value {
    color: var(--text-muted);
  }

  .setting-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .form-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    margin-top: var(--space-3);
  }
</style>