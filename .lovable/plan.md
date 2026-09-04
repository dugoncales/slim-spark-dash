# Relatório individual do paciente (PDF/PNG)

Sim, é possível. A ideia é um botão "Exportar relatório" no topo da página de cada paciente, que gera um arquivo pronto para enviar à pessoa, com os gráficos e as tabelas como imagem.

## O que o relatório vai conter

- Cabeçalho com logo HEALTHBIT/RDsaúde, nome (ou "Pessoa N", respeitando o modo de privacidade), grupo, mês de início e período coberto.
- Resumo em destaque: peso inicial x atual, variação em kg e %, IMC inicial x atual, circunferência abdominal.
- Risco cardiovascular: estimativa inicial x atual e a redução obtida.
- Gráficos de evolução: peso (com a dose do medicamento), IMC e circunferência.
- Exames laboratoriais: glicemia, HbA1c, perfil lipídico e pressão, com a evolução.
- Acompanhamento multidisciplinar: consultas por especialidade.
- Tabela mês a mês do histórico.
- Rodapé com data de emissão e aviso de que é um documento de acompanhamento, não laudo médico.

## Como vai funcionar

- Botão "Exportar" com duas opções: PDF (para encaminhar) e PNG.
- Antes de gerar, um pequeno diálogo permite escolher quais blocos entram (resumo, risco, exames, consultas, histórico) — igual ao que já existe no painel geral.
- Todas as seções escolhidas são abertas automaticamente durante a captura, então nada sai cortado ou vazio.
- Nome do arquivo: `relatorio-<paciente>-<mes>.pdf`.

## Detalhes técnicos

- Reaproveitar o fluxo já existente em `src/routes/index.tsx`: `html2canvas-pro` + `jspdf`, com espera de ~1,7s para o Recharts pintar, e as opções compartilhadas de `ExportMenu` (`H2C_OPTIONS`, `safeMonthSlug`).
- Novo componente `src/components/paciente/RelatorioExport.tsx` com o botão, o diálogo de seções e o efeito de captura; a página `src/routes/paciente.$id.tsx` ganha um wrapper `id="paciente-export"` e um modo de exportação que força as seções abertas.
- Sem mudanças no banco de dados; usa apenas os dados já carregados na página.
