import { createToken, Lexer } from 'chevrotain';

// === Whitespace & Structure ===

export const Newline = createToken({
  name: 'Newline',
  pattern: /\r?\n/,
  line_breaks: true,
});

export const Indent = createToken({
  name: 'Indent',
  pattern: /[ ]+/,
  longer_alt: undefined,
});

export const Comment = createToken({
  name: 'Comment',
  pattern: /#[^\r\n]*/,
  group: Lexer.SKIPPED,
});

// === Keywords ===

export const Process = createToken({
  name: 'Process',
  pattern: /process:/,
});

export const Pool = createToken({
  name: 'Pool',
  pattern: /pool:/,
});

export const Lane = createToken({
  name: 'Lane',
  pattern: /lane:/,
});

export const Start = createToken({
  name: 'Start',
  pattern: /start:/,
});

export const Event = createToken({
  name: 'Event',
  pattern: /event:/,
});

export const End = createToken({
  name: 'End',
  pattern: /end:/,
});

export const Boundary = createToken({
  name: 'Boundary',
  pattern: /boundary:/,
});

export const Task = createToken({
  name: 'Task',
  pattern: /task:/,
});

export const Subprocess = createToken({
  name: 'Subprocess',
  pattern: /subprocess:/,
});

export const Call = createToken({
  name: 'Call',
  pattern: /call:/,
});

export const Gateway = createToken({
  name: 'Gateway',
  pattern: /gateway:/,
});

export const Flow = createToken({
  name: 'Flow',
  pattern: /flow:/,
});

export const MessageFlow = createToken({
  name: 'MessageFlow',
  pattern: /message-flow:/,
});

export const DataObject = createToken({
  name: 'DataObject',
  pattern: /data-object:/,
});

export const DataStore = createToken({
  name: 'DataStore',
  pattern: /data-store:/,
});

export const Annotation = createToken({
  name: 'Annotation',
  pattern: /annotation:/,
});

export const Group = createToken({
  name: 'Group',
  pattern: /group:/,
});

export const LayoutBlock = createToken({
  name: 'LayoutBlock',
  pattern: /@layout:/,
});

// === Attribute keywords ===

export const Name = createToken({
  name: 'Name',
  pattern: /name:/,
});

export const Type = createToken({
  name: 'Type',
  pattern: /type:/,
});

export const Trigger = createToken({
  name: 'Trigger',
  pattern: /trigger:/,
});

export const Message = createToken({
  name: 'Message',
  pattern: /message:/,
});

export const Timer = createToken({
  name: 'Timer',
  pattern: /timer:/,
});

export const Duration = createToken({
  name: 'Duration',
  pattern: /duration:/,
});

export const Signal = createToken({
  name: 'Signal',
  pattern: /signal:/,
});

export const Condition = createToken({
  name: 'Condition',
  pattern: /condition:/,
});

export const Error = createToken({
  name: 'Error',
  pattern: /error:/,
});

export const Escalation = createToken({
  name: 'Escalation',
  pattern: /escalation:/,
});

export const Link = createToken({
  name: 'Link',
  pattern: /link:/,
});

export const Executable = createToken({
  name: 'Executable',
  pattern: /executable:/,
});

export const Documentation = createToken({
  name: 'Documentation',
  pattern: /documentation:/,
});

export const Implementation = createToken({
  name: 'Implementation',
  pattern: /implementation:/,
});

export const Class = createToken({
  name: 'Class',
  pattern: /class:/,
});

export const Script = createToken({
  name: 'Script',
  pattern: /script:/,
});

export const ScriptFormat = createToken({
  name: 'ScriptFormat',
  pattern: /scriptFormat:/,
});

export const Assignee = createToken({
  name: 'Assignee',
  pattern: /assignee:/,
});

export const CandidateGroups = createToken({
  name: 'CandidateGroups',
  pattern: /candidateGroups:/,
});

export const CandidateUsers = createToken({
  name: 'CandidateUsers',
  pattern: /candidateUsers:/,
});

export const Triggered = createToken({
  name: 'Triggered',
  pattern: /triggered:/,
});

