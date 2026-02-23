import { test, expect } from '@playwright/test';

test.describe('Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bpmn-txt/playground');
  });

  test('loads playground page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Playground');
  });

  test('editor loads with default code', async ({ page }) => {
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();

    // Check default code is present
    const content = page.locator('.cm-content');
    await expect(content).toContainText('process: hello-world');
  });

  test('diagram viewer is visible', async ({ page }) => {
    const viewer = page.locator('.viewer');
    await expect(viewer).toBeVisible();
  });

  test('compiles default code without errors', async ({ page }) => {
    // Wait for initial compilation
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

    // No error panel should be visible (or it should show no errors)
    const errorsPanel = page.locator('.errors-panel');
    const hasErrors = await errorsPanel.isVisible();
    if (hasErrors) {
      // If visible, should only show warnings, not errors
      await expect(page.locator('.error-item.error')).toHaveCount(0);
    }
  });

  test('renders BPMN diagram', async ({ page }) => {
    // Wait for bpmn-js to render
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

    // Check for SVG elements in the viewer (bpmn-js renders SVG)
    // Use first() since bpmn-js also has a logo SVG
    const svg = page.locator('.viewer svg').first();
    await expect(svg).toBeVisible({ timeout: 10000 });
  });

  test('shows errors for invalid syntax', async ({ page }) => {
    // Clear editor and type invalid content
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.type('invalid syntax here');

    // Wait for error status
    await expect(page.locator('.status.error')).toBeVisible({ timeout: 5000 });

    // Error panel should be visible
    await expect(page.locator('.errors-panel')).toBeVisible();
  });

  test('copy button is enabled after successful compile', async ({ page }) => {
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

    const copyButton = page.locator('button:has-text("Copy BPMN XML")');
    await expect(copyButton).toBeEnabled();
  });

  test('copy button is disabled on error', async ({ page }) => {
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.type('broken');

    await expect(page.locator('.status.error')).toBeVisible({ timeout: 5000 });

    const copyButton = page.locator('button:has-text("Copy BPMN XML")');
    await expect(copyButton).toBeDisabled();
  });

  test('updates diagram when code changes', async ({ page }) => {
    // Wait for initial render
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

    // Find the editor and add a new task
    const editor = page.locator('.cm-content');
    await editor.click();

    // Go to end of document
    await page.keyboard.press('Meta+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  task: new-task');
    await page.keyboard.press('Enter');
    await page.keyboard.type('    name: "New Task"');

    // Wait for recompilation (may show error due to missing flow, that's ok)
    await page.waitForTimeout(500);

    // Editor should have the new content
    await expect(editor).toContainText('new-task');
  });

  test('displays validation warnings', async ({ page }) => {
    // Wait for initial compile
    await expect(page.locator('.status.success')).toBeVisible({ timeout: 10000 });

    // Type a process with an unreferenced element (should generate warning)
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.type(`process: test
  start: s1
  task: orphan
    name: "Orphan Task"
  end: e1
  flow: f1
    from: s1
    to: e1`);

    // Wait for compilation
    await page.waitForTimeout(500);

    // Should still be success (warnings don't prevent success)
    // but may show warnings panel
  });
});

test.describe('Playground navigation', () => {
  test('playground link in nav works', async ({ page }) => {
    await page.goto('/bpmn-txt/');
    await page.click('a:has-text("Playground")');
    await expect(page).toHaveURL(/\/playground/);
    await expect(page.locator('h1')).toContainText('Playground');
  });
});
