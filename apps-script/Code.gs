/**
 * Dashboard de Manutenção de Equipamentos — ETL + API do web app.
 *
 * Instalação: veja apps-script/README.md.
 *
 * Fontes (somente leitura): Manutenções equipamentos, activities (Strava), km total, bikes.
 * Destino: planilha "Manutenção – Modelo de Dados" (abas fato_*, log_atualizacao, pendencias).
 * As abas manuais (dim_equipamento, de_para_nomes, dim_servico, plano_manutencao) NUNCA são
 * apagadas pelo ETL.
 */

var CONFIG = {
  MODELO_ID: '1dbsPfl2tVdBW97KUOTGNOt-kfv6nUNAw_4IZZEhVWGA',
  FONTES: {
    manutencoes: { id: '1NKJVfKI6DM-9FrEZGDfWF5iMBOIbGLF0YxN6yZGltUg', aba: 'Equipamentos' },
    activities: { id: '1c1ku0zijqbcF8b0JOFyGn8qDJTlYGPiwS6u68BfW5UE', aba: 'activities' },
    kmTotal: { id: '1eP1wUMXCAARKJH6UIpGW5_oo-yvhdtaKd2NVsC4Zbqc', aba: 'Página1' },
    bikes: { id: '1eLm-Y92ghWu7hqNg4MegwTgMB5xmHCHFltcR3xjHnfc', aba: 'bikes' }
  },
  // Strava exporta horário em UTC; Brasília não tem horário de verão desde 2019.
  OFFSET_STRAVA_HORAS: -3,
  ATENCAO_PCT: 0.8
};

var CABECALHOS = {
  fato_manutencao: ['manut_id', 'equip_id', 'nome_equipamento', 'categoria', 'data', 'ano_mes',
    'km_no_evento', 'km_informado', 'servico_id', 'servico', 'componente', 'grupo', 'natureza',
    'descricao_original', 'custo', 'observacao', 'evento_id', 'periodo_posse', 'linha_origem'],
  fato_aquisicao: ['equip_id', 'nome_equipamento', 'categoria', 'data', 'valor',
    'descricao_original', 'observacao', 'linha_origem'],
  fato_uso_diario: ['data', 'equip_id', 'km_dia', 'n_atividades', 'tempo_mov_h'],
  fato_hodometro: ['data', 'equip_id', 'km_leitura', 'fonte'],
  log_atualizacao: ['timestamp', 'duracao_s', 'manut_lidas', 'manut_gravadas', 'aquis_gravadas',
    'ativ_lidas', 'ativ_sem_equip', 'uso_gravadas', 'hodometro_gravadas', 'pendencias', 'status', 'mensagem'],
  pendencias: ['tipo', 'origem', 'linha', 'valor', 'detalhe']
};

// Agrupa componentes em no máximo 8 grupos (limite da paleta categórica do dashboard).
var GRUPOS = [
  ['Motor', 'Motor'], ['Transmissão', 'Transmissão'], ['Pneus', 'Pneus e rodas'], ['Rodas', 'Pneus e rodas'],
  ['Suspensão', 'Suspensão'], ['Freios', 'Freios'], ['Elétrica', 'Elétrica e combustível'],
  ['Combustível', 'Elétrica e combustível'], ['Revisão geral', 'Revisão geral']
];

/* ============================== utilitários puros ============================== */

function normalizar(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Número digitado no padrão brasileiro: "7489,8", "305.000", "8.628", "1.234,56", 999. */
function parseNumeroBR(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v == null ? '' : v).replace(/[R$\s]/g, '');
  if (!s) return null;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  var n = Number(s);
  return isFinite(n) ? n : null;
}

