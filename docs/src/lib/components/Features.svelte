<script lang="ts">
  const features = [
    {
      icon: '1',
      title: 'Human-Readable',
      description: 'YAML-like syntax that\'s easy to write, read, and version control. No XML editing required.'
    },
    {
      icon: '2',
      title: 'BPMN 2.0 Compatible',
      description: 'Exports to standard BPMN 2.0 XML that works with Camunda, Flowable, and other engines.'
    },
    {
      icon: '3',
      title: 'Automatic Layout',
      description: 'Smart auto-layout using ELK.js generates proper diagram coordinates automatically.'
    },
    {
      icon: '4',
      title: 'Fast CLI',
      description: 'Compile, watch, and validate from the command line. Integrates into any workflow.'
    }
  ];
</script>

<section class="features">
  {#each features as feature}
    <div class="feature">
      <div class="feature-icon">{feature.icon}</div>
      <h3 class="feature-title">{feature.title}</h3>
      <p class="feature-description">{feature.description}</p>
    </div>
  {/each}
</section>

<style>
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    padding: 2rem 1.5rem 4rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature {
    text-align: center;
    padding: 1.5rem;
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    background-color: var(--c-brand);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 auto 1rem;
  }

  .feature-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  .feature-description {
    color: var(--c-text-light);
    margin: 0;
    font-size: 0.9375rem;
  }
</style>
