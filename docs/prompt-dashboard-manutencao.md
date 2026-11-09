# Prompt de execução: Dashboard de Manutenção de Equipamentos

> Cole este prompt numa sessão do Claude que tenha acesso ao Google Drive e ao Google Sheets do usuário.
> Ele foi escrito depois de uma análise da estrutura real das planilhas (09/11/2026).

---

## Contexto

Quero um dashboard que mostre **as manutenções dos meus equipamentos ao longo do tempo**, com um **botão que atualize os dados** a partir das planilhas de origem. Todos os dados ficam no meu Google Drive. Se precisar de tabelas novas, crie-as no Google Drive.

### Planilhas de origem (somente leitura, nunca altere)

| Planilha | ID | Aba | Conteúdo |
|---|---|---|---|
| Manutenções equipamentos | `1NKJVfKI6DM-9FrEZGDfWF5iMBOIbGLF0YxN6yZGltUg` | `Equipamentos` | ~200 linhas. Colunas: Tipo, Equipamento, O que foi feito, Data, Km, Observação, Marca, Modelo, Valor, Km atual, Utilização |
| activities (planilha Google de 02/11/2026) | `1c1ku0zijqbcF8b0JOFyGn8qDJTlYGPiwS6u68BfW5UE` | `activities` | ~1.700 linhas, 106 colunas. É o export do Strava: pedaladas, corridas e caminhadas, com o equipamento usado em cada uma |
| km total | `1eP1wUMXCAARKJH6UIpGW5_oo-yvhdtaKd2NVsC4Zbqc` | `Página1` | Leituras manuais de hodômetro: Equipamento, Modelo, km total, data km total |
| bikes | `1eLm-Y92ghWu7hqNg4MegwTgMB5xmHCHFltcR3xjHnfc` | `bikes` | Cadastro das 3 bikes: Nome, Marca, Modelo, Padrão esporte |

Não use os arquivos `activities.csv` nem `bikes.csv`. Use apenas as planilhas Google acima.

### Problemas encontrados nos dados (o modelo novo precisa resolver)

1. **Compras e manutenções estão misturadas** em `Equipamentos` ("Compra", "Aquisição", "Compra/troca" estão junto com "Revisão Geral", "Troca corrente" etc.). Há também itens sem manutenção nenhuma: TV, sofá, cafeteira, celular…
2. **Os nomes dos equipamentos não batem entre as planilhas**:
   - `Fire` ↔ `Fila fire Fire` (Strava)
   - `KIPRUN TR` ↔ `Kalenji evadic KIPRUN TR`
   - `Shinobi` ↔ `ASICS Gel-shinobi Shinobi`
   - `Ultrarange Neo Vr3 …` ↔ `Vans Ultrarange Neo Vr3`
   - `Backpack NH500 20L GREY` ↔ `Quechua NH 500 NH500`
   - `CHISEL`, `Tricross` e `PRO - CARBONO - ARO 26` batem.
3. **Acessórios estão classificados pelo "Tipo" do veículo.** Por exemplo, capacetes e jaquetas aparecem com Tipo = Bicicleta/Motocicleta, e "Bomba de combustível" aparece como se fosse um equipamento.
4. **Os números estão como texto e em formatos misturados**:
   - Km: `7489,8` (vírgula decimal), `305.000` (ponto de milhar), `318585`.
   - Valor: `314,93`, `999`.
   - km total: `8.628`, `66500`.
5. **Datas**: `Equipamentos` usa `dd/mm/aaaa` e uma linha está sem data ("Ajuste de borracha canister"). Já `activities` usa texto em pt-BR, por exemplo `2 de nov. de 2026, 12:02:56`.
6. **`activities` tem colunas com nomes duplicados.** Há duas "Distância": a coluna G, em km com vírgula, e a coluna R, em metros. Também há duas "Tempo decorrido". Use a coluna **R (metros)** como fonte da distância. Os equipamentos estão na coluna **L** ("Equipamento da atividade"), e há atividades sem equipamento.
7. **Há linhas duplicadas e linhas que agrupam vários eventos.** Exemplos: "Vela de ignição M10" aparece duas vezes em 06/09/2022, e "Troca da bateria (23-03-22)(2/2/24)" junta duas datas numa linha só.
8. **Cada tipo de equipamento tem uma fonte de km diferente**:
   - Bikes e tênis: o km sai do Strava (`activities`).
   - Moto e carro: o km sai das leituras manuais (`km total`) e da coluna Km das manutenções.
   - Demais itens: não têm km.
9. A coluna "Utilização" está quase vazia, e "Km atual" está preenchida só em poucas linhas.

---

## Estratégia recomendada

