// Teste do ETL com os dados reais de manutenções + Strava sintético. Uso: node test/teste_etl.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const ctx = { module: { exports: {} }, console };
vm.createContext(ctx); vm.runInContext(src, ctx);
const G = ctx.module.exports;
const sem = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sementes', 'sementes.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_manutencoes.json'), 'utf8'));
const outras = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture_outras.json'), 'utf8'));

// --- parsers ---
assert.strictEqual(G.parseNumeroBR('7489,8'), 7489.8);
assert.strictEqual(G.parseNumeroBR('305.000'), 305000);
assert.strictEqual(G.parseNumeroBR('8.628'), 8628);
assert.strictEqual(G.parseNumeroBR('1.234,56'), 1234.56);
assert.strictEqual(G.parseNumeroBR(''), null);
assert.strictEqual(G.parseNumeroStrava('39580.5'), 39580.5);
assert.strictEqual(G.parseDataBR('09/01/2026'), '2026-01-09');
assert.strictEqual(G.parseDataBR('31/02/2026'), null);
assert.strictEqual(G.parseDataStrava('2 de nov. de 2026, 12:02:56'), '2026-11-02');
assert.strictEqual(G.parseDataStrava('1 de nov. de 2026, 01:30:00'), '2026-10-31'); // UTC-3
assert.strictEqual(G.parseDataStrava('15 de mar. de 2024, 10:00:00'), '2024-03-15');
assert.ok(G.ehAquisicao('Compra   ') && G.ehAquisicao('Aquisição por Matheus') && G.ehAquisicao('Compra/troca') && G.ehAquisicao('Compra da bike'));
assert.ok(!G.ehAquisicao('Compra Guidão adventure'));

// --- Strava sintético com o cabeçalho real (colunas duplicadas) ---
const cab = ["ID da atividade","Data da atividade","Nome da atividade","Tipo de atividade","Descrição da atividade","Tempo decorrido","Distância","Frequência cardíaca máxima","Esforço relativo","Deslocamento","Observação privada da atividade","Equipamento da atividade","Nome do arquivo","Peso do atleta","Peso da bicicleta","Tempo decorrido","Tempo de movimentação","Distância"];
const mesesAbr = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const act = [cab];
function add(d, eq, km) {
  const r = new Array(cab.length).fill('');
  r[1] = `${d.getUTCDate()} de ${mesesAbr[d.getUTCMonth()]}. de ${d.getUTCFullYear()}, 12:00:00`;
  r[11] = eq; r[16] = '3600.0'; r[17] = String(km * 1000); r[6] = String(km).replace('.', ',');
  act.push(r);
}
for (let t = Date.UTC(2021, 0, 25); t <= Date.UTC(2026, 10, 2); t += 7 * 86400000) add(new Date(t), 'CHISEL', 30);
for (let t = Date.UTC(2016, 9, 1); t <= Date.UTC(2026, 9, 1); t += 7 * 86400000) add(new Date(t), 'Tricross', 40);
for (let t = Date.UTC(2024, 7, 20); t <= Date.UTC(2026, 10, 1); t += 5 * 86400000) add(new Date(t), 'Fila fire Fire', 6.3);
for (let t = Date.UTC(2023, 1, 1); t <= Date.UTC(2024, 6, 1); t += 4 * 86400000) add(new Date(t), 'ASICS Gel-shinobi Shinobi', 7.5);
for (let t = Date.UTC(2023, 1, 5); t <= Date.UTC(2023, 8, 1); t += 20 * 86400000) add(new Date(t), 'Kalenji evadic KIPRUN TR', 9);
for (let t = Date.UTC(2025, 1, 1); t <= Date.UTC(2026, 9, 1); t += 9 * 86400000) add(new Date(t), 'Vans Ultrarange Neo Vr3', 5);
for (let t = Date.UTC(2017, 0, 1); t <= Date.UTC(2020, 11, 1); t += 6 * 86400000) add(new Date(t), 'PRO - CARBONO - ARO 26', 35);
add(new Date(Date.UTC(2025, 0, 11)), 'Bike desconhecida', 10);
add(new Date(Date.UTC(2025, 0, 12)), '', 5);

const r = G.transformar(
  { manutencoes: man, activities: act, kmTotal: outras.kmTotal, bikes: outras.bikes },
  sem
);
const pend = r.pendencias.map(p => p.join(' | '));
console.log('stats', JSON.stringify(r.stats));
console.log('pendências:\n  ' + pend.join('\n  '));

const naoClass = r.pendencias.filter(p => p[0] === 'Serviço não classificado');
assert.strictEqual(naoClass.length, 0, 'todos os serviços reais devem ser classificados');
assert.ok(!r.pendencias.some(p => p[0] === 'Equipamento sem de-para' && p[1] === 'manutencoes'), 'todos os nomes de manutenções mapeados');
assert.ok(pend.some(p => p.startsWith('Possível duplicata') && p.includes('Vela de ignição M10')));
assert.ok(pend.some(p => p.startsWith('Data inferida') && p.includes('canister')));
assert.ok(pend.some(p => p.includes('Bike desconhecida')));
assert.strictEqual(r.stats.ativ_sem_equip, 1);

