# Etapas 1 e 2: diagnóstico e sementes propostas

> Gerado em 09/11/2026 a partir das planilhas de origem (somente leitura).
> **Status: aguardando aprovação.** Nada foi criado no Google Drive ainda.

---

## 1. Diagnóstico

### Manutenções equipamentos (aba `Equipamentos`)
- **~190 linhas** de dados (vão até a linha 191; o resto da grade está vazio).
- **Compras/aquisições**: 52 linhas ("Compra", "Compra ", "Compra   ", "Aquisição", "Compra/troca", "Compra da bike", "Aquisição por Matheus").
- **Manutenções**: ~138 linhas, distribuídas assim:
  - Motocicleta Himalayan 411: ~95 linhas, de 17/02/2020 a 28/02/2026;
  - Bicicleta CHISEL: ~35;
  - Carro Pajero TR4: ~19;
  - Bicicleta Tricross: ~7;
  - Bicicleta PRO – Carbono: 3;
  - Banheiro: 1.
- **Valor preenchido** em só ~20% das manutenções, principalmente nas mais recentes: carro em 05/2026, CHISEL em 01/2026 e alguns itens da moto.

### activities (Strava)
- **~1.690 atividades.** A coluna L tem estes equipamentos:

| Nome no Strava | O que é |
|---|---|
| CHISEL | bike MTB |
| Tricross | bike gravel/ciclocross |
| PRO - CARBONO - ARO 26 | bike MTB antiga (usada só nas atividades mais antigas) |
| Fila fire Fire | tênis de corrida |
| ASICS Gel-shinobi Shinobi | tênis |
| Kalenji evadic KIPRUN TR | tênis trail |
| Vans Ultrarange Neo Vr3 | tênis casual/caminhada |
| Quechua NH 500 NH500 | mochila (trilhas) |
| *(vazio)* | ~250 atividades sem equipamento |

- **Distância**: a coluna R está em metros, como texto com ponto decimal (`39580.5`). Há várias atividades com `0.0` (provavelmente treinos indoor/musculação).
- **Data**: a coluna B está em texto pt-BR, no formato `2 de nov. de 2026, 12:02:56`. O ETL vai converter isso com um mapa dos meses (jan., fev., …).
- A conferência do km acumulado por equipamento no Strava contra a planilha `km total` fica para a **primeira carga** (etapa 5), feita pelo próprio script.

### km total
- 6 leituras: Himalayan (1), Pajero (2), CHISEL (2), Tricross (1).
- Os números estão como texto e misturam formatos: `66500`, `8.628`, `322.800`. O ponto é separador de milhar.

### bikes
- 3 bikes (CHISEL, PRO – Carbono, Tricross). Os nomes batem 100% com o Strava.

---

## 2. Sementes propostas

### 2.1 `dim_equipamento`: equipamentos com manutenção rastreada

| equip_id | nome_canonico | categoria | subtipo | marca | modelo | data_aquisicao | valor_aquisicao | status | fonte_km | rastrear |
|---|---|---|---|---|---|---|---|---|---|---|
| MOTO-HIMALAYAN | Himalayan 411 | Veículo | Moto | Royal Enfield | Himalayan 411 | 22/01/2020 | | Ativo | hodometro | S |
| CARRO-TR4 | Pajero TR4 2010 | Veículo | Carro | Mitsubishi | Pajero TR4 2010 | 13/04/2026 | | Ativo | hodometro | S |
| BIKE-CHISEL | CHISEL | Bicicleta | MTB | Specialized | Chisel | 22/01/2021 | | Ativo | strava | S |
| BIKE-TRICROSS | Tricross | Bicicleta | Gravel/Ciclocross | Specialized | Tricross | 23/09/2016 | 5.000,00 | Ativo | strava | S |
| BIKE-FUJI | PRO – Carbono Aro 26 | Bicicleta | MTB | Fuji | MTB PRO | | | **Baixado?** | strava | S |
| TENIS-FIRE | Fila Fire | Calçado | Tênis corrida | Fila | Fire | 16/08/2024 | 199,00 | Ativo | strava | S |
| TENIS-SHINOBI | ASICS Gel Shinobi | Calçado | Tênis corrida | ASICS | Gel Shinobi | 28/01/2023 | | Ativo? | strava | S |
| TENIS-KIPRUN | Kiprun TR | Calçado | Tênis trail | Kalenji/Evadict | Kiprun TR | 28/01/2023 | | Ativo? | strava | S |
| TENIS-ULTRARANGE | Vans Ultrarange Neo VR3 | Calçado | Tênis casual | Vans | Ultrarange Neo VR3 | 17/01/2025 | 630,00 | Ativo | strava | S |
| CASA-BANHEIRO | Banheiro | Casa | Hidráulica | | | | | Ativo | nenhuma | S |

