import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine } from "recharts";
import { r0, fmt } from "../../lib/utils";

export interface MilesAccrualChartProps {
  sim: any[];
  chosenTargetMiles: number;
}

const MilesAccrualChart: React.FC<MilesAccrualChartProps> = ({ sim, chosenTargetMiles }) => (
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
);

export default MilesAccrualChart;
