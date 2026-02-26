import type { Document, FlowNode } from './types.js';

export interface DocLink {
  elementId: string;
  anchor: string;
}

export interface ServiceRef {
  elementId: string;
  serviceId: string;
}

function collectFromNodes(
  nodes: FlowNode[] | undefined,
  docLinks: DocLink[],
  serviceRefs: ServiceRef[],
): void {
  if (!nodes) return;
  for (const node of nodes) {
    if (node.id) {
      if ('doc' in node && node.doc) {
        docLinks.push({ elementId: node.id, anchor: node.doc });
      }
      if ('service' in node && node.service) {
        serviceRefs.push({ elementId: node.id, serviceId: node.service });
      }
    }
    if (node.type === 'subprocess' && node.elements) {
      collectFromNodes(node.elements, docLinks, serviceRefs);
    }
    if ('boundaryEvents' in node && node.boundaryEvents) {
      collectFromNodes(node.boundaryEvents, docLinks, serviceRefs);
    }
  }
}

function collectFromDocument(doc: Document): { docLinks: DocLink[]; serviceRefs: ServiceRef[] } {
  const docLinks: DocLink[] = [];
  const serviceRefs: ServiceRef[] = [];
  for (const process of doc.processes) {
    collectFromNodes(process.elements, docLinks, serviceRefs);
    if (process.pools) {
      for (const pool of process.pools) {
        collectFromNodes(pool.elements, docLinks, serviceRefs);
        if (pool.lanes) {
          for (const lane of pool.lanes) {
            collectFromNodes(lane.elements, docLinks, serviceRefs);
          }
        }
      }
    }
  }
  return { docLinks, serviceRefs };
}

/** Extract doc links from AST — maps BPMN element IDs to markdown anchors */
export function extractDocLinks(doc: Document): DocLink[] {
  return collectFromDocument(doc).docLinks;
}

/** Extract service references from AST — maps BPMN element IDs to service IDs */
export function extractServiceRefs(doc: Document): ServiceRef[] {
  return collectFromDocument(doc).serviceRefs;
}
