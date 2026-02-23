# Fix Tasks

Issues identified in code review. Ordered by priority.

---

## Phase A: Core DSL Fixes

### A1. Implement Inline Flow Resolution

**Problem**: `-> target` syntax parses but doesn't produce SequenceFlow objects.

**Files**:
- `src/parser/visitor.ts` - `inlineFlow()` returns result but it's ignored
- `src/parser/index.ts` - needs post-processing step

**Implementation**:
1. Track `currentElementId` when visiting flow elements
2. Collect inline flows during visit: `{ from: currentElementId, to, condition?, name? }`
3. After visiting, append collected flows to appropriate container (lane/pool/process)
4. Generate flow IDs: `flow_${from}_${to}` or auto-increment

**Tests**:
```typescript
it('resolves inline flow to sequence flow', () => {
  const input = `process: test
  start: begin
    -> do-work
  task: do-work
    -> finish
  end: finish
`;
  const { document } = parse(input);
  expect(document.processes[0].sequenceFlows).toHaveLength(2);
  expect(document.processes[0].sequenceFlows[0].from).toBe('begin');
  expect(document.processes[0].sequenceFlows[0].to).toBe('do-work');
});

it('resolves inline flow with condition', () => {
  const input = `process: test
  gateway: check
    -> yes-path {condition: "approved == true"}
    -> no-path {condition: "approved == false"}
`;
  const { document } = parse(input);
  const flows = document.processes[0].sequenceFlows;
  expect(flows[0].condition).toBe('approved == true');
});
```

---

### A2. Implement Data Association Resolution

**Problem**: `<- input` and `=> output` syntax parses but source/target not resolved.

**Files**:
- `src/parser/visitor.ts` - `dataAssociation()` leaves placeholders

**Implementation**:
1. Track current task ID when visiting tasks
2. For `<- dataId`: create DataInputAssociation with source=dataId, target=currentTaskId
3. For `=> dataId`: create DataOutputAssociation with source=currentTaskId, target=dataId
4. Attach to task's `dataInputAssociations` / `dataOutputAssociations` arrays

**Tests**:
```typescript
it('resolves input data association', () => {
  const input = `process: test
  data-object: invoice
  task: process-invoice
    <- invoice
`;
  const { document } = parse(input);
  const task = document.processes[0].elements[1];
  expect(task.dataInputAssociations).toHaveLength(1);
  expect(task.dataInputAssociations[0].source).toBe('invoice');
});
```

---

### A3. Implement Multiline String Parsing

**Problem**: `multilineString()` visitor returns empty string.

**Files**:
- `src/parser/visitor.ts` - `multilineString()`
- `src/lexer/index.ts` - may need to preserve indented continuation lines

**Implementation**:
1. After `|` token, collect subsequent lines at deeper indent level
2. Join with newlines, dedent to common baseline
3. Return concatenated string

**Affected attributes**: `documentation:`, `script:`, `text:`

**Tests**:
```typescript
it('parses multiline documentation', () => {
  const input = `process: test
  documentation: |
    This is line 1.
    This is line 2.
  task: work
`;
  const { document } = parse(input);
  expect(document.processes[0].documentation).toBe('This is line 1.\nThis is line 2.');
});

it('parses multiline script', () => {
  const input = `process: test
  task: compute
    type: script
    scriptFormat: javascript
    script: |
      const x = 1;
      return x + 2;
`;
  const { document } = parse(input);
  const task = document.processes[0].elements[0];
  expect(task.script).toContain('const x = 1;');
});
```

---

## Phase B: Robustness Fixes

### B1. Gateway Type Default in XML Export

**Problem**: `gatewayType` undefined causes `tag` to be undefined.

**File**: `src/generators/bpmn-xml.ts:608-625`

**Fix**:
```typescript
function buildGateway(gateway: Gateway): { tag: string; element: Record<string, unknown> } {
  const tagMap: Record<string, string> = { ... };
  const tag = tagMap[gateway.gatewayType] ?? 'bpmn:exclusiveGateway';  // Add default
  // ...
}
```

**Test**:
```typescript
it('defaults undefined gateway type to exclusive', () => {
  const doc = { processes: [{ id: 'p1', elements: [{ type: 'gateway', id: 'g1' }] }] };
  const xml = toBpmnXml(doc);
  expect(xml).toContain('bpmn:exclusiveGateway');
});
```

---

