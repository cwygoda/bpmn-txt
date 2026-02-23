<script lang="ts">
  import { base } from '$app/paths';
  import { siteConfig } from '$lib/config';
</script>

<section class="hero">
  <h1 class="hero-title">
    <span class="brand">BPMN</span>-TXT
  </h1>
  <p class="hero-tagline">Human-readable BPMN 2.0</p>
  <p class="hero-description">
    Write business processes in a simple, text-based DSL. Export to standard BPMN XML.
  </p>
  <div class="hero-actions">
    <a href="{base}/guide/getting-started" class="btn btn-primary">Get Started</a>
    <a href={siteConfig.github} class="btn btn-secondary" target="_blank" rel="noopener">
      View on GitHub
    </a>
  </div>
</section>

<style>
  .hero {
    text-align: center;
    padding: 4rem 1.5rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0;
    line-height: 1.1;
  }

  .brand {
    color: var(--c-brand);
  }

  .hero-tagline {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--c-text-light);
    margin: 1rem 0;
  }

  .hero-description {
    font-size: 1.125rem;
    color: var(--c-text-light);
    max-width: 600px;
    margin: 1rem auto 2rem;
  }

  .hero-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: var(--c-brand);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--c-brand-light);
    text-decoration: none;
  }

  .btn-secondary {
    background-color: var(--c-bg-soft);
    color: var(--c-text);
    border: 1px solid var(--c-border);
  }

  .btn-secondary:hover {
    border-color: var(--c-brand);
    text-decoration: none;
  }

  @media (max-width: 640px) {
    .hero-title {
      font-size: 2.5rem;
    }

    .hero-tagline {
      font-size: 1.25rem;
    }
  }
</style>