Para os tênis, "rastrear manutenção" significa acompanhar a vida útil em km, já que eles não passam por manutenção.

### 2.2 `dim_equipamento`: itens só com compra (entram no cadastro, sem manutenção)

| equip_id | nome_canonico | categoria | equip_pai_id | data | valor |
|---|---|---|---|---|---|
| ACC-CAP-AEROFIT | Capacete Aerofit 900 Noir | Acessório ciclismo | | 11/02/2023 | 250 |
| ACC-CAP-POLISPORT | Capacete Polisport Light Road | Acessório ciclismo | | 11/10/2023 | 280 |
| ACC-CICLO-IGS620 | Ciclocomputador IGS620 | Acessório ciclismo | | 15/01/2021 | 989 |
| ACC-CICLO-BSC300 | Ciclocomputador BSC 300 | Acessório ciclismo | | 28/04/2024 | 870 |
| ACC-CINTA-HR40 | Cinta cardíaca HR40 | Acessório ciclismo | | 31/01/2023 | 269 |
| ACC-OCULOS-OAKLEY | Oakley Flak 2.0 XL | Acessório ciclismo | | 11/10/2023 | 650 |
| ACC-MOCHILA-USWE | Mochila hidratação USWE Epic 8 | Acessório ciclismo | | 02/02/2023 | 1.044 |
| ACC-CAP-BELL-2020 | Capacete Bell MX-9 Adventure MIPS | Acessório moto | MOTO-HIMALAYAN | 25/01/2020 | 759 |
| ACC-CAP-BELL-2025 | Capacete Bell MX-9 Stealth Camo | Acessório moto | MOTO-HIMALAYAN | 07/02/2025 | 768 |
| ACC-CAP-HJC | Capacete HJC CS 15 Kane | Acessório moto | MOTO-HIMALAYAN | 09/08/2021 | 630 |
| ACC-JAQ-X11 | Jaqueta X-11 Summer Pro | Acessório moto | MOTO-HIMALAYAN | 21/02/2020 | 565 |
| ACC-JAQ-ALPINESTARS | Jaqueta Alpinestars Headlands Drystar | Acessório moto | MOTO-HIMALAYAN | 09/08/2021 | 1.530 |
| ACC-JAQ-TEXX | Jaqueta Texx Storm | Acessório moto | MOTO-HIMALAYAN | 29/08/2023 | 900 |
| TREK-BARRACA | Barraca Naturehike Mongar | Trekking | | 18/06/2021 | 1.459 |
| TREK-MOCHILA-DEUTER | Mochila Deuter Alpamayo 55+10 | Trekking | | 26/06/2021 | 952 |
| TREK-MOCHILA-NH500 | Mochila Quechua NH500 20L | Trekking | | 19/11/2020 | 250 |
| ELE-RELOGIO-GTR4 | Amazfit GTR4 | Eletrônico | | 02/09/2023 | 970 |
| … | TV, ar-condicionado, Alexa, cadeiras, cafeteira, JBL Flip 3, GoPro, celular, escova, AirPods, monitor, panela, sofá, soundbar, webcam, óculos Ray-Ban e tênis casuais Fila (4) | Eletrônico / Casa / Vestuário | | | |

Esses itens alimentam `fato_aquisicao` e um painel de compras. Não entram nos gráficos de manutenção.

### 2.3 `de_para_nomes`: só os nomes que não batem

