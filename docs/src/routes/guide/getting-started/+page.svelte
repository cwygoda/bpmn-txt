<script lang="ts">
  import { base } from '$app/paths';
</script>

<h1>Getting Started</h1>

<h2>Installation</h2>

<h3>Global Installation (Recommended)</h3>

<pre><code class="language-bash">npm install -g bpmn-txt
# or
pnpm add -g bpmn-txt</code></pre>

<h3>Local Installation</h3>

<pre><code class="language-bash">npm install bpmn-txt
# or
pnpm add bpmn-txt</code></pre>

<h2>Your First Process</h2>

<p>Create a file named <code>hello.bpmn.md</code>:</p>

<pre><code class="language-yaml">process: hello-world
  name: "Hello World"

  start: begin
    name: "Start"

  task: greet
    name: "Say Hello"
    type: user

  end: finish
    name: "End"

  flow: f1
    from: begin
    to: greet

  flow: f2
    from: greet
    to: finish</code></pre>

<h2>Compile to BPMN</h2>

<pre><code class="language-bash">bpmn-txt compile hello.bpmn.md</code></pre>

<p>This creates <code>hello.bpmn</code> with full BPMN 2.0 XML including diagram layout.</p>

<h2>Validate Without Compiling</h2>

<pre><code class="language-bash">bpmn-txt validate hello.bpmn.md</code></pre>

<p>Output:</p>
<pre><code>✓ hello.bpmn.md is valid</code></pre>

<h2>Watch Mode</h2>

<p>For development, use watch mode to recompile on changes:</p>

<pre><code class="language-bash">bpmn-txt watch hello.bpmn.md</code></pre>

<h2>Output Formats</h2>

<h3>BPMN XML (Default)</h3>

<pre><code class="language-bash">bpmn-txt compile hello.bpmn.md -o process.bpmn</code></pre>

<h3>JSON</h3>

<pre><code class="language-bash">bpmn-txt compile hello.bpmn.md -f json -o process.json</code></pre>

<h2>Layout Options</h2>

<p>Control the automatic layout direction:</p>

<pre><code class="language-bash"># Left to right (default)
bpmn-txt compile hello.bpmn.md -d RIGHT

# Top to bottom
bpmn-txt compile hello.bpmn.md -d DOWN

# Disable auto-layout
bpmn-txt compile hello.bpmn.md --no-layout</code></pre>

<h2>Programmatic Usage</h2>

<pre><code class="language-typescript">import {'{'} parse, validate, toBpmnXmlAsync {'}'} from 'bpmn-txt';
import {'{'} readFileSync {'}'} from 'fs';

const content = readFileSync('hello.bpmn.md', 'utf-8');

// Parse
const {'{'} document, errors {'}'} = parse(content);
if (errors.length &gt; 0) {'{'}
  console.error('Parse errors:', errors);
  process.exit(1);
{'}'}

// Validate
const {'{'} errors: validationErrors {'}'} = validate(document);
if (validationErrors.length &gt; 0) {'{'}
  console.error('Validation errors:', validationErrors);
  process.exit(1);
{'}'}

// Generate BPMN XML with layout
const xml = await toBpmnXmlAsync(document, {'{'}
  layoutOptions: {'{'} direction: 'RIGHT' {'}'}
{'}'});

console.log(xml);</code></pre>

<h2>Next Steps</h2>

<ul>
  <li><a href="{base}/guide/cli">CLI Reference</a> - Full CLI documentation</li>
  <li><a href="{base}/guide/processes">Processes &amp; Pools</a> - Learn about process structure</li>
  <li><a href="{base}/guide/tasks-events">Tasks &amp; Events</a> - Define activities and events</li>
</ul>
