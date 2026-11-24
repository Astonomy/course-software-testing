import { CLOCK } from "./clock-config";

const Real = Date;
const realStart = Real.now();
const start = CLOCK ? Real.parse(CLOCK.start) : 0;

function now(): number {
  if (!CLOCK) return Real.now();
  return CLOCK.mode === "fixed" ? start : start + (Real.now() - realStart);
}

// Every Date in the server follows the benchmark clock, so generated code needs no special handling.
if (CLOCK) {
  class BenchmarkDate extends Real {
    constructor(...args: any[]) {
      if (args.length === 0) super(now());
      else super(...(args as [any]));
    }
    static now(): number {
      return now();
    }
  }
  globalThis.Date = BenchmarkDate as DateConstructor;
}

/** Script loaded before the frontend bundle so the browser shares the server clock. */
export function clockScript(): string {
  return `window.__ARC_CLOCK=${JSON.stringify(CLOCK ? { now: now(), mode: CLOCK.mode } : null)};`;
}
