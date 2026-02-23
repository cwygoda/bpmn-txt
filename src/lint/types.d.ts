declare module 'bpmn-moddle' {
  interface ModdleElement {
    $type: string;
    id?: string;
    [key: string]: unknown;
  }

  interface FromXMLResult {
    rootElement: ModdleElement;
    warnings?: Array<{ message: string }>;
  }

  export function BpmnModdle(): {
    fromXML(xml: string): Promise<FromXMLResult>;
  };
}

declare module 'bpmnlint/lib/linter.js' {
  interface LintReport {
    id: string;
    message: string;
    category: string;
    rule?: string;
  }

  interface LinterConfig {
    rules: Record<string, string | number>;
  }

  interface LinterOptions {
    config?: LinterConfig;
    resolver: unknown;
  }

  export default class Linter {
    constructor(options: LinterOptions);
    lint(rootElement: unknown): Promise<Record<string, LintReport[]>>;
  }
}

declare module 'bpmnlint/lib/resolver/node-resolver.js' {
  export default class NodeResolver {
    constructor(options?: Record<string, unknown>);
  }
}
