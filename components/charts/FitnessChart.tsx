"use client";

import { Area, Bar, ComposedChart, Line, XAxis, YAxis } from "recharts";
import type { LoadPoint } from "@/lib/training/load";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  ctl: { label: "Fitness (CTL)", color: "var(--chart-1)" },
  atl: { label: "Fatigue (ATL)", color: "var(--chart-2)" },
  tsb: { label: "Form (TSB)", color: "var(--chart-3)" },
  tss: { label: "TSS", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function FitnessChart({ points }: { points: LoadPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
    ctl: Math.round(p.ctl),
    atl: Math.round(p.atl),
    tsb: Math.round(p.tsb),
    tss: Math.round(p.tss),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="tss" fill="var(--color-tss)" radius={[2, 2, 0, 0]} />
        <Area dataKey="tsb" stroke="var(--color-tsb)" fill="var(--color-tsb)" fillOpacity={0.12} strokeWidth={1.5} dot={false} />
        <Line dataKey="ctl" stroke="var(--color-ctl)" strokeWidth={2} dot={false} />
        <Line dataKey="atl" stroke="var(--color-atl)" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ChartContainer>
  );
}
