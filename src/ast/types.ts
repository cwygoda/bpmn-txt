import { z } from 'zod';

// === Location tracking ===

export const LocationSchema = z.object({
  line: z.number(),
  column: z.number(),
  offset: z.number(),
});

export type Location = z.infer<typeof LocationSchema>;

export const SourceSpanSchema = z.object({
  start: LocationSchema,
  end: LocationSchema,
});

export type SourceSpan = z.infer<typeof SourceSpanSchema>;

// === Layout ===

export const LayoutSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type Layout = z.infer<typeof LayoutSchema>;

export const WaypointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Waypoint = z.infer<typeof WaypointSchema>;

export const FlowLayoutSchema = z.object({
  waypoints: z.array(WaypointSchema).optional(),
});

export type FlowLayout = z.infer<typeof FlowLayoutSchema>;

// === Base node ===

const BaseNodeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  documentation: z.string().optional(),
  loc: SourceSpanSchema.optional(),
  layout: LayoutSchema.optional(),
});

// === Events ===

export const StartTrigger = z.enum([
  'none',
  'message',
  'timer',
  'signal',
  'conditional',
  'error',
]);
export type StartTrigger = z.infer<typeof StartTrigger>;

export const IntermediateTrigger = z.enum([
  'message',
  'timer',
  'signal',
  'link',
  'compensation',
  'error',
  'escalation',
  'conditional',
]);
export type IntermediateTrigger = z.infer<typeof IntermediateTrigger>;

export const EndTrigger = z.enum([
  'none',
  'message',
  'signal',
  'error',
  'terminate',
  'compensation',
  'escalation',
]);
export type EndTrigger = z.infer<typeof EndTrigger>;

export const BoundaryTrigger = z.enum([
  'message',
  'timer',
  'signal',
  'error',
  'escalation',
  'compensation',
  'conditional',
]);
export type BoundaryTrigger = z.infer<typeof BoundaryTrigger>;

