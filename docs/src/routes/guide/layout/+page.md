# Layout

BPMN-TXT automatically generates diagram layouts using the ELK.js graph layout library.

## Automatic Layout

By default, `bpmn-txt compile` generates optimal positions for all elements:

```bash
bpmn-txt compile process.bpmn.md
```

The generated BPMN XML includes complete BPMNDI information:
- `BPMNShape` elements with `Bounds` (x, y, width, height)
- `BPMNEdge` elements with waypoints

## Layout Direction

Control the flow direction with the `-d` option:

```bash
# Left to right (default)
bpmn-txt compile process.bpmn.md -d RIGHT

# Top to bottom
bpmn-txt compile process.bpmn.md -d DOWN

# Right to left
bpmn-txt compile process.bpmn.md -d LEFT

# Bottom to top
bpmn-txt compile process.bpmn.md -d UP
```

## Disabling Auto-Layout

To skip automatic layout generation:

```bash
bpmn-txt compile process.bpmn.md --no-layout
```

This creates BPMN XML with default coordinates (0,0 for all elements).

## Programmatic Layout Options

When using the TypeScript API:

```typescript
import { toBpmnXmlAsync } from 'bpmn-txt';

const xml = await toBpmnXmlAsync(document, {
  layoutOptions: {
    direction: 'DOWN',      // RIGHT, LEFT, DOWN, UP
    nodeSpacing: 50,        // Space between nodes
    layerSpacing: 100,      // Space between layers
    edgeSpacing: 20,        // Space between edges
  }
});
```

### Layout Options

| Option | Default | Description |
|--------|---------|-------------|
| `direction` | `'RIGHT'` | Flow direction |
| `nodeSpacing` | `50` | Horizontal space between nodes |
| `layerSpacing` | `100` | Vertical space between layers |
| `edgeSpacing` | `20` | Space between parallel edges |

## Element Sizes

Default sizes for BPMN elements:

| Element | Width | Height |
|---------|-------|--------|
| Start/End Event | 36 | 36 |
| Intermediate Event | 36 | 36 |
| Task | 100 | 80 |
| Subprocess | 200 | 150 |
| Gateway | 50 | 50 |
| Data Object | 36 | 50 |
| Data Store | 50 | 50 |

## Layout Algorithm

BPMN-TXT uses ELK's **layered** algorithm with:
- **BRANDES_KOEPF** node placement (minimizes edge crossings)
- **ORTHOGONAL** edge routing (horizontal/vertical lines only)

This produces clean, readable diagrams similar to those created by visual BPMN editors.

## Tips for Better Layouts

1. **Linear processes** work best with `RIGHT` direction
2. **Tall processes** with many parallel paths work better with `DOWN`
3. **Complex processes** may benefit from subprocesses to reduce visual complexity
4. **Gateways with many branches** are laid out automatically

## Viewing Generated Diagrams

The generated BPMN XML can be viewed in:

- [bpmn.io](https://demo.bpmn.io/) - Online viewer/editor
- [Camunda Modeler](https://camunda.com/download/modeler/) - Desktop app
- [Flowable Designer](https://www.flowable.org/) - Eclipse plugin

```bash
# Generate and open in default browser
bpmn-txt compile process.bpmn.md
open process.bpmn  # macOS
xdg-open process.bpmn  # Linux
```
