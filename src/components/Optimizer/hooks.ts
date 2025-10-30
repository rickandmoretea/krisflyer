import { useMemo } from "react";
import { clamp } from "../../lib/utils";
import { TARGET_MILES } from "../../lib/constants";

export function useNormalizedShares(shareSQ: number, shareFX: number) {
  return useMemo(() => {
    const s = clamp(shareSQ, 0, 100);
    const f = clamp(shareFX, 0, 100 - s);
    const o = 100 - s - f;
    return { s, f, o };
  }, [shareSQ, shareFX]);
}

export function useChosenTargetMiles({
  useCustomTarget,
  customMiles,
  target,
  devaluationPct,
}: {
  useCustomTarget: boolean;
  customMiles: number;
  target: keyof typeof TARGET_MILES;
  devaluationPct: number;
}) {
  return useMemo(
    () =>
      (useCustomTarget
        ? customMiles
        : TARGET_MILES[target]) * (1 + devaluationPct / 100),
    [useCustomTarget, customMiles, target, devaluationPct]
  );
}

export function useSimulation({
  cyclesToSim,
  monthlySpendTHB,
  normShares,
  includeAnnualBonus,
  includeSignupBonus,
  rules,
  card,
}: any) {
  function computeCycle(mthSpend: number) {
    const wantSQ = (normShares.s / 100) * mthSpend;
    const wantFX = (normShares.f / 100) * mthSpend;
    const wantOther = (normShares.o / 100) * mthSpend;
    // SINGAPORE AIRLINES/SCOOT/KRISSHOP
    const sqEligible = Math.min(wantSQ, rules.capSQ);
    const sqOverflow = Math.max(0, wantSQ - sqEligible);
    // DUTY FREE/FX
    const fxEligible = Math.min(wantFX, rules.capFX);
    const fxOverflow = Math.max(0, wantFX - fxEligible);
    // OTHER = all else + overflow
    const otherTotal = wantOther + sqOverflow + fxOverflow;
    const milesSQ = sqEligible / rules.rateSQ + sqOverflow / 20;
    const milesFX = fxEligible / rules.rateFX + fxOverflow / 20;
    const milesOther = otherTotal / rules.rateOther;
    const cycleMiles = milesSQ + milesFX + milesOther;
    return { sqEligible, fxEligible, otherTotal, milesSQ, milesFX, milesOther, cycleMiles };
  }

  return useMemo(() => {
    const months = cyclesToSim;
    const rows: any[] = [];
    let cumMiles = 0;
    let cumSpend = 0;
    let postedBonus = false;
    let yearSpend = 0;
    for (let m = 1; m <= months; m++) {
      const c = computeCycle(monthlySpendTHB);
      cumMiles += c.cycleMiles;
      cumSpend += monthlySpendTHB;
      yearSpend += monthlySpendTHB;
      let bonusThisMonth = 0;
      if (includeAnnualBonus && card === "elite" && !postedBonus && m % 12 === 1 && yearSpend >= rules.annualBonusThresholdTHB && rules.annualBonusMiles > 0) {
        bonusThisMonth = rules.annualBonusMiles;
        cumMiles += bonusThisMonth;
        postedBonus = true;
      }
      let signupMiles = 0;
      if (includeSignupBonus && m === 1 && rules.signupBonusMiles > 0) {
        signupMiles = rules.signupBonusMiles;
        cumMiles += signupMiles;
      }
      rows.push({
        month: m,
        spendTHB: monthlySpendTHB,
        milesSQ: c.milesSQ,
        milesFX: c.milesFX,
        milesOther: c.milesOther,
        milesThisMonth: c.cycleMiles + bonusThisMonth + signupMiles,
        cumMiles: cumMiles,
        cumSpend: cumSpend,
        bonus: bonusThisMonth,
        signup: signupMiles,
      });
      if (m % 12 === 0) {
        yearSpend = 0;
        postedBonus = false;
      }
    }
    return rows;
  }, [cyclesToSim, monthlySpendTHB, normShares, includeAnnualBonus, includeSignupBonus, rules, card]);
}

export function useSolveForTarget(sim: any[], targetMiles: number) {
  return useMemo(() => {
    const row = sim.find((r) => r.cumMiles >= targetMiles);
    if (!row) return null;
    const months = row.month;
    const spend = row.cumSpend;
    const thbPerMile = spend / targetMiles;
    return { months, spend, thbPerMile };
  }, [sim, targetMiles]);
}