### Decisão 1: criar tabelas novas? **Sim.** Fazer uma camada modelada separada das fontes

As planilhas de origem continuam como estão, para eu seguir preenchendo do jeito de sempre. Crie no Drive **uma planilha nova, `Manutenção – Modelo de Dados`**, com estas abas (modelo estrela simples):

| Aba | Tipo | Preenchimento | Colunas principais |
|---|---|---|---|
| `dim_equipamento` | dimensão | **manual** (semente gerada por você, depois eu mantenho) | equip_id, nome_canonico, categoria (Veículo, Bicicleta, Calçado, Acessório, Eletrônico, Casa, Outros), subtipo (Moto, Carro, MTB, Gravel, Tênis corrida…), marca, modelo, data_aquisicao, valor_aquisicao, data_baixa, status (Ativo/Baixado), fonte_km (`strava`/`hodometro`/`nenhuma`), equip_pai_id (ex.: capacete → moto, opcional), rastrear_manutencao (S/N) |
| `de_para_nomes` | mapeamento | **manual** (semente gerada por você) | nome_origem, origem (`manutencoes`/`strava`/`km_total`/`bikes`), equip_id |
| `dim_servico` | dimensão | semente gerada por você, depois eu mantenho | servico_id, descricao_padrao, componente (Transmissão, Pneu, Suspensão, Freio, Motor/Óleo, Elétrica, Geral…), natureza (Preventiva/Corretiva/Upgrade), padroes_texto (palavras-chave usadas para classificar "O que foi feito") |
| `plano_manutencao` | parâmetro | **manual** | equip_id ou subtipo, componente, intervalo_km, intervalo_dias. Exemplos: óleo da moto a cada 5.000 km; líquido selante dos pneus a cada 120 dias |
| `fato_manutencao` | fato | **gerada pelo botão** | manut_id, equip_id, data, km_no_evento, servico_id, componente, natureza, descricao_original, custo, observacao, evento_id (agrupa os itens de uma mesma visita/revisão: mesmo equipamento + mesma data), linha_origem |
| `fato_aquisicao` | fato | **gerada pelo botão** | equip_id, data, valor, loja/obs (linhas "Compra"/"Aquisição") |
| `fato_uso_diario` | fato | **gerada pelo botão** | data, equip_id, km_dia, n_atividades, tempo_mov_s (Strava, agregado por dia e equipamento) |
| `fato_hodometro` | fato | **gerada pelo botão** | data, equip_id, km_leitura, fonte (`km_total` ou `manutencao`) |
| `log_atualizacao` | controle | gerada pelo botão | timestamp, linhas lidas por fonte, linhas gravadas, nomes sem de-para, avisos |
| `pendencias` | controle | gerada pelo botão | nomes sem mapeamento, datas inválidas, km inválido, possíveis duplicatas. É o que eu preciso corrigir na origem |

Com isso dá para calcular:
- **km acumulado do equipamento em qualquer data**: soma do Strava até a data (bikes e tênis) ou interpolação das leituras de hodômetro (moto e carro);
- **km e dias desde a última manutenção de cada componente**, e **próxima manutenção prevista** (usando `plano_manutencao`);
- **custo de manutenção por mês/ano**, por equipamento e por componente, e **custo por km**.

### Decisão 2: melhorar a modelagem atual ou criar outra? **Criar outra (a camada acima), sem reestruturar a planilha original.**

A planilha original é usada para digitar, então mudar a estrutura dela atrapalharia o dia a dia. A camada nova normaliza os dados (nomes, números, datas, separação compra × manutenção) e é refeita do zero a cada atualização, o que garante que a atualização possa ser repetida sem duplicar nada. Melhorias opcionais na planilha original, **só se eu aprovar**:
- validação de dados (lista suspensa) na coluna Equipamento, usando `dim_equipamento`;
- formatar Data como data, e Km e Valor como número.

### Decisão 3: tecnologia do dashboard e do botão de atualizar. **Google Apps Script (web app) ligado à planilha de modelo**

Motivos: está tudo no Google Drive, não tem custo, o botão de atualizar roda no próprio Google (lê as fontes e regrava as abas `fato_*`), e o web app pode ser **embutido no Google Sites "Gestão de Manutenções de Equipamentos"** que já existe no meu Drive.

- `Code.gs`:
  - `atualizarDados()` faz o ETL das 4 fontes para as abas do modelo, grava `log_atualizacao` e `pendencias`, e usa `LockService` para impedir duas execuções ao mesmo tempo;
  - `getDashboardData(filtros)` devolve JSON para a página;
  - `doGet()` serve o HTML;
  - `onOpen()` cria o menu "Manutenção → Atualizar dados" na própria planilha.
