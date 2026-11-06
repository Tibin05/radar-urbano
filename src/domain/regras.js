// Regras de negócio do documento de requisitos (seção 5): RN01 confiança, RN02 risco, RN03 prioridade.
// Funções puras: recebem dados e o instante atual, devolvem números. Nada aqui altera estado.

export const NIVEIS = ['Baixo', 'Moderado', 'Alto', 'Crítico'];

// RN01 — nota base por origem
export const ORIGENS = {
  operador: { rotulo: 'Operador de serviço', base: 90 },
  publica: { rotulo: 'Base pública', base: 85 },
  sensor: { rotulo: 'Sensor IoT', base: 80 },
  comunidade: { rotulo: 'Comunidade', base: 40 },
};

export const TIPOS = {
  alagamento: {
    rotulo: 'Alagamento',
    unidade: 'cm',
    medidaRotulo: 'Lâmina d’água',
    orientacao: 'Evite a região e não atravesse áreas alagadas. Se a água entrar em casa, desligue a energia.',
    orientacaoCritica:
      'Saia da área alagada agora e vá para um local alto. Não entre na água nem tente passar de carro. Se a água entrar em casa, desligue a energia.',
  },
  calor: {
    rotulo: 'Ilha de calor',
    unidade: '°C',
    medidaRotulo: 'Sensação térmica',
    orientacao:
      'Beba água com frequência, evite o sol entre 10h e 16h e procure locais frescos. Atenção redobrada com idosos, crianças e animais.',
    orientacaoCritica:
      'Vá agora para um local fresco e com sombra. Beba água, evite qualquer esforço físico e confira se idosos, crianças e pessoas doentes estão bem.',
  },
  energia: {
    rotulo: 'Falta de energia',
    unidade: 'h',
    medidaRotulo: 'Duração prevista',
    servico: true,
    orientacao:
      'Desligue aparelhos da tomada, evite abrir a geladeira e use lanterna em vez de velas. Não se aproxime de fios caídos.',
    orientacaoCritica:
      'Se alguém em casa depende de aparelho elétrico de saúde, procure atendimento agora. Desligue os aparelhos e não se aproxime de fios caídos.',
  },
  agua: {
    rotulo: 'Falta de água',
    unidade: 'h',
    medidaRotulo: 'Duração prevista',
    servico: true,
    orientacao: 'Economize a água da caixa d’água e priorize consumo e higiene até a normalização.',
    orientacaoCritica: 'Reserve agora a água para beber e cozinhar e suspenda qualquer uso não essencial até a normalização.',
  },
  transporte: {
    rotulo: 'Transporte interrompido',
    unidade: 'h',
    medidaRotulo: 'Duração prevista',
    servico: true,
    orientacao: 'Busque rotas alternativas e acompanhe os avisos oficiais do transporte público.',
    orientacaoCritica: 'Evite se deslocar pela região agora. Se precisar sair, use rotas alternativas e confira os avisos oficiais antes.',
  },
};

// Orientação muda com o nível: no Crítico, a instrução é de ação imediata
export const orientacao = (tipo, nivel) => (nivel === 'Crítico' ? TIPOS[tipo].orientacaoCritica : TIPOS[tipo].orientacao);
export const EMERGENCIA = 'Emergência: 199 (Defesa Civil) ou 193 (Bombeiros).';

// RN02 — severidade de 1 a 4 conforme o tipo de risco
export function severidade(tipo, medida, critico = false) {
  if (tipo === 'alagamento') return medida <= 10 ? 1 : medida <= 30 ? 2 : medida <= 50 ? 3 : 4;
  if (tipo === 'calor') return medida <= 34 ? 1 : medida <= 36 ? 2 : medida <= 38 ? 3 : 4;
  if (critico) return 4; // interrupção que atinge hospital ou abastecimento essencial
  return medida <= 1 ? 1 : medida <= 4 ? 2 : medida <= 12 ? 3 : 4;
}

export const nivelRisco = (S) => (S <= 2 ? 'Baixo' : S <= 5 ? 'Moderado' : S <= 8 ? 'Alto' : 'Crítico');

export const faixaConfianca = (c) => (c >= 75 ? 'Alta' : c >= 50 ? 'Média' : 'Baixa');

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// RN01 — confiança de um dado: C = min(100, max(0, B + A − P))
export function confiancaDado(d, agora) {
  const base = ORIGENS[d.origem].base;
  const itens = [];
  if (d.origem === 'comunidade') {
    if (d.foto) itens.push({ rotulo: 'Foto anexada', pontos: 5 });
    if (d.confirmacoes > 0)
      itens.push({
        rotulo: `${plural(d.confirmacoes, 'confirmação', 'confirmações')} “também vejo”`,
        pontos: Math.min(20, 5 * d.confirmacoes),
      });
    if (d.reputacao > 0)
      itens.push({ rotulo: 'Autor com relatos anteriores confirmados', pontos: Math.min(10, d.reputacao) });
    if (d.contestacoes > 0)
      itens.push({ rotulo: plural(d.contestacoes, 'contestação', 'contestações'), pontos: -10 * d.contestacoes });
  }
  if (d.atipico) itens.push({ rotulo: 'Leitura fora da faixa física ou salto atípico', pontos: -30 });
  if (d.previsaoRetorno && d.previsaoRetorno < agora) itens.push({ rotulo: 'Previsão de retorno vencida', pontos: -20 });

  const idadeMin = (agora - d.ts) / 60000;
  const desatualizado = Boolean(d.intervaloMin) && idadeMin > 2 * d.intervaloMin; // RN05
  if (desatualizado) itens.push({ rotulo: 'Dado desatualizado (idade maior que 2× o intervalo)', pontos: -20 });

  const soma = itens.reduce((s, i) => s + i.pontos, 0);
  const valor = Math.max(0, Math.min(100, base + soma));
  return { base, itens, valor, faixa: faixaConfianca(valor), desatualizado, idadeMin };
}

// Avalia um evento inteiro: RN01 (confiança do evento), RN02 (risco) e RN03 (prioridade)
export function avaliar(ev, agora) {
  const dados = ev.dados.map((d) => ({ ...d, conf: confiancaDado(d, agora) }));
  const origens = [...new Set(dados.map((d) => d.origem))];
  const maxC = Math.max(...dados.map((d) => d.conf.valor));
  const conf = Math.min(100, maxC + 10 * (origens.length - 1));

  // A severidade vem do dado medido mais confiável
  const ref = dados.filter((d) => d.medida != null).sort((a, b) => b.conf.valor - a.conf.valor)[0];
  const sev = ref ? severidade(ev.tipo, ref.medida, ref.critico) : 1;
  const S = sev * ev.exposicao;

  return {
    dados,
    origens,
    maxC,
    conf,
    faixa: faixaConfianca(conf),
    ref,
    sev,
    exp: ev.exposicao,
    S,
    nivel: nivelRisco(S),
    prioridade: Math.round((S * conf) / 10) / 10, // S × C/100, com 1 casa decimal
  };
}

// Distância em metros entre dois pontos (fórmula de haversine) — usada no agrupamento do RF04
export function distanciaM(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
