import { CstParser } from 'chevrotain';
import type { IToken } from 'chevrotain';
import * as T from '../lexer/tokens.js';
import type { IndentedToken } from '../lexer/index.js';

export class BpmnMdParser extends CstParser {
  private currentIndent = 0;
  private indentStack: number[] = [0];

  constructor() {
    super(T.allTokens, {
      recoveryEnabled: true,
      maxLookahead: 3,
    });
    this.performSelfAnalysis();
  }

  // Helper to check if token is at expected indent level
  private isAtIndent(token: IToken, expected: number): boolean {
    const indented = token as IndentedToken;
    return indented.indent === expected;
  }

  // Helper to check if next non-newline token is at indent level
  private peekIndent(): number {
    let i = 1;
    let token = this.LA(i);
    while (token && token.tokenType === T.Newline) {
      i++;
      token = this.LA(i);
    }
    if (!token) return 0;
    const indented = token as IndentedToken;
    return indented.indent >= 0 ? indented.indent : this.currentIndent;
  }

  // Gate function: continue parsing if next token is at expected indent or is newline
  private atExpectedIndent(): boolean {
    const token = this.LA(1);
    if (!token) return false;
    if (token.tokenType === T.Newline) return true;
    const indented = token as IndentedToken;
    return indented.indent === this.currentIndent;
  }

  // === Entry point ===
  public document = this.RULE('document', () => {
    this.MANY(() => this.CONSUME(T.Newline));
    this.MANY1(() => {
      this.SUBRULE(this.processDecl);
      this.MANY2(() => this.CONSUME1(T.Newline));
    });
    this.OPTION(() => this.SUBRULE(this.globalLayout));
  });

  // === Process ===
  private processDecl = this.RULE('processDecl', () => {
    this.CONSUME(T.Process);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.executableAttr) },
          { ALT: () => this.SUBRULE(this.documentationAttr) },
          { ALT: () => this.SUBRULE(this.poolDecl) },
          { ALT: () => this.SUBRULE(this.flowElement) },
          { ALT: () => this.SUBRULE(this.sequenceFlowDecl) },
          { ALT: () => this.SUBRULE(this.messageFlowDecl) },
          { ALT: () => this.SUBRULE(this.annotationDecl) },
          { ALT: () => this.SUBRULE(this.groupDecl) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Pool & Lane ===
  private poolDecl = this.RULE('poolDecl', () => {
    this.CONSUME(T.Pool);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.laneDecl) },
          { ALT: () => this.SUBRULE(this.flowElement) },
          { ALT: () => this.SUBRULE(this.sequenceFlowDecl) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private laneDecl = this.RULE('laneDecl', () => {
    this.CONSUME(T.Lane);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.flowElement) },
          { ALT: () => this.SUBRULE(this.sequenceFlowDecl) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Flow Elements ===
  private flowElement = this.RULE('flowElement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.startEvent) },
      { ALT: () => this.SUBRULE(this.intermediateEvent) },
      { ALT: () => this.SUBRULE(this.endEvent) },
      { ALT: () => this.SUBRULE(this.taskDecl) },
      { ALT: () => this.SUBRULE(this.subprocessDecl) },
      { ALT: () => this.SUBRULE(this.callActivity) },
      { ALT: () => this.SUBRULE(this.gatewayDecl) },
      { ALT: () => this.SUBRULE(this.dataObjectDecl) },
      { ALT: () => this.SUBRULE(this.dataStoreDecl) },
    ]);
  });