- `Dashboard.html`:
  - página com Chart.js (CDN com versão fixa);
  - botão **"Atualizar planilhas"**, que chama `google.script.run.atualizarDados()`, mostra o progresso e recarrega os gráficos;
  - mostra também a data e hora da última atualização.
- Opcional: um gatilho de tempo diário para chamar `atualizarDados()`.
- Alternativa descartada: Looker Studio. Ele não tem botão que rode o ETL e tem pouca flexibilidade para os cálculos de km desde a última manutenção.

> Observação: o botão atualiza o modelo a partir das planilhas. Ele **não** baixa dados novos do Strava. A planilha `activities` continua sendo atualizada pelo export do Strava, como já faço hoje. Opcional (perguntar antes): o botão pode procurar o `activities.csv` mais recente no Drive e acrescentar à planilha `activities` as atividades que ainda não estão lá (comparando pelo ID da atividade).

### Conteúdo do dashboard (foco: manutenções ao longo do tempo)

1. **Filtros**: período, categoria, equipamento, componente, natureza.
2. **KPIs**: nº de manutenções no período; custo total; custo por km (bikes/moto/carro); dias desde a última manutenção; alertas de manutenção vencida ou próxima.
3. **Linha do tempo de manutenções**: eixo X = data, uma faixa por equipamento, um ponto por evento (cor = componente). Tooltip com os serviços e o km.
4. **Manutenções por mês/ano**: barras empilhadas por equipamento ou componente, alternando entre contagem e custo.
5. **Uso × manutenção** (bikes e tênis): km por mês (Strava) como área, com as manutenções marcadas como pontos. Mostra o "km entre manutenções".
6. **Hodômetro** (moto e carro): km acumulado ao longo do tempo, com os eventos de manutenção marcados.
7. **Status por componente**: tabela com equipamento, componente, última data, km na última, km desde então, intervalo do plano, % consumido e próxima data/km prevista (semáforo).
8. **Vida útil dos tênis**: km acumulado por tênis desde a data de aquisição, com uma linha de referência (ex.: 600–800 km).
9. **Tabela detalhada** pesquisável com todas as manutenções e o link para a linha de origem.

---

## Passo a passo de execução (siga esta ordem e pare nos checkpoints)

1. **Diagnóstico** (só leitura): leia as 4 planilhas inteiras. Gere um relatório curto com contagem de linhas, valores distintos de Equipamento/Tipo/"O que foi feito", nomes da coluna L do Strava com o km total de cada um, e os problemas da lista acima confirmados ou novos.
2. **Proposta de sementes**: monte, em tabelas no chat, `dim_equipamento`, `de_para_nomes`, `dim_servico` (classificação de cada "O que foi feito" em componente e natureza) e um `plano_manutencao` sugerido.
   **CHECKPOINT: espere eu aprovar ou corrigir.**
3. **Criar a planilha `Manutenção – Modelo de Dados` no Drive**, com as abas e os cabeçalhos acima, e gravar as sementes aprovadas. Me passe o link.
4. **Apps Script**: escreva `Code.gs` e `Dashboard.html` completos e um passo a passo de instalação (Extensões → Apps Script, colar os arquivos, autorizar, Implantar → App da Web, embutir no Google Sites). Os arquivos também devem ficar versionados neste repositório, em `apps-script/`.
   Se não for possível criar o projeto Apps Script pelo conector, entregue os arquivos prontos para colar.
5. **Primeira carga**: rode a mesma lógica do ETL (ou peça que eu clique em "Atualizar") e confira:
   - todas as linhas de manutenção ficaram mapeadas ou foram para `pendencias`;
   - o km do Strava por bike bate com a planilha `km total` (ex.: CHISEL ≈ 9.226 km em 25/09/2026; Tricross ≈ 21.534 km), com tolerância explicada;
   - o custo total bate com a soma da coluna Valor das linhas que não são compra.
6. **Entrega**: link da planilha de modelo, link do web app (ou instruções), lista de pendências para eu corrigir na origem e sugestões de próximos passos.

### Regras

- **Nunca** altere as 4 planilhas de origem sem a minha aprovação explícita.
- Todo texto da interface deve estar em português do Brasil. Use datas `dd/mm/aaaa`, números `1.234,5` e moeda `R$`.
- O ETL precisa poder ser rodado várias vezes: limpa e regrava as abas `fato_*`, sem nunca apagar as abas manuais.
- Nome sem de-para não pode sumir em silêncio: ele vai para `pendencias`.
- Commits deste repositório vão para a branch `claude/festive-sagan-wu0avp`.
