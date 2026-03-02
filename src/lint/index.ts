import { BpmnModdle } from 'bpmn-moddle';

// Type definitions for bpmnlint (no official types available)
interface LintReport {
  id: string;
  message: string;
  category: 'error' | 'warn' | 'off';
}

export interface LinterConfig {
  extends?: string | string[];
  rules?: Record<string, 'error' | 'warn' | 'off' | 0 | 1 | 2>;
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
 * Recommended config using bpmnlint's built-in recommended ruleset
 */
export const recommendedConfig: LinterConfig = {
  extends: 'bpmnlint:recommended',
};

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
    // bpmnlint's JSDoc Config type requires non-optional rules; ours is wider
    config: config as { rules: Record<string, string | number> },
    resolver,
  });

  // Run linting
  const reports = await linter.lint(rootElement);

  // Transform reports to our result format
  // bpmnlint returns { [ruleId]: Array<{ id: elementId, message, category }> }
  const results: LintResult[] = [];

  for (const [ruleId, ruleReports] of Object.entries(reports)) {
    for (const report of ruleReports as LintReport[]) {
      if (report.category === 'off') continue;

      results.push({
        id: report.id,
        message: report.message,
        category: report.category as 'error' | 'warn',
        rule: ruleId,
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