  // === Events ===
  private startEvent = this.RULE('startEvent', () => {
    this.CONSUME(T.Start);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.triggerAttr) },
          { ALT: () => this.SUBRULE(this.messageAttr) },
          { ALT: () => this.SUBRULE(this.timerAttr) },
          { ALT: () => this.SUBRULE(this.signalAttr) },
          { ALT: () => this.SUBRULE(this.conditionAttr) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private intermediateEvent = this.RULE('intermediateEvent', () => {
    this.CONSUME(T.Event);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.typeAttr) },
          { ALT: () => this.SUBRULE(this.triggerAttr) },
          { ALT: () => this.SUBRULE(this.messageAttr) },
          { ALT: () => this.SUBRULE(this.timerAttr) },
          { ALT: () => this.SUBRULE(this.signalAttr) },
          { ALT: () => this.SUBRULE(this.linkAttr) },
          { ALT: () => this.SUBRULE(this.errorAttr) },
          { ALT: () => this.SUBRULE(this.escalationAttr) },
          { ALT: () => this.SUBRULE(this.conditionAttr) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private endEvent = this.RULE('endEvent', () => {
    this.CONSUME(T.End);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.triggerAttr) },
          { ALT: () => this.SUBRULE(this.messageAttr) },
          { ALT: () => this.SUBRULE(this.signalAttr) },
          { ALT: () => this.SUBRULE(this.errorAttr) },
          { ALT: () => this.SUBRULE(this.escalationAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private boundaryEvent = this.RULE('boundaryEvent', () => {
    this.CONSUME(T.Boundary);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.typeAttr) },
          { ALT: () => this.SUBRULE(this.triggerAttr) },
          { ALT: () => this.SUBRULE(this.messageAttr) },
          { ALT: () => this.SUBRULE(this.timerAttr) },
          { ALT: () => this.SUBRULE(this.durationAttr) },
          { ALT: () => this.SUBRULE(this.signalAttr) },
          { ALT: () => this.SUBRULE(this.errorAttr) },
          { ALT: () => this.SUBRULE(this.escalationAttr) },
          { ALT: () => this.SUBRULE(this.conditionAttr) },
          { ALT: () => this.SUBRULE(this.interruptingAttr) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Activities ===
  private taskDecl = this.RULE('taskDecl', () => {
    this.CONSUME(T.Task);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.typeAttr) },
          { ALT: () => this.SUBRULE(this.implementationAttr) },
          { ALT: () => this.SUBRULE(this.classAttr) },
          { ALT: () => this.SUBRULE(this.scriptAttr) },
          { ALT: () => this.SUBRULE(this.scriptFormatAttr) },
          { ALT: () => this.SUBRULE(this.assigneeAttr) },
          { ALT: () => this.SUBRULE(this.candidateGroupsAttr) },
          { ALT: () => this.SUBRULE(this.candidateUsersAttr) },
          { ALT: () => this.SUBRULE(this.boundaryEvent) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.SUBRULE(this.dataAssociation) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private subprocessDecl = this.RULE('subprocessDecl', () => {
    this.CONSUME(T.Subprocess);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.triggeredAttr) },
          { ALT: () => this.SUBRULE(this.flowElement) },
          { ALT: () => this.SUBRULE(this.sequenceFlowDecl) },
          { ALT: () => this.SUBRULE(this.boundaryEvent) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private callActivity = this.RULE('callActivity', () => {
    this.CONSUME(T.Call);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.calledElementAttr) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Gateways ===
  private gatewayDecl = this.RULE('gatewayDecl', () => {
    this.CONSUME(T.Gateway);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.typeAttr) },
          { ALT: () => this.SUBRULE(this.defaultAttr) },
          { ALT: () => this.SUBRULE(this.inlineFlow) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Flows ===
  private inlineFlow = this.RULE('inlineFlow', () => {
    this.CONSUME(T.Arrow);
    this.CONSUME(T.Identifier, { LABEL: 'target' });
    this.OPTION(() => this.SUBRULE(this.inlineAttrs));
    this.CONSUME(T.Newline);
  });

  private sequenceFlowDecl = this.RULE('sequenceFlowDecl', () => {
    this.CONSUME(T.Flow);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.fromAttr) },
          { ALT: () => this.SUBRULE(this.toAttr) },
          { ALT: () => this.SUBRULE(this.conditionAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private messageFlowDecl = this.RULE('messageFlowDecl', () => {
    this.CONSUME(T.MessageFlow);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.fromAttr) },
          { ALT: () => this.SUBRULE(this.toAttr) },
          { ALT: () => this.SUBRULE(this.messageAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Data ===
  private dataObjectDecl = this.RULE('dataObjectDecl', () => {
    this.CONSUME(T.DataObject);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private dataStoreDecl = this.RULE('dataStoreDecl', () => {
    this.CONSUME(T.DataStore);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private dataAssociation = this.RULE('dataAssociation', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.InputAssoc);
          this.CONSUME(T.Identifier, { LABEL: 'inputData' });
        },
      },
      {
        ALT: () => {
          this.CONSUME(T.OutputAssoc);
          this.CONSUME1(T.Identifier, { LABEL: 'outputData' });
        },
      },
    ]);
    this.CONSUME(T.Newline);
  });

  // === Artifacts ===
  private annotationDecl = this.RULE('annotationDecl', () => {
    this.CONSUME(T.Annotation);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.textAttr) },
          { ALT: () => this.SUBRULE(this.annotatesAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private groupDecl = this.RULE('groupDecl', () => {
    this.CONSUME(T.Group);
    this.CONSUME(T.Identifier, { LABEL: 'id' });
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.nameAttr) },
          { ALT: () => this.SUBRULE(this.elementsAttr) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  // === Layout ===
  private globalLayout = this.RULE('globalLayout', () => {
    this.CONSUME(T.LayoutBlock);
    this.CONSUME(T.Newline);

    const baseIndent = this.currentIndent;
    this.currentIndent = baseIndent + 1;

    this.MANY({
      GATE: () => this.atExpectedIndent(),
      DEF: () => {
        this.OR([
          { ALT: () => this.SUBRULE(this.layoutEntry) },
          { ALT: () => this.CONSUME1(T.Newline) },
        ]);
      },
    });

    this.currentIndent = baseIndent;
  });

  private layoutEntry = this.RULE('layoutEntry', () => {
    this.CONSUME(T.Identifier, { LABEL: 'elementId' });
    this.CONSUME(T.Colon);
    this.SUBRULE(this.inlineAttrs);
    this.CONSUME(T.Newline);
  });

  // === Inline attributes {key: value, ...} ===
  private inlineAttrs = this.RULE('inlineAttrs', () => {
    this.CONSUME(T.LBrace);
    this.OPTION(() => {
      this.SUBRULE(this.inlineAttr);
      this.MANY(() => {
        this.CONSUME(T.Comma);
        this.SUBRULE1(this.inlineAttr);
      });
    });
    this.CONSUME(T.RBrace);
  });

  private inlineAttr = this.RULE('inlineAttr', () => {
    this.CONSUME(T.Identifier, { LABEL: 'key' });
    this.CONSUME(T.Colon);
    this.SUBRULE(this.attrValue);
  });

  // === Attribute rules ===
  private nameAttr = this.RULE('nameAttr', () => {
    this.CONSUME(T.Name);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private typeAttr = this.RULE('typeAttr', () => {
    this.CONSUME(T.Type);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private triggerAttr = this.RULE('triggerAttr', () => {
    this.CONSUME(T.Trigger);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private messageAttr = this.RULE('messageAttr', () => {
    this.CONSUME(T.Message);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private timerAttr = this.RULE('timerAttr', () => {
    this.CONSUME(T.Timer);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private durationAttr = this.RULE('durationAttr', () => {
    this.CONSUME(T.Duration);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private signalAttr = this.RULE('signalAttr', () => {
    this.CONSUME(T.Signal);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private conditionAttr = this.RULE('conditionAttr', () => {
    this.CONSUME(T.Condition);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private errorAttr = this.RULE('errorAttr', () => {
    this.CONSUME(T.Error);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private escalationAttr = this.RULE('escalationAttr', () => {
    this.CONSUME(T.Escalation);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private linkAttr = this.RULE('linkAttr', () => {
    this.CONSUME(T.Link);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private executableAttr = this.RULE('executableAttr', () => {
    this.CONSUME(T.Executable);
    this.SUBRULE(this.boolValue);
    this.CONSUME(T.Newline);
  });

  private documentationAttr = this.RULE('documentationAttr', () => {
    this.CONSUME(T.Documentation);
    this.OR([
      { ALT: () => this.SUBRULE(this.stringValue) },
      { ALT: () => this.SUBRULE(this.multilineString) },
    ]);
    this.CONSUME(T.Newline);
  });

  private implementationAttr = this.RULE('implementationAttr', () => {
    this.CONSUME(T.Implementation);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private classAttr = this.RULE('classAttr', () => {
    this.CONSUME(T.Class);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private scriptAttr = this.RULE('scriptAttr', () => {
    this.CONSUME(T.Script);
    this.OR([
      { ALT: () => this.SUBRULE(this.stringValue) },
      { ALT: () => this.SUBRULE(this.multilineString) },
    ]);
    this.CONSUME(T.Newline);
  });

  private scriptFormatAttr = this.RULE('scriptFormatAttr', () => {
    this.CONSUME(T.ScriptFormat);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private assigneeAttr = this.RULE('assigneeAttr', () => {
    this.CONSUME(T.Assignee);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private candidateGroupsAttr = this.RULE('candidateGroupsAttr', () => {
    this.CONSUME(T.CandidateGroups);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private candidateUsersAttr = this.RULE('candidateUsersAttr', () => {
    this.CONSUME(T.CandidateUsers);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private triggeredAttr = this.RULE('triggeredAttr', () => {
    this.CONSUME(T.Triggered);
    this.SUBRULE(this.boolValue);
    this.CONSUME(T.Newline);
  });

  private calledElementAttr = this.RULE('calledElementAttr', () => {
    this.CONSUME(T.CalledElement);
    this.SUBRULE(this.stringValue);
    this.CONSUME(T.Newline);
  });

  private defaultAttr = this.RULE('defaultAttr', () => {
    this.CONSUME(T.Default);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private interruptingAttr = this.RULE('interruptingAttr', () => {
    this.CONSUME(T.Interrupting);
    this.SUBRULE(this.boolValue);
    this.CONSUME(T.Newline);
  });

  private fromAttr = this.RULE('fromAttr', () => {
    this.CONSUME(T.From);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private toAttr = this.RULE('toAttr', () => {
    this.CONSUME(T.To);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private textAttr = this.RULE('textAttr', () => {
    this.CONSUME(T.Text);
    this.OR([
      { ALT: () => this.SUBRULE(this.stringValue) },
      { ALT: () => this.SUBRULE(this.multilineString) },
    ]);
    this.CONSUME(T.Newline);
  });

  private annotatesAttr = this.RULE('annotatesAttr', () => {
    this.CONSUME(T.Annotates);
    this.CONSUME(T.Identifier, { LABEL: 'value' });
    this.CONSUME(T.Newline);
  });

  private elementsAttr = this.RULE('elementsAttr', () => {
    this.CONSUME(T.Elements);
    this.SUBRULE(this.array);
    this.CONSUME(T.Newline);
  });

  // === Value types ===
  private attrValue = this.RULE('attrValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.QuotedString, { LABEL: 'string' }) },
      { ALT: () => this.CONSUME(T.Number, { LABEL: 'number' }) },
      { ALT: () => this.CONSUME(T.True, { LABEL: 'true' }) },
      { ALT: () => this.CONSUME(T.False, { LABEL: 'false' }) },
      { ALT: () => this.CONSUME(T.Identifier, { LABEL: 'identifier' }) },
    ]);
  });

  private stringValue = this.RULE('stringValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.QuotedString, { LABEL: 'quoted' }) },
      { ALT: () => this.CONSUME(T.Identifier, { LABEL: 'unquoted' }) },
    ]);
  });

  private boolValue = this.RULE('boolValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.True) },
      { ALT: () => this.CONSUME(T.False) },
    ]);
  });

  private multilineString = this.RULE('multilineString', () => {
    this.CONSUME(T.Pipe);
    // Multiline content is handled by collecting subsequent indented lines
    // For now, we'll mark the start; actual collection happens in visitor
  });

  private array = this.RULE('array', () => {
    this.CONSUME(T.LBracket);
    this.OPTION(() => {
      this.CONSUME(T.Identifier, { LABEL: 'element' });
      this.MANY(() => {
        this.CONSUME(T.Comma);
        this.CONSUME1(T.Identifier, { LABEL: 'element' });
      });
    });
    this.CONSUME(T.RBracket);
  });
}

// Singleton parser instance
export const parser = new BpmnMdParser();