const col = n => sem.dim_equipamento && null;
const M = r.fato_manutencao;
const porTexto = t => M.filter(m => m[13] === t);
// classificação: amostras
const cls = Object.fromEntries(M.map(m => [m[13], m[8]]));
const esperado = {
  'Kit do filtro de oleo': 'S-OLEO-FILTRO', 'Troca de filtro óleo motor': 'S-OLEO-FILTRO', 'Oleo motor 15w-50': 'S-OLEO-MOTOR',
  'Troca êmbolo suspensão': 'S-SUSP-REPARO', 'Revisão suspensão': 'S-SUSP', 'Líquido pneu traseiro': 'S-SELANTE',
  'Troca camera pneu traseiro': 'S-PNEU-REPARO', 'Remendo pneu traseiro': 'S-PNEU-REPARO', 'Pneu traseiro': 'S-PNEU',
  'Relação: coroa,corrente e pinhão': 'S-RELACAO', 'CAMBAGEM': 'S-ALINHAMENTO', 'Troca câmbio traseiro': 'S-CAMBIO',
  'Compra Guidão adventure': 'S-ACESSORIOS', 'Revisão da caixa de direção': 'S-DIRECAO', 'Troca de válvula do motor': 'S-MOTOR-REPARO',
  'Regular válvulas do motor': 'S-VALVULAS', 'Medição de corrente OK': 'S-MEDICAO-CORRENTE', 'Troca': 'S-HIDRAULICA',
  'Limpeza do filtro K & N': 'S-FILTRO-AR', 'Troca milha direita': 'S-ELETRICA', 'Sensor de rotação': 'S-MOTOR-REPARO',
};
for (const [t, id] of Object.entries(esperado)) assert.strictEqual(cls[t], id, `classificação de "${t}": ${cls[t]}`);

// Pajero: histórico anterior à compra
const pajero = M.filter(m => m[1] === 'CARRO-TR4');
assert.strictEqual(pajero.filter(m => m[17] === 'Dono anterior').length, 4); // bateria + óleo + filtro óleo + filtro ar
// Bike km vem do Strava acumulado
const chiselRev = M.find(m => m[1] === 'BIKE-CHISEL' && m[4] === '2026-01-09');
assert.ok(chiselRev[6] > 7000 && chiselRev[7] === 7489.8, 'km_no_evento (Strava) e km_informado');
// aquisições: compras separadas
assert.strictEqual(r.fato_aquisicao.length, 48);
assert.ok(!M.some(m => /^compra$/i.test(m[13].trim())));
// hodômetro
const hod = r.fato_hodometro.filter(h => h[1] === 'CARRO-TR4');
assert.ok(hod.some(h => h[2] === 327500 && h[3] === 'km_total'));
assert.ok(r.fato_hodometro.some(h => h[1] === 'MOTO-HIMALAYAN' && h[2] === 68000));
console.log(`manutenções: ${M.length}, aquisições: ${r.fato_aquisicao.length}, uso: ${r.fato_uso_diario.length}, hodômetro: ${r.fato_hodometro.length}`);
const custo = M.filter(m => m[17] === 'Próprio').reduce((s, m) => s + (m[14] || 0), 0);
console.log('custo próprio total:', custo);

// --- dashboard ---
const objs = (cabec, linhas) => linhas.map(l => Object.fromEntries(cabec.map((c, i) => [c, l[i]])));
const CAB = {
  m: ['manut_id','equip_id','nome_equipamento','categoria','data','ano_mes','km_no_evento','km_informado','servico_id','servico','componente','grupo','natureza','descricao_original','custo','observacao','evento_id','periodo_posse','linha_origem'],
};
const d = G.montarDashboard({
  equipamentos: G.paraObjetos(sem.dim_equipamento), plano: G.paraObjetos(sem.plano_manutencao),
  manutencoes: objs(CAB.m, M).map(m => ({ ...m, km_no_evento: m.km_no_evento ?? '' })),
  aquisicoes: [], uso: objs(['data','equip_id','km_dia','n_atividades','tempo_mov_h'], r.fato_uso_diario),
  hodometro: objs(['data','equip_id','km_leitura','fonte'], r.fato_hodometro), pendencias: r.pendencias, ultimaAtualizacao: '09/11/2026 08:15:02',
}, '2026-11-09');
console.log('status:'); d.status.forEach(s => console.log(`  ${s.situacao.padEnd(12)} ${s.equipamento.padEnd(22)} ${s.componente.padEnd(28)} últ=${s.ultima_data} km_desde=${s.km_desde} dias=${s.dias_desde} pct=${s.pct && s.pct.toFixed(2)}`));
assert.ok(d.status.length > 15);
const kc = d.equipamentos.find(e => e.equip_id === 'CARRO-TR4').km_atual; assert.ok(kc.estimado && kc.km_leitura === 327500 && kc.km > 327500); console.log('Pajero', JSON.stringify(kc), 'Moto', JSON.stringify(d.equipamentos.find(e => e.equip_id === 'MOTO-HIMALAYAN').km_atual));
fs.writeFileSync(path.join(__dirname, 'mock_dashboard.json'), JSON.stringify(d));
console.log('OK — todos os testes passaram');
