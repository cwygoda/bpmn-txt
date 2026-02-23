import { test, expect } from '@playwright/test';

/**
 * Comprehensive browser-based parser tests.
 * Tests run in a real browser via the playground page.
 */

test.describe('Parser - Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bpmn-txt/playground');
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });
    await page.waitForFunction(() => (window as any).__bpmnTxt !== undefined, { timeout: 10000 });
  });

  test.describe('Valid syntax', () => {
    test('parses minimal process', async ({ page }) => {
      const code = `process: minimal
  name: "Minimal Process"

  start: s
  end: e
  flow: f
    from: s
    to: e
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        const r = parse(c);
        return { errors: r.errors, hasDoc: !!r.document };
      }, code);

      expect(result.errors).toHaveLength(0);
      expect(result.hasDoc).toBe(true);
    });

    test('parses process with task', async ({ page }) => {
      const code = `process: with-task
  name: "Process With Task"

  start: begin
    name: "Start"

  task: do-something
    name: "Do Something"
    type: user

  end: finish
    name: "End"

  flow: f1
    from: begin
    to: do-something

  flow: f2
    from: do-something
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });

    test('parses process with gateway', async ({ page }) => {
      const code = `process: with-gateway
  name: "Process With Gateway"

  start: begin

  gateway: decision
    name: "Yes or No?"
    type: exclusive

  task: yes-path
    name: "Yes Path"

  task: no-path
    name: "No Path"

  gateway: merge
    type: exclusive

  end: finish

  flow: f1
    from: begin
    to: decision

  flow: f2
    from: decision
    to: yes-path
    condition: "approved"

  flow: f3
    from: decision
    to: no-path

  flow: f4
    from: yes-path
    to: merge

  flow: f5
    from: no-path
    to: merge

  flow: f6
    from: merge
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });

    test('parses process with subprocess', async ({ page }) => {
      const code = `process: with-subprocess
  name: "Process With Subprocess"

  start: begin

  subprocess: inner
    name: "Inner Process"
    triggered: false

    start: inner-start
    task: inner-task
      name: "Inner Task"
    end: inner-end

    flow: if1
      from: inner-start
      to: inner-task
    flow: if2
      from: inner-task
      to: inner-end

  end: finish

  flow: f1
    from: begin
    to: inner

  flow: f2
    from: inner
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });

    test('parses process with boundary event', async ({ page }) => {
      const code = `process: with-boundary
  name: "Process With Boundary Event"

  start: begin

  task: work
    name: "Do Work"
    type: user

    boundary: timeout
      name: "Timeout"
      trigger: timer
      timer: "PT1H"

  end: finish
  end: timeout-end

  flow: f1
    from: begin
    to: work

  flow: f2
    from: work
    to: finish

  flow: f3
    from: timeout
    to: timeout-end
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });

    test('parses flow at process level (correct indentation)', async ({ page }) => {
      const code = `process: correct-indent
  name: "Correct Indentation"

  start: begin
  task: work
    name: "Do Work"
  end: finish

  flow: f1
    from: begin
    to: work

  flow: f2
    from: work
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });
  });

  test.describe('Indentation errors (regression tests)', () => {
    test('rejects flow nested inside task', async ({ page }) => {
      const code = `process: bad-indent
  name: "Bad Indentation"

  start: begin

  task: greet
    name: "Say Hello"

    flow: f1
    from: begin
    to: greet

  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('flow');
    });

    test('rejects flow nested inside end event', async ({ page }) => {
      const code = `process: bad-indent
  name: "Bad Indentation"

  start: begin
    name: "Start"

  end: finish
    name: "End"

    flow: f1
    from: begin
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects flow nested inside start event', async ({ page }) => {
      const code = `process: bad-indent
  name: "Bad Indentation"

  start: begin
    name: "Start"

    flow: f1
    from: begin
    to: finish

  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects flow nested inside gateway', async ({ page }) => {
      const code = `process: bad-indent
  name: "Bad Indentation"

  start: begin

  gateway: decide
    name: "Decision"
    type: exclusive

    flow: f1
    from: begin
    to: decide

  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects task nested inside another task', async ({ page }) => {
      const code = `process: bad-nesting
  name: "Bad Nesting"

  start: begin

  task: outer
    name: "Outer Task"

    task: inner
    name: "Inner Task"

  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects deeply nested flow (3 levels)', async ({ page }) => {
      const code = `process: deep-nest
  name: "Deep Nesting"

  start: begin

  task: t1
    name: "Task 1"
    type: user

      flow: bad
      from: begin
      to: t1

  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Syntax errors', () => {
    test('rejects missing process declaration', async ({ page }) => {
      const code = `start: begin
end: finish
flow: f
  from: begin
  to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects process without id', async ({ page }) => {
      const code = `process:
  name: "No ID"
  start: begin
  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects invalid keyword', async ({ page }) => {
      const code = `process: test
  name: "Test"

  startt: begin
  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects unclosed string', async ({ page }) => {
      const code = `process: test
  name: "Unclosed string

  start: begin
  end: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Edge cases', () => {
    test('handles empty input gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parse } = (window as any).__bpmnTxt;
        const r = parse('');
        return { errors: r.errors, hasDoc: !!r.document };
      });

      // Parser returns empty document with no errors
      expect(result.hasDoc).toBe(true);
    });

    test('handles whitespace only gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parse } = (window as any).__bpmnTxt;
        const r = parse('   \n\n   \n');
        return { errors: r.errors, hasDoc: !!r.document };
      });

      // Parser returns empty document with no errors
      expect(result.hasDoc).toBe(true);
    });

    test('handles single newline gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parse } = (window as any).__bpmnTxt;
        const r = parse('\n');
        return { errors: r.errors, hasDoc: !!r.document };
      });

      // Parser returns empty document with no errors
      expect(result.hasDoc).toBe(true);
    });

    test('rejects tabs for indentation', async ({ page }) => {
      const code = `process: tabs
\tname: "Tabs"

\tstart: begin
\tend: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      // Tabs are not supported - spaces only
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('handles mixed content with comments', async ({ page }) => {
      const code = `# This is a comment
process: with-comments
  name: "With Comments"
  # Another comment

  start: begin
  # Comment before end
  end: finish

  flow: f
    from: begin
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });

    test('handles trailing whitespace', async ({ page }) => {
      const code = `process: trailing
  name: "Trailing Whitespace"

  start: begin
  end: finish
  flow: f
    from: begin
    to: finish
`;
      const result = await page.evaluate((c) => {
        const { parse } = (window as any).__bpmnTxt;
        return { errors: parse(c).errors };
      }, code);

      expect(result.errors).toHaveLength(0);
    });
  });
});

