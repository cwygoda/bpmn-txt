import type { CstNode, IToken } from 'chevrotain';
import { parser } from './parser.js';
import type {
  Document,
  Process,
  Pool,
  Lane,
  FlowNode,
  StartEvent,
  IntermediateEvent,
  EndEvent,
  BoundaryEvent,
  Task,
  Subprocess,
  CallActivity,
  Gateway,
  DataObject,
  DataStore,
  SequenceFlow,
  MessageFlow,
  DataAssociation,
  Annotation,
  Group,
  Layout,
  FlowLayout,
  SourceSpan,
  GatewayType,
  TaskType,
  StartTrigger,
  IntermediateTrigger,
  EndTrigger,
  BoundaryTrigger,
} from '../ast/types.js';

const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

// Helper to extract token image
function img(token: IToken | IToken[] | undefined): string {
  if (!token) return '';
  const t = Array.isArray(token) ? token[0] : token;
  return t?.image ?? '';
}

// Helper to extract string value (remove quotes if present)
function str(token: IToken | IToken[] | undefined): string {
  const s = img(token);
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return s;
}

// Helper to extract location
function loc(token: IToken | undefined): SourceSpan | undefined {
  if (!token) return undefined;
  return {
    start: {
      line: token.startLine ?? 0,
      column: token.startColumn ?? 0,
      offset: token.startOffset,
    },
    end: {
      line: token.endLine ?? 0,
      column: token.endColumn ?? 0,
      offset: token.endOffset ?? token.startOffset,
    },
  };
}

interface CstChildren {
  [key: string]: CstNode[] | IToken[] | undefined;
}

export interface InlineFlowInfo {
  from: string;
  to: string;
  condition?: string;
  name?: string;
}

export class BpmnMdVisitor extends BaseCstVisitor {
  // Track current element for inline flow resolution
  private currentElementId: string | undefined;
  private collectedFlows: InlineFlowInfo[] = [];

  constructor() {
    super();
    this.validateVisitor();
  }

  /** Get collected inline flows (call after visiting) */
  getCollectedFlows(): InlineFlowInfo[] {
    return this.collectedFlows;
  }

  /** Reset state for new parse */
  reset(): void {
    this.currentElementId = undefined;
    this.collectedFlows = [];
  }

  /** Capture inline flows from element context */
  private captureInlineFlows(fromId: string, ctx: CstChildren): void {
    if (ctx.inlineFlow) {
      for (const flowNode of ctx.inlineFlow as CstNode[]) {
        const { to, attrs } = this.visit(flowNode) as { to: string; attrs: Record<string, unknown> };
        this.collectedFlows.push({
          from: fromId,
          to,
          condition: attrs.condition as string | undefined,
          name: attrs.name as string | undefined,
        });
      }
    }
  }

  document(ctx: CstChildren): Document {
    // Reset state for each document parse
    this.reset();

    const processes: Process[] = [];
    if (ctx.processDecl) {
      for (const node of ctx.processDecl as CstNode[]) {
        processes.push(this.visit(node));
      }
    }

    let globalLayout: Record<string, Layout | FlowLayout> | undefined;
    if (ctx.globalLayout) {
      globalLayout = this.visit(ctx.globalLayout[0] as CstNode);
    }

    return { processes, globalLayout };
  }

