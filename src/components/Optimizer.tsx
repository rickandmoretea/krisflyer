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

const Optimizer: React.FC = () => {
  // --- All state and code here is directly migrated from your .jsx, types added
  const [card, setCard] = useState<CardKey>("elite");
  const [monthlySpendTHB, setMonthlySpendTHB] = useState(120000);
  const [shareSQ, setShareSQ] = useState(20);
  const [shareFX, setShareFX] = useState(30);
  const [shareOther] = useState(50); // still computed below, here for compatibility
  const [target, setTarget] = useState<TargetKey>("saver");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [customMiles, setCustomMiles] = useState(122500);
  const [altTargetForMix] = useState<TargetKey>("advantage");
  const [pSaver, setPSaver] = useState(70);
  const [includeAnnualBonus, setIncludeAnnualBonus] = useState(true);
  const [includeSignupBonus, setIncludeSignupBonus] = useState(false);
  const [devaluationPct, setDevaluationPct] = useState(0);
  const [estTaxesFeesTHB, setEstTaxesFeesTHB] = useState(8000);
  const [cyclesToSim, setCyclesToSim] = useState(18);
  const [simpleMode, setSimpleMode] = useState(true);

  const normShares = useMemo(() => {
    const s = clamp(shareSQ, 0, 100);
    const f = clamp(shareFX, 0, 100 - s);
    const o = 100 - s - f;
    return { s, f, o };
  }, [shareSQ, shareFX]);

  const rules = CARD_RULES[card];

  const expectedTargetMiles = useMemo(() => {
    if (useCustomTarget) return customMiles * (1 + devaluationPct / 100);
    const baseSaver = TARGET_MILES.saver;
    const baseAlt = TARGET_MILES[altTargetForMix];
    const expected = (pSaver / 100) * baseSaver + (1 - pSaver / 100) * baseAlt;
    return expected * (1 + devaluationPct / 100);
  }, [pSaver, altTargetForMix, devaluationPct, useCustomTarget, customMiles]);

  const chosenTargetMiles = useMemo(() => {
    return (useCustomTarget ? customMiles : TARGET_MILES[target]) * (1 + devaluationPct / 100);
  }, [useCustomTarget, customMiles, target, devaluationPct]);

  function computeCycle(mthSpend: number) {
    const wantSQ = (normShares.s / 100) * mthSpend;
    const wantFX = (normShares.f / 100) * mthSpend;
    const wantOther = (normShares.o / 100) * mthSpend;
    const sqEligible = Math.min(wantSQ, rules.capSQ);
    const fxEligible = Math.min(wantFX, rules.capFX);
    const sqOverflow = Math.max(0, wantSQ - sqEligible);
    const fxOverflow = Math.max(0, wantFX - fxEligible);
    const otherTotal = wantOther + sqOverflow + fxOverflow;
    const milesSQ = sqEligible / rules.rateSQ + sqOverflow / 20;
    const milesFX = fxEligible / rules.rateFX + fxOverflow / 20;
    const milesOther = otherTotal / rules.rateOther;
    const cycleMiles = milesSQ + milesFX + milesOther;
    return { sqEligible, fxEligible, otherTotal, milesSQ, milesFX, milesOther, cycleMiles };
  }

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
      if (includeAnnualBonus && !postedBonus && m > 12 && yearSpend >= rules.annualBonusThresholdTHB && rules.annualBonusMiles > 0) {
        bonusThisMonth = rules.annualBonusMiles;
        cumMiles += bonusThisMonth;
        postedBonus = true;
      }
      let signupMiles = 0;
      if (includeSignupBonus && m === 1 && CARD_RULES.world.signupBonusMiles > 0) {
        signupMiles = CARD_RULES.world.signupBonusMiles;
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
  }, [cyclesToSim, monthlySpendTHB, normShares, includeAnnualBonus, includeSignupBonus, rules]);

  function solveForTarget(targetMiles: number) {
    const row = sim.find((r) => r.cumMiles >= targetMiles);
    if (!row) return null;
    const months = row.month;
    const spend = row.cumSpend;
    const thbPerMile = spend / targetMiles;
    return { months, spend, thbPerMile };
  }

  const pointChosen = solveForTarget(chosenTargetMiles);
  const pointExpected = solveForTarget(expectedTargetMiles);

  const lb12_5 = TARGET_MILES.saver * 12.5;
  const lb15 = TARGET_MILES.saver * 15;
  const lb20 = TARGET_MILES.saver * 20;
  const dLB12_5 = chosenTargetMiles * 12.5;
  const dLB15 = chosenTargetMiles * 15;
  const dLB20 = chosenTargetMiles * 20;

  const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="flex flex-col p-4 rounded-2xl bg-white/50 shadow-sm border">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl md:text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );

  const expiryWarn = Boolean(pointChosen && pointChosen.months > 34);

  function BestRatePanel() {
    const bestRate = card === "elite" ? rules.rateSQ : 15;
    const bonus = includeAnnualBonus ? rules.annualBonusMiles || 0 : 0;
    const need = chosenTargetMiles - bonus;
    const thb = Math.max(0, need) * bestRate;
    const months = monthlySpendTHB > 0 ? Math.ceil(thb / monthlySpendTHB) : Infinity;
    return (
      <>
        <div className="mt-3 text-sm text-zinc-600">Spend needed:</div>
        <div className="text-2xl font-semibold">{fmtTHB(thb)}</div>
        <div className="mt-3 text-sm text-zinc-600">Est. cycles at your spend:</div>
        <div className="text-xl font-semibold">{isFinite(months) ? months : "—"} cycles</div>
        <div className="text-xs text-zinc-500 mt-1">Reality check: caps apply per cycle; see tips below.</div>
      </>
    );
  }

  function TypicalMixPanel() {
    const spend = 1;
    const sq = 0.4 * spend;
    const fx = 0.3 * spend;
    const ot = 0.3 * spend;
    const milesPerTHB = sq / rules.rateSQ + fx / rules.rateFX + ot / 20;
    const thbPerMile = 1 / milesPerTHB;
    const bonus = includeAnnualBonus ? rules.annualBonusMiles || 0 : 0;
    const need = Math.max(0, chosenTargetMiles - bonus);
    const thb = need * thbPerMile;
    const months = monthlySpendTHB > 0 ? Math.ceil(thb / monthlySpendTHB) : Infinity;
    return (
      <>
        <div className="text-sm text-zinc-600">Effective earn ≈ {r2(1 / thbPerMile)} miles/THB</div>
        <div className="mt-3 text-sm text-zinc-600">Spend needed:</div>
        <div className="text-2xl font-semibold">{fmtTHB(thb)}</div>
        <div className="mt-3 text-sm text-zinc-600">Est. cycles at your spend:</div>
        <div className="text-xl font-semibold">{isFinite(months) ? months : "—"} cycles</div>
      </>
    );
  }

  function WorstCasePanel() {
    const bonus = includeAnnualBonus ? rules.annualBonusMiles || 0 : 0;
    const need = Math.max(0, chosenTargetMiles - bonus);
    const thb = need * 20;
    const months = monthlySpendTHB > 0 ? Math.ceil(thb / monthlySpendTHB) : Infinity;
    return (
      <>
        <div className="mt-3 text-sm text-zinc-600">Spend needed:</div>
        <div className="text-2xl font-semibold">{fmtTHB(thb)}</div>
        <div className="mt-3 text-sm text-zinc-600">Est. cycles at your spend:</div>
        <div className="text-xl font-semibold">{isFinite(months) ? months : "—"} cycles</div>
      </>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-4xl font-bold tracking-tight">
            UOB KrisFlyer Spend→Miles Optimizer
          </motion.h1>
          <div className="text-zinc-600">
            Model your path to <span className="font-medium">BKK→JFK Business</span> using KrisFlyer miles. Adjust spend mix, caps, bonuses, and award availability.
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border shadow-sm">
            <div>
              <div className="font-medium">Simple mode (easier for everyone)</div>
              <div className="text-xs text-zinc-500">Shows how much to spend and practical tips. Switch off for full quant controls.</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">Off</span>
              <Switch checked={simpleMode} onCheckedChange={setSimpleMode} />
              <span className="text-xs text-zinc-600">On</span>
            </div>
          </div>
          {simpleMode && (
            <>
              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label>Card</Label>
                      <Select value={card} onValueChange={(v) => setCard(v as CardKey)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elite">UOB KrisFlyer World Elite</SelectItem>
                          <SelectItem value="world">UOB KrisFlyer World</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-zinc-500 mt-1">Elite earns best rate on SQ at 1/12.5; World at 1/15.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Award</Label>
                      <Select value={target} onValueChange={(v) => setTarget(v as TargetKey)} disabled={useCustomTarget}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saver">SQ Saver (122,500)</SelectItem>
                          <SelectItem value="advantage">SQ Advantage (172,000)</SelectItem>
                          <SelectItem value="star">Star Alliance OW (131,000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Use custom miles?</Label>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border">
                        <div className="text-xs text-zinc-600">Enter your own target miles</div>
                        <Switch checked={useCustomTarget} onCheckedChange={setUseCustomTarget} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom miles</Label>
                      <Input type="number" value={customMiles} onChange={(e) => setCustomMiles(clamp(parseInt(e.target.value || "0"), 0, 500000))} disabled={!useCustomTarget} />
                      <div className="text-xs text-zinc-500">Example: 90,000 for regional J, 200,000+ for long-haul J roundtrip.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Typical Monthly Spend (THB)</Label>
                      <Input type="number" value={monthlySpendTHB} onChange={(e) => setMonthlySpendTHB(clamp(parseInt(e.target.value || "0"), 0, 10000000))} />
                      <div className="text-xs text-zinc-500">We’ll estimate time-to-award from this.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">If all spend earns at best rate</div>
                      <div className="text-sm text-zinc-600">Elite best: 1 mile per THB 12.5 (SQ). World best: 1 per THB 15.</div>
                      <BestRatePanel />
                    </div>
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">Typical mix (40% SQ, 30% FX, 30% other)</div>
                      <TypicalMixPanel />
                    </div>
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">Worst case (all local @ 1/20)</div>
                      <WorstCasePanel />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="rounded-xl"><CardContent className="p-4 space-y-2">
                      <div className="text-lg font-semibold">Quick tips to earn faster</div>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
                        <li>Buy SQ/Scoot tickets or KrisShop via the card to earn at the best rate (Elite 1/12.5; World 1/15).</li>
                        <li>Put foreign-currency spend and duty-free on the card (1/15) — but keep within the cap each cycle.</li>
                        <li>Avoid supermarket (MCC 5411), gasoline (MCC 5541), utilities (MCC 4900), e-wallet top-ups — they don’t earn.</li>
                        <li>Watch the per-cycle caps: overflow drops to 1/20. If you’re close to the cap, split purchases across statements.</li>
                        <li>Consider the annual +25,000 miles plan (Elite): hit ≥ THB 1M in a membership year — miles post after year end.</li>
                        <li>Plan booking windows: Saver seats are scarce. Have Star Alliance (131k) or Advantage (172k) as backups.</li>
                      </ul>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="p-4 space-y-2">
                      <div className="text-lg font-semibold">Hidden info & gotchas</div>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
                        <li><span className="font-medium">Auto-transfer timing</span>: points convert to KrisFlyer miles automatically ~10 days after each statement cycle; the <span className="font-medium">posting date controls the 3-year expiry</span>.</li>
                        <li><span className="font-medium">Miles expiry</span>: KrisFlyer miles expire 3 years after posting. Slow accrual can lead to early miles expiring before you reach a big target.</li>
                        <li><span className="font-medium">Low-spend caution</span>: If you spend a small amount monthly, consider smaller redemptions or top-ups — this card is most efficient if you can also hit the annual 25,000-mile bonus at THB 1,000,000/year.</li>
                        <li><span className="font-medium">Foreign spend rule</span>: only true foreign-currency counts (avoid DCC/MCP which convert to THB at the terminal).</li>
                        <li><span className="font-medium">MCC exclusions</span>: supermarket (5411), gasoline (5541), utilities (4900), e-wallet top-ups, etc., may not earn miles.</li>
                      </ul>
                    </CardContent></Card>
                  </div>
                  <Card className="rounded-xl"><CardContent className="p-4 space-y-2">
                    <div className="text-lg font-semibold">KrisFlyer Elite status shortcuts (nice-to-have)</div>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
                      <li><span className="font-medium">World Elite → Fast track to KrisFlyer Elite Gold</span> when you spend ~THB 300,000 on SQ/Scoot/KrisShop in the first membership year.</li>
                      <li><span className="font-medium">World → Fast track to KrisFlyer Elite Silver</span> when you spend THB 100,000 on SQ/Scoot/KrisShop in the first year.</li>
                      <li>Elite Gold = Star Alliance Gold benefits (lounge with a guest, priority check-in/boarding, extra baggage on SQ).</li>
                    </ul>
                  </CardContent></Card>
                </CardContent>
              </Card>
            </>
          )}

          {!simpleMode && (
            <>
              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4 md:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Card</Label>
                      <Select value={card} onValueChange={(v) => setCard(v as CardKey)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elite">UOB KrisFlyer World Elite</SelectItem>
                          <SelectItem value="world">UOB KrisFlyer World</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-zinc-500 mt-1">Elite caps: 200k/cycle for 12.5 & 15 buckets. World caps: 100k (SQ) & 50k (FX).</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Spend (THB)</Label>
                      <Input type="number" value={monthlySpendTHB} onChange={(e) => setMonthlySpendTHB(clamp(parseInt(e.target.value || "0"), 0, 10000000))} />
                      <div className="text-xs text-zinc-500">Total credit card spend per statement cycle.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cycles to simulate</Label>
                      <Input type="number" value={cyclesToSim} onChange={(e) => setCyclesToSim(clamp(parseInt(e.target.value || "1"), 1, 48))} />
                      <div className="text-xs text-zinc-500">Use ~18 to see 1.5 years of accrual.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><Label>SQ/Scoot/KrisShop %</Label><span className="text-sm text-zinc-600">{normShares.s}%</span></div>
                      <Slider value={[normShares.s]} max={100} step={1} onValueChange={([v]) => setShareSQ(v)} />
                      <div className="text-xs text-zinc-500">Earns at {card === "elite" ? "1/12.5" : "1/15"} up to cap; overflow at 1/20.</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><Label>FX/Duty Free %</Label><span className="text-sm text-zinc-600">{normShares.f}%</span></div>
                      <Slider value={[normShares.f]} max={100 - normShares.s} step={1} onValueChange={([v]) => setShareFX(v)} />
                      <div className="text-xs text-zinc-500">Earns at 1/15 up to cap; overflow at 1/20.</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><Label>Other %</Label><span className="text-sm text-zinc-600">{normShares.o}%</span></div>
                      <div className="text-xs text-zinc-500">Auto = 100 - SQ - FX. Earns at 1/20.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Use custom miles?</Label>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border">
                        <div className="text-xs text-zinc-600">Enter your own target miles</div>
                        <Switch checked={useCustomTarget} onCheckedChange={setUseCustomTarget} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Chosen Award Target</Label>
                      <Select value={target} onValueChange={(v) => setTarget(v as TargetKey)} disabled={useCustomTarget}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saver">SQ Saver (122,500)</SelectItem>
                          <SelectItem value="advantage">SQ Advantage (172,000)</SelectItem>
                          <SelectItem value="star">Star Alliance OW (131,000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom miles</Label>
                      <Input type="number" value={customMiles} onChange={(e) => setCustomMiles(clamp(parseInt(e.target.value || "0"), 0, 500000))} disabled={!useCustomTarget} />
                      <div className="text-xs text-zinc-500">Set target miles when not using preset awards.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Availability Mix: p(Saver)</Label>
                      <div className="flex items-center gap-3">
                        <Slider value={[pSaver]} max={100} step={1} onValueChange={([v]) => setPSaver(v)} disabled={useCustomTarget} />
                        <span className="w-10 text-right text-sm text-zinc-600">{pSaver}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500"><Info size={14} /> Expected target uses Saver probability vs Alt.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div>
                        <div className="font-medium">Include Annual Bonus (+25,000)</div>
                        <div className="text-xs text-zinc-500">Posts after 12 cycles if ≥1M THB/year.</div>
                      </div>
                      <Switch checked={includeAnnualBonus} onCheckedChange={setIncludeAnnualBonus} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div>
                        <div className="font-medium">Include Sign-up Bonus (+5,000)</div>
                        <div className="text-xs text-zinc-500">World variant promo; model as month 1.</div>
                      </div>
                      <Switch checked={includeSignupBonus} onCheckedChange={setIncludeSignupBonus} />
                    </div>
                    <div className="space-y-2">
                      <Label>Devaluation Shock (%)</Label>
                      <div className="flex items-center gap-3">
                        <Slider value={[devaluationPct]} max={20} step={1} onValueChange={([v]) => setDevaluationPct(v)} />
                        <span className="w-10 text-right text-sm text-zinc-600">{devaluationPct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Estimated Taxes & Fees (THB)</Label>
                      <Input type="number" value={estTaxesFeesTHB} onChange={(e) => setEstTaxesFeesTHB(clamp(parseInt(e.target.value || "0"), 0, 100000))} />
                      <div className="text-xs text-zinc-500">Cash component you still pay at ticketing.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Lower-bound spend @ best rate</Label>
                      <div className="text-lg font-semibold">{fmtTHB(dLB12_5)}</div>
                      <div className="text-xs text-zinc-500">Elite uses 1/12.5; World 1/15.</div>
                    </div>
                    <div className="space-y-2">
                      <Label>… @ 1/15 and 1/20</Label>
                      <div className="text-sm">{fmtTHB(dLB15)} &nbsp; • &nbsp; {fmtTHB(dLB20)}</div>
                      <div className="text-xs text-zinc-500">Benchmarks for sub-optimal mixes.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPI label="Chosen target miles" value={`${fmt(r0(chosenTargetMiles))} mi`} sub={TARGET_MILES[target] !== chosenTargetMiles ? "Includes devaluation or custom" : ""} />
                <KPI label="Expected target miles" value={`${fmt(r0(expectedTargetMiles))} mi`} sub={useCustomTarget ? "Custom target" : `p(Saver)=${pSaver}% vs ${altTargetForMix}`} />
                <KPI label="Miles/month (current mix)" value={`${fmt(r0(sim[0]?.milesThisMonth || 0))} mi`} sub={`at ${fmtTHB(monthlySpendTHB)}/cycle`} />
                <KPI label="Annual bonus modeled" value={includeAnnualBonus && rules.annualBonusMiles > 0 ? `Yes (+${rules.annualBonusMiles})` : "No"} sub={includeAnnualBonus ? `Threshold ${fmtTHB(rules.annualBonusThresholdTHB)}` : "—"} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl shadow-md">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold">Cumulative Miles vs Target</div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer>
                        <LineChart data={sim}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
                          <YAxis tickFormatter={(v) => `${(v as number / 1000).toFixed(0)}k`} />
                          <RTooltip formatter={(v: any, n: any) => (String(n).includes("Miles") ? `${fmt(r0(v as number))} mi` : fmtTHB(v as number))} />
                          <Line type="monotone" dataKey="cumMiles" strokeWidth={2} dot={false} name="Cumulative Miles" />
                          <ReferenceLine y={chosenTargetMiles} stroke="#111" strokeDasharray="4 2" label={`Chosen Target (${fmt(r0(chosenTargetMiles))})`} />
                          <ReferenceLine y={expectedTargetMiles} stroke="#666" strokeDasharray="2 2" label={`Expected Target (${fmt(r0(expectedTargetMiles))})`} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-md">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold">Monthly Miles Breakdown</div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={sim}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
                          <YAxis tickFormatter={(v) => `${(v as number / 1000).toFixed(0)}k`} />
                          <RTooltip formatter={(v: any) => `${fmt(r0(v as number))} mi`} />
                          <Bar dataKey="milesSQ" stackId="a" name="SQ/Scoot/KrisShop" />
                          <Bar dataKey="milesFX" stackId="a" name="FX/Duty Free" />
                          <Bar dataKey="milesOther" stackId="a" name="Other" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div className="text-lg font-semibold">Solutions & Economics</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">Chosen Target</div>
                      {pointChosen ? (
                        <>
                          <div className="text-sm text-zinc-600">Months to reach:</div>
                          <div className="text-2xl font-semibold">{pointChosen.months} cycles</div>
                          <div className="mt-3 text-sm text-zinc-600">Cumulative spend:</div>
                          <div className="text-xl font-semibold">{fmtTHB(pointChosen.spend)}</div>
                          <div className="mt-3 text-sm text-zinc-600">Effective THB/mile:</div>
                          <div className="text-xl font-semibold">{r2(pointChosen.thbPerMile)}</div>
                          <div className="mt-3 text-sm text-zinc-600">TCO (add taxes/fees):</div>
                          <div className="text-xl font-semibold">{fmtTHB(pointChosen.spend + estTaxesFeesTHB)}</div>
                        </>
                      ) : (
                        <div className="text-zinc-500">Increase cycles or adjust mix to hit the target within the horizon.</div>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">Expected Target (Availability-weighted)</div>
                      {pointExpected ? (
                        <>
                          <div className="text-sm text-zinc-600">Months to reach:</div>
                          <div className="text-2xl font-semibold">{pointExpected.months} cycles</div>
                          <div className="mt-3 text-sm text-zinc-600">Cumulative spend:</div>
                          <div className="text-xl font-semibold">{fmtTHB(pointExpected.spend)}</div>
                          <div className="mt-3 text-sm text-zinc-600">Effective THB/mile:</div>
                          <div className="text-xl font-semibold">{r2(pointExpected.thbPerMile)}</div>
                        </>
                      ) : (
                        <div className="text-zinc-500">Extend horizon or improve earn mix.</div>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-white border">
                      <div className="font-medium mb-1">What to Optimize</div>
                      <ul className="text-sm list-disc pl-5 space-y-1 text-zinc-700">
                        <li>Fill best-rate bucket first (SQ at {card === "elite" ? "1/12.5" : "1/15"}) up to cap.</li>
                        <li>Then fill FX/Duty Free (1/15) up to cap.</li>
                        <li>Avoid overflow (falls to 1/20) — shift timing across cycles.</li>
                        <li>Bonus strategy: If chasing +25k, ensure ≥ {fmtTHB(rules.annualBonusThresholdTHB)} in 12 cycles; redemption waits until posting.</li>
                        <li>Use p(Saver) & devaluation sliders to stress-test plan.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Tabs defaultValue="math">
                <TabsList className="grid grid-cols-3 w-full md:w-auto">
                  <TabsTrigger value="math">Math</TabsTrigger>
                  <TabsTrigger value="caps">Caps & Timing</TabsTrigger>
                  <TabsTrigger value="risk">Risks</TabsTrigger>
                </TabsList>
                <TabsContent value="math">
                  <Card className="rounded-2xl shadow-md"><CardContent className="p-4 md:p-6 space-y-2">
                    <div className="font-semibold">Core formulas</div>
                    <div className="text-sm text-zinc-700">
                      Miles = SQ/Rate<sub>SQ</sub> + FX/Rate<sub>FX</sub> + Other/20 + Bonuses<br />
                      Effective THB/mile = Total THB Spend / Target Miles
                    </div>
                    <div className="text-sm text-zinc-700">Rates: Elite (12.5 / 15 / 20). World (15 / 15 / 20). Caps per cycle apply to first two buckets; overflow earns at 1/20.</div>
                  </CardContent></Card>
                </TabsContent>
                <TabsContent value="caps">
                  <Card className="rounded-2xl shadow-md"><CardContent className="p-4 md:p-6 space-y-2">
                    <div className="font-semibold">Caps & Annual Bonus</div>
                    <div className="text-sm text-zinc-700">Per-cycle caps bind at {card === "elite" ? "200k (SQ) & 200k (FX)" : "100k (SQ) & 50k (FX)"}. Overflow routes to Other at 1/20. Annual bonus (if toggled) posts after 12 cycles when ≥1M THB.</div>
                    <div className="text-sm text-zinc-700">Tip: If you consistently overflow, shift spend timing across cycles to keep more THB inside best buckets.</div>
                  </CardContent></Card>
                </TabsContent>
                <TabsContent value="risk">
                  <Card className="rounded-2xl shadow-md"><CardContent className="p-4 md:p-6 space-y-2">
                    <div className="font-semibold">Risk knobs</div>
                    <ul className="text-sm list-disc pl-5 space-y-1 text-zinc-700">
                      <li>Availability risk: use p(Saver); if Saver fails you may need Advantage or Star.</li>
                      <li>Devaluation risk: shock target by +X% to see buffer needed.</li>
                      <li>Expiry risk: ensure your accrual horizon & posting delays are within 3-year validity.</li>
                      <li>Cap-binding risk: marginal earn drops to 1/20 when caps are exceeded.</li>
                      <li>Cash TCO: add taxes/fees to see all-in cost.</li>
                    </ul>
                  </CardContent></Card>
                </TabsContent>
              </Tabs>
            </>
          )}

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
