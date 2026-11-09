# Dashboard de Manutenção de Equipamentos (Google Apps Script)

Web app que lê 4 planilhas do Google Drive, monta um modelo de dados normalizado na planilha
**Manutenção – Modelo de Dados** e mostra as manutenções ao longo do tempo. O botão
**Atualizar planilhas** refaz o modelo a partir das fontes.

```
Fontes (só leitura)                 Modelo (planilha nova)                    Dashboard
───────────────────                 ──────────────────────                    ─────────
Manutenções equipamentos ─┐         manuais: dim_equipamento, de_para_nomes,
activities (Strava) ──────┼─ ETL ─▶          dim_servico, plano_manutencao  ─▶ web app
km total ─────────────────┤         geradas: fato_manutencao, fato_aquisicao,   (Dashboard.html)
bikes ────────────────────┘                  fato_uso_diario, fato_hodometro,
                                             pendencias, log_atualizacao
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `Code.gs` | ETL (`atualizarDados`), API da página (`getDashboardData`), `doGet`, menu na planilha |
| `Dashboard.html` | Página do dashboard (Chart.js 4.4.1), com tema claro/escuro e layout para celular |
| `appsscript.json` | Manifesto (fuso America/Sao_Paulo, web app só para você) |
| `sementes/` | Gerador e conteúdo inicial das abas manuais (já gravados na planilha) |
| `test/teste_etl.js` | Testes do ETL com os dados reais de manutenções: `node apps-script/test/teste_etl.js` |

## Instalação (uma vez, ~5 minutos)

1. Abra a planilha **Manutenção – Modelo de Dados**:
   https://docs.google.com/spreadsheets/d/1dbsPfl2tVdBW97KUOTGNOt-kfv6nUNAw_4IZZEhVWGA/edit
2. Menu **Extensões → Apps Script**.
3. No editor:
   - Apague o conteúdo de `Código.gs` e cole o conteúdo de `Code.gs`.
   - Clique em **+ → HTML**, dê o nome `Dashboard` (sem `.html`) e cole o conteúdo de `Dashboard.html`.
   - (Opcional) **Configurações do projeto → Mostrar o arquivo de manifesto "appsscript.json"** e cole o conteúdo de `appsscript.json`.
   - Salve (Ctrl+S).
4. Primeira carga: selecione a função **`atualizarDados`** no topo do editor e clique em **Executar**.
   O Google vai pedir autorização (o script lê as 4 planilhas e escreve na de modelo).
   Como o script é seu, aparece o aviso "app não verificado": clique em *Avançado → Acessar (não seguro)*.
5. Publicar o dashboard: **Implantar → Nova implantação → tipo "App da Web"**.
   - Executar como: **Eu**. Quem pode acessar: **Somente eu**.
   - Copie a URL `…/exec`. Esse é o dashboard.
6. (Opcional) Embutir no Google Sites "Gestão de Manutenções de Equipamentos":
   **Inserir → Incorporar → Por URL** e cole a URL `/exec`.
7. (Opcional) Atualização automática diária: no editor, execute `criarGatilhoDiario` uma vez (roda às 5h).

Depois de instalado, a planilha de modelo ganha o menu **Manutenção → Atualizar dados**, e o
dashboard tem o botão **Atualizar planilhas**. Os dois fazem a mesma coisa.

> Ao alterar o código depois, use **Implantar → Gerenciar implantações → editar → Nova versão**
> para a URL `/exec` passar a usar a versão nova.

## Uso no dia a dia

- Continue lançando manutenções na planilha **Manutenções equipamentos**, como sempre.
- Ao atualizar, confira a aba **pendencias**. Ela lista:
  - nome de equipamento sem correspondência: adicione uma linha em `de_para_nomes`;
  - serviço não classificado: adicione uma palavra-chave em `dim_servico.padroes_texto`;
  - datas inválidas ou inferidas, e possíveis duplicatas.
- Equipamento novo: adicione-o em `dim_equipamento` e, se o nome for diferente nas planilhas, em `de_para_nomes`.
- Ajuste os intervalos de manutenção em `plano_manutencao`. A coluna `alvo` aceita um `equip_id`, um `subtipo` (ex.: `MTB`) ou uma `categoria` (ex.: `Bicicleta`).
- Para tirar um equipamento dos alertas, mude `status` para `Baixado` em `dim_equipamento`.

## Regras do ETL

- As fontes são lidas como texto exibido (`getDisplayValues`), então funcionam com qualquer formatação.
- Números no padrão brasileiro: `7489,8`, `305.000` e `8.628` são lidos corretamente.
- **Compra × manutenção**: os textos "Compra", "Aquisição", "Compra/troca", "Compra da bike" e "Aquisição por …" vão para `fato_aquisicao`. O resto vai para `fato_manutencao`.
- **Classificação**: vale o primeiro serviço de `dim_servico` (pela coluna `ordem`) cuja palavra-chave aparece no texto, sem diferenciar acentos nem maiúsculas. Se o texto for genérico (por exemplo, "Troca"), o nome do equipamento também entra na busca.
- **Km no evento**:
  - bikes e tênis: km acumulado no Strava até a data. O km digitado continua disponível em `km_informado`;
  - moto e carro: o km digitado na manutenção.
- **Km atual**:
  - Strava: soma de todas as atividades;
  - hodômetro: última leitura (planilha `km total` ou maior km das manutenções), **estimada para hoje** pela média diária entre leituras. Nesse caso o dashboard marca o valor com `*`.
- **Strava**: a data vem em UTC e é convertida para o horário de Brasília. A distância é a 2ª coluna "Distância" (em metros). Atividades sem equipamento são ignoradas e contadas no log.
- **Duplicatas**: mesmo equipamento, mesma data e mesmo texto contam uma vez só. As repetições vão para `pendencias`.
- **Sem data**: herda a data de outra manutenção do mesmo equipamento com o mesmo km e registra uma pendência.
- **Dono anterior**: manutenção anterior a `data_aquisicao` fica marcada como `periodo_posse = Dono anterior`. O dashboard esconde essas linhas por padrão, mas há um filtro para incluí-las.