| nome_origem | origem | equip_id |
|---|---|---|
| Himalayan 411 | manutencoes / km_total | MOTO-HIMALAYAN |
| Bomba de combustível | manutencoes | MOTO-HIMALAYAN |
| Pajero TR4 2010 | manutencoes / km_total | CARRO-TR4 |
| CHISEL | manutencoes / strava / km_total / bikes | BIKE-CHISEL |
| Tricross | manutencoes / strava / km_total / bikes | BIKE-TRICROSS |
| PRO - CARBONO - ARO 26 | manutencoes / strava / bikes | BIKE-FUJI |
| Fire ↔ Fila fire Fire | manutencoes ↔ strava | TENIS-FIRE |
| Shinobi ↔ ASICS Gel-shinobi Shinobi | manutencoes ↔ strava | TENIS-SHINOBI |
| KIPRUN TR ↔ Kalenji evadic KIPRUN TR | manutencoes ↔ strava | TENIS-KIPRUN |
| Ultrarange Neo Vr3 Mte Navy True Blue ↔ Vans Ultrarange Neo Vr3 | manutencoes ↔ strava | TENIS-ULTRARANGE |
| Backpack NH500 20L GREY ↔ Quechua NH 500 NH500 | manutencoes ↔ strava | TREK-MOCHILA-NH500 |
| Kit Completo caixa acoplada do vaso | manutencoes | CASA-BANHEIRO |

Os demais itens de compra são mapeados 1:1 pelo nome exato.

### 2.4 `dim_servico`: classificação de "O que foi feito"

| componente | natureza | textos de origem que caem aqui |
|---|---|---|
| Motor / Óleo | Preventiva | Oleo motor 15w-50; Kit do filtro de oleo; Arruela parafuso inspeção; Troca de óleo motor 10w40; Troca de filtro óleo motor; Troca de filtro de ar; Limpeza do filtro K & N; k-80 descarbonizante |
| Motor / Ignição e válvulas | Preventiva | Vela de ignição M10; Regular válvulas do motor |
| Motor / Reparo | Corretiva | Troca da junta cabeçote; Retífica do cabeçote; Troca de válvula do motor; Sensor de rotação; Bujão supressor |
| Motor / Inspeção | Inspeção | Avaliação correia dentada |
| Transmissão | Preventiva | Kit lubrificação; Relação completa; Relação: coroa,corrente e pinhão; Troca da relação; Troca corrente; Troca cassete; Troca coroa; Troca câmbio traseiro; Cabo de embreagem troca; Graxa branca especial |
| Transmissão / Inspeção | Inspeção | Medição de corrente OK |
| Pneus | Preventiva | Troca dos pneus; Troca pneu traseiro; Pneu traseiro; Vacina nos pneus |
| Pneus / Selante | Preventiva | Troca líquido dos pneus; Líquido dois pneus; Líquido pneu traseiro; Líquido pneu dianteiro |
| Pneus / Reparo | Corretiva | Troca de câmera de ar; Troca camera pneu traseiro; Remendo pneu traseiro |
| Rodas / Alinhamento | Preventiva | Balancear rodas; ALINHAMENTO; BALANCEAMENTO; CAMBAGEM; DESEMPENO RODA; Protetor de aro traseiro |
| Rodas / Cubos | Corretiva | Troca rolamentos do Freehub |
| Suspensão | Preventiva | Suspensão; Revisão suspensão; Óleo suspensão 10w; Revisão suspensão dianteira |
| Suspensão / Reparo | Corretiva | Troca êmbolo suspensão; AMORTECEDOR TRASEIRO; AMORTECEDOR DIANTEIRO; KIT COXIM AMORTECEDOR DIANT.; COIFA DA RODA |
| Freios | Preventiva | Pastilha freio traseiro; Óleo DOT 4 (freio); Troca pastilha de freio traseira/DIANTEIRA; Troca do disco traseiro |
| Direção | Preventiva | Rolamentos caixa de direção; Revisão da caixa de direção |
| Elétrica | Corretiva | Troca da bateria; Curto no fusível de 10 amperes; Troca das duas setas dianteiras; Troca setas dianteiras; Troca lâmpada farol baixo; Troca milha direita |
| Combustível | Corretiva | Quebrou a bomba de combustível; Troca da bomba de combustível; Ajuste de borracha canister |
| Carroceria / Acessórios | Upgrade | Troca do escapamento; Troca ponteira escapamento; Troca da bolha para brisa; Troca do descanso do pé…; Compra/Troca guidão adventure; Colocação de película; Polimento faróis |
| Revisão geral | Preventiva | Revisão Geral; MAO DE OBRA MECANICA |
| Hidráulica | Corretiva | Kit Completo caixa acoplada do vaso (Troca) |

