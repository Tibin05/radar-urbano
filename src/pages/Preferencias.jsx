// T08 — Preferências de notificação (RF12), aplicadas pela RN04
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, NIVEIS, TIPOS } from '../domain/regras.js';
import { EMITIDOS, moradorRecebe } from '../domain/motor.js';
import { BAIRROS } from '../data/mock.js';
import { PageHeader, TipoIcone, Toggle } from '../components/ui.jsx';

export default function Preferencias() {
  const { estado, dispatch, agora, avisar } = useStore();
  const [p, setP] = useState(estado.prefs);
  const alternar = (lista, item) => (lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item]);

  const ativos = estado.eventos.filter((e) => EMITIDOS.includes(e.estado) && e.nivelAlertado);
  const simulado = { ...estado, prefs: p };
  const receberia = ativos.filter((e) => moradorRecebe(simulado, e, avaliar(e, agora).nivel)).length;

  return (
    <>
      <PageHeader titulo="Preferências de notificação" subtitulo="Escolha o que você quer acompanhar e por onde quer ser avisado." />

      <div className="grade-prefs">
        <section className="card">
          <h2>Bairros acompanhados</h2>
          <div className="chips-filtro">
            {Object.keys(BAIRROS).map((b) => (
              <button key={b} className={`chip-filtro ${p.bairros.includes(b) ? 'sel' : ''}`} aria-pressed={p.bairros.includes(b)} onClick={() => setP({ ...p, bairros: alternar(p.bairros, b) })}>
                {b}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Tipos de risco</h2>
          <div className="lista-toggles">
            {Object.entries(TIPOS).map(([k, t]) => (
              <Toggle
                key={k}
                rotulo={
                  <>
                    <TipoIcone tipo={k} tamanho={14} /> {t.rotulo}
                  </>
                }
                checked={p.tipos.includes(k)}
                onChange={() => setP({ ...p, tipos: alternar(p.tipos, k) })}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Nível mínimo de risco</h2>
          <div className="segmentado" role="radiogroup" aria-label="Nível mínimo">
            {NIVEIS.map((n) => (
              <button key={n} role="radio" aria-checked={p.nivelMinimo === n} className={p.nivelMinimo === n ? 'sel' : ''} onClick={() => setP({ ...p, nivelMinimo: n })}>
                {n}
              </button>
            ))}
          </div>
          <p className="aviso-info">
            <Info size={16} aria-hidden="true" /> Alertas de risco <strong>Crítico</strong> sempre chegam, mesmo fora dos seus bairros e do nível escolhido (RN04).
          </p>
        </section>

        <section className="card">
          <h2>Canais</h2>
          <div className="lista-toggles">
            <Toggle rotulo="Notificação push" descricao="No celular ou navegador" checked={p.canais.push} onChange={(v) => setP({ ...p, canais: { ...p.canais, push: v } })} />
            <Toggle rotulo="E-mail" descricao={estado.usuarios[estado.perfil].email} checked={p.canais.email} onChange={(v) => setP({ ...p, canais: { ...p.canais, email: v } })} />
            <Toggle rotulo="SMS" descricao="Somente alertas Alto e Crítico" checked={p.canais.sms} onChange={(v) => setP({ ...p, canais: { ...p.canais, sms: v } })} />
          </div>
        </section>
      </div>

      <div className="barra-salvar card">
        <span>
          Com essas escolhas, você receberia <strong>{receberia}</strong> dos {ativos.length} alertas ativos agora.
        </span>
        <button
          className="btn btn-primario"
          onClick={() => {
            dispatch({ type: 'PREFS', prefs: p });
            avisar('Preferências salvas');
          }}
        >
          Salvar preferências
        </button>
      </div>
    </>
  );
}
