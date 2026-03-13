<script lang="ts">
  import { theme, cycleTheme } from '$lib/theme.svelte';

  const labels: Record<string, string> = {
    system: 'Theme: system preference',
    light: 'Theme: light',
    dark: 'Theme: dark',
  };
</script>

<button
  class="theme-toggle"
  onclick={cycleTheme}
  aria-label={labels[theme.choice]}
  title={labels[theme.choice]}
>
  {#if theme.choice === 'system'}
    <!-- monitor -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  {:else if theme.choice === 'light'}
    <!-- sun -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  {:else}
    <!-- moon -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 6px;
    color: var(--c-text-light);
    transition: color 0.2s, background-color 0.2s;
  }

  .theme-toggle:hover {
    color: var(--c-brand);
    background-color: var(--c-bg-soft);
  }
</style>