### B2. Add Location to Unresolved Reference Errors

**Problem**: Unresolved ref errors lack `loc`, hard to find in large files.

**File**: `src/validator/index.ts`

**Implementation**:
1. When collecting `referencedIds`, also store the location where reference was made
2. Change from `Set<string>` to `Map<string, SourceSpan[]>` (multiple refs possible)
3. Include first occurrence location in error

**Fix**:
```typescript
// Change signature
const referencedIds = new Map<string, SourceSpan | undefined>();

// When adding reference (e.g., in validateSequenceFlow)
referencedIds.set(flow.to, flow.loc);

// When reporting error
const refLoc = referencedIds.get(refId);
errors.push({
  code: 'UNRESOLVED_REFERENCE',
  message: `Reference to undefined element: ${refId}`,
  severity: 'error',
  loc: refLoc,
});
```

---

## Phase C: Test Infrastructure

### C1. Add Invalid Fixture Tests

**Structure**:
```
fixtures/
└── invalid/
    ├── missing-process-id.bpmn.txt      # process without id
    ├── duplicate-id.bpmn.txt            # same id used twice
    ├── unresolved-ref.bpmn.txt          # flow to nonexistent target
    ├── missing-called-element.bpmn.txt  # call activity without calledElement
    ├── bad-indentation.bpmn.txt         # wrong indent level
    └── unknown-keyword.bpmn.txt         # invalid element type
```

**Test file**: `tests/invalid-fixtures.test.ts`
```typescript
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from '../src/parser/index.js';
import { validate } from '../src/validator/index.js';

const INVALID_DIR = join(__dirname, '../fixtures/invalid');

describe('Invalid fixtures', () => {
  const files = readdirSync(INVALID_DIR).filter(f => f.endsWith('.bpmn.txt'));

  for (const file of files) {
    it(`rejects ${file}`, () => {
      const content = readFileSync(join(INVALID_DIR, file), 'utf-8');
      const { document, errors: parseErrors } = parse(content);

      if (parseErrors.length > 0) {
        expect(parseErrors.length).toBeGreaterThan(0);
        return;
      }

      const { errors: validationErrors } = validate(document!);
      expect(validationErrors.length).toBeGreaterThan(0);
    });
  }
});
```

---

### C2. Add BPMN 2.0 XSD Validation

**Files**:
- `schemas/BPMN20.xsd` - download from OMG
- `schemas/BPMNDI.xsd`
- `schemas/DC.xsd`
- `schemas/DI.xsd`

**Source**: https://www.omg.org/spec/BPMN/2.0.2/

**Implementation**:
1. Add `libxmljs2` or use CLI `xmllint` in tests
2. Create validation helper

**Test file**: `tests/xsd-validation.test.ts`
```typescript
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { toBpmnXmlAsync } from '../src/generators/bpmn-xml.js';

describe('XSD Validation', () => {
  it('generates valid BPMN 2.0 XML', async () => {
    const doc = { processes: [{ id: 'p1', elements: [...] }] };
    const xml = await toBpmnXmlAsync(doc);

    const tmpFile = '/tmp/test-output.bpmn';
    writeFileSync(tmpFile, xml);

    try {
      execSync(`xmllint --noout --schema schemas/BPMN20.xsd ${tmpFile}`);
    } finally {
      unlinkSync(tmpFile);
    }
  });
});
```

**npm script**:
```json
"test:xsd": "vitest run tests/xsd-validation.test.ts"
```

---

## Phase D: Documentation

### D1. Add EBNF Grammar Documentation

**File**: `docs/src/routes/reference/grammar/+page.md`

