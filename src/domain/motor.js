// Ciclo de vida do evento (Diagrama de Estados, seção 8) e disparo de notificações (RN03, RN04, RN05).
// As funções recebem o estado já clonado pelo reducer e o alteram diretamente.
import { avaliar, distanciaM, EMERGENCIA, NIVEIS, orientacao, TIPOS } from './regras.js';
import { BAIRROS } from '../data/mock.js';

export const FINAIS = ['Encerrado', 'Descartado'];
export const EMITIDOS = ['Alerta emitido', 'Em monitoramento'];

const MIN = 60000;
let seq = 0;
export const novoId = (prefixo) => `${prefixo}-${Date.now().toString(36)}${(seq++).toString(36)}`;

function transitar(ev, estado, agora, por, motivo) {
  ev.estado = estado;
  ev.historico.push({ estado, ts: agora, por, motivo });
}

export function notificar(s, perfil, n, agora) {
  s.notificacoes[perfil].unshift({ id: novoId('n'), ts: agora, lida: false, ...n });
}

const canaisAtivos = (prefs) => Object.keys(prefs.canais).filter((c) => prefs.canais[c]);

// RN04 — quem recebe a notificação
export function moradorRecebe(s, ev, nivel) {
  const p = s.prefs;
  if (!s.consentimentos.notificacoes) return false;
  if (nivel === 'Crítico') return true; // Crítico ignora o nível mínimo
  return p.bairros.includes(ev.bairro) && p.tipos.includes(ev.tipo) && NIVEIS.indexOf(nivel) >= NIVEIS.indexOf(p.nivelMinimo);
}

function emitir(s, ev, agora, por, motivo, automatico) {
  const av = avaliar(ev, agora);
  transitar(ev, 'Alerta emitido', agora, por, motivo);
  ev.emitidoEm = agora;
  ev.nivelAlertado = av.nivel;
  ev.ultimaNotificacao = agora;
  ev.entregas = BAIRROS[ev.bairro]?.inscritos ?? 0;

  if (moradorRecebe(s, ev, av.nivel))
    notificar(
      s,
      'morador',
      {
        tipo: 'alerta',
        eventoId: ev.id,
        nivel: av.nivel,
        titulo: `Alerta ${av.nivel}: ${ev.titulo}`,
        texto: `${orientacao(ev.tipo, av.nivel)} ${EMERGENCIA}`,
        canais: canaisAtivos(s.prefs),
      },
      agora,
    );
  if (automatico)
    notificar(
      s,
      'agente',
      { tipo: 'alerta', eventoId: ev.id, nivel: av.nivel, titulo: `Alerta ${av.nivel} emitido automaticamente`, texto: `${ev.titulo} · ${ev.bairro}. ${motivo}` },
      agora,
    );
  if (TIPOS[ev.tipo].servico)
    notificar(
      s,
      'operador',
      { tipo: 'alerta', eventoId: ev.id, nivel: av.nivel, titulo: `Alerta ${av.nivel}: ${ev.titulo}`, texto: `Área: ${ev.bairro}. Atualize a previsão de retorno se houver mudança.` },
      agora,
    );
}

const contestacoes = (ev) => ev.dados.reduce((s, d) => s + (d.contestacoes || 0), 0);

// RN05 — leitura "normal": lâmina d'água abaixo de 5 cm ou sensação térmica abaixo de 32 °C.
// Só vale para eventos medidos por fontes automáticas; interrupções de serviço são encerradas pelo operador.
const LIMITE_NORMAL = { alagamento: 5, calor: 32 };
function leiturasNormais(ev) {
  const automaticas = ev.dados.filter((d) => d.intervaloMin && d.medida != null && !d.atipico);
  return ev.tipo in LIMITE_NORMAL && automaticas.length > 0 && automaticas.every((d) => d.medida < LIMITE_NORMAL[ev.tipo]);
}