  processDecl(ctx: CstChildren): Process {
    const id = img(ctx.id as IToken[]);
    const process: Process = { id, executable: true };

    if (ctx.nameAttr) {
      process.name = this.visit(ctx.nameAttr[0] as CstNode);
    }
    if (ctx.executableAttr) {
      process.executable = this.visit(ctx.executableAttr[0] as CstNode);
    }
    if (ctx.documentationAttr) {
      process.documentation = this.visit(ctx.documentationAttr[0] as CstNode);
    }

    // Pools
    if (ctx.poolDecl) {
      process.pools = (ctx.poolDecl as CstNode[]).map((n) => this.visit(n));
    }

    // Direct flow elements
    if (ctx.flowElement) {
      process.elements = (ctx.flowElement as CstNode[]).map((n) => this.visit(n));
    }

    // Explicit sequence flows
    if (ctx.sequenceFlowDecl) {
      process.sequenceFlows = (ctx.sequenceFlowDecl as CstNode[]).map((n) => this.visit(n));
    }

    // Message flows
    if (ctx.messageFlowDecl) {
      process.messageFlows = (ctx.messageFlowDecl as CstNode[]).map((n) => this.visit(n));
    }

    // Annotations
    if (ctx.annotationDecl) {
      process.annotations = (ctx.annotationDecl as CstNode[]).map((n) => this.visit(n));
    }

    // Groups
    if (ctx.groupDecl) {
      process.groups = (ctx.groupDecl as CstNode[]).map((n) => this.visit(n));
    }

    return process;
  }

  poolDecl(ctx: CstChildren): Pool {
    const pool: Pool = {
      type: 'pool',
      id: img(ctx.id as IToken[]),
    };

    if (ctx.nameAttr) {
      pool.name = this.visit(ctx.nameAttr[0] as CstNode);
    }

    if (ctx.laneDecl) {
      pool.lanes = (ctx.laneDecl as CstNode[]).map((n) => this.visit(n));
    }

    if (ctx.flowElement) {
      pool.elements = (ctx.flowElement as CstNode[]).map((n) => this.visit(n));
    }

    if (ctx.sequenceFlowDecl) {
      pool.sequenceFlows = (ctx.sequenceFlowDecl as CstNode[]).map((n) => this.visit(n));
    }

    return pool;
  }

  laneDecl(ctx: CstChildren): Lane {
    const lane: Lane = {
      type: 'lane',
      id: img(ctx.id as IToken[]),
    };

    if (ctx.nameAttr) {
      lane.name = this.visit(ctx.nameAttr[0] as CstNode);
    }

    if (ctx.flowElement) {
      lane.elements = (ctx.flowElement as CstNode[]).map((n) => this.visit(n));
    }

    if (ctx.sequenceFlowDecl) {
      lane.sequenceFlows = (ctx.sequenceFlowDecl as CstNode[]).map((n) => this.visit(n));
    }

    return lane;
  }

  flowElement(ctx: CstChildren): FlowNode {
    if (ctx.startEvent) return this.visit(ctx.startEvent[0] as CstNode);
    if (ctx.intermediateEvent) return this.visit(ctx.intermediateEvent[0] as CstNode);
    if (ctx.endEvent) return this.visit(ctx.endEvent[0] as CstNode);
    if (ctx.taskDecl) return this.visit(ctx.taskDecl[0] as CstNode);
    if (ctx.subprocessDecl) return this.visit(ctx.subprocessDecl[0] as CstNode);
    if (ctx.callActivity) return this.visit(ctx.callActivity[0] as CstNode);
    if (ctx.gatewayDecl) return this.visit(ctx.gatewayDecl[0] as CstNode);
    if (ctx.dataObjectDecl) return this.visit(ctx.dataObjectDecl[0] as CstNode);
    if (ctx.dataStoreDecl) return this.visit(ctx.dataStoreDecl[0] as CstNode);
    throw new Error('Unknown flow element');
  }

  startEvent(ctx: CstChildren): StartEvent {
    const event: StartEvent = {
      type: 'startEvent',
      id: img(ctx.id as IToken[]),
      trigger: 'none',
    };

    if (ctx.nameAttr) event.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.triggerAttr) event.trigger = this.visit(ctx.triggerAttr[0] as CstNode) as StartTrigger;
    if (ctx.messageAttr) event.message = this.visit(ctx.messageAttr[0] as CstNode);
    if (ctx.timerAttr) event.timer = this.visit(ctx.timerAttr[0] as CstNode);
    if (ctx.signalAttr) event.signal = this.visit(ctx.signalAttr[0] as CstNode);
    if (ctx.conditionAttr) event.condition = this.visit(ctx.conditionAttr[0] as CstNode);

    // Capture inline flows
    this.captureInlineFlows(event.id!, ctx);

