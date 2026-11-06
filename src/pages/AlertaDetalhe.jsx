// T04 — Detalhe do alerta (RF06, RF08, RF09, RF14, RF16)
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Megaphone, Phone, ShieldCheck, Siren, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, orientacao, TIPOS } from '../domain/regras.js';
import { EMITIDOS, FINAIS } from '../domain/motor.js';
import MapaEventos, { RAIO_AREA_M } from '../components/MapaEventos.jsx';
import ConfirmacaoAgente, { focarAbridor, rotuloConfirmar } from '../components/ConfirmacaoAgente.jsx';
import { ConfiancaBadge, EstadoChip, OrigemChip, PageHeader, RiscoBadge, Vazio } from '../components/ui.jsx';
import { dataHora, medida, minutosRestantes, num, tempoRelativo } from '../utils/format.js';

const URGENTE = ['Alto', 'Crítico'];
const slugNivel = (n) => (n === 'Crítico' ? 'critico' : n.toLowerCase());
// O morador não precisa ler códigos de requisito: "(RN03)", "(RF04)"…
const semCodigos = (t) => t.replace(/\s*\((?:RN|RF)\d+\)/g, '');

export default function AlertaDetalhe() {
  const { id } = useParams();
  const { estado, dispatch, agora, avisar } = useStore();
  const [pendente, setPendente] = useState(null); // 'emitir' | 'descartar' | 'confirmar' | 'encerrar'
  const ev = estado.eventos.find((e) => e.id === id);
  if (!ev) return <Vazio titulo="Evento não encontrado" texto="Ele pode ter sido removido ao restaurar os dados de demonstração." />;

  const av = avaliar(ev, agora);
  const perfil = estado.perfil;
  const morador = perfil === 'morador';
  const texto = (t) => (morador ? semCodigos(t) : t);
  const Regra = ({ codigo }) => (morador ? null : <small className="regra"> {codigo}</small>);
  const ativo = !FINAIS.includes(ev.estado);
  const urgente = ativo && URGENTE.includes(av.nivel);
  const confBaixa = av.conf < 50;
  const eu = estado.usuarios.morador.pseudonimo;
  const temRelato = ev.dados.some((d) => d.origem === 'comunidade' && d.autor !== eu);
  const jaRelatou = !ev.votoMorador && ev.dados.some((d) => d.autor === eu);
  const raio = RAIO_AREA_M[ev.exposicao];
  const ultimoDado = Math.max(...ev.dados.map((d) => d.ts));
  const podeEmitir = ['Em validação', 'Confirmado'].includes(ev.estado) && av.nivel !== 'Baixo';
  // Em Alto/Crítico, confirmar dispara a emissão automática (RN03): passa pela confirmação
  const confirmarDisparaEmissao = URGENTE.includes(av.nivel);
  const MENSAGENS = {
    emitir: 'Alerta emitido para a população',
    descartar: 'Evento descartado',
    confirmar: 'Evento confirmado',
    encerrar: 'Evento encerrado',
  };

  const agente = (acao, msg, motivo) => {
    const antes = estado;
    dispatch({ type: 'AGENTE', eventoId: ev.id, acao, motivo });
    setPendente(null);
    // Só a emissão não tem volta: a notificação já chegou ao celular das pessoas
    if (acao === 'emitir') avisar(msg);
    else avisar(msg, { rotulo: 'Desfazer', executar: () => dispatch({ type: 'DESFAZER', estado: antes }) });
  };
  const cancelar = () => {
    focarAbridor(`${pendente}-${ev.id}`);
    setPendente(null);
  };

  const cardOrientacao = morador ? (
    <section className={`card orientacao orientacao-${slugNivel(av.nivel)} ordem-1`}>
      <h2>
        {av.nivel === 'Crítico' && ativo ? (
          <>
            <Siren size={20} aria-hidden="true" /> Aja agora: risco crítico
          </>
        ) : (
          'O que fazer agora'
        )}
      </h2>
      <p>{ativo ? orientacao(ev.tipo, av.nivel) : 'Este evento foi encerrado. Não há ação necessária no momento.'}</p>
      {ativo && (
        <div className="botoes emergencia">
          <a href="tel:199" className={`btn ${urgente ? 'btn-perigo' : 'btn-secundario'}`}>
            <Phone size={16} aria-hidden="true" /> Ligar 199 · Defesa Civil
          </a>
          <a href="tel:193" className="btn btn-secundario">
            <Phone size={16} aria-hidden="true" /> Ligar 193 · Bombeiros
          </a>
        </div>
      )}
    </section>
  ) : (
    // Para agente e operador, a orientação é o conteúdo do alerta, não uma instrução a eles
    <section className="card orientacao-previa ordem-1">
      <h2>Mensagem que a população recebe</h2>
      <p>{orientacao(ev.tipo, av.nivel)}</p>
    </section>
  );

  const cardAcoesAgente = ativo && perfil === 'agente' && (
    <section className="card acoes ordem-2">
      <h2>Ações do agente</h2>
      {pendente ? (
        <ConfirmacaoAgente
          ev={ev}
          av={av}
          acao={pendente}
          onCancelar={cancelar}
          onConfirmar={(motivo) => agente(pendente, MENSAGENS[pendente], motivo)}
        />
      ) : (
        <div className="botoes coluna-botoes">
          {podeEmitir && confBaixa && (
            <p className="aviso-confirmacao">
              <AlertTriangle size={16} aria-hidden="true" />
              Confiança {av.conf} com {av.origens.length} {av.origens.length === 1 ? 'origem' : 'origens'}: emitir agora pode gerar um alarme falso.
            </p>
          )}
          {ev.estado === 'Em validação' && (
            // O nome diz o que acontece: em Alto/Crítico, confirmar já põe a emissão em andamento (RN03)
            <button
              data-abre={`confirmar-${ev.id}`}
              className="btn btn-secundario"
              onClick={() => (confirmarDisparaEmissao ? setPendente('confirmar') : agente('confirmar', MENSAGENS.confirmar))}
            >
              <ShieldCheck size={16} aria-hidden="true" /> {rotuloConfirmar(av.nivel)}
            </button>
          )}
          {podeEmitir && (
            // Com confiança baixa nenhuma ação é destacada: a decisão é do agente, não da interface
            <button data-abre={`emitir-${ev.id}`} className={`btn ${confBaixa ? 'btn-secundario' : 'btn-primario'}`} onClick={() => setPendente('emitir')}>
              <Megaphone size={16} aria-hidden="true" /> {ev.estado === 'Confirmado' ? 'Emitir alerta' : 'Confirmar e emitir alerta'}
            </button>
          )}
          {ev.estado === 'Em validação' && (
            <button data-abre={`descartar-${ev.id}`} className="btn btn-perigo-leve" onClick={() => setPendente('descartar')}>
              <XCircle size={16} aria-hidden="true" /> Descartar
            </button>
          )}
          {EMITIDOS.includes(ev.estado) && (
            <button data-abre={`encerrar-${ev.id}`} className="btn btn-secundario" onClick={() => setPendente('encerrar')}>
              <CheckCircle2 size={16} aria-hidden="true" /> Encerrar evento
            </button>
          )}
          {ev.estado === 'Confirmado' && av.nivel === 'Alto' && (
            <p className="aviso-auto">
              <Clock size={14} aria-hidden="true" /> Emissão automática {minutosRestantes(ev.confirmadoEm + 10 * 60000, agora)} se não houver ação (RN03).
            </p>
          )}
          {ev.estado === 'Em validação' && confBaixa && (
            <p className="aviso-auto info">
              <Clock size={14} aria-hidden="true" /> Se nada mudar: descarte automático {minutosRestantes(ultimoDado + 120 * 60000, agora)} (RN03).
            </p>
          )}
        </div>
      )}
    </section>
  );

  const cardAcoesOperador = ativo && perfil === 'operador' && TIPOS[ev.tipo].servico && EMITIDOS.includes(ev.estado) && (
    <section className="card acoes ordem-2">
      <h2>Ações do operador</h2>
      <button
        className="btn btn-primario"
        onClick={() => {
          const antes = estado;
          dispatch({ type: 'NORMALIZAR', eventoId: ev.id });
          avisar('Normalização registrada. Evento encerrado.', { rotulo: 'Desfazer', executar: () => dispatch({ type: 'DESFAZER', estado: antes }) });
        }}
      >
        <CheckCircle2 size={16} aria-hidden="true" /> Registrar normalização do serviço
      </button>
    </section>
  );

  const cardAcaoMorador = ativo && morador && (
    <section className="card acoes ordem-3">
      <h2>Você está vendo isso?</h2>
      {jaRelatou ? (
        <p className="sucesso">
          <CheckCircle2 size={18} aria-hidden="true" /> Você já relatou este evento. Acompanhe as atualizações por aqui e pela central de notificações.
        </p>
      ) : ev.votoMorador ? (
        <p className="sucesso">
          <CheckCircle2 size={18} aria-hidden="true" /> Obrigado! Sua {ev.votoMorador === 'confirma' ? 'confirmação' : 'contestação'} já ajuda quem mora perto.
        </p>
      ) : (
        <>
          <p className="muted">Sua resposta ajuda a confirmar o evento para quem mora perto.</p>
          <div className="botoes">
            <button
              className={`btn ${urgente ? 'btn-secundario' : 'btn-primario'}`}
              onClick={() => {
                dispatch({ type: 'VOTAR', eventoId: ev.id, voto: 'confirma' });
                avisar('Confirmação registrada');
              }}
            >
              <ThumbsUp size={16} aria-hidden="true" /> Também vejo
            </button>
            {temRelato && (
              <button
                className="btn btn-secundario"
                onClick={() => {
                  dispatch({ type: 'VOTAR', eventoId: ev.id, voto: 'contesta' });
                  avisar('Contestação registrada');
                }}
              >
                <ThumbsDown size={16} aria-hidden="true" /> Não está acontecendo
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );

  const cardCalculo = (
    <details className="card calculo-card ordem-5" open={!morador}>
      <summary>
        <h2>Como calculamos o risco</h2>
      </summary>
      <dl className="calculo">
        <div>
          <dt>
            Gravidade
            <Regra codigo="RN02" />
          </dt>
          <dd>
            {av.sev} de 4{av.ref && <small> · {medida(ev.tipo, av.ref.medida)} ({av.ref.fonte})</small>}
          </dd>
        </div>
        <div>
          <dt>Área atingida</dt>
          <dd>
            {av.exp} de 3 <small>· {['', 'via ou quadra', 'bairro', 'vários bairros ou local sensível'][av.exp]}</small>
          </dd>
        </div>
        <div className="calc-total">
          <dt>Pontuação de risco</dt>
          <dd>
            {av.sev} × {av.exp} = {av.S} → <RiscoBadge nivel={av.nivel} />
          </dd>
        </div>
        {!morador && (
          <div className="calc-total">
            <dt>
              Prioridade na fila
              <Regra codigo="RN03" />
            </dt>
            <dd>
              {av.S} × {num(av.conf / 100, 2)} = {av.prioridade.toLocaleString('pt-BR')}
            </dd>
          </div>
        )}
      </dl>
    </details>
  );

  const cardMapa = (
    <section className={`card ${morador ? 'ordem-2' : 'ordem-3'}`}>
      <h2>
        <MapPin size={18} aria-hidden="true" /> Área afetada aproximada
      </h2>
      <p className="muted">
        Raio de cerca de {raio >= 1000 ? `${num(raio / 1000, 1)} km` : `${raio} m`} em {ev.bairro}. O ponto exato de quem relatou não é exibido.
      </p>
      <MapaEventos itens={[{ ev, av }]} altura={220} centro={[ev.lat, ev.lng]} zoom={raio >= 1000 ? 13 : 14} popups={false} />
    </section>
  );

  return (
    <>
      <PageHeader voltar="/alertas" titulo={ev.titulo} subtitulo={`${TIPOS[ev.tipo].rotulo} · ${ev.bairro} · aberto ${tempoRelativo(ev.criadoEm, agora)}`} />

      <div className="detalhe-badges">
        <RiscoBadge nivel={av.nivel} />
        <ConfiancaBadge valor={av.conf} eventoId={ev.id} />
        <EstadoChip estado={ev.estado} />
        {!morador && <span className="chip">Prioridade {av.prioridade.toLocaleString('pt-BR')}</span>}
        {EMITIDOS.includes(ev.estado) && ev.entregas > 0 && <span className="chip">Alerta enviado a {num(ev.entregas)} inscritos</span>}
      </div>

      <div className="detalhe-grade">
        <div className="coluna">
          {cardOrientacao}

          <section className="card ordem-4">
            <div className="card-titulo">
              <h2>Dados vinculados ({ev.dados.length})</h2>
              <Link to={`/eventos/${ev.id}/confianca`} className="link">
                Ver origem e cálculo da confiança →
              </Link>
            </div>
            <ul className="lista-dados">
              {av.dados.map((d) => {
                const valor = medida(ev.tipo, d.medida);
                // Só repete a medida quando a descrição ainda não a menciona
                const mostrarMedida = valor && !d.descricao.includes(String(d.medida).replace('.', ','));
                return (
                  <li key={d.id}>
                    <OrigemChip origem={d.origem} />
                    <div className="dado-texto">
                      <strong>{d.fonte}</strong>
                      <span>{d.descricao}</span>
                      {d.atipico && (
                        <small className="dado-atipico">
                          <AlertTriangle size={13} aria-hidden="true" /> Leitura atípica: pesa menos na confiança (−30)
                        </small>
                      )}
                      <small className="muted">
                        {mostrarMedida && `${TIPOS[ev.tipo].medidaRotulo}: ${valor} · `}
                        Recebido {tempoRelativo(d.ts, agora)}
                        {d.autor && ` · autor ${d.autor} (identidade protegida)`}
                      </small>
                    </div>
                    <ConfiancaBadge valor={d.conf.valor} curto />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card ordem-6">
            <h2>Linha do tempo</h2>
            <ol className="timeline">
              {[...ev.historico].reverse().map((h, i) => (
                <li key={i} className={i === 0 ? 'atual' : ''} aria-current={i === 0 ? 'step' : undefined}>
                  <span className="timeline-ponto" aria-hidden="true" />
                  <div>
                    <strong>{h.estado}</strong>
                    <span>{texto(h.motivo)}</span>
                    <small className="muted">
                      {dataHora(h.ts)} · {h.por}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Coluna direita: o agente vê primeiro as próprias ações; o morador vê primeiro a área */}
        <div className="coluna">
          {morador ? (
            <>
              {cardMapa}
              {cardAcaoMorador}
              {cardCalculo}
            </>
          ) : (
            <>
              {cardAcoesAgente}
              {cardAcoesOperador}
              {cardCalculo}
              {cardMapa}
            </>
          )}
        </div>
      </div>
    </>
  );
}
