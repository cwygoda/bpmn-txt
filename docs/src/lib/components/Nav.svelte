<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { siteConfig, nav } from '$lib/config';

  let menuOpen = $state(false);
</script>

<nav class="nav">
  <div class="nav-container">
    <a href="{base}/" class="brand">
      <span class="logo">BPMN</span>
      <span class="logo-txt">-TXT</span>
    </a>

    <button class="menu-toggle" onclick={() => menuOpen = !menuOpen} aria-label="Toggle menu">
      <span class="hamburger" class:open={menuOpen}></span>
    </button>

    <div class="nav-links" class:open={menuOpen}>
      {#each nav as item}
        <a
          href="{base}{item.link}"
          class="nav-link"
          class:active={page.url.pathname.startsWith(base + item.link)}
        >
          {item.text}
        </a>
      {/each}
      <a href={siteConfig.github} class="nav-link github" target="_blank" rel="noopener">
        GitHub
      </a>
    </div>
  </div>
</nav>

<style>
  .nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--nav-height);
    background-color: var(--c-bg);
    border-bottom: 1px solid var(--c-border);
    z-index: 100;
  }

  .nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .logo {
    color: var(--c-brand);
  }

  .logo-txt {
    color: var(--c-text);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    color: var(--c-text-light);
    font-weight: 500;
    transition: color 0.2s;
  }

  .nav-link:hover,
  .nav-link.active {
    color: var(--c-brand);
    text-decoration: none;
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
  }

  .hamburger {
    display: block;
    width: 24px;
    height: 2px;
    background-color: var(--c-text);
    position: relative;
    transition: background-color 0.2s;
  }

  .hamburger::before,
  .hamburger::after {
    content: '';
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--c-text);
    transition: transform 0.2s;
  }

  .hamburger::before {
    top: -7px;
  }

  .hamburger::after {
    bottom: -7px;
  }

  .hamburger.open {
    background-color: transparent;
  }

  .hamburger.open::before {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .hamburger.open::after {
    transform: rotate(-45deg) translate(5px, -5px);
  }

  @media (max-width: 768px) {
    .menu-toggle {
      display: block;
    }

    .nav-links {
      display: none;
      position: absolute;
      top: var(--nav-height);
      left: 0;
      right: 0;
      background-color: var(--c-bg);
      border-bottom: 1px solid var(--c-border);
      flex-direction: column;
      padding: 1rem;
      gap: 0.5rem;
    }

    .nav-links.open {
      display: flex;
    }

    .nav-link {
      padding: 0.5rem 1rem;
      width: 100%;
    }
  }
</style>
