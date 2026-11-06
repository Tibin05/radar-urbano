// T03 — Lista de alertas (RF06, RF08, RF09)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar } from '../domain/regras.js';
import { EMITIDOS, FINAIS } from '../domain/motor.js';
import { ConfiancaBadge, EstadoChip, Origens, PageHeader, RiscoBadge, TipoIcone, Vazio } from '../components/ui.jsx';
import { tempoRelativo } from '../utils/format.js';

const ABAS = [
  { id: 'emitidos', rotulo: 'Alertas emitidos', filtro: (e) => EMITIDOS.includes(e.estado) && e.nivelAlertado },
  { id: 'validacao', rotulo: 'Em validação', filtro: (e) => ['Reportado', 'Em validação', 'Confirmado'].includes(e.estado) },
  { id: 'mapa', rotulo: 'Só no mapa (risco baixo)', filtro: (e) => e.estado === 'Em monitoramento' && !e.nivelAlertado },
  { id: 'historico', rotulo: 'Encerrados e descartados', filtro: (e) => FINAIS.includes(e.estado) },
];

export default function Alertas() {
  const { estado, agora } = useStore();
  const [aba, setAba] = useState('emitidos');
  const [busca, setBusca] = useState('');

  const todos = useMemo(() => estado.eventos.map((ev) => ({ ev, av: avaliar(ev, agora) })), [estado.eventos, agora]);
  const atual = ABAS.find((a) => a.id === aba);
  const termo = busca.trim().toLowerCase();
  const lista = todos
    .filter(({ ev }) => atual.filtro(ev))
    .filter(({ ev }) => !termo || `${ev.titulo} ${ev.bairro}`.toLowerCase().includes(termo))
    .sort((a, b) => b.av.prioridade - a.av.prioridade || b.ev.criadoEm - a.ev.criadoEm);

  return (
    <>
      <PageHeader titulo="Alertas" subtitulo="Ordenados por prioridade = score de risco × confiança (RN03). Em empate, o mais recente primeiro." />

      <div className="barra-lista">
        <div className="abas abas-linha" role="tablist">
          {ABAS.map((a) => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativa' : ''} onClick={() => setAba(a.id)}>
              {a.rotulo} <span className="aba-n">{todos.filter(({ ev }) => a.filtro(ev)).length}</span>
            </button>
          ))}
        </div>
        <label className="busca">
          <Search size={16} aria-hidden="true" />
          <input placeholder="Buscar por título ou bairro" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar alertas" />
        </label>
      </div>

      {lista.length === 0 ? (
        <Vazio titulo="Nada por aqui" texto="Nenhum evento nesta aba com essa busca." />
      ) : (
        <ul className="lista-alertas">
          {lista.map(({ ev, av }) => (
            <li key={ev.id} className={`card alerta-item borda-${av.nivel === 'Crítico' ? 'critico' : av.nivel.toLowerCase()}`}>
              <TipoIcone tipo={ev.tipo} tamanho={22} />
              <div className="alerta-corpo">
                <Link to={`/alertas/${ev.id}`} className="alerta-titulo">
                  {ev.titulo}
                </Link>
                <small className="muted">
                  {ev.bairro} · atualizado {tempoRelativo(Math.max(...ev.dados.map((d) => d.ts)), agora)} · {ev.dados.length}{' '}
                  {ev.dados.length === 1 ? 'dado vinculado' : 'dados vinculados'}
                </small>
                <div className="linha-badges">
                  <RiscoBadge nivel={av.nivel} />
                  <ConfiancaBadge valor={av.conf} eventoId={ev.id} />
                  <EstadoChip estado={ev.estado} />
                </div>
                <Origens origens={av.origens} />
              </div>
              <div className="alerta-lado">
                <span className="pontuacao" title="Prioridade (RN03)">
                  {av.prioridade.toLocaleString('pt-BR')}
                </span>
                <small className="muted">prioridade</small>
                <Link to={`/alertas/${ev.id}`} className="btn-icone" aria-label={`Abrir ${ev.titulo}`}>
                  <ChevronRight size={20} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