**Content outline**:
```markdown
# Formal Grammar

BPMN-TXT uses an indentation-based syntax similar to YAML.

## EBNF

\`\`\`ebnf
document     = { process } [ globalLayout ] ;
process      = "process:" identifier NEWLINE INDENT processBody DEDENT ;
processBody  = { attribute | pool | flowElement | flow | artifact } ;

pool         = "pool:" identifier NEWLINE INDENT poolBody DEDENT ;
poolBody     = { attribute | lane | flowElement | flow } ;

lane         = "lane:" identifier NEWLINE INDENT laneBody DEDENT ;
laneBody     = { attribute | flowElement | flow } ;

flowElement  = startEvent | endEvent | event | task | subprocess | call | gateway | dataObject | dataStore ;

startEvent   = "start:" identifier NEWLINE INDENT { eventAttr | inlineFlow } DEDENT ;
endEvent     = "end:" identifier NEWLINE INDENT { eventAttr } DEDENT ;
task         = "task:" identifier NEWLINE INDENT { taskAttr | boundaryEvent | inlineFlow | dataAssoc } DEDENT ;
gateway      = "gateway:" identifier NEWLINE INDENT { gatewayAttr | inlineFlow } DEDENT ;

inlineFlow   = "->" identifier [ inlineAttrs ] NEWLINE ;
flow         = "flow:" identifier NEWLINE INDENT flowAttrs DEDENT ;

inlineAttrs  = "{" [ attr { "," attr } ] "}" ;
attr         = identifier ":" value ;
value        = string | number | boolean | identifier ;

identifier   = /[a-zA-Z_][a-zA-Z0-9_-]*/ ;
string       = /"[^"]*"/ | /[a-zA-Z_][a-zA-Z0-9_-]*/ ;
\`\`\`

## Indentation Rules

- 2 spaces per level (mandatory)
- Tabs not allowed
- Blank lines ignored
- Comments start with `#`
```

---

## Phase E: bpmnlint Integration

### E1. Add bpmnlint as Optional Post-Process Step

**Goal**: Validate generated BPMN XML against bpmnlint rules (opt-in).

**Browser support**: Yes, via [bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint)

**Dependencies**:
```json
{
  "dependencies": {
    "bpmnlint": "^10.3.0",
    "bpmnlint-utils": "^1.1.1"
  },
  "devDependencies": {
    "bpmnlint-pack-config": "^0.6.0"
  }
}
```

**Files**:
- `src/lint/index.ts` - linting API
- `src/lint/config.ts` - default rules
- `.bpmnlintrc` - config file

**Implementation**:
```typescript
// src/lint/index.ts
import Linter from 'bpmnlint/lib/linter';
import { readModdle } from 'bpmnlint-utils';

export interface LintResult {
  id: string;
  message: string;
  category: 'error' | 'warn';
  rule: string;
}

export async function lint(xml: string, config?: object): Promise<LintResult[]> {
  const moddleRoot = await readModdle(xml);
  const linter = new Linter({ config: config ?? defaultConfig });
  const reports = await linter.lint(moddleRoot);

  return Object.entries(reports).flatMap(([id, issues]) =>
    issues.map(issue => ({
      id,
      message: issue.message,
      category: issue.category,
      rule: issue.rule,
    }))
  );
}

export const defaultConfig = {
  rules: {
    'label-required': 'warn',
    'start-event-required': 'error',
    'end-event-required': 'error',
    'no-disconnected': 'error',
    'no-implicit-split': 'warn',
    'no-inclusive-gateway': 'warn',
  }
};
```

**CLI integration**:
```typescript
// In cli.ts compile command
.option('--lint', 'Run bpmnlint on output')

if (options.lint) {
  const { lint } = await import('./lint/index.js');
  const results = await lint(xml);
  for (const r of results) {
    console.log(`${r.category}: [${r.rule}] ${r.id}: ${r.message}`);
  }
}
```

**Browser usage** (playground):
```typescript
import Linter from 'bpmnlint/lib/linter';
import packedConfig from './packed-config';  // Generated by bpmnlint-pack-config

const linter = new Linter({ config: packedConfig });
const results = await linter.lint(moddleRoot);
```

**Build step for browser config**:
```json
"scripts": {
  "lint:pack-config": "bpmnlint-pack-config -c .bpmnlintrc -o docs/src/lib/packed-config.js"
}
```

---

## Task Summary

| Phase | Task | Priority | Effort |
|-------|------|----------|--------|
| A | ~~A1. Inline flow resolution~~ | ✅ Done | Medium |
| A | ~~A2. Data association resolution~~ | ✅ Done | Small |
| A | ~~A3. Multiline string parsing~~ | ✅ Done | Medium |
| B | ~~B1. Gateway type default~~ | ✅ Done | Trivial |
| B | ~~B2. Unresolved ref locations~~ | ✅ Done | Small |
| C | C1. Invalid fixtures | Medium | Small |
| C | C2. XSD validation | Low | Medium |
| D | D1. EBNF grammar docs | Low | Small |
| E | E1. bpmnlint integration | Low | Medium |

**Recommended order**: B1 → A1 → B2 → A2 → A3 → C1 → C2 → D1 → E1
