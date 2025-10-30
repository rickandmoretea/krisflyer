"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TooltipProvider } from "./ui/tooltip";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { CARD_RULES, TargetKey, CardKey, TARGET_MILES } from "../lib/constants";
import { clamp, r0, r2, fmtTHB, fmt } from "../lib/utils";

const EXCLUDED_MCCS = "MCC 5411 (supermarkets), MCC 5541 (gasoline), MCC 4900 (utilities), all e-wallet top-ups, PayAnything, Makro, spending in THB at overseas merchants, tax refunds, interest, and fees";

const Optimizer: React.FC = () => {
  const [card, setCard] = useState<CardKey>("elite");
  const [monthlySpendTHB, setMonthlySpendTHB] = useState(120000);
  const [shareSQ, setShareSQ] = useState(40);
  const [shareFX, setShareFX] = useState(30);
  // shareOther is not settable - always computed
  const [target, setTarget] = useState<TargetKey>("saver");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [customMiles, setCustomMiles] = useState(122500);
  const [includeAnnualBonus, setIncludeAnnualBonus] = useState(true);
  const [includeSignupBonus, setIncludeSignupBonus] = useState(card==="world");
  const [devaluationPct, setDevaluationPct] = useState(0);
  const [estTaxesFeesTHB, setEstTaxesFeesTHB] = useState(8000);
  const [cyclesToSim, setCyclesToSim] = useState(24);
  const [simpleMode, setSimpleMode] = useState(true);

  const rules = CARD_RULES[card];
  const normShares = useMemo(() => {
    const s = clamp(shareSQ, 0, 100);
    const f = clamp(shareFX, 0, 100 - s);
    const o = 100 - s - f;
    return { s, f, o };
  }, [shareSQ, shareFX]);

  const chosenTargetMiles = useMemo(() => {
    return (useCustomTarget ? customMiles : TARGET_MILES[target]) * (1 + devaluationPct / 100);
  }, [useCustomTarget, customMiles, target, devaluationPct]);

  // Core T&C accurate cycle earn
  function computeCycle(mthSpend: number) {
    const wantSQ = (normShares.s / 100) * mthSpend; // SQ/Scoot/KrisShop
    const wantFX = (normShares.f / 100) * mthSpend; // Duty Free/FX
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

  // Simulate cycles, showing progress each month (for graph)
  const sim = useMemo(() => {
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
      if (includeAnnualBonus && card==="elite" && !postedBonus && m % 12 === 1 && yearSpend >= rules.annualBonusThresholdTHB && rules.annualBonusMiles > 0) {
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
        milesSQ: r2(c.milesSQ),
        milesFX: r2(c.milesFX),
        milesOther: r2(c.milesOther),
        milesThisMonth: r2(c.cycleMiles + bonusThisMonth + signupMiles),
        cumMiles: r2(cumMiles),
        cumSpend: r0(cumSpend),
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

  // Find cycles & spend to meet target
  function solveForTarget(targetMiles: number) {
    const row = sim.find((r) => r.cumMiles >= targetMiles);
    if (!row) return null;
    const months = row.month;
    const spend = row.cumSpend;
    const thbPerMile = spend / targetMiles;
    return { months, spend, thbPerMile };
  }

  const pointChosen = solveForTarget(chosenTargetMiles);

  // Direct panel answers
  function SpendPanel() {
    // Best case: 100% at best category up to the cap (no overflow)
    const milesToGo = chosenTargetMiles - (card==="elite" && includeAnnualBonus ? rules.annualBonusMiles : 0) - (card==="world" && includeSignupBonus ? rules.signupBonusMiles : 0);
    const rateBest = rules.rateSQ; // For both cards, best rate is SQ/Scoot/KrisShop
    const spendBest = Math.max(0, milesToGo * rateBest);
    const cyclesBest = monthlySpendTHB > 0 ? Math.ceil(spendBest / monthlySpendTHB) : 0;
    const rateFX = rules.rateFX;
    // If user enters a mix, calculate mix spend required
    const spendMix = milesToGo / (
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
              <div className="text-sm font-semibold text-emerald-700 mb-1">Best-case: 100% at {card === "elite" ? "SQ/Scoot/KrisShop (1/12.5)" : "SQ/Scoot/KrisShop (1/15)"}</div>
              <div>Spend needed: <span className="font-bold text-lg">{fmtTHB(spendBest)}</span></div>
              <div className="text-sm text-zinc-500">{cyclesBest} cycles at your monthly spend</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-2 border-amber-400">
            <CardContent className="p-4 space-y-1">
              <div className="text-sm font-semibold text-amber-700 mb-1">Your current mix ({normShares.s}% SQ/KrisShop, {normShares.f}% Duty Free/FX)</div>
              <div>Spend needed: <span className="font-bold text-lg">{fmtTHB(spendMix)}</span></div>
              <div className="text-sm text-zinc-500">{cyclesMix} cycles at your monthly spend</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-2 border-rose-400">
            <CardContent className="p-4 space-y-1">
              <div className="text-sm font-semibold text-rose-700 mb-1">Worst-case: all spend at 1/20</div>
              <div>Spend needed: <span className="font-bold text-lg">{fmtTHB(spendWorst)}</span></div>
              <div className="text-sm text-zinc-500">{cyclesWorst} cycles at your monthly spend</div>
            </CardContent>
          </Card>
        </div>
        <div className="mb-2 p-3 rounded bg-yellow-50 border-l-4 border-yellow-300 text-yellow-800 text-xs">
          <span className="font-bold">Warning:</span> Excluded categories (NO miles): {EXCLUDED_MCCS}.
        </div>
      </>
    );
  }

  // Panel for cap/overflow awareness
  function CapPanel() {
    return (
      <div className="mb-3 text-xs text-zinc-700">
        <span className="font-bold">Category cap per cycle:</span> <br/>
        {card === "elite"
          ? "THB 200,000 for SQ/Scoot/KrisShop, THB 200,000 for Duty Free/FX. Over this, earn drops to 1/20."
          : "THB 100,000 for SQ/Scoot/KrisShop, THB 50,000 for Duty Free/FX. Over this, earn drops to 1/20."}
        <br/>
        Choose a spend mix/amount that keeps as much as possible inside these caps each month for maximum miles!
      </div>
    );
  }

  const expiryWarn = Boolean(pointChosen && pointChosen.months > 34);

  return (
    <TooltipProvider>
      <div className="w-full min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
            UOB KrisFlyer Spend→Miles Requirement Calculator
          </motion.h1>
          <div className="text-zinc-600 mb-1">
            <span className="font-semibold">How much do I need to spend to get {fmt(r0(chosenTargetMiles))} miles ({useCustomTarget ? 'custom' : target}) on {rules.name}?</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Label>Choose Card:</Label>
            <Select value={card} onValueChange={(v) => { setCard(v as CardKey); setIncludeSignupBonus(v === "world"); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="elite">UOB KrisFlyer World Elite</SelectItem>
                <SelectItem value="world">UOB KrisFlyer World</SelectItem>
              </SelectContent>
            </Select>
            <Label className="ml-4">Award Target Miles:</Label>
            <Select value={target} onValueChange={(v) => { setTarget(v as TargetKey); setUseCustomTarget(false); }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saver">SQ Saver (122,500)</SelectItem>
                <SelectItem value="advantage">SQ Advantage (172,000)</SelectItem>
                <SelectItem value="star">Star Alliance OW (131,000)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 ml-2">
              <Switch checked={useCustomTarget} onCheckedChange={setUseCustomTarget} />
              <Label>Custom</Label>
              <Input type="number" className="w-24 ml-1" value={customMiles} min={0} max={500000} onChange={e => setCustomMiles(clamp(Number(e.target.value), 0, 500000))} disabled={!useCustomTarget} />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <Label>Monthly Spend (THB):</Label>
            <Input type="number" className="w-36" value={monthlySpendTHB} min={0} max={10000000} onChange={e => setMonthlySpendTHB(clamp(Number(e.target.value), 0, 10000000))} />
            <Label className="ml-8">Your normal monthly split:</Label>
            <Label>SQ/Scoot %</Label>
            <Slider value={[normShares.s]} max={100} step={1} onValueChange={([v]) => setShareSQ(v)} className="w-24" />
            <Label>DutyFree/FX %</Label>
            <Slider value={[normShares.f]} max={100 - normShares.s} step={1} onValueChange={([v]) => setShareFX(v)} className="w-24" />
            <Label>Other %</Label>
            <span>{normShares.o}%</span>
          </div>
          <SpendPanel />
          <CapPanel />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card className="rounded-xl border">
              <CardContent className="p-4">
                <div className="font-semibold mb-2">Months/Cycles until you reach your miles</div>
                {pointChosen ? (
                  <>
                    <div className="text-lg font-bold">{pointChosen.months} cycles</div>
                    <div className="text-sm text-zinc-600">Estimated total spend: {fmtTHB(pointChosen.spend)}</div>
                    <div className="text-sm text-zinc-600">Effective THB per mile: {r2(pointChosen.thbPerMile)}</div>
                    {card==="elite" && includeAnnualBonus && (
                      <div className="text-xs mt-1 text-emerald-700">Annual bonus (25,000 miles) applies after THB 1M/year, posts after year end and renewal.</div>
                    )}
                    {card==="world" && includeSignupBonus && (
                      <div className="text-xs mt-1 text-emerald-700">Sign-up bonus (5,000 miles) applies in month 1 if toggled.</div>
                    )}
                  </>
                ) : (
                  <div className="text-zinc-500">Increase cycles or monthly spend to hit your target.</div>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-xl border">
              <CardContent className="p-4">
                <div className="font-semibold mb-2">Visualize Accrual</div>
                <div className="h-56">
                  <ResponsiveContainer>
                    <LineChart data={sim}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={v => `M${v}`} />
                      <YAxis tickFormatter={v => `${(v as number / 1000).toFixed(0)}k`} />
                      <RTooltip formatter={(v: any) => `${fmt(r0(v as number))} mi`} />
                      <Line type="monotone" dataKey="cumMiles" strokeWidth={2} dot={false} name="Cumulative Miles" />
                      <ReferenceLine y={chosenTargetMiles} stroke="#111" strokeDasharray="4 2" label={`Target (${fmt(r0(chosenTargetMiles))})`} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="rounded-xl border">
              <CardContent className="p-4 space-y-2">
                <div className="text-md font-semibold mb-1">More info</div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
                  <li>More spend in SQ/Scoot/KrisShop bucket = faster earn (until cap, then next best is DutyFree/FX; try to keep largest spend below caps).</li>
                  <li>Caps: {card === "elite" ? "THB 200,000/cycle for each (SQ&FX)" : "THB 100,000/cycle (SQ), THB 50,000/cycle (FX)"}</li>
                  <li>If you spend more than cap, overflow goes to "other" rate (1 mile/THB 20).</li>
                  <li>Exclusions: {EXCLUDED_MCCS} (see card T&Cs for full details).</li>
                  <li>KrisFlyer miles are valid for 3 years after posting. Consider faster accrual + redeem sooner for best value.</li>
                  <li>Elite: Annual bonus +25k miles after THB 1M/year (must renew).</li>
                  <li>World: 5k signup promo bonus if toggled on.</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-xl border">
              <CardContent className="p-4 space-y-2">
                <div className="text-md font-semibold mb-1">Category Rules (Official, condensed)</div>
                <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
                  <li>SQ/Scoot/KrisShop: {card === "elite" ? "1/12.5 (cap 200k/cycle)" : "1/15 (cap 100k/cycle)"}</li>
                  <li>Duty Free/FX: 1/15 (cap {card === "elite" ? "200k" : "50k"}/cycle)</li>
                  <li>Other: 1/20, includes overflow/uncategorized spend</li>
                  <li>Annual bonus: Elite only, 25,000 miles on THB 1M/year (with renewal, posts after year).</li>
                  <li>SignUp bonus: World only, 5,000 miles one-time (toggle in UI if eligible).</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          {expiryWarn && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              ⚠️ Expiry risk: at your current plan it may take {pointChosen?.months} cycles to reach the chosen award. Miles post about 10 days after each statement and expire 36 months after posting. Consider increasing monthly spend, improving earn mix, redeeming sooner, or aiming for a smaller target.
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Optimizer;
