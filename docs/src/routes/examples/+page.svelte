<script lang="ts">
  import { base } from '$app/paths';
</script>

<h1>Examples</h1>

<p>This section contains complete BPMN-TXT examples demonstrating various features.</p>

<h2>Available Examples</h2>

<h3><a href="{base}/examples/simple-process">Simple Process</a></h3>
<p>A basic process with start, task, and end events. Great for learning the basics.</p>
<p><strong>Features:</strong> Start/End events, User task, Service task, Sequence flows</p>

<h3><a href="{base}/examples/approval-workflow">Approval Workflow</a></h3>
<p>A document approval process with conditional routing and parallel reviews.</p>
<p><strong>Features:</strong> Exclusive gateway, Parallel gateway, Conditions, Multiple end events</p>

<h3><a href="{base}/examples/order-fulfillment">Order Fulfillment</a></h3>
<p>A cross-organizational order process with pools, lanes, and message flows.</p>
<p><strong>Features:</strong> Pools, Lanes, Message events, Message flows, Boundary events</p>

<h3><a href="{base}/examples/error-handling">Error Handling</a></h3>
<p>A payment process demonstrating subprocesses and error handling patterns.</p>
<p><strong>Features:</strong> Subprocess, Boundary events, Error events, Timer events</p>

<h2>Running Examples</h2>

<p>All examples are included in the <code>examples/</code> directory of the repository.</p>

<pre><code class="language-bash"># Compile an example
bpmn-txt compile examples/simple-process.bpmn.md

# Validate all examples
for f in examples/*.bpmn.md; do
  bpmn-txt validate "$f"
done</code></pre>

<h2>Creating Your Own</h2>

<p>Use these examples as templates:</p>

<ol>
  <li>Copy an example that's similar to your use case</li>
  <li>Modify the process ID and name</li>
  <li>Add/remove elements as needed</li>
  <li>Update the flows to connect your elements</li>
  <li>Compile and test with <code>bpmn-txt compile</code></li>
</ol>
