"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { motion } from "framer-motion";
import { CARD_RULES, TargetKey, CardKey } from "../lib/constants";
import { clamp, r0, r2, fmtTHB, fmt } from "../lib/utils";

import SpendPanel from "./Optimizer/SpendPanel";
import CapPanel from "./Optimizer/CapPanel";
import MilesAccrualChart from "./Optimizer/MilesAccrualChart";
import InfoPanels from "./Optimizer/InfoPanels";
import InfoAccordion from "./Optimizer/InfoPanels";
import { useNormalizedShares, useSimulation, useChosenTargetMiles, useSolveForTarget } from "./Optimizer/hooks";
import BeginnerExplainerModal from "./BeginnerExplainerModal";
import { RequiredSpendPanel, CompareSpendPanel } from "./Optimizer/SpendPanel";

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
  const [cyclesToSim, setCyclesToSim] = useState(24);
  const [showExplainer, setShowExplainer] = useState(false);

  // Show explainer modal on first visit or ?beginner=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('beginner') === '1') {
      setShowExplainer(true);
      return;
    }
    if (!localStorage.getItem("kf.beginnerSeen")) {
      setShowExplainer(true);
    }
  }, []);

  const rules = CARD_RULES[card];
  const normShares = useNormalizedShares(shareSQ, shareFX);
  const chosenTargetMiles = useChosenTargetMiles({ useCustomTarget, customMiles, target, devaluationPct });
  const sim = useSimulation({ cyclesToSim, monthlySpendTHB, normShares, includeAnnualBonus, includeSignupBonus, rules, card });
  const pointChosen = useSolveForTarget(sim, chosenTargetMiles);

  // Direct panel answers
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
  // Find cycles & spend to meet target
  // Direct panel answers

  return (
    <TooltipProvider>
      <BeginnerExplainerModal open={showExplainer} setOpen={setShowExplainer} />
      <div className="w-full min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 p-2 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <motion.h1 initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-2xl md:text-4xl font-bold tracking-tight mb-2 text-center">
            UOB KrisFlyer Spend→Miles Requirement Calculator
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} className="text-zinc-600 mb-6 md:mb-8 text-center">
            <span className="font-semibold">How much do I need to spend to get {fmt(r0(chosenTargetMiles))} miles ({useCustomTarget ? 'custom' : target}) on {rules.name}?</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13, duration: 0.4 }}
            className="flex flex-col items-center justify-center mb-2 md:mb-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-2">
              {[{key: 'elite', label: 'World Elite', img: '/uob-krisflyer-elite.png'}, {key: 'world', label: 'World', img: '/uob-krisflyer-world.png'}].map(cardObj => (
                <button
                  key={cardObj.key}
                  type="button"
                  onClick={() => { setCard(cardObj.key as CardKey); setIncludeSignupBonus(cardObj.key === 'world'); }}
                  className={
                    `flex flex-col items-center transition-all duration-150 rounded-xl border-2 p-1 md:p-2 w-44 md:w-52 shadow-sm hover:shadow-lg ` +
                    (card === cardObj.key ? 'border-blue-500 shadow-lg scale-105 ring-2 ring-blue-200' : 'border-zinc-200 opacity-80 hover:opacity-100')
                  }
                  style={{ background: '#fff' }}
                  aria-label={cardObj.label + ' Card'}
                >
                  <img src={cardObj.img} alt={cardObj.label + ' Card'} className="h-24 md:h-28 w-auto object-contain mb-2 select-none" draggable="false" />
                  <span className={`block font-semibold text-base ${card === cardObj.key ? 'text-blue-700' : 'text-zinc-700'}`}>{cardObj.label}</span>
                </button>
              ))}
            </div>
            {/* ---- 'Learn the basics' explainer link ---- */}
            <button className="mt-1 text-sm underline text-blue-500 hover:text-blue-600 focus:outline-none"
              onClick={() => setShowExplainer(true)} type="button">
              💡 Learn the basics
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, duration: 0.4 }}
            className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 mb-4 md:mb-3">
            <div className="flex flex-col w-full md:w-auto space-y-2 md:space-y-0 md:flex-row md:items-center md:gap-2">
              <div className="flex flex-col w-full mb-2 md:mb-0">
                <Label htmlFor="target-select">Award Target Miles:</Label>
                <Select value={target} onValueChange={(v) => { setTarget(v as TargetKey); setUseCustomTarget(false); }}>
                  <SelectTrigger className="w-full md:w-52" id="target-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saver">SQ Saver (122,500)</SelectItem>
                    <SelectItem value="advantage">SQ Advantage (172,000)</SelectItem>
                    <SelectItem value="star">Star Alliance OW (131,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-row items-center w-full md:w-auto gap-3 md:gap-1 mt-1 md:mt-0">
                <Switch checked={useCustomTarget} onCheckedChange={setUseCustomTarget} />
                <Label htmlFor="custom-miles-input" className="mb-0">Custom</Label>
                <Input type="number" className="w-full md:w-24" id="custom-miles-input" value={customMiles} min={0} max={500000} onChange={e => setCustomMiles(clamp(Number(e.target.value), 0, 500000))} disabled={!useCustomTarget} />
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, duration: 0.4 }}
            className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 mb-4 md:mb-6">
            <div className="flex flex-col w-full mb-2 md:mb-0">
              <Label htmlFor="monthly-spend">Monthly Spend (THB):</Label>
              <Input type="number" className="w-full md:w-36" id="monthly-spend" value={monthlySpendTHB} min={0} max={10000000} onChange={e => setMonthlySpendTHB(clamp(Number(e.target.value), 0, 10000000))} />
            </div>
            <div className="flex flex-col w-full gap-1">
              <Label className="mb-1">Split:</Label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                <div className="flex flex-col w-full max-w-xs mb-1">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <Label>SQ/Scoot %</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 text-zinc-400 cursor-help">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Flight tickets, in-flight shopping
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-medium ml-1 text-zinc-700">{normShares.s}%</span>
                  </div>
                  <Slider value={[normShares.s]} max={100} step={1} onValueChange={([v]) => setShareSQ(v)} className="w-full" />
                </div>
                <div className="flex flex-col w-full max-w-xs mb-1">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <Label>DutyFree/FX %</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 text-zinc-400 cursor-help">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Foreign-currency or duty-free purchases abroad
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-medium ml-1 text-zinc-700">{normShares.f}%</span>
                  </div>
                  <Slider value={[normShares.f]} max={100 - normShares.s} step={1} onValueChange={([v]) => setShareFX(v)} className="w-full" />
                </div>
                <div className="flex flex-col w-full max-w-xs mb-1">
                  <div className="flex flex-row items-center justify-between mb-1">
                    <Label>Other %</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 text-zinc-400 cursor-help">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Everything else (local THB spend)
                      </TooltipContent>
                    </Tooltip>
                    <span className="font-medium ml-1 text-zinc-700">{normShares.o}%</span>
                  </div>
                  {/* no slider, just a value */}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
            <RequiredSpendPanel chosenTargetMiles={chosenTargetMiles} rules={rules} normShares={normShares} monthlySpendTHB={monthlySpendTHB} />
            <CompareSpendPanel chosenTargetMiles={chosenTargetMiles} card={card} rules={rules} monthlySpendTHB={monthlySpendTHB} />
          </motion.div>
          <motion.div className="mb-2 p-3 rounded bg-yellow-50 border-l-4 border-yellow-300 text-yellow-800 text-xs flex flex-col gap-1 mt-2">
            <div className="font-bold mb-1"><span role="img" aria-label="warning">🚫</span> These types of payments don’t earn miles: groceries, petrol, bills, and e-wallet top-ups.</div>
            <span>Excluded categories: MCC 5411 (supermarkets), MCC 5541 (gasoline), MCC 4900 (utilities), all e-wallet top-ups, PayAnything, Makro, spending in THB at overseas merchants, tax refunds, interest, and fees.</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}>
            <CapPanel card={card} />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 md:mt-4">
            <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.4 }}>
              <Card className="rounded-xl border-2 border-amber-400 mb-4">
                <CardContent className="p-4 space-y-2">
                  <div className="text-lg font-bold mb-1 text-amber-600">How long to your miles goal?</div>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-2xl font-bold">{pointChosen ? `${pointChosen.months} months at your pace` : 'N/A'}</span>
                  </div>
                  <div className="text-md">You’d need to spend about <span className="font-bold">{fmtTHB(pointChosen?.spend ?? 0)}</span> in total.</div>
                  {card === "elite" && includeAnnualBonus && (
                    <div className="flex items-center gap-1 text-xs mt-1 text-emerald-700">
                      <span>Annual bonus (25,000 miles)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-0.5 align-middle cursor-pointer text-zinc-400">ℹ️</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Earns once per year if you spend ≥ 1M THB in that year. Posts after your card renewal.
                        </TooltipContent>
                      </Tooltip>
                      <span>&mdash; if you spend 1M THB in a year. Paid after renewal.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.4 }}>
              <Card className="rounded-xl border w-full">
                <CardContent className="p-4">
                  <div className="font-semibold mb-2">Visualize Accrual</div>
                  <div className="overflow-x-auto">
                    <MilesAccrualChart sim={sim} chosenTargetMiles={chosenTargetMiles} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <InfoAccordion />

          {pointChosen && pointChosen.months > 34 && (
            <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.4 }} className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              ⚠️ Expiry risk: at your current plan it may take {pointChosen?.months} cycles to reach the chosen award. Miles post about 10 days after each statement and expire 36 months after posting. Consider increasing monthly spend, improving earn mix, redeeming sooner, or aiming for a smaller target.
            </motion.div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Optimizer;
