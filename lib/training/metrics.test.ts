import { describe, expect, it } from "vitest";
import { computeLoad, interpretForm } from "./load";
import { bestTss, normalizedPower, powerCurve, powerTss, resampleTo1Hz } from "./metrics";

describe("metrics", () => {
  it("NP of constant power equals that power", () => {
    expect(normalizedPower(new Array(600).fill(200))).toBeCloseTo(200, 5);
  });

  it("NP is above average power for intervals", () => {
    const intervals = Array.from({ length: 1200 }, (_, i) => (Math.floor(i / 60) % 2 === 0 ? 300 : 100));
    expect(normalizedPower(intervals)!).toBeGreaterThan(200);
  });

  it("1 h at FTP yields 100 TSS", () => {
    expect(powerTss(3600, 250, 250)).toBeCloseTo(100, 5);
  });

  it("bestTss prefers power over heart rate", () => {
    expect(bestTss({ durationS: 3600, np: 200, ftp: 250, avgHr: 150, lthr: 165 })?.method).toBe("power");
    expect(bestTss({ durationS: 3600, avgHr: 150, lthr: 165 })?.method).toBe("hr");
    expect(bestTss({ durationS: 3600, rpe: 5 })?.method).toBe("rpe");
    expect(bestTss({ durationS: 3600 })).toBeNull();
  });

  it("power curve finds the best 5 min block", () => {
    const data = [...new Array(600).fill(150), ...new Array(300).fill(320), ...new Array(600).fill(150)];
    expect(powerCurve(data)["300"]).toBe(320);
  });

  it("resampling fills recording gaps with 0 W", () => {
    expect(resampleTo1Hz([{ t: 0, power: 100 }, { t: 3, power: 100 }])).toEqual([100, 0, 0, 100]);
  });
});

describe("load", () => {
  it("CTL rises towards daily TSS under constant load", () => {
    const daily = Array.from({ length: 200 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      tss: 80,
    }));
    const points = computeLoad(daily, daily[0].date, daily[daily.length - 1].date);
    const last = points[points.length - 1];
    expect(last.ctl).toBeGreaterThan(75);
    expect(last.atl).toBeCloseTo(80, 0);
  });

  it("interprets strongly negative form as risk", () => {
    expect(interpretForm(-40).tone).toBe("risk");
    expect(interpretForm(0).tone).toBe("neutral");
  });
});
