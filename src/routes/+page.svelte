<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { isAppInstalled } from '$lib/stores/app.js';

  let deferredPrompt = null;
  let showInstallButton = false;

  onMount(() => {
    // Capture PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton = true;
    });
  });

  async function launchApp() {
    await goto('/app');
  }

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    showInstallButton = false;
  }
</script>

<svelte:head>
  <title>Floorish — Draw Your Home</title>
  <meta name="description" content="Draw your home's floor plan, furnish it in 3D, and see how it looks before you change anything. Free and open source." />
</svelte:head>

<div class="landing">
  <!-- Hero -->
  <section class="hero">
    <div class="hero-badge">Free & Open Source</div>
    
    <h1 class="hero-title">Floorish</h1>
    
    <p class="hero-tagline">
      Draw it. Furnish it.<br />
      <span>See it before you change it.</span>
    </p>
    
    <p class="hero-desc">
      Create your home's floor plan on your phone. Arrange furniture in 3D. 
      Know what works before you move anything real.
    </p>

    <div class="hero-actions">
      <button class="btn btn-primary btn-lg" on:click={launchApp}>
        Launch App
      </button>
      
      {#if showInstallButton && !$isAppInstalled}
        <button class="btn btn-secondary btn-lg" on:click={installApp}>
          Install
        </button>
      {/if}
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="feature-card">
      <div class="feature-icon">
        <!-- Simple inline SVG -->
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <h3>Draw Your Floor Plan</h3>
      <p>Map every room in your home with simple drag-and-drop.</p>
    </div>

    <div class="feature-card">
      <div class="feature-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h3>See It in 3D</h3>
      <p>Switch to 3D view and walk through your space before committing.</p>
    </div>

    <div class="feature-card">
      <div class="feature-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M7 21h10" />
          <path d="M12 17v4" />
        </svg>
      </div>
      <h3>Works on Your Phone</h3>
      <p>Touch-friendly, installable, and works offline. No account needed.</p>
    </div>
  </section>

  <!-- How it works -->
  <section class="how-it-works">
    <h2>How it works</h2>
    
    <div class="steps">
      <div class="step">
        <span class="step-num">1</span>
        <div>
          <strong>Create your home</strong>
          <p>Name it. Add floors. Give it structure.</p>
        </div>
      </div>
      
      <div class="step">
        <span class="step-num">2</span>
        <div>
          <strong>Add rooms</strong>
          <p>Pick from templates. Drag them into place.</p>
        </div>
      </div>
      
      <div class="step">
        <span class="step-num">3</span>
        <div>
          <strong>Visualise</strong>
          <p>See your layout in 3D. Make changes. Save.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <h2>Ready to redesign your home?</h2>
    <p>Free. No sign-up. Works in your browser.</p>
    <button class="btn btn-primary btn-lg btn-block" on:click={launchApp}>
      Start Designing
    </button>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>Floorish — Built with ❤️ · Open Source</p>
  </footer>
</div>

<style>
  .landing {
    max-width: 520px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Hero */
  .hero {
    text-align: center;
    padding: var(--space-6) 0;
    flex-shrink: 0;
  }

  .hero-badge {
    display: inline-block;
    background: var(--primary-light);
    color: var(--primary);
    font-size: var(--text-xs);
    font-weight: 600;
    padding: 0.3rem 0.8rem;
    border-radius: var(--radius-full);
    margin-bottom: var(--space-4);
  }

  .hero-title {
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--primary);
    margin-bottom: var(--space-3);
  }

  .hero-tagline {
    font-size: var(--text-xl);
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: var(--space-4);
  }

  .hero-tagline span {
    color: var(--text-secondary);
    font-weight: 400;
  }

  .hero-desc {
    color: var(--text-secondary);
    font-size: var(--text-base);
    line-height: 1.6;
    max-width: 340px;
    margin: 0 auto var(--space-5);
  }

  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 280px;
    margin: 0 auto;
  }

  /* Features */
  .features {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .feature-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    box-shadow: var(--shadow-sm);
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--primary-light);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-3);
  }

  .feature-card h3 {
    font-size: var(--text-base);
    margin-bottom: var(--space-2);
  }

  .feature-card p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  /* How it works */
  .how-it-works {
    margin-bottom: var(--space-6);
  }

  .how-it-works h2 {
    font-size: var(--text-xl);
    margin-bottom: var(--space-4);
    text-align: center;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .step {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .step-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    font-weight: 700;
    font-size: var(--text-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step strong {
    font-size: var(--text-base);
    display: block;
  }

  .step p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 0.2rem;
  }

  /* CTA */
  .cta {
    text-align: center;
    background: var(--primary);
    border-radius: var(--radius-xl);
    padding: var(--space-6) var(--space-4);
    margin-bottom: var(--space-5);
  }

  .cta h2 {
    color: #fff;
    font-size: var(--text-xl);
    margin-bottom: var(--space-2);
  }

  .cta p {
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
  }

  .cta .btn-primary {
    background: #fff;
    color: var(--primary);
  }

  /* Footer */
  .footer {
    text-align: center;
    padding: var(--space-4) 0;
    color: var(--text-muted);
    font-size: var(--text-xs);
    margin-top: auto;
  }
</style>