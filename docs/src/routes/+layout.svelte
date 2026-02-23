<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import Nav from '$lib/components/Nav.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { getSidebar } from '$lib/config';
  import '../app.css';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let sidebarItems = $derived(getSidebar(page.url.pathname.replace(base, '')));
  let isHome = $derived(page.url.pathname === base || page.url.pathname === base + '/');
  let hasSidebar = $derived(!isHome && sidebarItems.length > 0);
</script>

<Nav />

<div class="layout" class:has-sidebar={hasSidebar}>
  {#if hasSidebar}
    <Sidebar items={sidebarItems} />
  {/if}
  <main class="content" class:with-sidebar={hasSidebar}>
    {@render children()}
  </main>
</div>

<style>
  .layout {
    padding-top: var(--nav-height);
    min-height: 100vh;
  }

  .content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .content.with-sidebar {
    margin-left: var(--sidebar-width);
    max-width: calc(100% - var(--sidebar-width));
    padding: 2rem 3rem;
  }

  @media (max-width: 960px) {
    .content.with-sidebar {
      margin-left: 0;
      max-width: 100%;
      padding: 2rem 1.5rem;
    }
  }
</style>
