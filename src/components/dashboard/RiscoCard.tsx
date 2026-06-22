import { HeartPulse, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiscoParticipante } from "@/lib/dashboard-data";
import { LIMITE_CINTURA, type Sexo } from "@/lib/dashboard-data";

const pctFmt = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const ppFmt = (delta: number) => {
  const abs = Math.abs(delta) * 100;
  return `${delta < 0 ? "−" : "+"}${abs.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`;
};

const faixaFmt = (min: number, max: number) =>
  min === max ? pctFmt(min) : `${pctFmt(min)} – ${pctFmt(max)}`;

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
  const melhora = risco.deltaMedio < 0;
  const tone =
    risco.deltaMedio === 0
      ? "text-muted-foreground"
      : melhora
        ? "text-success"
        : "text-destructive";
  const DeltaIcon = melhora ? TrendingDown : TrendingUp;

  return (
    <Card className="p-5">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Risco cardiovascular estimado</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {risco.circInicial != null && risco.circAtual != null && risco.deltaCintura !== 0 && (
            <Badge
              variant={reduzCintura ? "default" : "destructive"}
              className={reduzCintura ? "bg-success/15 text-success border-success/30 hover:bg-success/15" : ""}
            >
              {reduzCintura ? "−" : "+"}
              {Math.abs(risco.deltaCintura).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm na cintura
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            Limite WHO: {limite} cm
          </Badge>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Risco cardiovascular adicional (faixa estimada)
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl font-bold">
            {faixaFmt(risco.riscoMinAtual, risco.riscoMaxAtual)}
          </span>
          <span className="text-xs text-muted-foreground">
            de {faixaFmt(risco.riscoMinInicial, risco.riscoMaxInicial)}
          </span>
        </div>
        {risco.deltaMedio !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {ppFmt(risco.deltaMedio)} (ponto médio) {melhora ? "— redução" : "— aumento"}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        Cintura atual: <strong>{risco.circAtual?.toLocaleString("pt-BR") ?? "—"} cm</strong> ({risco.excessoAtual.toFixed(1)} cm acima do limite).
        Faixa estimada conforme tabela executiva: +5 cm ⇒ 5–10%, +10 cm ⇒ 10–20%, +15 cm ⇒ 15–30%, +20 cm ⇒ 20–40%, +30 cm ⇒ 35–60%, +40 cm ⇒ 50–100% (interpolação linear entre pontos).
      </p>
    </Card>
  );
}
