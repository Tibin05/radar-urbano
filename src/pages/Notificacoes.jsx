// T07 — Central de notificações (RF10, RF11)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, ClipboardCheck, Info, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { PageHeader, RiscoBadge, Vazio } from '../components/ui.jsx';
import { tempoRelativo } from '../utils/format.js';

const CANAL = { push: { icone: Smartphone, rotulo: 'Push' }, email: { icone: Mail, rotulo: 'E-mail' }, sms: { icone: MessageSquare, rotulo: 'SMS' } };
const TIPO_ICONE = { alerta: BellRing, fila: ClipboardCheck, sistema: Info };

export default function Notificacoes() {
  const { estado, dispatch, agora } = useStore();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const todas = estado.notificacoes[estado.perfil];
  const lista = filtro === 'nao-lidas' ? todas.filter((n) => !n.lida) : todas;
  const naoLidas = todas.filter((n) => !n.lida).length;

  const abrir = (n) => {
    dispatch({ type: 'LER', id: n.id });
    if (n.eventoId) navigate(`/alertas/${n.eventoId}`);
  };

  return (
    <>
      <PageHeader
        titulo="Central de notificações"
        subtitulo={naoLidas ? `${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Tudo lido'}
        acoes={
          <>
            <Link to="/preferencias" className="btn btn-fantasma">
              Preferências
            </Link>
            <button className="btn btn-secundario" disabled={!naoLidas} onClick={() => dispatch({ type: 'LER', id: 'todas' })}>
              <CheckCheck size={16} aria-hidden="true" /> Marcar todas como lidas
            </button>
          </>
        }
      />

      <div className="abas abas-linha" role="tablist">
        <button role="tab" aria-selected={filtro === 'todas'} className={filtro === 'todas' ? 'ativa' : ''} onClick={() => setFiltro('todas')}>
          Todas <span className="aba-n">{todas.length}</span>
        </button>
        <button role="tab" aria-selected={filtro === 'nao-lidas'} className={filtro === 'nao-lidas' ? 'ativa' : ''} onClick={() => setFiltro('nao-lidas')}>
          Não lidas <span className="aba-n">{naoLidas}</span>
        </button>
      </div>

      {lista.length === 0 ? (
        <Vazio icone={Bell} titulo="Nenhuma notificação" texto="Quando um alerta atingir seus bairros, ele aparece aqui." />
      ) : (
        <ul className="lista-notif">
          {lista.map((n) => {
            const I = TIPO_ICONE[n.tipo];
            return (
              <li key={n.id}>
                <button className={`notif card ${n.lida ? '' : 'nao-lida'}`} onClick={() => abrir(n)}>
                  <span className={`notif-icone notif-${n.nivel ? n.nivel.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : 'info'}`}>
                    <I size={18} aria-hidden="true" />
                  </span>
                  <span className="notif-corpo">
                    <span className="notif-topo">
                      <strong>{n.titulo}</strong>
                      <small className="muted">{tempoRelativo(n.ts, agora)}</small>
                    </span>
                    <span className="notif-texto">{n.texto}</span>
                    <span className="linha-badges">
                      {n.nivel && <RiscoBadge nivel={n.nivel} />}
                      {n.canais?.map((c) => {
                        const C = CANAL[c].icone;
                        return (
                          <span key={c} className="chip">
                            <C size={13} aria-hidden="true" /> {CANAL[c].rotulo}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                  {!n.lida && <span className="ponto-nao-lida" aria-label="Não lida" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