Texto que não casar com nenhum padrão vai para `pendencias`.

### 2.5 `plano_manutencao` sugerido

Os intervalos de km foram baseados no seu próprio histórico. **Ajuste à vontade.**

| equip_id / subtipo | componente | intervalo_km | intervalo_dias | base |
|---|---|---|---|---|
| MOTO-HIMALAYAN | Óleo + filtro | 5.000 | 180 | histórico: troca a cada ~5–7 mil km |
| MOTO-HIMALAYAN | Kit lubrificação (corrente) | 5.000 | 180 | histórico |
| MOTO-HIMALAYAN | Válvulas | 10.000 | 365 | histórico |
| MOTO-HIMALAYAN | Vela | 10.000 | 730 | |
| MOTO-HIMALAYAN | Óleo suspensão | 20.000 | 730 | |
| MOTO-HIMALAYAN | Fluido de freio DOT 4 | | 730 | |
| MOTO-HIMALAYAN | Relação | 20.000 | | |
| MOTO-HIMALAYAN | Pneus | 20.000 | | |
| CARRO-TR4 | Óleo + filtros | 10.000 | 365 | |
| CARRO-TR4 | Alinhamento/balanceamento | 10.000 | 365 | |
| CARRO-TR4 | Correia dentada | 60.000 | 1.460 | conferir no manual |
| Bicicleta (todas) | Selante pneus | | 120 | |
| Bicicleta (todas) | Revisão geral | 3.000 | 365 | |
| Bicicleta MTB | Revisão suspensão | 3.000 | 365 | |
| Bicicleta (todas) | Corrente (medir/trocar) | 2.000 | | |
| Bicicleta (todas) | Pneu traseiro | 3.000 | | |
| Bicicleta (todas) | Pastilhas de freio | 2.000 | | |
| Tênis corrida/trail | Vida útil | 700 | | referência comum: 600–800 km |

---

## 3. Pendências encontradas na origem (não vou alterar sem aprovação)

1. **Linha duplicada**: "Vela de ignição M10" aparece duas vezes em 06/09/2022 (Himalayan).
2. **Linha sem data**: "Ajuste de borracha canister", com 68.000 km. Sugestão: assumir 20/02/2026.
3. **Datas diferentes no mesmo texto**: "Troca da bateria (23-03-22)(2/2/24)" aparece em 06/09/2022 e em 08/01/2024, com a obs "48.400 km". As datas reais parecem ser 23/03/2022 e 02/02/2024.
4. **Marca/modelo provavelmente colados por engano**: "Kit lubrificação" de 06/09/2022 (moto) tem Marca = Shimano e Modelo = B05S, que é uma pastilha de freio de bike.
5. **Aquisição em dobro**: CHISEL tem "Aquisição" em 09/01/2021 e "Compra da bike" em 22/01/2021.
6. **Revisões em dias próximos**: CHISEL tem "Revisão Geral" e "Revisão suspensão" em 15/08/2023 e de novo em 18/08/2023. Pode ser retorno à oficina ou duplicata.
7. **Histórico do Pajero anterior à compra**: as linhas de 25/05/2024, 11/11/2024 ("Aquisição por Matheus") e 10/12/2025 são de antes da sua compra (13/04/2026).
8. **Datas diferentes na mesma revisão**: na revisão de 20/02/2026 da moto, "Troca pneu traseiro" está com data 28/02/2026.
9. **"Bomba de combustível"** está na coluna Equipamento, quando deveria ser Himalayan 411. Isso já está resolvido via de-para.
10. **Valor das compras de bike vazio**: as compras da CHISEL e dos tênis Shinobi e Kiprun estão sem valor.
