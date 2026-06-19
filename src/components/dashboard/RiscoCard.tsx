import { HeartPulse, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiscoParticipante } from "@/lib/dashboard-data";
import { LIMITE_CINTURA, type Sexo } from "@/lib/dashboard-data";

const pctFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ppFmt = (delta: number) => {
  const abs = Math.abs(delta) * 100;
  return `${delta < 0 ? "−" : "+"}${abs.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`;
};

function RiscoLine({
  label,
  inicial,
  atual,
  delta,
}: {
  label: string;
  inicial: number;
  atual: number;
  delta: number;
}) {
  const melhora = delta < 0;
  const tone = delta === 0 ? "text-muted-foreground" : melhora ? "text-success" : "text-destructive";
  const Icon = melhora ? TrendingDown : TrendingUp;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xl font-bold">{pctFmt.format(atual)}</span>
        <span className="text-xs text-muted-foreground">de {pctFmt.format(inicial)}</span>
      </div>
      {delta !== 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {ppFmt(delta)} {melhora ? "(redução)" : "(aumento)"}
        </div>
      )}
    </div>
  );
}

export function RiscoCard({
  risco,
  sexo,
}: {
  risco: RiscoParticipante;
  sexo: Sexo | null;
}) {
  if (!sexo) {
    return (
      <Card className="p-5 border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
        <header className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">Risco cardiovascular estimado</h3>
        </header>
        <p className="text-sm text-muted-foreground">
          Preencha o <strong>sexo</strong> do participante em <code className="px-1 rounded bg-muted text-xs">/gestao</code> para calcular o risco a partir da circunferência abdominal.
        </p>
      </Card>
    );
  }

  const limite = LIMITE_CINTURA[sexo];
  const reduzCintura = risco.deltaCintura < 0;

  return (
    <Card className="p-5">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Risco cardiovascular estimado</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {risco.circInicial != null && risco.circAtual != null && risco.deltaCintura !== 0 && (
            <Badge variant={reduzCintura ? "default" : "destructive"} className={reduzCintura ? "bg-success/15 text-success border-success/30 hover:bg-success/15" : ""}>
              {reduzCintura ? "−" : "+"}
              {Math.abs(risco.deltaCintura).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm na cintura
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            Limite WHO: {limite} cm
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <RiscoLine
          label="Risco de angina (relativo)"
          inicial={risco.riscoAnginaInicial}
          atual={risco.riscoAnginaAtual}
          delta={risco.deltaAngina}
        />
        <RiscoLine
          label="Risco cardiovascular adicional"
          inicial={risco.riscoCVInicial}
          atual={risco.riscoCVAtual}
          delta={risco.deltaCV}
        />
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        Cintura atual: <strong>{risco.circAtual?.toLocaleString("pt-BR") ?? "—"} cm</strong> ({risco.excessoAtual.toFixed(1)} cm acima do limite). Risco de angina = (1,075)^cm acima − 1.
        Risco cardiovascular adicional = 3,5% × cm acima.
      </p>
    </Card>
  );
}
