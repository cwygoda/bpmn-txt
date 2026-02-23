<script lang="ts">
  import { base } from '$app/paths';
</script>

<h1>What is BPMN-TXT?</h1>

<p>BPMN-TXT is a text-based Domain Specific Language (DSL) for defining BPMN 2.0 business processes. It provides a human-readable alternative to editing XML directly, making process definitions easier to write, review, and version control.</p>

<h2>Why BPMN-TXT?</h2>

<h3>The Problem with BPMN XML</h3>

<p>BPMN 2.0 XML is verbose and hard to read:</p>

<pre><code class="language-xml">&lt;bpmn:process id="Process_1" isExecutable="true"&gt;
  &lt;bpmn:startEvent id="StartEvent_1" name="Start"&gt;
    &lt;bpmn:outgoing&gt;Flow_1&lt;/bpmn:outgoing&gt;
  &lt;/bpmn:startEvent&gt;
  &lt;bpmn:task id="Task_1" name="Do Something"&gt;
    &lt;bpmn:incoming&gt;Flow_1&lt;/bpmn:incoming&gt;
    &lt;bpmn:outgoing&gt;Flow_2&lt;/bpmn:outgoing&gt;
  &lt;/bpmn:task&gt;
  &lt;bpmn:endEvent id="EndEvent_1" name="End"&gt;
    &lt;bpmn:incoming&gt;Flow_2&lt;/bpmn:incoming&gt;
  &lt;/bpmn:endEvent&gt;
  &lt;bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/&gt;
  &lt;bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/&gt;
&lt;/bpmn:process&gt;</code></pre>

<h3>The BPMN-TXT Solution</h3>

<p>The same process in BPMN-TXT:</p>

<pre><code class="language-yaml">process: Process_1
  start: StartEvent_1
    name: "Start"
  task: Task_1
    name: "Do Something"
  end: EndEvent_1
    name: "End"
  flow: Flow_1
    from: StartEvent_1
    to: Task_1
  flow: Flow_2
    from: Task_1
    to: EndEvent_1</code></pre>

<h2>Key Features</h2>

<ul>
  <li><strong>YAML-like Syntax</strong> - Familiar, indentation-based structure</li>
  <li><strong>BPMN 2.0 Parity</strong> - Supports all standard BPMN elements</li>
  <li><strong>Automatic Layout</strong> - Generates diagram coordinates automatically</li>
  <li><strong>Multiple Outputs</strong> - Export to BPMN XML or JSON</li>
  <li><strong>CLI Tool</strong> - Compile, watch, and validate from command line</li>
  <li><strong>TypeScript API</strong> - Use programmatically in Node.js</li>
</ul>

<h2>Supported Elements</h2>

<table>
  <thead>
    <tr><th>Category</th><th>Elements</th></tr>
  </thead>
  <tbody>
    <tr><td>Events</td><td>Start, End, Intermediate (Catch/Throw), Boundary</td></tr>
    <tr><td>Tasks</td><td>User, Service, Script, Send, Receive, Manual, Business Rule</td></tr>
    <tr><td>Gateways</td><td>Exclusive, Parallel, Inclusive, Event-Based, Complex</td></tr>
    <tr><td>Containers</td><td>Process, Pool, Lane, Subprocess</td></tr>
    <tr><td>Flows</td><td>Sequence Flow, Message Flow</td></tr>
    <tr><td>Data</td><td>Data Object, Data Store</td></tr>
    <tr><td>Artifacts</td><td>Text Annotation, Group</td></tr>
  </tbody>
</table>

<h2>Next Steps</h2>

<ul>
  <li><a href="{base}/guide/getting-started">Getting Started</a> - Install and create your first process</li>
  <li><a href="{base}/guide/cli">CLI Usage</a> - Learn the command-line interface</li>
  <li><a href="{base}/reference/syntax">Syntax Reference</a> - Complete syntax documentation</li>
</ul>
