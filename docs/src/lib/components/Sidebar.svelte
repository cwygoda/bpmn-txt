<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import type { SidebarItem } from '$lib/config';

  interface Props {
    items: SidebarItem[];
  }

  let { items }: Props = $props();
</script>

<aside class="sidebar">
  {#each items as group}
    <div class="sidebar-group">
      <div class="sidebar-group-title">{group.text}</div>
      {#if group.items}
        <ul class="sidebar-items">
          {#each group.items as item}
            <li>
              <a
                href="{base}{item.link}"
                class="sidebar-link"
                class:active={page.url.pathname === base + item.link}
              >
                {item.text}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</aside>

<style>
  .sidebar {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    bottom: 0;
    width: var(--sidebar-width);
    padding: 1.5rem;
    overflow-y: auto;
    border-right: 1px solid var(--c-border);
    background-color: var(--c-bg);
  }

  .sidebar-group {
    margin-bottom: 1.5rem;
  }

  .sidebar-group-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sidebar-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .sidebar-link {
    display: block;
    padding: 0.375rem 0;
    color: var(--c-text-light);
    font-size: 0.9375rem;
    transition: color 0.2s;
  }

  .sidebar-link:hover {
    color: var(--c-brand);
    text-decoration: none;
  }

  .sidebar-link.active {
    color: var(--c-brand);
    font-weight: 500;
  }

  @media (max-width: 960px) {
    .sidebar {
      display: none;
    }
  }
</style>
