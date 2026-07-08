import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXAMES_META, CATEGORIA_LABEL, type ExameCategoria, type ExameKey } from "@/lib/exames";
import type { Medicao } from "@/lib/dashboard-data";

/**
 * Diálogo compacto para edição dos 8 campos opcionais de exames laboratoriais
 * de uma medição mensal. Não escreve no banco — atualiza o estado local
 * via callback (mesmo padrão de `edits` usado em gestao.tsx).
 */
export function ExamesDialog({
  open,
  onOpenChange,
  nome,
  mesLabel,
  getValor,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  mesLabel: string;
  /** Retorna o valor atual (edit → medição). String vazia se ausente. */
  getValor: (key: ExameKey) => string;
  /** Chamado a cada alteração de input. String vazia = null. */
  onChange: (key: ExameKey, valor: string) => void;
}) {
  const categorias: ExameCategoria[] = ["glicemico", "lipidico", "pressao"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exames laboratoriais — {nome}</DialogTitle>
          <DialogDescription>
            Mês de referência: <strong>{mesLabel}</strong>. Todos os campos são opcionais — preencha apenas o
            que tiver resultado. Os dados são salvos junto com as demais alterações do mês ao clicar em
            <em> Salvar alterações</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {categorias.map((cat) => {
            const examesDaCat = EXAMES_META.filter((m) => m.categoria === cat);
            return (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORIA_LABEL[cat]}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {examesDaCat.map((meta) => (
                    <div key={meta.key}>
                      <Label className="text-xs">
                        {meta.label} <span className="text-muted-foreground font-normal">({meta.unidade})</span>
                      </Label>
                      <Input
                        type="number"
                        step={meta.step}
                        inputMode="decimal"
                        value={getValor(meta.key)}
                        onChange={(e) => onChange(meta.key, e.target.value)}
                        placeholder="—"
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utilitário: chaves de exame como campos de Medicao (para tipagem em callers).
export const EXAME_KEYS_TYPED: ReadonlyArray<keyof Medicao> = EXAMES_META.map((m) => m.key) as ReadonlyArray<keyof Medicao>;