export const StartEventSchema = BaseNodeSchema.extend({
  type: z.literal('startEvent'),
  trigger: StartTrigger.optional().default('none'),
  message: z.string().optional(),
  timer: z.string().optional(),
  signal: z.string().optional(),
  condition: z.string().optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type StartEvent = z.infer<typeof StartEventSchema>;

export const IntermediateEventSchema = BaseNodeSchema.extend({
  type: z.literal('intermediateEvent'),
  eventType: z.enum(['catch', 'throw']).optional().default('catch'),
  trigger: IntermediateTrigger,
  message: z.string().optional(),
  timer: z.string().optional(),
  signal: z.string().optional(),
  link: z.string().optional(),
  error: z.string().optional(),
  escalation: z.string().optional(),
  condition: z.string().optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type IntermediateEvent = z.infer<typeof IntermediateEventSchema>;

export const EndEventSchema = BaseNodeSchema.extend({
  type: z.literal('endEvent'),
  trigger: EndTrigger.optional().default('none'),
  message: z.string().optional(),
  signal: z.string().optional(),
  error: z.string().optional(),
  escalation: z.string().optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type EndEvent = z.infer<typeof EndEventSchema>;

export const BoundaryEventSchema = BaseNodeSchema.extend({
  type: z.literal('boundaryEvent'),
  trigger: BoundaryTrigger,
  interrupting: z.boolean().optional().default(true),
  attachedTo: z.string().optional(), // resolved during parsing
  message: z.string().optional(),
  timer: z.string().optional(),
  duration: z.string().optional(),
  signal: z.string().optional(),
  error: z.string().optional(),
  escalation: z.string().optional(),
  condition: z.string().optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type BoundaryEvent = z.infer<typeof BoundaryEventSchema>;

export type Event = StartEvent | IntermediateEvent | EndEvent | BoundaryEvent;

// === Tasks ===

export const TaskType = z.enum([
  'task',
  'user',
  'service',
  'script',
  'send',
  'receive',
  'manual',
  'businessRule',
]);
export type TaskType = z.infer<typeof TaskType>;

export const TaskSchema = BaseNodeSchema.extend({
  type: z.literal('task'),
  taskType: TaskType.optional().default('task'),
  implementation: z.string().optional(),
  class: z.string().optional(),
  script: z.string().optional(),
  scriptFormat: z.string().optional(),
  assignee: z.string().optional(),
  candidateGroups: z.string().optional(),
  candidateUsers: z.string().optional(),
  boundaryEvents: z.array(z.lazy(() => BoundaryEventSchema)).optional(),
  dataInputAssociations: z.array(z.lazy(() => DataAssociationSchema)).optional(),
  dataOutputAssociations: z.array(z.lazy(() => DataAssociationSchema)).optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// === Subprocess ===

export const SubprocessSchema: z.ZodType<Subprocess> = BaseNodeSchema.extend({
  type: z.literal('subprocess'),
  triggered: z.boolean().optional().default(false),
  elements: z.lazy(() => z.array(FlowNodeSchema)).optional(),
  boundaryEvents: z.array(z.lazy(() => BoundaryEventSchema)).optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export interface Subprocess extends z.infer<typeof BaseNodeSchema> {
  type: 'subprocess';
  triggered?: boolean;
  elements?: FlowNode[];
  boundaryEvents?: BoundaryEvent[];
  doc?: string;
  service?: string;
}

// === Call Activity ===

export const CallActivitySchema = BaseNodeSchema.extend({
  type: z.literal('callActivity'),
  calledElement: z.string(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type CallActivity = z.infer<typeof CallActivitySchema>;

// === Gateways ===

export const GatewayType = z.enum([
  'exclusive',
  'parallel',
  'inclusive',
  'eventBased',
  'complex',
]);
export type GatewayType = z.infer<typeof GatewayType>;

export const GatewaySchema = BaseNodeSchema.extend({
  type: z.literal('gateway'),
  gatewayType: GatewayType,
  default: z.string().optional(),
  doc: z.string().optional(),
  service: z.string().optional(),
});

export type Gateway = z.infer<typeof GatewaySchema>;

// === Sequence Flow ===

export const SequenceFlowSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),
  loc: SourceSpanSchema.optional(),
  layout: FlowLayoutSchema.optional(),
});

export type SequenceFlow = z.infer<typeof SequenceFlowSchema>;

// === Message Flow ===

export const MessageFlowSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  from: z.string(),
  to: z.string(),
  message: z.string().optional(),
  loc: SourceSpanSchema.optional(),
  layout: FlowLayoutSchema.optional(),
});

export type MessageFlow = z.infer<typeof MessageFlowSchema>;

// === Data ===

export const DataObjectSchema = BaseNodeSchema.extend({
  type: z.literal('dataObject'),
});

export type DataObject = z.infer<typeof DataObjectSchema>;

export const DataStoreSchema = BaseNodeSchema.extend({
  type: z.literal('dataStore'),
});

export type DataStore = z.infer<typeof DataStoreSchema>;

export const DataAssociationSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  direction: z.enum(['input', 'output']),
  loc: SourceSpanSchema.optional(),
});

export type DataAssociation = z.infer<typeof DataAssociationSchema>;

// === Artifacts ===

export const AnnotationSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  annotates: z.string().optional(),
  loc: SourceSpanSchema.optional(),
  layout: LayoutSchema.optional(),
});

export type Annotation = z.infer<typeof AnnotationSchema>;

export const GroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  elements: z.array(z.string()).optional(),
  loc: SourceSpanSchema.optional(),
  layout: LayoutSchema.optional(),
});

export type Group = z.infer<typeof GroupSchema>;

// === Flow Node (union) ===

export type FlowNode =
  | StartEvent
  | IntermediateEvent
  | EndEvent
  | BoundaryEvent
  | Task
  | Subprocess
  | CallActivity
  | Gateway
  | DataObject
  | DataStore;

export const FlowNodeSchema: z.ZodType<FlowNode> = z.lazy(() =>
  z.union([
    StartEventSchema,
    IntermediateEventSchema,
    EndEventSchema,
    BoundaryEventSchema,
    TaskSchema,
    SubprocessSchema,
    CallActivitySchema,
    GatewaySchema,
    DataObjectSchema,
    DataStoreSchema,
  ])
) as z.ZodType<FlowNode>;

// === Lane ===

export const LaneSchema = BaseNodeSchema.extend({
  type: z.literal('lane'),
  elements: z.array(FlowNodeSchema).optional(),
  sequenceFlows: z.array(SequenceFlowSchema).optional(),
});

export type Lane = z.infer<typeof LaneSchema>;

// === Pool ===

export const PoolSchema = BaseNodeSchema.extend({
  type: z.literal('pool'),
  lanes: z.array(LaneSchema).optional(),
  elements: z.array(FlowNodeSchema).optional(),
  sequenceFlows: z.array(SequenceFlowSchema).optional(),
});

export type Pool = z.infer<typeof PoolSchema>;

// === Process ===

export const ProcessSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  executable: z.boolean().optional().default(true),
  documentation: z.string().optional(),
  pools: z.array(PoolSchema).optional(),
  elements: z.array(FlowNodeSchema).optional(),
  sequenceFlows: z.array(SequenceFlowSchema).optional(),
  messageFlows: z.array(MessageFlowSchema).optional(),
  dataAssociations: z.array(DataAssociationSchema).optional(),
  annotations: z.array(AnnotationSchema).optional(),
  groups: z.array(GroupSchema).optional(),
  loc: SourceSpanSchema.optional(),
});

export type Process = z.infer<typeof ProcessSchema>;

// === Document (root) ===

export const DocumentSchema = z.object({
  processes: z.array(ProcessSchema),
  globalLayout: z
    .record(z.string(), z.union([LayoutSchema, FlowLayoutSchema]))
    .optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
