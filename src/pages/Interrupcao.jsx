// T10 — Registro oficial de interrupção pelo operador (RF15)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, TIPOS } from '../domain/regras.js';
import { EMITIDOS, FINAIS } from '../domain/motor.js';
import { BAIRROS } from '../data/mock.js';
import { ConfiancaBadge, EstadoChip, PageHeader, RiscoBadge, TipoIcone, Vazio } from '../components/ui.jsx';
import { dataHora, tempoRelativo } from '../utils/format.js';

const SERVICOS = ['energia', 'agua', 'transporte'];

export default function Interrupcao() {
  const { estado, dispatch, agora, avisar } = useStore();
  const [f, setF] = useState({ tipo: estado.usuarios.operador.servico, bairro: 'Vila Mariana', horas: 3, critico: false, exposicao: 2, descricao: '' });
  const [enviado, setEnviado] = useState(false);

  const minhas = estado.eventos
    .filter((e) => !FINAIS.includes(e.estado) && e.dados.some((d) => d.origem === 'operador'))
    .map((ev) => ({ ev, av: avaliar(ev, agora), dado: ev.dados.find((d) => d.origem === 'operador') }));

  const enviar = (e) => {
    e.preventDefault();
    const b = BAIRROS[f.bairro];
    dispatch({ type: 'INTERRUPCAO', form: { ...f, horas: Number(f.horas), lat: b.lat + 0.0004, lng: b.lng - 0.0006 } });
    setEnviado(true);
  };

  return (
    <>
      <PageHeader titulo="Registrar interrupção" subtitulo="Registro oficial: entra com confiança base 90 e é identificado como dado do operador." />

      <div className="grade-2">
        <section className="card">
          {enviado && estado.ultimaInterrupcao ? (
            <div className="sucesso-inline">
              <CheckCircle2 size={28} className="icone-sucesso" aria-hidden="true" />
              <div>
                <strong>Interrupção registrada</strong>
                <p>
                  {estado.ultimaInterrupcao.agrupado ? 'Vinculada a um evento já aberto na região.' : 'Novo evento criado.'} Estado atual: {estado.ultimaInterrupcao.estado}.
                </p>
                <div className="botoes">
                  <Link className="btn btn-primario" to={`/alertas/${estado.ultimaInterrupcao.eventoId}`}>
                    Ver evento
                  </Link>
                  <button className="btn btn-secundario" onClick={() => setEnviado(false)}>
                    Novo registro
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form className="form" onSubmit={enviar}>
              <fieldset>
                <legend>Serviço</legend>
                <div className="grade-tipos tres">
                  {SERVICOS.map((s) => (
                    <button type="button" key={s} className={`opcao-tipo ${f.tipo === s ? 'sel' : ''}`} aria-pressed={f.tipo === s} onClick={() => setF({ ...f, tipo: s })}>
                      <TipoIcone tipo={s} tamanho={22} />
                      {TIPOS[s].rotulo}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="linha-campos">
                <label className="campo">
                  Área afetada
                  <select value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })}>
                    {Object.keys(BAIRROS).map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label className="campo">
                  Abrangência
                  <select value={f.exposicao} onChange={(e) => setF({ ...f, exposicao: Number(e.target.value) })}>
                    <option value={1}>Algumas ruas</option>
                    <option value={2}>Bairro</option>
                    <option value={3}>Vários bairros</option>
                  </select>
                </label>
                <label className="campo">
                  Previsão de retorno (horas)
                  <input type="number" min="0.5" max="48" step="0.5" required value={f.horas} onChange={(e) => setF({ ...f, horas: e.target.value })} />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" checked={f.critico} onChange={(e) => setF({ ...f, critico: e.target.checked })} />
                <span>Atinge hospital ou abastecimento essencial (severidade 4)</span>
              </label>
              <label className="campo">
                Descrição técnica
                <textarea rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: rompimento de adutora; equipe no local" />
              </label>
              <p className="aviso-info">
                <Info size={16} aria-hidden="true" /> Relatos de moradores a menos de 500 m são vinculados a este registro automaticamente (RF04).
              </p>
              <button className="btn btn-primario" type="submit">
                Registrar interrupção
              </button>
            </form>
          )}
        </section>

        <section className="card">
          <h2>Interrupções com registro oficial</h2>
          {minhas.length === 0 ? (
            <Vazio titulo="Nenhuma interrupção ativa" />
          ) : (
            <ul className="lista-simples">
              {minhas.map(({ ev, av, dado }) => (
                <li key={ev.id}>
                  <TipoIcone tipo={ev.tipo} />
                  <div className="item-texto">
                    <Link to={`/alertas/${ev.id}`} className="alerta-titulo">
                      {ev.titulo}
                    </Link>
                    <small className="muted">
                      Registrado {tempoRelativo(dado.ts, agora)} · retorno previsto {dataHora(dado.previsaoRetorno)}
                    </small>
                    <div className="linha-badges">
                      <RiscoBadge nivel={av.nivel} />
                      <ConfiancaBadge valor={av.conf} eventoId={ev.id} curto />
                      <EstadoChip estado={ev.estado} />
                    </div>
                  </div>
                  {EMITIDOS.includes(ev.estado) && (
                    <button
                      className="btn btn-secundario"
                      onClick={() => {
                        dispatch({ type: 'NORMALIZAR', eventoId: ev.id });
                        avisar('Serviço normalizado. Evento encerrado.');
                      }}
                    >
                      Normalizado
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
