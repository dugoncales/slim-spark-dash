import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";

export function ComparisonChart({ title, data, keyA, keyB, labelA, labelB, unit }: {
  title: string;
  data: Array<Record<string, string | number>>;
  keyA: string;
  keyB: string;
  labelA: string;
  labelB: string;
  unit: string;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" label={{ value: unit, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "var(--muted-foreground)" } }} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={keyA} name={labelA} fill="var(--primary)" radius={[4, 4, 0, 0]}>
            <LabelList dataKey={keyA} position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
          </Bar>
          <Bar dataKey={keyB} name={labelB} fill="var(--accent)" radius={[4, 4, 0, 0]}>
            <LabelList dataKey={keyB} position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