// Um passo da máquina de estados. Retorna nada; altera ev.
function passo(s, ev, agora) {
  const av = avaliar(ev, agora);
  const ultimoDado = Math.max(...ev.dados.map((d) => d.ts));

  switch (ev.estado) {
    case 'Reportado':
      transitar(ev, 'Em validação', agora, 'Sistema', 'Dado válido, evento criado (RF04)');
      notificar(
        s,
        'agente',
        { tipo: 'fila', eventoId: ev.id, nivel: av.nivel, titulo: `Novo evento na fila: ${ev.titulo}`, texto: `${ev.bairro} · confiança ${av.conf} (${av.faixa.toLowerCase()}).` },
        agora,
      );
      break;
    case 'Em validação':
      if (av.conf >= 75) {
        transitar(ev, 'Confirmado', agora, 'Sistema', `Confiança ${av.conf} ≥ 75 (RN03)`);
        ev.confirmadoEm = agora;
      } else if (av.conf < 50 && contestacoes(ev) >= 3) {
        transitar(ev, 'Descartado', agora, 'Sistema', '3 contestações da comunidade (RN03)');
      } else if (av.conf < 50 && agora - ultimoDado > 120 * MIN) {
        transitar(ev, 'Descartado', agora, 'Sistema', '2 h sem corroboração (RN03)');
      }
      break;
    case 'Confirmado':
      if (av.nivel === 'Crítico') emitir(s, ev, agora, 'Sistema', 'Risco Crítico: emissão automática (RN03)', true);
      else if (av.nivel === 'Baixo') transitar(ev, 'Em monitoramento', agora, 'Sistema', 'Risco Baixo: sem notificação, só no mapa (RN03)');
      else if (av.nivel === 'Alto' && agora - ev.confirmadoEm >= 10 * MIN)
        emitir(s, ev, agora, 'Sistema', 'Risco Alto sem ação do agente em 10 min (RN03)', true);
      break;
    case 'Alerta emitido':
      if (agora - ev.emitidoEm >= MIN)
        transitar(ev, 'Em monitoramento', agora, 'Sistema', `Notificações entregues a ${ev.entregas.toLocaleString('pt-BR')} inscritos`);
      break;
    case 'Em monitoramento':
      // Marca desde quando as leituras estão normais; qualquer leitura fora do normal zera a contagem
      if (leiturasNormais(ev)) ev.normalDesde ??= agora;
      else delete ev.normalDesde;

      if (ev.nivelAlertado && NIVEIS.indexOf(av.nivel) > NIVEIS.indexOf(ev.nivelAlertado))
        emitir(s, ev, agora, 'Sistema', `Risco subiu de ${ev.nivelAlertado} para ${av.nivel}: reemissão (RN04)`, true);
      else if (ev.normalDesde && agora - ev.normalDesde >= 30 * MIN) transitar(ev, 'Encerrado', agora, 'Sistema', 'Leituras normais por 30 min (RN05)');
      else if (agora - ultimoDado > 360 * MIN) transitar(ev, 'Encerrado', agora, 'Sistema', '6 h sem dados novos (RN05)');
      break;
    default:
  }
}

export function aplicarRegras(s, agora) {
  for (const ev of s.eventos) {
    for (let i = 0; i < 6 && !FINAIS.includes(ev.estado); i++) {
      const antes = ev.estado;
      passo(s, ev, agora);
      if (ev.estado === antes) break;
    }
  }
  return s;
}

// RF04 — agrupa no evento ativo do mesmo tipo a até 500 m com dado nos últimos 60 min
export function eventoProximo(s, tipo, ponto, agora) {
  return s.eventos.find(
    (e) =>
      !FINAIS.includes(e.estado) &&
      e.tipo === tipo &&
      distanciaM(e, ponto) <= 500 &&
      agora - Math.max(...e.dados.map((d) => d.ts)) <= 60 * MIN,
  );
}

function anexarOuCriar(s, { tipo, bairro, lat, lng, exposicao, titulo }, dado, agora, motivo) {
  const existente = eventoProximo(s, tipo, { lat, lng }, agora);
  if (existente) {
    const confAntes = avaliar(existente, agora).conf;
    existente.dados.push(dado);
    existente.exposicao = Math.max(existente.exposicao, exposicao);
    return { ev: existente, agrupado: true, confAntes };
  }
  const ev = {
    id: novoId('evt'),
    tipo,
    titulo,
    bairro,
    lat,
    lng,
    exposicao,
    estado: 'Reportado',
    criadoEm: agora,
    dados: [dado],
    historico: [{ estado: 'Reportado', ts: agora, por: 'Sistema', motivo }],
  };
  s.eventos.unshift(ev);
  return { ev, agrupado: false, confAntes: null };
}

export const protocolo = (id) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return `RU-${String(h).padStart(5, '0')}`;
};

// RF03 — registro comunitário
export function registrarRelato(s, f, agora) {
  const u = s.usuarios.morador;
  const dado = {
    id: novoId('d'),
    origem: 'comunidade',
    fonte: 'Relato de morador',
    autor: u.pseudonimo, // RNF08: o nome nunca é gravado no dado público
    medida: f.medida,
    descricao: f.descricao || f.opcaoRotulo,
    foto: f.foto,
    confirmacoes: 0,
    contestacoes: 0,
    reputacao: u.reputacao,
    ts: agora,
  };
  const titulo = `${TIPOS[f.tipo].rotulo} em ${f.bairro}`;
  // RNF08: a localização pública do relato é arredondada para ~100 m (3 casas decimais)
  const arred = (x) => Math.round(x * 1000) / 1000;
  const local = { ...f, lat: arred(f.lat), lng: arred(f.lng), titulo };
  const r = anexarOuCriar(s, local, dado, agora, 'Relato comunitário recebido (RF03)');
  aplicarRegras(s, agora);
  const av = avaliar(r.ev, agora);
  const prot = protocolo(dado.id);
  s.meusRelatos.unshift({ dadoId: dado.id, eventoId: r.ev.id, protocolo: prot, ts: agora });
  s.ultimoRelato = { eventoId: r.ev.id, protocolo: prot, agrupado: r.agrupado, confAntes: r.confAntes, confDepois: av.conf, estado: r.ev.estado };
  notificar(
    s,
    'morador',
    {
      tipo: 'sistema',
      eventoId: r.ev.id,
      titulo: `Relato recebido · protocolo ${prot}`,
      texto: r.agrupado
        ? `Seu relato foi vinculado a um evento existente. A confiança passou de ${r.confAntes} para ${av.conf}.`
        : `Criamos um novo evento com confiança ${av.conf}. Ele aparece no mapa enquanto é validado.`,
    },
    agora,
  );
  return s;
}

