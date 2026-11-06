// T06 — Registro comunitário de ocorrência (RF03), em até 3 passos (RNF06)
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Crosshair, Info, Lock } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, distanciaM, TIPOS } from '../domain/regras.js';
import { eventoProximo } from '../domain/motor.js';
import { BAIRROS } from '../data/mock.js';
import MapaEventos from '../components/MapaEventos.jsx';
import { ConfiancaBadge, EstadoChip, PageHeader, TipoIcone } from '../components/ui.jsx';

const INTERRUPCAO = {
  pergunta: 'Há quanto tempo está sem o serviço?',
  opcoes: [
    { rotulo: 'Começou agora (menos de 1 h)', medida: 0.5 },
    { rotulo: 'De 1 a 4 h', medida: 2 },
    { rotulo: 'De 4 a 12 h', medida: 6 },
    { rotulo: 'Mais de 12 h', medida: 13 },
  ],
};

// A pergunta simples vira severidade 1 a 4 (RN02)
const SEVERIDADE = {
  alagamento: {
    pergunta: 'Até onde vai a água?',
    opcoes: [
      { rotulo: 'Até o tornozelo', medida: 10 },
      { rotulo: 'Até o joelho', medida: 25 },
      { rotulo: 'Acima do joelho', medida: 40 },
      { rotulo: 'Na cintura ou mais', medida: 60 },
    ],
  },
  calor: {
    pergunta: 'Como está o calor?',
    opcoes: [
      { rotulo: 'Desconfortável', medida: 33 },
      { rotulo: 'Muito quente', medida: 35 },
      { rotulo: 'Calor extremo', medida: 37 },
      { rotulo: 'Insuportável', medida: 39 },
    ],
  },
  energia: INTERRUPCAO,
  agua: INTERRUPCAO,
  transporte: INTERRUPCAO,
};

const ALCANCE = [
  { valor: 1, rotulo: 'Só a minha rua ou quadra' },
  { valor: 2, rotulo: 'O bairro todo' },
  { valor: 3, rotulo: 'Vários bairros, ou perto de hospital ou escola' },
];

const PASSOS = ['O que está acontecendo', 'Onde', 'Detalhes'];

