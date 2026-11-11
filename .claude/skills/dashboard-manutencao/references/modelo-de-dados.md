# Modelo de dados — "Manutenção – Modelo de Dados"

Colunas conferidas com `CABECALHOS` em `apps-script/Code.gs` e com `sementes.json`. Se o código
mudar, confira lá; o código é a fonte da verdade.

## Fontes (somente leitura)

| Chave em `CONFIG.FONTES` | Planilha / aba | Conteúdo útil |
|---|---|---|
| `manutencoes` | Manutenções equipamentos / `Equipamentos` | Tipo, Equipamento, O que foi feito, Data (`dd/mm/aaaa`), Km, Observação, Marca, Modelo, Valor, Km atual, Utilização. Compras e manutenções misturadas. |
| `activities` | activities / `activities` | Export do Strava, ~106 colunas. Data em texto pt-BR UTC; "Equipamento da atividade"; 2ª "Distância" em metros; "Tempo de movimentação" em segundos. |
| `kmTotal` | km total / `Página1` | Leituras manuais de hodômetro: Equipamento, Modelo, km total, data km total. |
| `bikes` | bikes / `bikes` | Cadastro das bikes: Nome, Marca, Modelo, Padrão esporte. Só é conferido contra o de-para. |

Todas são lidas com `getDisplayValues()` (texto exibido), para não depender da formatação.

## Abas manuais (o usuário mantém; o ETL só lê)

### `dim_equipamento`
`equip_id, nome_canonico, categoria, subtipo, marca, modelo, data_aquisicao, valor_aquisicao,
data_baixa, status, fonte_km, equip_pai_id, rastrear_manutencao, vida_util_km`

- `equip_id`: chave, padrão `TIPO-NOME` (`MOTO-HIMALAYAN`, `BIKE-CHISEL`, `TENIS-FIRE`, `ACC-...`, `CASA-...`).
- `categoria`: Veículo, Bicicleta, Calçado, Acessório ciclismo, Acessório moto, Eletrônico, Casa, Outros.
- `status`: `Ativo` ou `Baixado` (baixado sai dos alertas).
- `fonte_km`: `strava`, `hodometro` ou `nenhuma`.
- `equip_pai_id`: opcional (capacete → moto).
- `rastrear_manutencao`: `S` gera status por componente; `N` só histórico.
- `vida_util_km`: usado na curva de vida útil dos tênis.
- `data_aquisicao` define `periodo_posse`: manutenção antes dela = "Dono anterior".

### `de_para_nomes`
`nome_origem, origem, equip_id`

- `origem`: `manutencoes`, `strava`, `km_total`, `bikes` ou `*` (qualquer).
- Comparação sem acento, sem diferenciar maiúsculas e com espaços normalizados.
- Se não houver de-para, o ETL ainda tenta casar com `nome_canonico` ou `equip_id`.

### `dim_servico`
`ordem, servico_id, descricao_padrao, componente, natureza, padroes_texto`

- `natureza`: Preventiva, Corretiva ou Upgrade.
- `padroes_texto`: palavras-chave separadas por `;`. Vence o primeiro serviço por `ordem`
  cujo padrão aparece em "O que foi feito". Se o texto é genérico, o nome do equipamento também
  entra na busca.
- `componente` é agrupado em no máximo 8 grupos para a paleta (`GRUPOS` em `Code.gs`):
  Motor, Transmissão, Pneus e rodas, Suspensão, Freios, Elétrica e combustível, Revisão geral, Outros.

### `plano_manutencao`
`alvo, componente, servicos, intervalo_km, intervalo_dias, observacao`

- `alvo`: um `equip_id`, um `subtipo` (ex.: `MTB`) ou uma `categoria` (ex.: `Bicicleta`).
- `servicos`: `servico_id`s separados por `;`; a última manutenção com qualquer um deles conta.
- Intervalos vazios são ignorados; o maior percentual consumido decide o semáforo
  (≥ 100% Vencido, ≥ `CONFIG.ATENCAO_PCT` = 80% Atenção).

## Abas geradas pelo botão (limpas e regravadas a cada execução)

| Aba | Colunas |
|---|---|
| `fato_manutencao` | `manut_id, equip_id, nome_equipamento, categoria, data, ano_mes, km_no_evento, km_informado, servico_id, servico, componente, grupo, natureza, descricao_original, custo, observacao, evento_id, periodo_posse, linha_origem` |
| `fato_aquisicao` | `equip_id, nome_equipamento, categoria, data, valor, descricao_original, observacao, linha_origem` |
| `fato_uso_diario` | `data, equip_id, km_dia, n_atividades, tempo_mov_h` (Strava agregado por dia e equipamento) |
| `fato_hodometro` | `data, equip_id, km_leitura, fonte` (`km_total` ou `manutencao`; mantém a maior leitura por dia) |
| `pendencias` | `tipo, origem, linha, valor, detalhe` |
| `log_atualizacao` | `timestamp, duracao_s, manut_lidas, manut_gravadas, aquis_gravadas, ativ_lidas, ativ_sem_equip, uso_gravadas, hodometro_gravadas, pendencias, status, mensagem` (acumula; não é limpa) |

Detalhes:
- `km_no_evento`: bikes e tênis usam o km acumulado no Strava até a data; veículos usam o km
  digitado. O km digitado fica sempre em `km_informado`.
- `evento_id`: agrupa itens do mesmo equipamento na mesma data (uma visita/revisão).
- `ano_mes` é gravado como texto para o Sheets não convertê-lo em data.

## Tipos de pendência

| tipo | Origem | O que fazer |
|---|---|---|
| Equipamento sem de-para | qualquer fonte | Linha em `de_para_nomes` (ou equipamento novo em `dim_equipamento`). No Strava, o detalhe diz quantas atividades foram ignoradas. |
| Serviço não classificado | manutencoes | Padrão em `dim_servico.padroes_texto` ou serviço novo. |
| Data inválida | manutencoes, activities | Corrigir a data na origem (usuário). |
| Data inferida | manutencoes | Linha sem data recebeu a data de outra com o mesmo equipamento e km. Confirmar ou corrigir na origem. |
| Possível duplicata | manutencoes | Mesmo equipamento + data + texto; contada uma vez. Apagar a repetida na origem, se for mesmo duplicata. |
| Leitura inválida | km_total | Km ou data ilegível na planilha `km total`. |