/** Número exportado pelo Strava ("39580.5"); aceita vírgula decimal se a planilha formatou. */
function parseNumeroStrava(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = Number(s);
  return isFinite(n) ? n : null;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function isoDe(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }

function dataValida(y, m, d) {
  if (!(y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  var dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1;
}

/** "dd/mm/aaaa" (ou Date) -> "aaaa-mm-dd"; null se inválida. */
function parseDataBR(v) {
  if (v instanceof Date && !isNaN(v)) return isoDe(v.getFullYear(), v.getMonth() + 1, v.getDate());
  var m = String(v == null ? '' : v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  var y = +m[3]; if (y < 100) y += 2000;
  return dataValida(y, +m[2], +m[1]) ? isoDe(y, +m[2], +m[1]) : null;
}

var MESES_PT = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

/** "2 de nov. de 2026, 12:02:56" (UTC) -> data local "aaaa-mm-dd". */
function parseDataStrava(v) {
  if (v instanceof Date && !isNaN(v)) return isoDe(v.getFullYear(), v.getMonth() + 1, v.getDate());
  var s = normalizar(v);
  var m = s.match(/^(\d{1,2}) de ([a-z]{3})[a-z]*\.? de (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return parseDataBR(v);
  var mes = MESES_PT[m[2]];
  if (!mes) return null;
  var t = Date.UTC(+m[3], mes - 1, +m[1], +m[4], +m[5], +(m[6] || 0)) + CONFIG.OFFSET_STRAVA_HORAS * 3600000;
  var d = new Date(t);
  return isoDe(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function diasEntre(isoA, isoB) {
  var a = isoA.split('-'), b = isoB.split('-');
  return Math.round((Date.UTC(+b[0], b[1] - 1, +b[2]) - Date.UTC(+a[0], a[1] - 1, +a[2])) / 86400000);
}

function somarDias(iso, dias) {
  var p = iso.split('-');
  var d = new Date(Date.UTC(+p[0], p[1] - 1, +p[2]) + dias * 86400000);
  return isoDe(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function grupoDoComponente(componente) {
  for (var i = 0; i < GRUPOS.length; i++) if (String(componente).indexOf(GRUPOS[i][0]) === 0) return GRUPOS[i][1];
  return 'Outros';
}

/** Texto de "O que foi feito" que representa compra/aquisição do próprio equipamento. */
function ehAquisicao(texto) {
  return /^(compra|aquisicao)( da bike| por .*|\/troca)?$/.test(normalizar(texto));
}

/** Índice da n-ésima (1-based) coluna com esse nome no cabeçalho. */
function colunaPorNome(cabecalho, nome, ocorrencia) {
  var alvo = normalizar(nome), n = 0;
  for (var i = 0; i < cabecalho.length; i++) {
    if (normalizar(cabecalho[i]) === alvo && ++n === (ocorrencia || 1)) return i;
  }
  return -1;
}

/** Converte linhas (com cabeçalho) em objetos indexados pelo nome da coluna. */
function paraObjetos(linhas) {
  if (!linhas || linhas.length < 2) return [];
  var cab = linhas[0].map(function (c) { return String(c).trim(); });
  var out = [];
  for (var i = 1; i < linhas.length; i++) {
    var vazio = true, o = {};
    for (var j = 0; j < cab.length; j++) {
      if (!cab[j]) continue;
      var v = linhas[i][j];
      if (v !== '' && v != null) vazio = false;
      o[cab[j]] = v == null ? '' : v;
    }
    if (!vazio) out.push(o);
  }
  return out;
}

function listaSeparada(s) {
  return String(s == null ? '' : s).split(';').map(function (x) { return x.trim(); }).filter(String);
}

/* ============================== núcleo do ETL (puro) ============================== */

/**
 * Recebe as linhas cruas (arrays 2D com cabeçalho) e devolve as tabelas do modelo.
 * Não toca em nenhum serviço do Google — testável fora do Apps Script.
 */
function transformar(fontes, manuais) {
  var pend = [];
  function pendencia(tipo, origem, linha, valor, detalhe) { pend.push([tipo, origem, linha, valor, detalhe || '']); }

  // ---------- dimensões manuais ----------
  var equips = paraObjetos(manuais.dim_equipamento);
  var equipPorId = {};
  equips.forEach(function (e) {
    e.data_aquisicao_iso = parseDataBR(e.data_aquisicao);
    equipPorId[e.equip_id] = e;
  });

  var dePara = {};
  paraObjetos(manuais.de_para_nomes).forEach(function (r) {
    var origem = normalizar(r.origem) || '*';
    dePara[origem + '|' + normalizar(r.nome_origem)] = r.equip_id;
  });
  function resolver(nome, origem) {
    var k = normalizar(nome);
    if (!k) return null;
    var id = dePara[origem + '|' + k] || dePara['*|' + k];
    if (!id) equips.forEach(function (e) { if (!id && (normalizar(e.nome_canonico) === k || normalizar(e.equip_id) === k)) id = e.equip_id; });
    return id && equipPorId[id] ? equipPorId[id] : null;
  }

  var servicos = paraObjetos(manuais.dim_servico).sort(function (a, b) { return (+a.ordem || 0) - (+b.ordem || 0); });
  servicos.forEach(function (s) { s.padroes = listaSeparada(s.padroes_texto).map(normalizar); });
  function classificar(texto) {
    var t = normalizar(texto);
    for (var i = 0; i < servicos.length; i++) {
      for (var j = 0; j < servicos[i].padroes.length; j++) if (t.indexOf(servicos[i].padroes[j]) >= 0) return servicos[i];
    }
    return null;
  }

  // ---------- Strava -> uso diário ----------
  var act = fontes.activities || [];
  var cabA = act[0] || [];
  var cData = colunaPorNome(cabA, 'Data da atividade'),
    cEq = colunaPorNome(cabA, 'Equipamento da atividade'),
    cDist = colunaPorNome(cabA, 'Distância', 2),       // 2ª "Distância" = metros
    cMov = colunaPorNome(cabA, 'Tempo de movimentação');
  if (cDist < 0) cDist = colunaPorNome(cabA, 'Distância', 1);
  var usoMap = {}, ativLidas = 0, ativSemEquip = 0, semMapStrava = {};
  for (var i = 1; i < act.length; i++) {
    var r = act[i];
    if (!r || !r[cData]) continue;
    ativLidas++;
    var nomeEq = String(r[cEq] || '').trim();
    if (!nomeEq) { ativSemEquip++; continue; }
    var eq = resolver(nomeEq, 'strava');
    if (!eq) { semMapStrava[nomeEq] = (semMapStrava[nomeEq] || 0) + 1; continue; }
    var d = parseDataStrava(r[cData]);
    if (!d) { pendencia('Data inválida', 'activities', i + 1, r[cData]); continue; }
    var distM = parseNumeroStrava(r[cDist]) || 0;
    var mov = cMov >= 0 ? (parseNumeroStrava(r[cMov]) || 0) : 0;
    var k = d + '|' + eq.equip_id;
    var u = usoMap[k] || (usoMap[k] = { data: d, equip_id: eq.equip_id, km: 0, n: 0, seg: 0 });
    u.km += distM / 1000; u.n++; u.seg += mov;
  }
  Object.keys(semMapStrava).forEach(function (n) {
    pendencia('Equipamento sem de-para', 'activities', '', n, semMapStrava[n] + ' atividade(s) ignoradas');
  });
  var uso = Object.keys(usoMap).map(function (k) { return usoMap[k]; })
    .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : a.equip_id < b.equip_id ? -1 : 1; });

  // km acumulado (Strava) por equipamento, para estimar km na data de cada manutenção
  var acumulado = {};
  uso.forEach(function (u) {
    var arr = acumulado[u.equip_id] || (acumulado[u.equip_id] = []);
    var ant = arr.length ? arr[arr.length - 1].km : 0;
    arr.push({ data: u.data, km: ant + u.km });
  });
  function kmStravaAte(equipId, iso) {
    var arr = acumulado[equipId]; if (!arr) return null;
    var km = 0;
    for (var i = 0; i < arr.length && arr[i].data <= iso; i++) km = arr[i].km;
    return km;
  }

  // ---------- Manutenções / aquisições ----------
  var man = fontes.manutencoes || [];
  var cabM = man[0] || [];
  var mc = {
    tipo: colunaPorNome(cabM, 'Tipo'), equip: colunaPorNome(cabM, 'Equipamento'),
    feito: colunaPorNome(cabM, 'O que foi feito'), data: colunaPorNome(cabM, 'Data'),
    km: colunaPorNome(cabM, 'Km'), obs: colunaPorNome(cabM, 'Observação'),
    valor: colunaPorNome(cabM, 'Valor')
  };
  var brutas = [], aquis = [], manutLidas = 0;
  for (var li = 1; li < man.length; li++) {
    var row = man[li] || [];
    var nome = String(row[mc.equip] || '').trim(), feito = String(row[mc.feito] || '').trim();
    if (!nome && !feito) continue;
    manutLidas++;
    var linha = li + 1;
    var e = resolver(nome, 'manutencoes');
    if (!e) { pendencia('Equipamento sem de-para', 'manutencoes', linha, nome); continue; }
    var dataIso = parseDataBR(row[mc.data]);
    var item = {
      e: e, linha: linha, feito: feito, nomeOrigem: nome, data: dataIso, dataBruta: row[mc.data],
      km: parseNumeroBR(row[mc.km]), custo: parseNumeroBR(row[mc.valor]),
      obs: String(row[mc.obs] || '').trim()
    };
    if (ehAquisicao(feito)) aquis.push(item); else brutas.push(item);
  }

  // datas faltantes: herda a data de outro evento do mesmo equipamento com o mesmo km
  brutas.forEach(function (it) {
    if (it.data) return;
    var par = null;
    if (it.km != null) brutas.forEach(function (o) { if (!par && o !== it && o.data && o.e === it.e && o.km === it.km) par = o; });
    if (par) {
      it.data = par.data;
      pendencia('Data inferida', 'manutencoes', it.linha, it.feito, 'sem data; assumida ' + par.data + ' (mesmo km da linha ' + par.linha + ')');
    } else {
      pendencia('Data inválida', 'manutencoes', it.linha, String(it.dataBruta), it.feito + ' — linha ignorada');
    }
  });

  var vistos = {}, manut = [], hodo = [];
  brutas.forEach(function (it) {
    if (!it.data) return;
    var chave = it.e.equip_id + '|' + it.data + '|' + normalizar(it.feito);
    if (vistos[chave]) {
      pendencia('Possível duplicata', 'manutencoes', it.linha, it.feito, 'igual à linha ' + vistos[chave] + ' — não contabilizada');
      return;
    }
    vistos[chave] = it.linha;
    // texto genérico ("Troca") pode ter o item no nome do equipamento ("Kit Completo caixa acoplada do vaso")
    var s = classificar(it.feito) || classificar(it.feito + ' ' + it.nomeOrigem);
    if (!s) pendencia('Serviço não classificado', 'manutencoes', it.linha, it.feito, 'adicione um padrão em dim_servico');
    var kmEvento = it.km;
    if (it.e.fonte_km === 'strava') {
      var kmS = kmStravaAte(it.e.equip_id, it.data);
      if (kmS != null) kmEvento = Math.round(kmS * 10) / 10;
    }
    if (it.e.fonte_km === 'hodometro' && it.km != null) hodo.push({ data: it.data, equip_id: it.e.equip_id, km: it.km, fonte: 'manutencao' });
    var posse = it.e.data_aquisicao_iso && it.data < it.e.data_aquisicao_iso ? 'Dono anterior' : 'Próprio';
    var comp = s ? s.componente : 'Outros';
    manut.push({
      equip_id: it.e.equip_id, nome: it.e.nome_canonico, categoria: it.e.categoria, data: it.data,
      km_no_evento: kmEvento, km_informado: it.km, servico_id: s ? s.servico_id : 'S-OUTROS',
      servico: s ? s.descricao_padrao : it.feito, componente: comp, grupo: grupoDoComponente(comp),
      natureza: s ? s.natureza : 'Não classificado', descricao: it.feito, custo: it.custo, obs: it.obs,
      evento_id: it.e.equip_id + '|' + it.data, posse: posse, linha: it.linha
    });
  });
  manut.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : a.linha - b.linha; });
  manut.forEach(function (m, i) { m.manut_id = 'M' + ('0000' + (i + 1)).slice(-4); });

  aquis.forEach(function (it) {
    if (!it.data) pendencia('Data inválida', 'manutencoes', it.linha, String(it.dataBruta), 'aquisição: ' + it.e.nome_canonico);
  });

  // ---------- km total -> hodômetro ----------
  var kt = fontes.kmTotal || [];
  var cabK = kt[0] || [];
  var kEq = colunaPorNome(cabK, 'Equipamento'), kMod = colunaPorNome(cabK, 'Modelo'),
    kKm = colunaPorNome(cabK, 'km total'), kData = colunaPorNome(cabK, 'data km total');
  for (var ki = 1; ki < kt.length; ki++) {
    var kr = kt[ki] || [];
    if (!kr[kMod] && !kr[kEq]) continue;
    var ke = resolver(kr[kMod], 'km_total') || resolver(kr[kEq], 'km_total');
    if (!ke) { pendencia('Equipamento sem de-para', 'km_total', ki + 1, kr[kMod] || kr[kEq]); continue; }
    var kd = parseDataBR(kr[kData]), kk = parseNumeroBR(kr[kKm]);
    if (!kd || kk == null) { pendencia('Leitura inválida', 'km_total', ki + 1, kr[kKm] + ' / ' + kr[kData]); continue; }
    hodo.push({ data: kd, equip_id: ke.equip_id, km: kk, fonte: 'km_total' });
  }
  // dedup (equip, data): mantém a maior leitura
  var hMap = {};
  hodo.forEach(function (h) {
    var k = h.equip_id + '|' + h.data;
    if (!hMap[k] || h.km > hMap[k].km) hMap[k] = h;
  });
  hodo = Object.keys(hMap).map(function (k) { return hMap[k]; })
    .sort(function (a, b) { return a.equip_id < b.equip_id ? -1 : a.equip_id > b.equip_id ? 1 : a.data < b.data ? -1 : 1; });

  // ---------- bikes: confere cadastro ----------
  paraObjetos(fontes.bikes || []).forEach(function (b, i) {
    var nb = b['Nome da bicicleta'];
    if (nb && !resolver(nb, 'bikes')) pendencia('Equipamento sem de-para', 'bikes', i + 2, nb);
  });

  return {
    fato_manutencao: manut.map(function (m) {
      return [m.manut_id, m.equip_id, m.nome, m.categoria, m.data, m.data.slice(0, 7), m.km_no_evento, m.km_informado,
        m.servico_id, m.servico, m.componente, m.grupo, m.natureza, m.descricao, m.custo, m.obs, m.evento_id, m.posse, m.linha];
    }),
    fato_aquisicao: aquis.filter(function (a) { return a.data; }).map(function (a) {
      return [a.e.equip_id, a.e.nome_canonico, a.e.categoria, a.data, a.custo, a.feito, a.obs, a.linha];
    }),
    fato_uso_diario: uso.map(function (u) {
      return [u.data, u.equip_id, Math.round(u.km * 100) / 100, u.n, Math.round(u.seg / 36) / 100];
    }),
    fato_hodometro: hodo.map(function (h) { return [h.data, h.equip_id, h.km, h.fonte]; }),
    pendencias: pend,
    stats: {
      manut_lidas: manutLidas, manut_gravadas: manut.length, aquis_gravadas: aquis.length,
      ativ_lidas: ativLidas, ativ_sem_equip: ativSemEquip, uso_gravadas: uso.length, hodometro_gravadas: hodo.length
    }
  };
}

/* ============================== cálculo do dashboard (puro) ============================== */

/** Monta o JSON consumido pela página a partir das tabelas do modelo (linhas sem cabeçalho já como objetos). */
function montarDashboard(t, hojeIso) {
  var equips = t.equipamentos, porId = {};
  equips.forEach(function (e) { porId[e.equip_id] = e; });

  // km atual
  var kmAtual = {};
  t.uso.forEach(function (u) {
    var k = kmAtual[u.equip_id] || (kmAtual[u.equip_id] = { km: 0, data: null, fonte: 'Strava' });
    k.km += +u.km_dia || 0;
    if (!k.data || u.data > k.data) k.data = u.data;
  });
  t.hodometro.forEach(function (h) {
    var e = porId[h.equip_id];
    if (!e || e.fonte_km !== 'hodometro') return;
    var k = kmAtual[h.equip_id];
    if (!k || k.fonte !== 'Hodômetro' || +h.km_leitura > k.km) kmAtual[h.equip_id] = { km: +h.km_leitura, data: h.data, fonte: 'Hodômetro' };
  });
  // hodômetro: estima o km de hoje pela média diária entre leituras dos últimos ~2 anos
  Object.keys(kmAtual).forEach(function (id) {
    var k = kmAtual[id];
    if (k.fonte !== 'Hodômetro') return;
    var leituras = t.hodometro.filter(function (h) { return h.equip_id === id; })
      .sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    var ref = null;
    leituras.forEach(function (h) { if (!ref && diasEntre(h.data, k.data) <= 730 && diasEntre(h.data, k.data) >= 60) ref = h; });
    var dias = diasEntre(k.data, hojeIso);
    if (ref && dias > 0) {
      var taxa = (k.km - +ref.km_leitura) / diasEntre(ref.data, k.data);
      if (taxa > 0) { k.km_leitura = k.km; k.km = k.km + taxa * dias; k.estimado = true; k.km_dia_medio = Math.round(taxa * 10) / 10; }
    }
  });
  Object.keys(kmAtual).forEach(function (id) { kmAtual[id].km = Math.round(kmAtual[id].km * 10) / 10; });

  // status por componente (plano)
  var status = [];
  t.plano.forEach(function (p) {
    var ids = listaSeparada(p.servicos);
    equips.forEach(function (e) {
      if (e.rastrear_manutencao !== 'S' || e.status === 'Baixado') return;
      if (p.alvo !== e.equip_id && p.alvo !== e.subtipo && p.alvo !== e.categoria) return;
      var ult = null;
      t.manutencoes.forEach(function (m) {
        if (m.equip_id === e.equip_id && ids.indexOf(m.servico_id) >= 0 && (!ult || m.data > ult.data)) ult = m;
      });
      var ka = kmAtual[e.equip_id], ikm = +p.intervalo_km || 0, idias = +p.intervalo_dias || 0;
      var linha = {
        equip_id: e.equip_id, equipamento: e.nome_canonico, componente: p.componente,
        ultima_data: ult ? ult.data : null, km_ultima: ult && ult.km_no_evento !== '' ? +ult.km_no_evento : null,
        km_atual: ka ? ka.km : null, km_desde: null, dias_desde: null,
        intervalo_km: ikm || null, intervalo_dias: idias || null, pct: null,
        proxima_data: null, proximo_km: null, situacao: 'Sem registro'
      };
      if (ult) {
        linha.dias_desde = diasEntre(ult.data, hojeIso);
        var pcts = [];
        if (idias) { pcts.push(linha.dias_desde / idias); linha.proxima_data = somarDias(ult.data, idias); }
        if (ikm && linha.km_ultima != null && ka) {
          linha.km_desde = Math.round((ka.km - linha.km_ultima) * 10) / 10;
          pcts.push(linha.km_desde / ikm);
          linha.proximo_km = Math.round(linha.km_ultima + ikm);
        }
        if (pcts.length) {
          linha.pct = Math.max.apply(null, pcts);
          linha.situacao = linha.pct >= 1 ? 'Vencido' : linha.pct >= CONFIG.ATENCAO_PCT ? 'Atenção' : 'OK';
        } else linha.situacao = 'Sem km';
      }
      status.push(linha);
    });
  });
  var ordem = { 'Vencido': 0, 'Atenção': 1, 'Sem registro': 2, 'Sem km': 3, 'OK': 4 };
  status.sort(function (a, b) { return (ordem[a.situacao] - ordem[b.situacao]) || ((b.pct || 0) - (a.pct || 0)); });

  // vida útil dos tênis (km acumulado desde a aquisição)
  var tenis = equips.filter(function (e) { return e.categoria === 'Calçado' && e.rastrear_manutencao === 'S'; })
    .map(function (e) {
      var acum = 0, serie = [];
      t.uso.filter(function (u) { return u.equip_id === e.equip_id; })
        .forEach(function (u) { acum += +u.km_dia || 0; serie.push([u.data, Math.round(acum * 10) / 10]); });
      return { equip_id: e.equip_id, nome: e.nome_canonico, status: e.status, vida_util_km: +e.vida_util_km || null, serie: serie };
    });

  // uso mensal por equipamento (Strava)
  var usoMensal = {};
  t.uso.forEach(function (u) {
    var k = u.equip_id + '|' + u.data.slice(0, 7);
    usoMensal[k] = (usoMensal[k] || 0) + (+u.km_dia || 0);
  });

  return {
    gerado_em: hojeIso,
    ultima_atualizacao: t.ultimaAtualizacao || null,
    equipamentos: equips.map(function (e) {
      return {
        equip_id: e.equip_id, nome: e.nome_canonico, categoria: e.categoria, subtipo: e.subtipo,
        status: e.status, fonte_km: e.fonte_km, rastrear: e.rastrear_manutencao,
        data_aquisicao: parseDataBR(e.data_aquisicao), km_atual: kmAtual[e.equip_id] || null
      };
    }),
    manutencoes: t.manutencoes,
    aquisicoes: t.aquisicoes,
    uso_mensal: Object.keys(usoMensal).map(function (k) {
      var p = k.split('|'); return [p[0], p[1], Math.round(usoMensal[k] * 10) / 10];
    }),
    hodometro: t.hodometro.map(function (h) { return [h.equip_id, h.data, +h.km_leitura, h.fonte]; }),
    status: status,
    tenis: tenis,
    pendencias: t.pendencias.length
  };
}

/* ============================== camada Google (Apps Script) ============================== */

function abrirModelo_() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa && ativa.getId() === CONFIG.MODELO_ID) return ativa;
  } catch (e) { /* web app sem planilha ativa */ }
  return SpreadsheetApp.openById(CONFIG.MODELO_ID);
}

function lerFonte_(f) {
  var aba = SpreadsheetApp.openById(f.id).getSheetByName(f.aba);
  if (!aba) throw new Error('Aba "' + f.aba + '" não encontrada na planilha ' + f.id);
  // valores exibidos: independe do fuso/formatação da planilha de origem
  return aba.getDataRange().getDisplayValues();
}

function lerAba_(ss, nome) {
  var aba = ss.getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada no modelo');
  return aba.getDataRange().getDisplayValues();
}

function isoParaData_(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    var p = v.split('-'); return new Date(+p[0], p[1] - 1, +p[2]);
  }
  return v == null ? '' : v;
}

function gravarFato_(ss, nome, linhas, colunasData, colunasTexto) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  var cab = CABECALHOS[nome];
  aba.clearContents();
  // texto puro onde o Sheets converteria sozinho (ex.: "2026-01" virando data)
  (colunasTexto || []).forEach(function (j) { aba.getRange(1, j + 1, Math.max(linhas.length + 1, 2), 1).setNumberFormat('@'); });
  var dados = [cab].concat(linhas.map(function (r) {
    return r.map(function (v, j) { return colunasData.indexOf(j) >= 0 ? isoParaData_(v) : (v == null ? '' : v); });
  }));
  aba.getRange(1, 1, dados.length, cab.length).setValues(dados);
  colunasData.forEach(function (j) { if (dados.length > 1) aba.getRange(2, j + 1, dados.length - 1, 1).setNumberFormat('dd/mm/yyyy'); });
  aba.getRange(1, 1, 1, cab.length).setFontWeight('bold');
  aba.setFrozenRows(1);
}

/** Botão "Atualizar planilhas": refaz todas as abas fato_* a partir das fontes. */
function atualizarDados() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Já existe uma atualização em andamento. Tente de novo em instantes.');
  var t0 = Date.now(), ss = abrirModelo_();
  try {
    var fontes = {
      manutencoes: lerFonte_(CONFIG.FONTES.manutencoes),
      activities: lerFonte_(CONFIG.FONTES.activities),
      kmTotal: lerFonte_(CONFIG.FONTES.kmTotal),
      bikes: lerFonte_(CONFIG.FONTES.bikes)
    };
    var manuais = {
      dim_equipamento: lerAba_(ss, 'dim_equipamento'), de_para_nomes: lerAba_(ss, 'de_para_nomes'),
      dim_servico: lerAba_(ss, 'dim_servico'), plano_manutencao: lerAba_(ss, 'plano_manutencao')
    };
    var r = transformar(fontes, manuais);
    gravarFato_(ss, 'fato_manutencao', r.fato_manutencao, [4], [5, 16]);
    gravarFato_(ss, 'fato_aquisicao', r.fato_aquisicao, [3]);
    gravarFato_(ss, 'fato_uso_diario', r.fato_uso_diario, [0]);
    gravarFato_(ss, 'fato_hodometro', r.fato_hodometro, [0]);
    gravarFato_(ss, 'pendencias', r.pendencias, [], [3]);
    var s = r.stats, dur = Math.round((Date.now() - t0) / 100) / 10;
    var log = ss.getSheetByName('log_atualizacao');
    if (log.getLastRow() === 0) log.appendRow(CABECALHOS.log_atualizacao);
    log.appendRow([new Date(), dur, s.manut_lidas, s.manut_gravadas, s.aquis_gravadas, s.ativ_lidas, s.ativ_sem_equip,
      s.uso_gravadas, s.hodometro_gravadas, r.pendencias.length, 'OK', '']);
    return { ok: true, duracao_s: dur, stats: s, pendencias: r.pendencias.length };
  } catch (err) {
    try {
      ss.getSheetByName('log_atualizacao').appendRow([new Date(), (Date.now() - t0) / 1000, '', '', '', '', '', '', '', '', 'ERRO', String(err)]);
    } catch (e2) { /* ignora */ }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/** Chamado pela página. */
function getDashboardData() {
  var ss = abrirModelo_();
  var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
  function objs(nome) {
    return paraObjetos(lerAba_(ss, nome)).map(function (o) {
      Object.keys(o).forEach(function (k) {
        var iso = parseDataBR(o[k]);
        if (iso && (k === 'data' || k.indexOf('data_') === 0)) o[k] = iso;
      });
      return o;
    });
  }
  var man = objs('fato_manutencao').map(function (m) {
    ['km_no_evento', 'km_informado', 'custo', 'linha_origem'].forEach(function (k) { m[k] = m[k] === '' ? '' : parseNumeroBR(m[k]); });
    return m;
  });
  var uso = objs('fato_uso_diario').map(function (u) { u.km_dia = parseNumeroBR(u.km_dia); return u; });
  var hod = objs('fato_hodometro').map(function (h) { h.km_leitura = parseNumeroBR(h.km_leitura); return h; });
  var aq = objs('fato_aquisicao').map(function (a) { a.valor = a.valor === '' ? '' : parseNumeroBR(a.valor); return a; });
  var log = lerAba_(ss, 'log_atualizacao'), ultima = null;
  for (var i = log.length - 1; i >= 1; i--) if (log[i][10] === 'OK') { ultima = log[i][0]; break; }
  var hoje = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var dados = montarDashboard({
    equipamentos: paraObjetos(lerAba_(ss, 'dim_equipamento')),
    plano: paraObjetos(lerAba_(ss, 'plano_manutencao')),
    manutencoes: man, aquisicoes: aq, uso: uso, hodometro: hod,
    pendencias: paraObjetos(lerAba_(ss, 'pendencias')), ultimaAtualizacao: ultima
  }, hoje);
  dados.planilha_url = ss.getUrl();
  return JSON.stringify(dados);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Manutenção de Equipamentos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // permite embutir no Google Sites
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Manutenção')
    .addItem('Atualizar dados', 'menuAtualizar_')
    .addToUi();
}

function menuAtualizar_() {
  var r = atualizarDados();
  SpreadsheetApp.getUi().alert('Atualização concluída em ' + r.duracao_s + ' s.\n' +
    r.stats.manut_gravadas + ' manutenções, ' + r.stats.uso_gravadas + ' dias de uso, ' +
    r.pendencias + ' pendência(s).');
}

/** Opcional: cria um gatilho diário (rode uma vez pelo editor). */
function criarGatilhoDiario() {
  ScriptApp.newTrigger('atualizarDados').timeBased().everyDays(1).atHour(5).create();
}

if (typeof module !== 'undefined') {
  module.exports = {
    CONFIG: CONFIG, normalizar: normalizar, parseNumeroBR: parseNumeroBR, parseNumeroStrava: parseNumeroStrava,
    parseDataBR: parseDataBR, parseDataStrava: parseDataStrava, ehAquisicao: ehAquisicao,
    transformar: transformar, montarDashboard: montarDashboard, paraObjetos: paraObjetos, grupoDoComponente: grupoDoComponente
  };
}