export default function Registrar() {
  const { estado, dispatch, agora } = useStore();
  const casa = estado.usuarios.morador.bairro;
  const [passo, setPasso] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [f, setF] = useState({ tipo: null, opcao: null, exposicao: 2, bairro: casa, lat: BAIRROS[casa].lat, lng: BAIRROS[casa].lng, descricao: '', foto: null });
  const [fotoUrl, setFotoUrl] = useState(null);

  useEffect(() => () => fotoUrl && URL.revokeObjectURL(fotoUrl), [fotoUrl]);

  const proximo = useMemo(() => (f.tipo ? eventoProximo(estado, f.tipo, f, agora) : null), [estado, f, agora]);
  const itensMapa = estado.eventos
    .filter((e) => e.tipo === f.tipo && !['Encerrado', 'Descartado'].includes(e.estado))
    .map((ev) => ({ ev, av: avaliar(ev, agora) }));

  const usarLocalizacao = () => {
    // GPS simulado: um ponto perto de casa (o consentimento de localização é verificado antes)
    const b = BAIRROS[casa];
    setF({ ...f, bairro: casa, lat: b.lat - 0.0005, lng: b.lng - 0.0008 });
  };

  const enviar = () => {
    const op = SEVERIDADE[f.tipo].opcoes[f.opcao];
    dispatch({
      type: 'REGISTRAR',
      form: { tipo: f.tipo, medida: op.medida, opcaoRotulo: op.rotulo, exposicao: f.exposicao, bairro: f.bairro, lat: f.lat, lng: f.lng, descricao: f.descricao.trim(), foto: Boolean(f.foto) },
    });
    setEnviado(true);
  };

  if (enviado && estado.ultimoRelato) {
    const r = estado.ultimoRelato;
    return (
      <div className="sucesso-tela card">
        <CheckCircle2 size={48} className="icone-sucesso" aria-hidden="true" />
        <h1>Relato enviado</h1>
        <p className="protocolo">
          Protocolo <strong>{r.protocolo}</strong>
        </p>
        <p>
          {r.agrupado
            ? 'Já existia um evento do mesmo tipo a menos de 500 m. Seu relato foi vinculado a ele (RF04).'
            : 'Criamos um novo evento. Ele aparece no mapa enquanto é validado.'}
        </p>
        <div className="conf-antes-depois">
          {r.agrupado && (
            <>
              <ConfiancaBadge valor={r.confAntes} />
              <span aria-hidden="true">→</span>
            </>
          )}
          <ConfiancaBadge valor={r.confDepois} />
          <EstadoChip estado={r.estado} />
        </div>
        <div className="botoes centro">
          <Link to={`/alertas/${r.eventoId}`} className="btn btn-primario">
            Acompanhar evento
          </Link>
          <button
            className="btn btn-secundario"
            onClick={() => {
              setEnviado(false);
              setPasso(0);
              setF({ ...f, tipo: null, opcao: null, descricao: '', foto: null });
              setFotoUrl(null);
            }}
          >
            Registrar outra ocorrência
          </button>
        </div>
      </div>
    );
  }

  const podeAvancar = passo === 0 ? f.tipo && f.opcao !== null : true;

  return (
    <>
      <PageHeader titulo="Registrar ocorrência" subtitulo="Leva menos de um minuto. Seu nome nunca aparece para outras pessoas." />

      <ol className="stepper" aria-label="Etapas">
        {PASSOS.map((p, i) => (
          <li key={p} className={i === passo ? 'atual' : i < passo ? 'feito' : ''} aria-current={i === passo ? 'step' : undefined}>
            <span>{i + 1}</span> {p}
          </li>
        ))}
      </ol>

      <div className="card form-card">
        {passo === 0 && (
          <div className="form">
            <fieldset>
              <legend>Tipo de ocorrência</legend>
              <div className="grade-tipos">
                {Object.entries(TIPOS).map(([k, t]) => (
                  <button type="button" key={k} className={`opcao-tipo ${f.tipo === k ? 'sel' : ''}`} aria-pressed={f.tipo === k} onClick={() => setF({ ...f, tipo: k, opcao: null })}>
                    <TipoIcone tipo={k} tamanho={22} />
                    {t.rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
            {f.tipo && (
              <fieldset>
                <legend>{SEVERIDADE[f.tipo].pergunta}</legend>
                <div className="opcoes-lista">
                  {SEVERIDADE[f.tipo].opcoes.map((o, i) => (
                    <label key={o.rotulo} className={`opcao-radio ${f.opcao === i ? 'sel' : ''}`}>
                      <input type="radio" name="sev" checked={f.opcao === i} onChange={() => setF({ ...f, opcao: i })} />
                      {o.rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {f.tipo && (
              <fieldset>
                <legend>Qual o tamanho da área afetada?</legend>
                <div className="opcoes-lista">
                  {ALCANCE.map((a) => (
                    <label key={a.valor} className={`opcao-radio ${f.exposicao === a.valor ? 'sel' : ''}`}>
                      <input type="radio" name="alcance" checked={f.exposicao === a.valor} onChange={() => setF({ ...f, exposicao: a.valor })} />
                      {a.rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {passo === 1 && (
          <div className="form">
            <div className="linha-campos">
              <label className="campo">
                Bairro
                <select
                  value={f.bairro}
                  onChange={(e) => {
                    const b = BAIRROS[e.target.value];
                    setF({ ...f, bairro: e.target.value, lat: b.lat, lng: b.lng });
                  }}
                >
                  {Object.keys(BAIRROS).map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-secundario" onClick={usarLocalizacao} disabled={!estado.consentimentos.localizacao}>
                <Crosshair size={16} aria-hidden="true" /> Usar minha localização
              </button>
            </div>
            {!estado.consentimentos.localizacao && <p className="muted">Localização desativada em Privacidade e dados. Escolha o bairro ou toque no mapa.</p>}
            <p className="muted">Toque no mapa para ajustar o ponto exato.</p>
            <MapaEventos itens={itensMapa} altura={320} centro={[f.lat, f.lng]} zoom={15} pino={f} onClique={(p) => setF({ ...f, ...p })} popups={false} />
            {proximo ? (
              <p className="aviso-info">
                <Info size={16} aria-hidden="true" /> Há um evento de {TIPOS[f.tipo].rotulo.toLowerCase()} a {Math.round(distanciaM(proximo, f))} m: “{proximo.titulo}”. Seu relato
                será vinculado a ele e vai aumentar a confiança.
              </p>
            ) : (
              <p className="aviso-info">
                <Info size={16} aria-hidden="true" /> Nenhum evento parecido a menos de 500 m. Seu relato vai abrir um novo evento.
              </p>
            )}
          </div>
        )}

        {passo === 2 && (
          <div className="form">
            <label className="campo">
              Descreva o que você está vendo (opcional)
              <textarea maxLength={280} rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: a água está entrando nas casas da rua" />
              <small>{280 - f.descricao.length} caracteres restantes</small>
            </label>
            <div className="campo">
              Foto (opcional, soma +5 de confiança)
              <label className="upload">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const arq = e.target.files?.[0];
                    if (!arq) return;
                    setF({ ...f, foto: arq.name });
                    setFotoUrl(URL.createObjectURL(arq));
                  }}
                />
                {fotoUrl ? <img src={fotoUrl} alt="Pré-visualização da foto" /> : <span><Camera size={22} aria-hidden="true" /> Tirar ou escolher foto</span>}
              </label>
            </div>
            <div className="aviso-lgpd">
              <Lock size={16} aria-hidden="true" />
              <span>
                Seu nome e contato não são exibidos. O relato aparece como <strong>{estado.usuarios.morador.pseudonimo}</strong>, e a localização pública é arredondada
                para cerca de 100 m (LGPD).
              </span>
            </div>
            <div className="resumo-envio">
              <TipoIcone tipo={f.tipo} />
              <span>
                <strong>{TIPOS[f.tipo].rotulo}</strong> · {SEVERIDADE[f.tipo].opcoes[f.opcao].rotulo} · {f.bairro}
              </span>
            </div>
          </div>
        )}

        <div className="rodape-form">
          {passo > 0 ? (
            <button className="btn btn-fantasma" onClick={() => setPasso(passo - 1)}>
              Voltar
            </button>
          ) : (
            <span />
          )}
          {passo < 2 ? (
            <button className="btn btn-primario" disabled={!podeAvancar} onClick={() => setPasso(passo + 1)}>
              Continuar
            </button>
          ) : (
            <button className="btn btn-primario" onClick={enviar}>
              Enviar relato
            </button>
          )}
        </div>
      </div>
    </>
  );
}
