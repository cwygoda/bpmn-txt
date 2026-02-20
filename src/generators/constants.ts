// Default sizes for BPMN elements (BPMN 2.0 standard sizes)
export const ELEMENT_SIZES: Record<string, { width: number; height: number }> = {
  startEvent: { width: 36, height: 36 },
  endEvent: { width: 36, height: 36 },
  intermediateEvent: { width: 36, height: 36 },
  boundaryEvent: { width: 36, height: 36 },
  task: { width: 100, height: 80 },
  subprocess: { width: 200, height: 150 },
  callActivity: { width: 100, height: 80 },
  gateway: { width: 50, height: 50 },
  dataObject: { width: 36, height: 50 },
  dataStore: { width: 50, height: 50 },
  pool: { width: 600, height: 200 },
  lane: { width: 600, height: 150 },
};
