---
name: dashboard-manutencao
description: >-
  Opera e evolui o Dashboard de Manutenção de Equipamentos do usuário (Google Apps Script +
  planilhas no Google Drive: "Manutenções equipamentos", Strava "activities", "km total",
  "bikes" e a planilha "Manutenção – Modelo de Dados"). Use sempre que o pedido envolver
  manutenção da moto Himalayan, do carro Pajero TR4, das bikes (CHISEL, Tricross, Fuji),
  dos tênis, km rodado, próxima troca de óleo/corrente/pneu, custo de manutenção, as abas
  dim_equipamento / de_para_nomes / dim_servico / plano_manutencao / pendencias, o botão
  "Atualizar planilhas", o ETL em apps-script/Code.gs ou o Dashboard.html — mesmo que o
  usuário não diga "dashboard". Também use quando ele pedir para montar um dashboard parecido
  (planilhas Google → modelo de dados → web app com botão de atualizar) para outro assunto.
---

# Dashboard de Manutenção de Equipamentos

O projeto mostra as manutenções dos equipamentos do usuário ao longo do tempo. Ele lê quatro
planilhas de origem, monta um modelo estrela numa planilha separada e serve um web app com
gráficos e um botão que refaz o modelo.

```
Fontes (só leitura)            Modelo (planilha "Manutenção – Modelo de Dados")      Dashboard
Manutenções equipamentos ─┐    manuais: dim_equipamento, de_para_nomes,
activities (Strava) ──────┼ETL▶         dim_servico, plano_manutencao          ─▶ web app
km total ─────────────────┤    geradas: fato_manutencao, fato_aquisicao,           (Dashboard.html)
bikes ────────────────────┘             fato_uso_diario, fato_hodometro,
                                        pendencias, log_atualizacao
```

## Onde está cada coisa

| O quê | Onde |
|---|---|
| IDs das planilhas, fuso do Strava, limiar de "Atenção" | `CONFIG` no topo de `apps-script/Code.gs` |
| ETL puro (testável fora do Google) | `transformar()` e `montarDashboard()` em `Code.gs` |
| Leitura/gravação nas planilhas, botão, menu | `atualizarDados()`, `getDashboardData()`, `onOpen()` em `Code.gs` |
| Página (Chart.js 4.4.1, claro/escuro, celular) | `apps-script/Dashboard.html` |
| Conteúdo inicial das abas manuais | `apps-script/sementes/gerar_sementes.py` → `sementes.json` |
| Testes do ETL | `node apps-script/test/teste_etl.js` |
| Instalação e regras do ETL para o usuário | `apps-script/README.md` |
| Diagnóstico original e sementes aprovadas | `docs/sementes-propostas.md` |
| Colunas de todas as abas e significado | `references/modelo-de-dados.md` (leia antes de mexer em abas ou no ETL) |
| Receita para criar um dashboard parecido do zero | `references/receita-dashboard-planilhas.md` |

Planilha de modelo: `https://docs.google.com/spreadsheets/d/1dbsPfl2tVdBW97KUOTGNOt-kfv6nUNAw_4IZZEhVWGA/edit`

Releia `CONFIG` no código antes de usar um ID: ele é a fonte da verdade, não esta página.

## Regras que protegem os dados do usuário

- **As quatro planilhas de origem são do dia a dia do usuário.** Ele digita nelas. Leia à
  vontade, mas não altere nada nelas sem aprovação explícita naquela conversa. Se a correção
  certa for na origem (data errada, linha duplicada), descreva a linha e o ajuste e deixe que
  ele decida.
- **As abas manuais do modelo também são dele** depois da carga inicial. Antes de gravar em
  `dim_equipamento`, `de_para_nomes`, `dim_servico` ou `plano_manutencao`, mostre as linhas
  que vai incluir ou mudar e peça um "ok". O ETL nunca apaga essas abas; você também não deve.
- **As abas `fato_*`, `pendencias` e `log_atualizacao` são descartáveis.** O botão as limpa e
  regrava a cada execução. Não edite à mão: a próxima atualização desfaz.
- Nada pode sumir em silêncio. Nome sem correspondência, serviço sem classificação, data
  inválida e duplicata vão para `pendencias`. Ao mexer no ETL, mantenha esse comportamento.
- Interface e mensagens em português do Brasil: datas `dd/mm/aaaa`, números `1.234,5`, `R$`.

## Tarefas comuns

### "Atualizei a planilha / rodei o botão e apareceram pendências"
1. Leia a aba `pendencias` (conector do Google Sheets) e agrupe por `tipo`.
2. Para cada grupo, proponha a correção no lugar certo:
   - nome de equipamento sem correspondência → nova linha em `de_para_nomes`
     (`nome_origem` exatamente como na fonte, `origem` = `manutencoes`/`strava`/`km_total`/`bikes`
     ou `*` para qualquer origem, `equip_id` existente);
   - serviço não classificado → nova palavra-chave em `dim_servico.padroes_texto`
     (separadas por `;`, sem acento, minúsculas) ou um serviço novo com `ordem` adequada;
   - data inválida, duplicata, linha que junta dois eventos → correção na planilha de origem,
     que só o usuário faz ou aprova.
3. Depois das correções, peça para ele clicar em **Atualizar planilhas** (ou no menu
   **Manutenção → Atualizar dados**) e confira se as pendências sumiram.

