// T02 — Painel de acompanhamento (RF01, RF02, RF07, RF09)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ChevronRight, ClipboardCheck, Clock, Radio, ShieldCheck, Siren, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, NIVEIS, ORIGENS, TIPOS } from '../domain/regras.js';
import { EMITIDOS, FINAIS, moradorRecebe } from '../domain/motor.js';
import { BAIRROS } from '../data/mock.js';
import MapaEventos from '../components/MapaEventos.jsx';
import { CONTORNO_RISCO, COR_RISCO, ConfiancaBadge, Kpi, Origens, PageHeader, RiscoBadge, TipoIcone } from '../components/ui.jsx';
import { minutosRestantes, tempoRelativo } from '../utils/format.js';

const SEM_FILTRO = { tipo: 'todos', risco: 'todos', origem: 'todas', bairro: 'todos' };
const LIMITE_LISTA = 6;

export default function Painel() {
  const { estado, agora } = useStore();
  const [f, setF] = useState(SEM_FILTRO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // só vale no celular
  const qtdFiltros = Object.keys(SEM_FILTRO).filter((k) => f[k] !== SEM_FILTRO[k]).length;
  const filtrando = qtdFiltros > 0;
  const morador = estado.perfil === 'morador';
  const agente = estado.perfil === 'agente';

  const ativos = useMemo(
    () =>
      estado.eventos
        .filter((e) => !FINAIS.includes(e.estado))
        .map((ev) => ({ ev, av: avaliar(ev, agora) }))
        .sort((a, b) => b.av.prioridade - a.av.prioridade),
    [estado.eventos, agora],
  );

  const filtrados = ativos.filter(
    ({ ev, av }) =>
      (f.tipo === 'todos' || ev.tipo === f.tipo) &&
      (f.risco === 'todos' || av.nivel === f.risco) &&
      (f.origem === 'todas' || av.origens.includes(f.origem)) &&
      (f.bairro === 'todos' || ev.bairro === f.bairro),
  );

  const alertas = ativos.filter(({ ev }) => EMITIDOS.includes(ev.estado) && ev.nivelAlertado).length;
  const naFila = ativos.filter(({ ev }) => ['Em validação', 'Confirmado'].includes(ev.estado)).length;
  const criticos = ativos.filter(({ av }) => av.nivel === 'Crítico').length;
  const sensores = new Set(ativos.flatMap(({ ev }) => ev.dados.filter((d) => d.origem === 'sensor').map((d) => d.fonte))).size;
  // Para o morador: os alertas emitidos que chegam até ele (RN04), do mais grave para o menos
  const paraMim = ativos.filter(({ ev, av }) => EMITIDOS.includes(ev.estado) && ev.nivelAlertado && moradorRecebe(estado, ev, av.nivel)).sort((a, b) => b.av.S - a.av.S);

  return (
    <>
      <PageHeader titulo="Painel de acompanhamento" subtitulo="Eventos ativos em São Paulo, do mais urgente para o menos." />

      {morador ? (
        <section
          className={`card para-mim ${!paraMim.length ? 'para-mim-calmo' : paraMim.some(({ av }) => av.nivel === 'Crítico') ? '' : 'para-mim-alto'}`}
          aria-labelledby="titulo-para-mim"
        >
          <h2 id="titulo-para-mim">
            {paraMim.length ? (
              <>
                <Siren size={18} aria-hidden="true" /> {paraMim.length === 1 ? '1 alerta para você agora' : `${paraMim.length} alertas para você agora`}
              </>
            ) : (
              <>
                <ShieldCheck size={18} aria-hidden="true" /> Nenhum alerta ativo nos seus bairros
              </>
            )}
          </h2>
          {paraMim.length ? (
            <ul className="lista-para-mim">
              {paraMim.slice(0, 3).map(({ ev, av }) => (
                <li key={ev.id}>
                  <Link to={`/alertas/${ev.id}`} className="item-para-mim">
                    <span className="para-mim-texto">
                      <strong>{ev.titulo}</strong>
                      <small>{ev.bairro}</small>
                    </span>
                    <span className="linha-badges para-mim-selos">
                      <RiscoBadge nivel={av.nivel} />
                      <ConfiancaBadge valor={av.conf} curto />
                      <Origens origens={av.origens} compacto />
                    </span>
                    <span className="ver-o-que-fazer">
                      Ver o que fazer <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Você acompanha {estado.prefs.bairros.join(', ')}. <Link to="/preferencias">Mudar bairros</Link>
            </p>
          )}
        </section>
      ) : (
        <div className="kpis">
          <Kpi rotulo="Alertas ativos" valor={alertas} detalhe="já enviados à população" icone={AlertTriangle} to="/alertas" />
          <Kpi
            rotulo="Na fila do agente"
            valor={naFila}
            detalhe={agente ? 'abrir a fila de validação' : 'aguardando validação ou emissão'}
            icone={ClipboardCheck}
            to={agente ? '/validacao' : '/alertas'}
          />
          <Kpi rotulo="Risco crítico" valor={criticos} detalhe={criticos ? 'emitidos sem esperar o agente' : 'nenhum evento agora'} icone={Siren} tom="critico" to="/alertas" />
          <Kpi rotulo="Sensores com leitura" valor={sensores} detalhe={`última leitura ${tempoRelativo(estado.ultimaSync, agora)}`} icone={Radio} to="/analises" />
        </div>
      )}

      <button className="btn btn-secundario so-mobile botao-filtrar" aria-expanded={filtrosAbertos} aria-controls="filtros-mapa" onClick={() => setFiltrosAbertos(!filtrosAbertos)}>
        <SlidersHorizontal size={16} aria-hidden="true" /> {filtrosAbertos ? 'Fechar filtros' : `Filtrar${qtdFiltros ? ` (${qtdFiltros})` : ''}`}
      </button>

      <div id="filtros-mapa" className={`filtros ${filtrosAbertos ? 'aberto' : ''}`} role="group" aria-label="Filtros do mapa">
        <div className="chips-filtro">
          <button className={`chip-filtro ${f.tipo === 'todos' ? 'sel' : ''}`} aria-pressed={f.tipo === 'todos'} onClick={() => setF({ ...f, tipo: 'todos' })}>
            Todos os tipos
          </button>
          {Object.entries(TIPOS).map(([k, t]) => (
            <button key={k} className={`chip-filtro ${f.tipo === k ? 'sel' : ''}`} aria-pressed={f.tipo === k} onClick={() => setF({ ...f, tipo: k })}>
              <TipoIcone tipo={k} tamanho={14} /> {t.rotulo}
            </button>
          ))}
        </div>
        <div className="selects">
          <label>
            Risco
            <select name="risco" value={f.risco} onChange={(e) => setF({ ...f, risco: e.target.value })}>
              <option value="todos">Todos</option>
              {NIVEIS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Origem do dado
            <select name="origem" value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })}>
              <option value="todas">Todas</option>
              {Object.entries(ORIGENS).map(([k, o]) => (
                <option key={k} value={k}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bairro
            <select name="bairro" value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })}>
              <option value="todos">Todos</option>
              {Object.keys(BAIRROS).map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          {filtrando && (
            <button className="btn btn-fantasma limpar-filtros" onClick={() => setF(SEM_FILTRO)}>
              <X size={16} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="painel-grade">
        <div className="card card-mapa">
          <MapaEventos itens={filtrados} altura={520} />
          <div className="legenda" aria-label="Legenda">
            {NIVEIS.map((n) => (
              <span key={n}>
                <i style={{ background: COR_RISCO[n], borderColor: CONTORNO_RISCO[n] }} aria-hidden="true" /> {n}
              </span>
            ))}
            <span className="legenda-nota">tamanho = pontuação de risco · círculo de perto = área afetada aproximada · tracejado = confiança baixa</span>
          </div>
        </div>

        <section className="card prioridade" aria-labelledby="titulo-prioridade">
          <h2 id="titulo-prioridade">
            <Activity size={18} aria-hidden="true" /> Prioridade agora
          </h2>
          {filtrados.length === 0 ? (
            <div className="vazio vazio-compacto">
              <strong>Nenhum evento com esses filtros</strong>
              <button className="btn btn-secundario" onClick={() => setF(SEM_FILTRO)}>
                Limpar filtros
              </button>
            </div>
          ) : (
            <ol className="lista-prioridade">
              {filtrados.slice(0, LIMITE_LISTA).map(({ ev, av }) => (
                <li key={ev.id}>
                  <Link to={`/alertas/${ev.id}`} className={`item-prioridade ${av.nivel === 'Crítico' ? 'item-critico' : ''}`}>
                    <TipoIcone tipo={ev.tipo} />
                    <span className="item-texto">
                      <strong>{ev.titulo}</strong>
                      <small>
                        {ev.bairro} · {ev.estado}
                      </small>
                      {agente && ['Em validação', 'Confirmado'].includes(ev.estado) && (
                        <span className="aguardando">
                          <Clock size={13} aria-hidden="true" /> Aguardando você
                          {ev.estado === 'Confirmado' && av.nivel === 'Alto' && ` · emite sozinho ${minutosRestantes(ev.confirmadoEm + 10 * 60000, agora)}`}
                        </span>
                      )}
                      <span className="linha-badges">
                        <RiscoBadge nivel={av.nivel} />
                        <ConfiancaBadge valor={av.conf} curto />
                        <Origens origens={av.origens} compacto />
                      </span>
                    </span>
                    {!morador && (
                      <span className="pontuacao">
                        {av.prioridade.toLocaleString('pt-BR')}
                        <small>prioridade</small>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {filtrados.length > 0 && (
            <p className="muted contagem">
              Mostrando {Math.min(LIMITE_LISTA, filtrados.length)} de {filtrados.length} {filtrados.length === 1 ? 'evento' : 'eventos'}
            </p>
          )}
          <Link to="/alertas" className="btn btn-secundario btn-bloco">
            Ver todos os alertas
          </Link>
        </section>
      </div>
    </>
  );
}
