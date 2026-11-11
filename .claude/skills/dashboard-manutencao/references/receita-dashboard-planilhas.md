# Receita: dashboard a partir de planilhas Google, com botão de atualizar

Use quando o usuário quiser algo parecido com o dashboard de manutenção, para outro assunto:
dados que ele digita em planilhas no Drive, um modelo limpo derivado delas e uma página com
gráficos e um botão que refaz o modelo. O projeto em `apps-script/` é o exemplo completo;
copie a estrutura e troque o domínio.

## Por que esta arquitetura

- **Fontes intocadas.** O usuário continua digitando como sempre. Reestruturar a planilha de
  digitação atrapalha o dia a dia e é a mudança que ele mais rejeita.
- **Modelo separado, refeito do zero a cada atualização.** Limpar e regravar as abas geradas
  torna o botão seguro de repetir: rodar duas vezes não duplica nada.
- **Abas manuais para o que é decisão humana** (cadastro, de-para de nomes, classificação,
  parâmetros). O ETL lê, nunca apaga.
- **Apps Script web app.** Fica no Google, sem custo, roda o ETL no botão e pode ser embutido
  no Google Sites. Looker Studio não tem botão que execute o ETL e limita cálculos derivados.

## Fases (pare nos checkpoints)

1. **Diagnóstico (só leitura).** Leia as planilhas inteiras pelo conector. Relate: linhas por
   aba, valores distintos das colunas-chave, nomes que deveriam ser a mesma entidade em
   planilhas diferentes, números como texto em formato brasileiro, datas em formatos mistos,
   colunas com nome repetido, linhas duplicadas ou que juntam dois eventos, e mistura de tipos
   de registro na mesma aba (ex.: compra × manutenção).
2. **Proposta do modelo e das sementes**, em tabelas no chat: dimensões, de-para de nomes,
   regras de classificação, parâmetros e as abas fato que o botão vai gerar, com colunas.
   **Checkpoint: espere aprovação ou correção.** Registre o diagnóstico e o que foi aprovado
   num `docs/*.md` no repositório.
3. **Criar a planilha de modelo no Drive** com as abas e cabeçalhos, e gravar as sementes
   aprovadas. Passe o link.
4. **Código** em `apps-script/`:
   - `Code.gs` com `CONFIG` (IDs das planilhas), funções puras de transformação
     (sem `SpreadsheetApp`, exportadas via `module.exports` quando `module` existe),
     `atualizarDados()` com `LockService` e registro em `log_atualizacao`,
     `getDashboardData()` devolvendo JSON, `doGet()` com `XFrameOptionsMode.ALLOWALL`
     (para o Google Sites) e `onOpen()` com o menu na planilha;
   - `Dashboard.html` com Chart.js de versão fixa, botão **Atualizar planilhas** chamando
     `google.script.run.atualizarDados()`, data/hora da última atualização, tema claro/escuro e
     layout de celular;
   - `appsscript.json` com fuso `America/Sao_Paulo`, runtime V8 e web app restrito ao dono;
   - `test/` com fixtures dos dados reais e um teste em Node que carrega `Code.gs` via `vm`;
   - `README.md` com a instalação passo a passo.
   Se o conector não conseguir criar o projeto Apps Script, entregue os arquivos para colar.
5. **Primeira carga e conferência.** Rode o ETL (ou peça o clique) e confira totais contra a
   origem: toda linha mapeada ou em `pendencias`, somas de valores batendo, uma ou duas
   medidas conhecidas pelo usuário reproduzidas, com tolerância explicada.
6. **Entrega:** links da planilha e do web app, lista de pendências para corrigir na origem e
   próximos passos.

## Regras que valem para qualquer tema

- Nunca altere as planilhas de origem sem aprovação explícita.
- Leia as fontes com `getDisplayValues()` e converta números e datas com funções próprias
  (`parseNumeroBR`, `parseDataBR`), porque a formatação da origem muda sem aviso.
- Nada some em silêncio: o que não casar ou não converter vai para `pendencias` com tipo,
  origem, linha e valor.
- Textos da interface em português do Brasil, `dd/mm/aaaa`, `1.234,5`, `R$`.
- Ao publicar mudanças, lembre: **Implantar → Gerenciar implantações → Nova versão**, ou a URL
  `/exec` continua servindo o código antigo.

## O que dá para reaproveitar direto de `apps-script/Code.gs`

`normalizar`, `parseNumeroBR`, `parseDataBR`, `parseDataStrava` (se houver dado do Strava),
`colunaPorNome` (colunas com nome repetido), `paraObjetos`, `listaSeparada`, `lerFonte_`,
`lerAba_`, `gravarFato_` e o esqueleto de `atualizarDados`, `getDashboardData`, `doGet`,
`onOpen` e `criarGatilhoDiario`.
