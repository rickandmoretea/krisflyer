import React from "react";

export interface CapPanelProps {
  card: string;
}

const CapPanel: React.FC<CapPanelProps> = ({ card }) => (
  <div className="mb-3 text-xs text-zinc-700">
    <span className="font-bold">Category cap per statement month:</span> <br/>
    {card === "elite" ? (
      <><span>THB 200,000 for SQ/Scoot/KrisShop, THB 200,000 for Duty Free/FX</span>
      <span title="A 'statement month' is one complete card billing cycle (usually about 30 days, check your statement dates)"><span className="ml-1">ℹ️</span></span></>)
      : (<><span>THB 100,000 for SQ/Scoot/KrisShop, THB 50,000 for Duty Free/FX</span><span title="A 'statement month' is one complete card billing cycle (usually about 30 days, check your statement dates)"><span className="ml-1">ℹ️</span></span></>)}
    <br/>
    <span>Spending above these caps earns miles at the lower rate: 1 mile per THB 20 spent.</span>
    <br/>
    <span className="italic">Tip: Try to keep most of your monthly spend inside the caps for best value.</span>
  </div>
);

export default CapPanel;
