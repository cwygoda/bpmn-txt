import { BpmnModdle } from 'bpmn-moddle';

// Type definitions for bpmnlint (no official types available)
interface LintReport {
  id: string;
  message: string;
  category: 'error' | 'warn' | 'off';
}

interface LinterConfig {
  rules: Record<string, 'error' | 'warn' | 'off' | 0 | 1 | 2>;
}

interface ModdleElement {
  $type: string;
  id?: string;
  [key: string]: unknown;
}

export interface LintResult {
  id: string;
  message: string;
  category: 'error' | 'warn';
  rule: string;
}

/**
 * Default linting configuration with recommended rules
 */
export const defaultConfig: LinterConfig = {
  rules: {
    'label-required': 'warn',
    'start-event-required': 'error',
    'end-event-required': 'error',
    'no-disconnected': 'error',
    'no-implicit-split': 'warn',
    'no-inclusive-gateway': 'warn',
  },
};

/**
 * Lint BPMN XML using bpmnlint
 *
 * @param xml - BPMN 2.0 XML string
 * @param config - Optional lint configuration (uses defaultConfig if not provided)
 * @returns Array of lint issues found
 */
export async function lint(
  xml: string,
  config: LinterConfig = defaultConfig
): Promise<LintResult[]> {
  // Parse BPMN XML to moddle
  const moddle = BpmnModdle();
  const { rootElement } = await moddle.fromXML(xml);

  // Dynamically import bpmnlint (CommonJS module)
  const Linter = (await import('bpmnlint/lib/linter.js')).default;
  const NodeResolver = (await import('bpmnlint/lib/resolver/node-resolver.js')).default;

  const resolver = new NodeResolver();
  const linter = new Linter({
    config,
    resolver,
  });

  // Run linting
  const reports = await linter.lint(rootElement);

  // Transform reports to our result format
  const results: LintResult[] = [];

  for (const [elementId, elementReports] of Object.entries(reports)) {
    for (const report of elementReports as LintReport[]) {
      if (report.category === 'off') continue;

      results.push({
        id: elementId,
        message: report.message,
        category: report.category as 'error' | 'warn',
        rule: (report as { rule?: string }).rule || 'unknown',
      });
    }
  }

  return results;
}

/**
 * Create a custom lint configuration
 */
export function createConfig(
  rules: Record<string, 'error' | 'warn' | 'off'>
): LinterConfig {
  return { rules };
}
