export function tempoRelativo(ts, agora) {
  const s = Math.max(0, Math.round((agora - ts) / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export function minutosRestantes(alvo, agora) {
  const min = Math.ceil((alvo - agora) / 60000);
  return min <= 0 ? 'a qualquer momento' : `em ${min} min`;
}

export const hora =(ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const dataHora = (ts) =>
  new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const num = (n, casas = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function medida(tipo, valor) {
  if (valor == null) return null;
  const v = valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (tipo === 'alagamento') return `${v} cm`;
  if (tipo === 'calor') return `${v} °C`;
  return `${v} h`;
}