A ordem em `dim_servico` importa: vence o primeiro serviço (menor `ordem`) cujo padrão aparece
no texto. Padrões curtos e genéricos ("troca", "oleo") com ordem baixa capturam textos que
deviam ir para serviços mais específicos. Coloque o específico antes do genérico.

### "Comprei um equipamento novo" / "vendi a moto"
- Novo: linha em `dim_equipamento` com `equip_id` no padrão `TIPO-NOME` (ex.: `TENIS-NOVO`),
  `categoria`, `subtipo`, `fonte_km` (`strava` para bikes e tênis, `hodometro` para veículos,
  `nenhuma` para o resto), `rastrear_manutencao` = `S` se deve gerar alertas e, para tênis,
  `vida_util_km` (o padrão do projeto é 700). Se o nome no Strava ou na planilha for diferente,
  acrescente o de-para.
- Baixa: `status` = `Baixado` e `data_baixa`. O equipamento sai dos alertas, mas o histórico fica.

### "Quando é a próxima troca de …" / "o que está vencido?"
O dashboard já calcula isso na tabela de status por componente. Para responder no chat, leia
as abas do modelo e aplique a mesma lógica de `montarDashboard()`: para cada linha de
`plano_manutencao` cujo `alvo` bate com o `equip_id`, o `subtipo` ou a `categoria` do
equipamento, pegue a última manutenção com algum dos `servicos` listados e compare km e dias
desde então com `intervalo_km` e `intervalo_dias`. O maior percentual decide:
≥ 100% Vencido, ≥ 80% (`CONFIG.ATENCAO_PCT`) Atenção, senão OK.

O km atual depende da fonte: Strava soma todas as atividades; hodômetro usa a última leitura
estimada para hoje pela média diária, e o dashboard marca esse valor com `*`. Diga ao usuário
quando o número for estimado.

### Ajustar intervalos de manutenção
Edite `plano_manutencao` (com aprovação). `servicos` é uma lista de `servico_id` separada por
`;`. Um `alvo` por categoria (`Bicicleta`) vale para todas as bikes; uma linha por
`equip_id` ou `subtipo` serve para casos específicos.

### Mudar o ETL ou o dashboard
1. Leia `references/modelo-de-dados.md` e as funções envolvidas em `Code.gs`.
2. Mantenha a separação: lógica nova em funções puras (`transformar`, `montarDashboard` e
   utilitários), sem `SpreadsheetApp` dentro delas, para continuar testável em Node.
3. Se acrescentar coluna numa aba gerada, atualize `CABECALHOS` e os índices de data/texto
   passados a `gravarFato_()` em `atualizarDados()`.
4. Acrescente asserções em `apps-script/test/teste_etl.js` e rode
   `node apps-script/test/teste_etl.js`. Ele precisa terminar com
   `OK — todos os testes passaram`.
5. Para o Dashboard, teste no navegador com o mock. O teste do passo 4 grava
   `apps-script/test/mock_dashboard.json` (ignorado pelo git). Fora do Apps Script não existe
   `google.script.run`; injete o JSON do mock como resposta de `getDashboardData()` (Playwright
   funciona) e confira o tema claro e escuro e a largura de celular.
6. Explique ao usuário como publicar: colar os arquivos no editor do Apps Script, salvar e
   **Implantar → Gerenciar implantações → editar → Nova versão**. Sem a versão nova, a URL
   `/exec` continua servindo o código antigo, que é a causa mais comum de "mudei e nada
   aconteceu".
7. Commit e push na branch de trabalho indicada na sessão.

### Regerar sementes
`sementes.json` é usado pelos testes e foi a carga inicial. Depois da aprovação, **a planilha é
a fonte da verdade** das abas manuais. Se o usuário mudou essas abas na planilha e você precisa
que os testes reflitam isso, atualize `gerar_sementes.py`, rode
`python3 apps-script/sementes/gerar_sementes.py` e rode os testes. Nunca regrave a planilha a
partir de `sementes.json` sem pedir: isso apagaria o que ele mantém lá.

## Armadilhas conhecidas dos dados

- Números como texto em formato brasileiro: `7489,8`, `305.000` (milhar), `8.628`. Use
  `parseNumeroBR()`; não converta com `Number()` direto.
- O Strava tem colunas com nome repetido: há duas "Distância" (G em km com vírgula, R em
  metros) e duas "Tempo decorrido". O ETL usa a 2ª "Distância" (metros) via
  `colunaPorNome(cab, nome, ocorrencia)`. Equipamento fica na coluna "Equipamento da atividade".
- Datas do Strava vêm em texto pt-BR e em UTC (`2 de nov. de 2026, 12:02:56`). O ETL converte
  para Brasília (UTC−3), então uma atividade de 01h30 conta no dia anterior.
- "Compra", "Aquisição", "Compra/troca", "Compra da bike" vão para `fato_aquisicao`, mas
  "Compra Guidão adventure" é manutenção/upgrade. A regra está em `ehAquisicao()`.
- Manutenções anteriores à `data_aquisicao` ficam com `periodo_posse = Dono anterior` (é o
  caso do histórico do Pajero) e ficam escondidas por padrão no dashboard.
- O botão **não** baixa dados novos do Strava. A planilha `activities` é atualizada pelo export
  do Strava, como o usuário já faz.

## Dashboard novo para outro assunto

Se o pedido for montar algo parecido do zero (outro tema, outras planilhas), siga
`references/receita-dashboard-planilhas.md`. Ela traz as fases com pontos de parada para
aprovação e o que reaproveitar deste projeto.
