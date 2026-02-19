import type { Document } from '../ast/types.js';
import { generateIds } from './id-generator.js';

export interface JsonExportOptions {
  /** Include source location info */
  includeLocations?: boolean;
  /** Include layout info */
  includeLayout?: boolean;
  /** Pretty print with indentation */
  indent?: number;
}

/**
 * Export document to JSON string
 */
export function toJson(doc: Document, options: JsonExportOptions = {}): string {
  const { includeLocations = false, includeLayout = true, indent = 2 } = options;

  // Generate IDs for elements without them
  generateIds(doc);

  // Clean up the document for export
  const cleaned = cleanDocument(doc, includeLocations, includeLayout);

  return JSON.stringify(cleaned, null, indent);
}

/**
 * Export document to plain object (for programmatic use)
 */
export function toObject(doc: Document, options: JsonExportOptions = {}): unknown {
  const { includeLocations = false, includeLayout = true } = options;
  generateIds(doc);
  return cleanDocument(doc, includeLocations, includeLayout);
}

function cleanDocument(
  doc: Document,
  includeLocations: boolean,
  includeLayout: boolean
): unknown {
  return {
    processes: doc.processes.map((p) => cleanProcess(p, includeLocations, includeLayout)),
    ...(includeLayout && doc.globalLayout ? { layout: doc.globalLayout } : {}),
  };
}

function cleanProcess(proc: unknown, includeLoc: boolean, includeLayout: boolean): unknown {
  return cleanObject(proc, includeLoc, includeLayout);
}

function cleanObject(obj: unknown, includeLoc: boolean, includeLayout: boolean): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanObject(item, includeLoc, includeLayout));
  }
  if (typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip location info unless requested
    if (key === 'loc' && !includeLoc) continue;
    // Skip layout info unless requested
    if (key === 'layout' && !includeLayout) continue;
    // Skip undefined values
    if (value === undefined) continue;
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) continue;

    result[key] = cleanObject(value, includeLoc, includeLayout);
  }
  return result;
}