test.describe('Validator - Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bpmn-txt/playground');
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });
    await page.waitForFunction(() => (window as any).__bpmnTxt !== undefined, { timeout: 10000 });
  });

  test('validates missing flow target', async ({ page }) => {
    const code = `process: missing-target
  name: "Missing Target"

  start: begin
  end: finish

  flow: f
    from: begin
    to: nonexistent
`;
    const result = await page.evaluate((c) => {
      const { parse, validate } = (window as any).__bpmnTxt;
      const parsed = parse(c);
      if (parsed.errors.length > 0) return { parseErrors: parsed.errors, validationErrors: [] };
      const validated = validate(parsed.document);
      return { parseErrors: [], validationErrors: validated.errors };
    }, code);

    expect(result.parseErrors).toHaveLength(0);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  test('validates missing flow source', async ({ page }) => {
    const code = `process: missing-source
  name: "Missing Source"

  start: begin
  end: finish

  flow: f
    from: nonexistent
    to: finish
`;
    const result = await page.evaluate((c) => {
      const { parse, validate } = (window as any).__bpmnTxt;
      const parsed = parse(c);
      if (parsed.errors.length > 0) return { parseErrors: parsed.errors, validationErrors: [] };
      const validated = validate(parsed.document);
      return { parseErrors: [], validationErrors: validated.errors };
    }, code);

    expect(result.parseErrors).toHaveLength(0);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  test('validates duplicate element ids', async ({ page }) => {
    const code = `process: duplicates
  name: "Duplicate IDs"

  start: same-id
  end: same-id

  flow: f
    from: same-id
    to: same-id
`;
    const result = await page.evaluate((c) => {
      const { parse, validate } = (window as any).__bpmnTxt;
      const parsed = parse(c);
      if (parsed.errors.length > 0) return { parseErrors: parsed.errors, validationErrors: [] };
      const validated = validate(parsed.document);
      return { parseErrors: [], validationErrors: validated.errors };
    }, code);

    expect(result.parseErrors).toHaveLength(0);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });
});
