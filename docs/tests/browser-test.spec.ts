import { test, expect } from '@playwright/test';

test('parse simple valid code', async ({ page }) => {
  await page.goto('/bpmn-txt/playground');
  await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

  // Wait for __bpmnTxt to be defined
  await page.waitForFunction(() => (window as any).__bpmnTxt !== undefined, { timeout: 10000 });

  const code = `process: hello-world
  name: "Hello World"

  start: begin
    name: "Start"
`;

  const result = await page.evaluate((c) => {
    const { parse } = (window as any).__bpmnTxt;
    return { errors: parse(c).errors, doc: !!parse(c).document };
  }, code);

  console.log('Valid code result:', JSON.stringify(result, null, 2));
  expect(result.errors).toHaveLength(0);
});

test('reject flow nested inside end', async ({ page }) => {
  await page.goto('/bpmn-txt/playground');
  await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });
  await page.waitForFunction(() => (window as any).__bpmnTxt !== undefined, { timeout: 10000 });

  const code = `process: hello-world
  name: "Hello World"

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
    return { errors: parse(c).errors, doc: !!parse(c).document };
  }, code);

  console.log('Invalid code result:', JSON.stringify(result, null, 2));
  expect(result.errors.length).toBeGreaterThan(0);
});
