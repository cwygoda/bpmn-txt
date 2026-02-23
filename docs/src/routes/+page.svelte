<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import Features from '$lib/components/Features.svelte';
</script>

<svelte:head>
  <title>BPMN-TXT - Human-readable BPMN 2.0</title>
</svelte:head>

<Hero />
<Features />

<section class="example">
  <h2>Quick Example</h2>
  <pre><code class="language-yaml">process: order-process
  name: "Order Processing"

  start: order-received
    name: "Order Received"

  task: validate-order
    name: "Validate Order"
    type: service

  gateway: valid-check
    type: exclusive
    name: "Order Valid?"

  task: fulfill-order
    name: "Fulfill Order"
    type: user

  end: completed
    name: "Order Complete"

  flow: f1
    from: order-received
    to: validate-order
  flow: f2
    from: validate-order
    to: valid-check
  flow: f3
    from: valid-check
    to: fulfill-order
    condition: "valid == true"
  flow: f4
    from: fulfill-order
    to: completed</code></pre>

  <p>Compile with:</p>
  <pre><code class="language-bash">bpmn-txt compile order.bpmn.md -o order.bpmn</code></pre>
</section>

<style>
  .example {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
  }

  .example h2 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
</style>