    return event;
  }

  intermediateEvent(ctx: CstChildren): IntermediateEvent {
    const event: IntermediateEvent = {
      type: 'intermediateEvent',
      id: img(ctx.id as IToken[]),
      trigger: 'message',
      eventType: 'catch',
    };

    if (ctx.nameAttr) event.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.typeAttr) {
      const t = this.visit(ctx.typeAttr[0] as CstNode);
      event.eventType = t === 'throw' ? 'throw' : 'catch';
    }
    if (ctx.triggerAttr) event.trigger = this.visit(ctx.triggerAttr[0] as CstNode) as IntermediateTrigger;
    if (ctx.messageAttr) event.message = this.visit(ctx.messageAttr[0] as CstNode);
    if (ctx.timerAttr) event.timer = this.visit(ctx.timerAttr[0] as CstNode);
    if (ctx.signalAttr) event.signal = this.visit(ctx.signalAttr[0] as CstNode);
    if (ctx.linkAttr) event.link = this.visit(ctx.linkAttr[0] as CstNode);
    if (ctx.errorAttr) event.error = this.visit(ctx.errorAttr[0] as CstNode);
    if (ctx.escalationAttr) event.escalation = this.visit(ctx.escalationAttr[0] as CstNode);
    if (ctx.conditionAttr) event.condition = this.visit(ctx.conditionAttr[0] as CstNode);

    // Capture inline flows
    this.captureInlineFlows(event.id!, ctx);

    return event;
  }

  endEvent(ctx: CstChildren): EndEvent {
    const event: EndEvent = {
      type: 'endEvent',
      id: img(ctx.id as IToken[]),
      trigger: 'none',
    };

    if (ctx.nameAttr) event.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.triggerAttr) event.trigger = this.visit(ctx.triggerAttr[0] as CstNode) as EndTrigger;
    if (ctx.messageAttr) event.message = this.visit(ctx.messageAttr[0] as CstNode);
    if (ctx.signalAttr) event.signal = this.visit(ctx.signalAttr[0] as CstNode);
    if (ctx.errorAttr) event.error = this.visit(ctx.errorAttr[0] as CstNode);
    if (ctx.escalationAttr) event.escalation = this.visit(ctx.escalationAttr[0] as CstNode);

    return event;
  }

  boundaryEvent(ctx: CstChildren): BoundaryEvent {
    const event: BoundaryEvent = {
      type: 'boundaryEvent',
      id: img(ctx.id as IToken[]),
      trigger: 'timer',
      interrupting: true,
    };

    if (ctx.nameAttr) event.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.typeAttr) event.trigger = this.visit(ctx.typeAttr[0] as CstNode) as BoundaryTrigger;
    if (ctx.triggerAttr) event.trigger = this.visit(ctx.triggerAttr[0] as CstNode) as BoundaryTrigger;
    if (ctx.messageAttr) event.message = this.visit(ctx.messageAttr[0] as CstNode);
    if (ctx.timerAttr) event.timer = this.visit(ctx.timerAttr[0] as CstNode);
    if (ctx.durationAttr) event.duration = this.visit(ctx.durationAttr[0] as CstNode);
    if (ctx.signalAttr) event.signal = this.visit(ctx.signalAttr[0] as CstNode);
    if (ctx.errorAttr) event.error = this.visit(ctx.errorAttr[0] as CstNode);
    if (ctx.escalationAttr) event.escalation = this.visit(ctx.escalationAttr[0] as CstNode);
    if (ctx.conditionAttr) event.condition = this.visit(ctx.conditionAttr[0] as CstNode);
    if (ctx.interruptingAttr) event.interrupting = this.visit(ctx.interruptingAttr[0] as CstNode);

    // Capture inline flows
    this.captureInlineFlows(event.id!, ctx);

    return event;
  }

  taskDecl(ctx: CstChildren): Task {
    const task: Task = {
      type: 'task',
      id: img(ctx.id as IToken[]),
      taskType: 'task',
    };

    if (ctx.nameAttr) task.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.typeAttr) task.taskType = this.visit(ctx.typeAttr[0] as CstNode) as TaskType;
    if (ctx.implementationAttr) task.implementation = this.visit(ctx.implementationAttr[0] as CstNode);
    if (ctx.classAttr) task.class = this.visit(ctx.classAttr[0] as CstNode);
    if (ctx.scriptAttr) task.script = this.visit(ctx.scriptAttr[0] as CstNode);
    if (ctx.scriptFormatAttr) task.scriptFormat = this.visit(ctx.scriptFormatAttr[0] as CstNode);
    if (ctx.assigneeAttr) task.assignee = this.visit(ctx.assigneeAttr[0] as CstNode);
    if (ctx.candidateGroupsAttr) task.candidateGroups = this.visit(ctx.candidateGroupsAttr[0] as CstNode);
    if (ctx.candidateUsersAttr) task.candidateUsers = this.visit(ctx.candidateUsersAttr[0] as CstNode);

    if (ctx.boundaryEvent) {
      task.boundaryEvents = (ctx.boundaryEvent as CstNode[]).map((n) => this.visit(n));
    }

    // Capture data associations
    if (ctx.dataAssociation) {
      const inputAssocs: DataAssociation[] = [];
      const outputAssocs: DataAssociation[] = [];

      for (const assocNode of ctx.dataAssociation as CstNode[]) {
        const assoc = this.visit(assocNode) as DataAssociation;
        if (assoc.direction === 'input') {
          // <- dataId means: data flows INTO task
          inputAssocs.push({
            ...assoc,
            target: task.id!,
          });
        } else {
          // => dataId means: data flows OUT OF task
          outputAssocs.push({
            ...assoc,
            source: task.id!,
          });
        }
      }

      if (inputAssocs.length > 0) task.dataInputAssociations = inputAssocs;
      if (outputAssocs.length > 0) task.dataOutputAssociations = outputAssocs;
    }

    // Capture inline flows
    this.captureInlineFlows(task.id!, ctx);

    return task;
  }

  subprocessDecl(ctx: CstChildren): Subprocess {
    const subprocess: Subprocess = {
      type: 'subprocess',
      id: img(ctx.id as IToken[]),
      triggered: false,
    };

    if (ctx.nameAttr) subprocess.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.triggeredAttr) subprocess.triggered = this.visit(ctx.triggeredAttr[0] as CstNode);

    if (ctx.flowElement) {
      subprocess.elements = (ctx.flowElement as CstNode[]).map((n) => this.visit(n));
    }

    if (ctx.boundaryEvent) {
      subprocess.boundaryEvents = (ctx.boundaryEvent as CstNode[]).map((n) => this.visit(n));
    }

    // Capture inline flows
    this.captureInlineFlows(subprocess.id!, ctx);

    return subprocess;
  }

  callActivity(ctx: CstChildren): CallActivity {
    const call: CallActivity = {
      type: 'callActivity',
      id: img(ctx.id as IToken[]),
      calledElement: '',
    };

    if (ctx.nameAttr) call.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.calledElementAttr) call.calledElement = this.visit(ctx.calledElementAttr[0] as CstNode);

    // Capture inline flows
    this.captureInlineFlows(call.id!, ctx);

    return call;
  }

  gatewayDecl(ctx: CstChildren): Gateway {
    const gateway: Gateway = {
      type: 'gateway',
      id: img(ctx.id as IToken[]),
      gatewayType: 'exclusive',
    };

    if (ctx.nameAttr) gateway.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.typeAttr) gateway.gatewayType = this.visit(ctx.typeAttr[0] as CstNode) as GatewayType;
    if (ctx.defaultAttr) gateway.default = this.visit(ctx.defaultAttr[0] as CstNode);

    // Capture inline flows
    this.captureInlineFlows(gateway.id!, ctx);

    return gateway;
  }

  dataObjectDecl(ctx: CstChildren): DataObject {
    const data: DataObject = {
      type: 'dataObject',
      id: img(ctx.id as IToken[]),
    };
    if (ctx.nameAttr) data.name = this.visit(ctx.nameAttr[0] as CstNode);
    return data;
  }

  dataStoreDecl(ctx: CstChildren): DataStore {
    const data: DataStore = {
      type: 'dataStore',
      id: img(ctx.id as IToken[]),
    };
    if (ctx.nameAttr) data.name = this.visit(ctx.nameAttr[0] as CstNode);
    return data;
  }

  sequenceFlowDecl(ctx: CstChildren): SequenceFlow {
    const idToken = (ctx.id as IToken[])?.[0];
    const flow: SequenceFlow = {
      id: img(ctx.id as IToken[]),
      from: '',
      to: '',
      loc: loc(idToken),
    };

    if (ctx.nameAttr) flow.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.fromAttr) flow.from = this.visit(ctx.fromAttr[0] as CstNode);
    if (ctx.toAttr) flow.to = this.visit(ctx.toAttr[0] as CstNode);
    if (ctx.conditionAttr) flow.condition = this.visit(ctx.conditionAttr[0] as CstNode);

    return flow;
  }

  messageFlowDecl(ctx: CstChildren): MessageFlow {
    const idToken = (ctx.id as IToken[])?.[0];
    const flow: MessageFlow = {
      id: img(ctx.id as IToken[]),
      from: '',
      to: '',
      loc: loc(idToken),
    };

    if (ctx.nameAttr) flow.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.fromAttr) flow.from = this.visit(ctx.fromAttr[0] as CstNode);
    if (ctx.toAttr) flow.to = this.visit(ctx.toAttr[0] as CstNode);
    if (ctx.messageAttr) flow.message = this.visit(ctx.messageAttr[0] as CstNode);

    return flow;
  }

  annotationDecl(ctx: CstChildren): Annotation {
    const annotation: Annotation = {
      id: img(ctx.id as IToken[]),
      text: '',
    };

    if (ctx.textAttr) annotation.text = this.visit(ctx.textAttr[0] as CstNode);
    if (ctx.annotatesAttr) annotation.annotates = this.visit(ctx.annotatesAttr[0] as CstNode);

    return annotation;
  }

  groupDecl(ctx: CstChildren): Group {
    const group: Group = {
      id: img(ctx.id as IToken[]),
    };

    if (ctx.nameAttr) group.name = this.visit(ctx.nameAttr[0] as CstNode);
    if (ctx.elementsAttr) group.elements = this.visit(ctx.elementsAttr[0] as CstNode);

    return group;
  }

  inlineFlow(ctx: CstChildren): { to: string; attrs: Record<string, unknown> } {
    const to = img(ctx.target as IToken[]);
    let attrs: Record<string, unknown> = {};
    if (ctx.inlineAttrs) {
      attrs = this.visit(ctx.inlineAttrs[0] as CstNode);
    }
    return { to, attrs };
  }

  dataAssociation(ctx: CstChildren): DataAssociation {
    if (ctx.inputData) {
      return {
        source: img(ctx.inputData as IToken[]),
        target: '', // resolved later
        direction: 'input',
      };
    }
    return {
      source: '', // resolved later
      target: img(ctx.outputData as IToken[]),
      direction: 'output',
    };
  }

  globalLayout(ctx: CstChildren): Record<string, Layout | FlowLayout> {
    const layout: Record<string, Layout | FlowLayout> = {};
    if (ctx.layoutEntry) {
      for (const entry of ctx.layoutEntry as CstNode[]) {
        const { id, attrs } = this.visit(entry);
        layout[id] = attrs;
      }
    }
    return layout;
  }

  layoutEntry(ctx: CstChildren): { id: string; attrs: Layout | FlowLayout } {
    const id = img(ctx.elementId as IToken[]);
    const attrs = this.visit(ctx.inlineAttrs![0] as CstNode);
    return { id, attrs };
  }

  inlineAttrs(ctx: CstChildren): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};
    if (ctx.inlineAttr) {
      for (const attr of ctx.inlineAttr as CstNode[]) {
        const { key, value } = this.visit(attr);
        attrs[key] = value;
      }
    }
    return attrs;
  }

  inlineAttr(ctx: CstChildren): { key: string; value: unknown } {
    let key: string;
    if (ctx.keywordKey) {
      // Keyword token includes colon (e.g., "condition:"), strip it
      key = img(ctx.keywordKey as IToken[]).replace(/:$/, '');
    } else {
      // Regular identifier
      key = img(ctx.key as IToken[]);
    }
    const value = this.visit(ctx.attrValue![0] as CstNode);
    return { key, value };
  }

  // Attribute visitors
  nameAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  typeAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  triggerAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  messageAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  timerAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  durationAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  signalAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  conditionAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  errorAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  escalationAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  linkAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  executableAttr(ctx: CstChildren): boolean {
    return this.visit(ctx.boolValue![0] as CstNode);
  }

  documentationAttr(ctx: CstChildren): string {
    if (ctx.stringValue) return this.visit(ctx.stringValue[0] as CstNode);
    if (ctx.multilineString) return this.visit(ctx.multilineString[0] as CstNode);
    return '';
  }

  implementationAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  classAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  scriptAttr(ctx: CstChildren): string {
    if (ctx.stringValue) return this.visit(ctx.stringValue[0] as CstNode);
    if (ctx.multilineString) return this.visit(ctx.multilineString[0] as CstNode);
    return '';
  }

  scriptFormatAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  assigneeAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  candidateGroupsAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  candidateUsersAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  triggeredAttr(ctx: CstChildren): boolean {
    return this.visit(ctx.boolValue![0] as CstNode);
  }

  calledElementAttr(ctx: CstChildren): string {
    return this.visit(ctx.stringValue![0] as CstNode);
  }

  defaultAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  interruptingAttr(ctx: CstChildren): boolean {
    return this.visit(ctx.boolValue![0] as CstNode);
  }

  fromAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  toAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  textAttr(ctx: CstChildren): string {
    if (ctx.stringValue) return this.visit(ctx.stringValue[0] as CstNode);
    if (ctx.multilineString) return this.visit(ctx.multilineString[0] as CstNode);
    return '';
  }

  annotatesAttr(ctx: CstChildren): string {
    return img(ctx.value as IToken[]);
  }

  elementsAttr(ctx: CstChildren): string[] {
    return this.visit(ctx.array![0] as CstNode);
  }

  // Value visitors
  attrValue(ctx: CstChildren): unknown {
    if (ctx.string) return str(ctx.string as IToken[]);
    if (ctx.number) return parseFloat(img(ctx.number as IToken[]));
    if (ctx.true) return true;
    if (ctx.false) return false;
    if (ctx.identifier) return img(ctx.identifier as IToken[]);
    return undefined;
  }

  stringValue(ctx: CstChildren): string {
    if (ctx.quoted) return str(ctx.quoted as IToken[]);
    if (ctx.unquoted) return img(ctx.unquoted as IToken[]);
    return '';
  }

  boolValue(ctx: CstChildren): boolean {
    return !!ctx.True;
  }

  multilineString(ctx: CstChildren): string {
    const token = (ctx.content as IToken[])?.[0];
    if (!token) return '';

    const raw = token.image;
    // Remove leading | and whitespace, then first newline
    const withoutPipe = raw.replace(/^\|[ \t]*\r?\n/, '');

    // Split into lines
    const lines = withoutPipe.split(/\r?\n/);

    // Find minimum indentation (ignoring empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      const match = line.match(/^[ \t]*/);
      if (match) {
        minIndent = Math.min(minIndent, match[0].length);
      }
    }

    // If no content, return empty
    if (minIndent === Infinity) return '';

    // Dedent all lines and join
    const dedented = lines
      .map((line) => (line.length >= minIndent ? line.slice(minIndent) : line))
      .join('\n')
      .replace(/\n+$/, ''); // Trim trailing newlines

    return dedented;
  }

  array(ctx: CstChildren): string[] {
    if (!ctx.element) return [];
    return (ctx.element as IToken[]).map((t) => t.image);
  }
}

export const visitor = new BpmnMdVisitor();