// RF16 — confirmação ou contestação comunitária
export function votar(s, eventoId, voto, agora) {
  const ev = s.eventos.find((e) => e.id === eventoId);
  const u = s.usuarios.morador;
  if (!ev || FINAIS.includes(ev.estado) || ev.votoMorador || ev.dados.some((d) => d.autor === u.pseudonimo)) return s;
  ev.votoMorador = voto;
  const relato = ev.dados.find((d) => d.origem === 'comunidade' && d.autor !== u.pseudonimo);
  if (relato) {
    if (voto === 'confirma') relato.confirmacoes += 1;
    else relato.contestacoes += 1;
  } else if (voto === 'confirma') {
    ev.dados.push({
      id: novoId('d'),
      origem: 'comunidade',
      fonte: 'Confirmação de morador',
      autor: u.pseudonimo,
      medida: null,
      descricao: 'Morador confirmou que também vê a ocorrência',
      foto: false,
      confirmacoes: 0,
      contestacoes: 0,
      reputacao: u.reputacao,
      ts: agora,
    });
  }
  return aplicarRegras(s, agora);
}

// RF13 — ações do agente na fila de validação
export function acaoAgente(s, eventoId, acao, agora, motivo) {
  const ev = s.eventos.find((e) => e.id === eventoId);
  if (!ev) return s;
  const por = `${s.usuarios.agente.nome} (agente)`;
  if ((acao === 'confirmar' || acao === 'emitir') && ev.estado === 'Em validação') {
    transitar(ev, 'Confirmado', agora, por, 'Confirmado pelo agente (RF13)');
    ev.confirmadoEm = agora;
  }
  if (acao === 'emitir' && ev.estado === 'Confirmado') emitir(s, ev, agora, por, 'Alerta emitido pelo agente (RF13)', false);
  if (acao === 'descartar' && ['Reportado', 'Em validação'].includes(ev.estado))
    transitar(ev, 'Descartado', agora, por, motivo || 'Descartado pelo agente');
  if (acao === 'encerrar') encerrar(ev, agora, por, 'Encerrado pelo agente (RN05)');
  return aplicarRegras(s, agora);
}

function encerrar(ev, agora, por, motivo) {
  if (ev.estado === 'Alerta emitido') transitar(ev, 'Em monitoramento', agora, 'Sistema', 'Notificações entregues');
  if (ev.estado === 'Em monitoramento') transitar(ev, 'Encerrado', agora, por, motivo);
}

// RF15 — registro oficial do operador
export function registrarInterrupcao(s, f, agora) {
  const u = s.usuarios.operador;
  const dado = {
    id: novoId('d'),
    origem: 'operador',
    fonte: `${u.orgao} · ${u.nome}`,
    medida: f.horas,
    critico: f.critico,
    previsaoRetorno: agora + f.horas * 60 * MIN,
    descricao: f.descricao || `Interrupção registrada com previsão de ${f.horas} h`,
    ts: agora,
  };
  const titulo = `${TIPOS[f.tipo].rotulo} em ${f.bairro}`;
  const r = anexarOuCriar(s, { ...f, titulo }, dado, agora, 'Registro oficial do operador (RF15)');
  aplicarRegras(s, agora);
  s.ultimaInterrupcao = { eventoId: r.ev.id, agrupado: r.agrupado, estado: r.ev.estado, conf: avaliar(r.ev, agora).conf };
  return s;
}

export function normalizar(s, eventoId, agora) {
  const ev = s.eventos.find((e) => e.id === eventoId);
  if (ev) encerrar(ev, agora, `${s.usuarios.operador.nome} (operador)`, 'Operador registrou a normalização (RN05)');
  return s;
}

// Simula a chegada de novas leituras das fontes automáticas (sensores e bases públicas)
export function tick(s, agora) {
  for (const ev of s.eventos) {
    if (FINAIS.includes(ev.estado)) continue;
    for (const d of ev.dados) if (d.intervaloMin && agora - d.ts >= d.intervaloMin * MIN) d.ts = agora;
  }
  s.ultimaSync = agora;
  return aplicarRegras(s, agora);
}
