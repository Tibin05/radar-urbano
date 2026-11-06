// T09 — Fila de validação do agente (RF04, RF13, RF14)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Clock, Megaphone, ShieldCheck, XCircle } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar } from '../domain/regras.js';
import { EMITIDOS } from '../domain/motor.js';
import ConfirmacaoAgente, { focarAbridor, rotuloConfirmar } from '../components/ConfirmacaoAgente.jsx';
import { ConfiancaBadge, EstadoChip, Origens, PageHeader, RiscoBadge, TipoIcone, Vazio } from '../components/ui.jsx';
import { minutosRestantes, tempoRelativo } from '../utils/format.js';

const MENSAGENS = {
  emitir: 'Alerta emitido para a população',
  descartar: 'Evento descartado',
  confirmar: 'Evento confirmado',
  encerrar: 'Evento encerrado',
};

export default function Validacao() {
  const { estado, dispatch, agora, avisar } = useStore();
  const [pendente, setPendente] = useState(null); // { id, acao: 'emitir' | 'descartar' }
  const comAv = estado.eventos.map((ev) => ({ ev, av: avaliar(ev, agora) }));
  const fila = comAv
    .filter(({ ev }) => ['Reportado', 'Em validação', 'Confirmado'].includes(ev.estado))
    .sort((a, b) => b.av.prioridade - a.av.prioridade || b.ev.criadoEm - a.ev.criadoEm);
  const monitorando = comAv.filter(({ ev }) => EMITIDOS.includes(ev.estado)).sort((a, b) => b.av.prioridade - a.av.prioridade);

  const agir = (eventoId, acao, msg, motivo) => {
    const antes = estado;
    dispatch({ type: 'AGENTE', eventoId, acao, motivo });
    setPendente(null);
    // Só a emissão não tem volta: a notificação já chegou ao celular das pessoas
    if (acao === 'emitir') avisar(msg);
    else avisar(msg, { rotulo: 'Desfazer', executar: () => dispatch({ type: 'DESFAZER', estado: antes }) });
  };
  const cancelar = () => {
    focarAbridor(`${pendente.acao}-${pendente.id}`);
    setPendente(null);
  };

  return (
    <>
      <PageHeader titulo="Fila de validação" subtitulo="Eventos que precisam da sua decisão, do mais prioritário para o menos (RN03)." />

      {fila.length === 0 ? (
        <Vazio icone={ClipboardCheck} titulo="Fila vazia" texto="Nenhum evento aguardando validação agora." />
      ) : (
        <ul className="lista-fila">
          {fila.map(({ ev, av }) => {
            const confirmando = pendente?.id === ev.id;
            const confBaixa = av.conf < 50;
            const ultimoDado = Math.max(...ev.dados.map((d) => d.ts));
            return (
              <li key={ev.id} className="card fila-item">
                <span className="pontuacao grande" title="Prioridade (RN03)">
                  {av.prioridade.toLocaleString('pt-BR')}
                  <small>prioridade</small>
                </span>
                <div className="fila-corpo">
                  <div className="fila-topo">
                    <TipoIcone tipo={ev.tipo} />
                    <Link to={`/alertas/${ev.id}`} className="alerta-titulo">
                      {ev.titulo}
                    </Link>
                  </div>
                  <small className="muted">
                    {ev.bairro} · aberto {tempoRelativo(ev.criadoEm, agora)} · {ev.dados.length} {ev.dados.length === 1 ? 'dado' : 'dados'}
                  </small>
                  <div className="linha-badges">
                    <RiscoBadge nivel={av.nivel} />
                    <ConfiancaBadge valor={av.conf} eventoId={ev.id} />
                    <EstadoChip estado={ev.estado} />
                  </div>
                  <Origens origens={av.origens} />
                  {ev.estado === 'Confirmado' && av.nivel === 'Alto' && (
                    <p className="aviso-auto">
                      <Clock size={14} aria-hidden="true" /> Emissão automática {minutosRestantes(ev.confirmadoEm + 10 * 60000, agora)} sem ação (RN03)
                    </p>
                  )}
                  {ev.estado === 'Em validação' && confBaixa && (
                    <p className="aviso-auto info">
                      <Clock size={14} aria-hidden="true" /> Confiança baixa. Se nada mudar: descarte automático {minutosRestantes(ultimoDado + 120 * 60000, agora)} (RN03)
                    </p>
                  )}
                </div>
                {!confirmando && (
                  <div className="fila-acoes">
                    {ev.estado === 'Em validação' && (
                      <button
                        data-abre={`confirmar-${ev.id}`}
                        className="btn btn-secundario"
                        onClick={() =>
                          // Em Alto/Crítico, confirmar dispara a emissão automática (RN03): passa pela confirmação
                          ['Alto', 'Crítico'].includes(av.nivel) ? setPendente({ id: ev.id, acao: 'confirmar' }) : agir(ev.id, 'confirmar', MENSAGENS.confirmar)
                        }
                      >
                        <ShieldCheck size={16} aria-hidden="true" /> {rotuloConfirmar(av.nivel)}
                      </button>
                    )}
                    {av.nivel !== 'Baixo' && (
                      <button
                        data-abre={`emitir-${ev.id}`}
                        className={`btn ${confBaixa ? 'btn-secundario' : 'btn-primario'}`}
                        onClick={() => setPendente({ id: ev.id, acao: 'emitir' })}
                      >
                        <Megaphone size={16} aria-hidden="true" /> {ev.estado === 'Confirmado' ? 'Emitir alerta' : 'Confirmar e emitir'}
                      </button>
                    )}
                    {ev.estado === 'Em validação' && (
                      <button data-abre={`descartar-${ev.id}`} className="btn btn-perigo-leve" onClick={() => setPendente({ id: ev.id, acao: 'descartar' })}>
                        <XCircle size={16} aria-hidden="true" /> Descartar
                      </button>
                    )}
                  </div>
                )}
                {confirmando && (
                  <div className="fila-confirmacao">
                    <ConfirmacaoAgente
                      ev={ev}
                      av={av}
                      acao={pendente.acao}
                      onCancelar={cancelar}
                      onConfirmar={(motivo) => agir(ev.id, pendente.acao, MENSAGENS[pendente.acao], motivo)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="secao-titulo">Em monitoramento ({monitorando.length})</h2>
      <ul className="lista-fila">
        {monitorando.map(({ ev, av }) => (
          <li key={ev.id} className="card fila-item compacto">
            <TipoIcone tipo={ev.tipo} />
            <div className="fila-corpo">
              <Link to={`/alertas/${ev.id}`} className="alerta-titulo">
                {ev.titulo}
              </Link>
              <div className="linha-badges">
                <RiscoBadge nivel={av.nivel} />
                <ConfiancaBadge valor={av.conf} eventoId={ev.id} curto />
                <EstadoChip estado={ev.estado} />
              </div>
            </div>
            {pendente?.id === ev.id ? (
              <div className="fila-confirmacao">
                <ConfirmacaoAgente ev={ev} av={av} acao="encerrar" onCancelar={cancelar} onConfirmar={() => agir(ev.id, 'encerrar', MENSAGENS.encerrar)} />
              </div>
            ) : (
              <button data-abre={`encerrar-${ev.id}`} className="btn btn-secundario" onClick={() => setPendente({ id: ev.id, acao: 'encerrar' })}>
                <CheckCircle2 size={16} aria-hidden="true" /> Encerrar
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