export const CalledElement = createToken({
  name: 'CalledElement',
  pattern: /calledElement:/,
});

export const Default = createToken({
  name: 'Default',
  pattern: /default:/,
});

export const Interrupting = createToken({
  name: 'Interrupting',
  pattern: /interrupting:/,
});

export const From = createToken({
  name: 'From',
  pattern: /from:/,
});

export const To = createToken({
  name: 'To',
  pattern: /to:/,
});

export const Text = createToken({
  name: 'Text',
  pattern: /text:/,
});

export const Annotates = createToken({
  name: 'Annotates',
  pattern: /annotates:/,
});

export const Elements = createToken({
  name: 'Elements',
  pattern: /elements:/,
});

export const Waypoints = createToken({
  name: 'Waypoints',
  pattern: /waypoints:/,
});

export const X = createToken({
  name: 'X',
  pattern: /x:/,
});

export const Y = createToken({
  name: 'Y',
  pattern: /y:/,
});

export const Width = createToken({
  name: 'Width',
  pattern: /width:/,
});

export const Height = createToken({
  name: 'Height',
  pattern: /height:/,
});

// === Operators ===

export const Arrow = createToken({
  name: 'Arrow',
  pattern: /->/,
});

export const InputAssoc = createToken({
  name: 'InputAssoc',
  pattern: /<-/,
});

export const OutputAssoc = createToken({
  name: 'OutputAssoc',
  pattern: /=>/,
});

export const LBrace = createToken({
  name: 'LBrace',
  pattern: /\{/,
});

export const RBrace = createToken({
  name: 'RBrace',
  pattern: /\}/,
});

export const LBracket = createToken({
  name: 'LBracket',
  pattern: /\[/,
});

export const RBracket = createToken({
  name: 'RBracket',
  pattern: /\]/,
});

export const Comma = createToken({
  name: 'Comma',
  pattern: /,/,
});

export const Colon = createToken({
  name: 'Colon',
  pattern: /:/,
});

export const Pipe = createToken({
  name: 'Pipe',
  pattern: /\|/,
});

export const Dash = createToken({
  name: 'Dash',
  pattern: /-/,
});

// === Literals ===

export const True = createToken({
  name: 'True',
  pattern: /true/,
});

export const False = createToken({
  name: 'False',
  pattern: /false/,
});

export const Number = createToken({
  name: 'Number',
  pattern: /-?\d+(\.\d+)?/,
});

export const QuotedString = createToken({
  name: 'QuotedString',
  pattern: /"(?:[^"\\]|\\.)*"/,
});

// Identifier - must come last (catch-all for unquoted values)
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_$][a-zA-Z0-9_$.-]*/,
});

// === Token order (priority matters!) ===

export const allTokens = [
  // Comments first (skipped)
  Comment,

  // Newlines
  Newline,

  // Keywords (before Identifier)
  Process,
  Pool,
  Lane,
  Start,
  Event,
  End,
  Boundary,
  Task,
  Subprocess,
  Call,
  Gateway,
  Flow,
  MessageFlow,
  DataObject,
  DataStore,
  Annotation,
  Group,
  LayoutBlock,

  // Attribute keywords
  Name,
  Type,
  Trigger,
  Message,
  Timer,
  Duration,
  Signal,
  Condition,
  Error,
  Escalation,
  Link,
  Executable,
  Documentation,
  Implementation,
  Class,
  Script,
  ScriptFormat,
  Assignee,
  CandidateGroups,
  CandidateUsers,
  Triggered,
  CalledElement,
  Default,
  Interrupting,
  From,
  To,
  Text,
  Annotates,
  Elements,
  Waypoints,
  X,
  Y,
  Width,
  Height,

  // Operators
  Arrow,
  InputAssoc,
  OutputAssoc,
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  Comma,
  Colon,
  Pipe,
  Dash,

  // Literals
  True,
  False,
  Number,
  QuotedString,

  // Identifier last
  Identifier,

  // Indent last (whitespace)
  Indent,
];

export const BpmnMdLexer = new Lexer(allTokens, {
  positionTracking: 'full',
});
