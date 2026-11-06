// T11 — Análises e indicadores (RF17): os três indicadores de sucesso do enunciado
import { useState } from 'react';
import { Clock, Gauge, Megaphone, Timer } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, NIVEIS, ORIGENS, TIPOS } from '../domain/regras.js';
import { FINAIS } from '../domain/motor.js';
import { COR_RISCO, Kpi, OrigemChip, PageHeader } from '../components/ui.jsx';
import { num, tempoRelativo } from '../utils/format.js';

function Barras({ linhas, cor }) {
  const max = Math.max(1, ...linhas.map((l) => l.valor));
  return (
    <ul className="barras">
      {linhas.map((l) => (
        <li key={l.rotulo}>
          <span className="barra-rotulo">{l.rotulo}</span>
          <span className="barra-trilho">
            <span className="barra" style={{ width: `${(l.valor / max) * 100}%`, background: l.cor ?? cor }} />
          </span>
          <span className="barra-valor">{l.valor}</span>
        </li>
      ))}
    </ul>
  );
}

const contar = (lista, chave) => lista.reduce((m, x) => ((m[chave(x)] = (m[chave(x)] || 0) + 1), m), {});

// RF17 — indicadores por período
const PERIODOS = { '24h': { rotulo: 'Últimas 24 horas', curto: '24 h', horas: 24 }, '7d': { rotulo: 'Últimos 7 dias', curto: '7 dias', horas: 24 * 7 } };

export default function Analises() {
  const { estado, agora } = useStore();
  const [periodo, setPeriodo] = useState('24h');
  const p = PERIODOS[periodo];
  const eventos = estado.eventos.filter((e) => agora - e.criadoEm <= p.horas * 3600000);
  const ativos = estado.eventos.filter((e) => !FINAIS.includes(e.estado));

  // Tempo de atualização: idade média da última leitura dos sensores em eventos ativos (RNF01: até 60 s)
  const media = (lista) => (lista.length ? lista.reduce((s, d) => s + (agora - d.ts), 0) / lista.length : 0);
  const dadosAtivos = ativos.flatMap((e) => e.dados);
  const idadeMedia = media(dadosAtivos.filter((d) => d.origem === 'sensor')) / 1000;
  const idadePublica = media(dadosAtivos.filter((d) => d.origem === 'publica')) / 60000;

  // Qualidade dos alertas: confirmados entre os eventos já decididos
  const confirmados = eventos.filter((e) => e.historico.some((h) => h.estado === 'Confirmado')).length;
  const descartados = eventos.filter((e) => e.estado === 'Descartado').length;
  const taxa = confirmados + descartados ? (confirmados / (confirmados + descartados)) * 100 : 0;

  const emitidos = eventos.filter((e) => e.emitidoEm);
  const ateAlerta = emitidos.length ? emitidos.reduce((s, e) => s + (e.emitidoEm - e.criadoEm), 0) / emitidos.length / 60000 : 0;

  const porTipo = contar(eventos, (e) => e.tipo);
  const porBairro = Object.entries(contar(eventos, (e) => e.bairro)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const porNivel = contar(ativos, (e) => avaliar(e, agora).nivel);
  const dados = estado.eventos.flatMap((e) => e.dados);

  return (
    <>
      <PageHeader
        titulo="Análises e indicadores"
        subtitulo={`${p.rotulo} · São Paulo`}
        acoes={
          <div className="segmentado segmentado-curto" role="radiogroup" aria-label="Período">
            {Object.entries(PERIODOS).map(([k, v]) => (
              <button key={k} role="radio" aria-checked={periodo === k} className={periodo === k ? 'sel' : ''} onClick={() => setPeriodo(k)}>
                {v.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <div className="kpis">
        <Kpi
          rotulo="Atualização dos sensores"
          valor={`${num(idadeMedia)} s`}
          detalhe={`meta RNF01: até 60 s · bases públicas: ${num(idadePublica)} min, no intervalo de cada fonte`}
          icone={Timer}
          tom={idadeMedia <= 60 ? 'ok' : 'alto'}
        />
        <Kpi
          rotulo="Alertas confirmados"
          valor={`${num(taxa)}%`}
          detalhe={`${confirmados} ${confirmados === 1 ? 'confirmado' : 'confirmados'} · ${descartados} ${descartados === 1 ? 'descartado' : 'descartados'}`}
          icone={Gauge}
          tom="ok"
        />
        <Kpi rotulo="Tempo médio até o alerta" valor={`${num(ateAlerta, 1)} min`} detalhe={`${emitidos.length} alertas emitidos`} icone={Megaphone} />
        <Kpi rotulo="Eventos ativos" valor={ativos.length} detalhe={`${eventos.length} registrados em ${p.curto}`} icone={Clock} />
      </div>

      <div className="grade-2">
        <section className="card">
          <h2>Eventos por tipo</h2>
          <Barras cor="#0f4c81" linhas={Object.entries(TIPOS).map(([k, t]) => ({ rotulo: t.rotulo, valor: porTipo[k] || 0 }))} />
        </section>
        <section className="card">
          <h2>Eventos ativos por nível de risco</h2>
          <Barras linhas={NIVEIS.map((n) => ({ rotulo: n, valor: porNivel[n] || 0, cor: COR_RISCO[n] }))} />
        </section>
        <section className="card">
          <h2>Bairros com mais eventos</h2>
          <Barras cor="#0f4c81" linhas={porBairro.map(([b, v]) => ({ rotulo: b, valor: v }))} />
        </section>
        <section className="card">
          <h2>Situação das fontes de dados</h2>
          <table className="tabela">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Dados</th>
                <th>Último recebido</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(ORIGENS).map((o) => {
                const daOrigem = dados.filter((d) => d.origem === o);
                const ultimo = Math.max(...daOrigem.map((d) => d.ts));
                return (
                  <tr key={o}>
                    <td>
                      <OrigemChip origem={o} />
                    </td>
                    <td>{daOrigem.length}</td>
                    <td>{daOrigem.length ? tempoRelativo(ultimo, agora) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
