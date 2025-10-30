import React from "react";

export interface CategoryRulesPanelProps {
  card: string;
}

const CategoryRulesPanel: React.FC<CategoryRulesPanelProps> = ({ card }) => (
  <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
    <li>SQ/Scoot/KrisShop: {card === "elite" ? "1/12.5 (cap 200k/cycle)" : "1/15 (cap 100k/cycle)"}</li>
    <li>Duty Free/FX: 1/15 (cap {card === "elite" ? "200k" : "50k"}/cycle)</li>
    <li>Other: 1/20, includes overflow/uncategorized spend</li>
    <li>Annual bonus: Elite only, 25,000 miles on THB 1M/year (with renewal, posts after year).</li>
    <li>SignUp bonus: World only, 5,000 miles one-time (toggle in UI if eligible).</li>
  </ul>
);

export default CategoryRulesPanel;
