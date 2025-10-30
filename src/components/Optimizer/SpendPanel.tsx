import React from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import { fmtTHB, clamp } from "../../lib/utils";

const EXCLUDED_MCCS = "MCC 5411 (supermarkets), MCC 5541 (gasoline), MCC 4900 (utilities), all e-wallet top-ups, PayAnything, Makro, spending in THB at overseas merchants, tax refunds, interest, and fees";

export interface RequiredSpendPanelProps {
  chosenTargetMiles: number;
  rules: any;
  normShares: { s: number; f: number; o: number };
  monthlySpendTHB: number;
}

export const RequiredSpendPanel: React.FC<RequiredSpendPanelProps> = ({ chosenTargetMiles, rules, normShares, monthlySpendTHB }) => {
  // Compute "your mix" spend and months
  const milesToGo = chosenTargetMiles;
  const spendMix =
    milesToGo /
    (
      normShares.s / 100 / rules.rateSQ +
      normShares.f / 100 / rules.rateFX +
      normShares.o / 100 / rules.rateOther
    );
  const months = monthlySpendTHB > 0 ? Math.ceil(spendMix / monthlySpendTHB) : 0;
  return (
    <Card className="rounded-xl border-2 border-amber-400 mb-4">
      <CardContent className="p-4 space-y-2">
        <div className="text-lg font-bold mb-1 text-amber-600">Your Required Spend</div>
        <div className="text-md">You'll need to spend about <span className="font-bold">{fmtTHB(spendMix)}</span> in total — roughly <span className="font-bold">{months} months</span> at your current pace.</div>
      </CardContent>
    </Card>
  );
};

export interface CompareSpendPanelProps {
  chosenTargetMiles: number;
  card: string;
  rules: any;
  monthlySpendTHB: number;
}

export const CompareSpendPanel: React.FC<CompareSpendPanelProps> = ({ chosenTargetMiles, card, rules, monthlySpendTHB }) => {
  // Best case: SQ rate only, all spend at best category up to cap
  const milesToGo = chosenTargetMiles;
  const bestRate = rules.rateSQ;
  const spendBest = milesToGo * bestRate;
  const monthsBest = monthlySpendTHB > 0 ? Math.ceil(spendBest / monthlySpendTHB) : 0;
  // Worst = always at 1/20
  const spendWorst = milesToGo * 20;
  const monthsWorst = monthlySpendTHB > 0 ? Math.ceil(spendWorst / monthlySpendTHB) : 0;
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-2">
      <Card className="rounded-xl border-2 border-emerald-400 flex-1">
        <CardContent className="p-4 space-y-1">
          <div className="font-semibold text-emerald-700">Best case (all SQ):</div>
          <div>Spend <span className="font-bold">{fmtTHB(spendBest)}</span> (about {monthsBest} months if all at SQ/foreign flights)</div>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-2 border-rose-400 flex-1">
        <CardContent className="p-4 space-y-1">
          <div className="font-semibold text-rose-700">Slowest case (all Other):</div>
          <div>Spend <span className="font-bold">{fmtTHB(spendWorst)}</span> (about {monthsWorst} months at slowest rate)</div>
        </CardContent>
      </Card>
    </div>
  );
};

export interface SpendPanelProps {
  card: string;
  chosenTargetMiles: number;
  includeAnnualBonus: boolean;
  includeSignupBonus: boolean;
  rules: any;
  normShares: { s: number; f: number; o: number };
  monthlySpendTHB: number;
}

const SpendPanel: React.FC<SpendPanelProps> = ({
  card,
  chosenTargetMiles,
  includeAnnualBonus,
  includeSignupBonus,
  rules,
  normShares,
  monthlySpendTHB,
}) => {
  // Best case: 100% at best category up to the cap (no overflow)
  const milesToGo =
    chosenTargetMiles -
    (card === "elite" && includeAnnualBonus ? rules.annualBonusMiles : 0) -
    (card === "world" && includeSignupBonus ? rules.signupBonusMiles : 0);
  const rateBest = rules.rateSQ; // For both cards, best rate is SQ/Scoot/KrisShop
  const spendBest = Math.max(0, milesToGo * rateBest);
  const cyclesBest = monthlySpendTHB > 0 ? Math.ceil(spendBest / monthlySpendTHB) : 0;
  const rateFX = rules.rateFX;
  // If user enters a mix, calculate mix spend required
  const spendMix =
    milesToGo /
    (
      normShares.s / 100 / rules.rateSQ +
      normShares.f / 100 / rules.rateFX +
      normShares.o / 100 / rules.rateOther
    );
  const cyclesMix = monthlySpendTHB > 0 ? Math.ceil(spendMix / monthlySpendTHB) : 0;
  // Worst case: all spend at 1/20
  const spendWorst = Math.max(0, milesToGo * 20);
  const cyclesWorst = monthlySpendTHB > 0 ? Math.ceil(spendWorst / monthlySpendTHB) : 0;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-xl border-2 border-emerald-400">
          <CardContent className="p-4 space-y-1">
            <div className="text-sm font-semibold text-emerald-700 mb-1">
              Best-case: 100% at {card === "elite" ? "SQ/Scoot/KrisShop (Earn 1 mile per THB 12.5)" : "SQ/Scoot/KrisShop (Earn 1 mile per THB 15)"}
            </div>
            <div>
              Spend needed: <span className="font-bold text-lg">{fmtTHB(spendBest)}</span>
            </div>
            <div className="text-sm text-zinc-500">{cyclesBest} cycles at your monthly spend</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-2 border-rose-400">
          <CardContent className="p-4 space-y-1">
            <div className="text-sm font-semibold text-rose-700 mb-1">Worst-case: all spend at Earn 1 mile per THB 20</div>
            <div>
              Spend needed: <span className="font-bold text-lg">{fmtTHB(spendWorst)}</span>
            </div>
            <div className="text-sm text-zinc-500">{cyclesWorst} cycles at your monthly spend</div>
          </CardContent>
        </Card>
      </div>
      <div className="mb-2 p-3 rounded bg-yellow-50 border-l-4 border-yellow-300 text-yellow-800 text-xs flex flex-col gap-1">
        <div className="font-bold mb-1"><span role="img" aria-label="warning">🚫</span> These categories earn 0 miles — avoid if you want to maximize points.</div>
        <span>Excluded categories (NO miles): {EXCLUDED_MCCS}.</span>
      </div>
    </>
  );
};

export default SpendPanel;
