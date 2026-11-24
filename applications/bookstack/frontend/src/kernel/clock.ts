// Align the browser's Date with the server clock published by /api/clock.js.
const clock = (window as any).__ARC_CLOCK as { now: number; mode: string } | null | undefined;

if (clock) {
  const Real = Date;
  const offset = clock.now - Real.now();
  const now = () => (clock.mode === "fixed" ? clock.now : Real.now() + offset);
  class BenchmarkDate extends Real {
    constructor(...args: any[]) {
      if (args.length === 0) super(now());
      else super(...(args as [any]));
    }
    static now(): number {
      return now();
    }
  }
  window.Date = BenchmarkDate as DateConstructor;
}

export {};
