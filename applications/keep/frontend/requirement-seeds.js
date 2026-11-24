// Generated solely from explicit input requirement seed declarations.
const declarations = JSON.parse("[{\"kind\":\"default label\",\"value\":{\"name\":\"Reminders\",\"icon\":\"distinct reminder icon\"},\"requirements\":[\"REQ-1.1\",\"REQ-2.8\",\"REQ-3.1\",\"REQ-3.2\",\"REQ-4.1\"]}]");
export const seedKinds = Object.freeze([...new Set(declarations.map(row => row.kind))]);
export function readSeedValues(kind) {
  if (!seedKinds.includes(kind)) throw new Error('Unknown requirement seed category: ' + kind);
  return structuredClone(declarations.filter(row => row.kind === kind).map(row => row.value));
}
