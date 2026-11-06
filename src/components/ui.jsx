import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Droplets,
  Info,
  Landmark,
  Radio,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Siren,
  ThermometerSun,
  TrainFront,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
import { faixaConfianca, ORIGENS, TIPOS } from '../domain/regras.js';

export const COR_RISCO = { Baixo: '#2563eb', Moderado: '#eab308', Alto: '#f97316', Crítico: '#dc2626' };
// Contorno escuro de cada nível: garante 3:1 contra o mapa e o fundo mesmo com o preenchimento claro
export const CONTORNO_RISCO = { Baixo: '#1e40af', Moderado: '#854d0e', Alto: '#9a3412', Crítico: '#991b1b' };
const RISCO_ICONE = { Baixo: Info, Moderado: AlertCircle, Alto: AlertTriangle, Crítico: Siren };
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

// RNF07: risco sempre com cor, ícone e texto
export function RiscoBadge({ nivel }) {
  const I = RISCO_ICONE[nivel];
  return (
    <span className={`badge risco risco-${slug(nivel)}`}>
      <I size={14} aria-hidden="true" />
      Risco {nivel}
    </span>
  );
}

// RF09: selo de confiança; com eventoId vira link para a tela de origem e confiança (T05)
export function ConfiancaBadge({ valor, eventoId, curto, soFaixa }) {
  const faixa = faixaConfianca(valor);
  const I = faixa === 'Alta' ? ShieldCheck : faixa === 'Média' ? ShieldHalf : Shield;
  const cls = `badge conf conf-${slug(faixa)}`;
  const conteudo = soFaixa ? (
    <>
      <I size={14} aria-hidden="true" />
      Faixa {faixa.toLowerCase()}
    </>
  ) : (
    <>
      <I size={14} aria-hidden="true" />
      Confiança {valor}
      {!curto && <span className="badge-faixa"> · {faixa}</span>}
    </>
  );
  if (!eventoId) return <span className={cls}>{conteudo}</span>;
  return (
    <Link to={`/eventos/${eventoId}/confianca`} className={`${cls} badge-link`} title="Ver origem e cálculo da confiança">
      {conteudo}
    </Link>
  );
}

const ORIGEM_ICONE = { sensor: Radio, publica: Landmark, comunidade: Users, operador: BadgeCheck };

export function OrigemChip({ origem }) {
  const I = ORIGEM_ICONE[origem];
  const rotulo = ORIGENS[origem].rotulo;
  return (
    <span className={`chip origem origem-${origem}`}>
      <I size={13} aria-hidden="true" />
      {rotulo}
    </span>
  );
}

// compacto: uma linha de texto ("Sensor IoT · Comunidade"), legível no toque e no leitor de tela
export function Origens({ origens, compacto }) {
  if (compacto)
    return (
      <span className="origens-linha">
        <span className="origens-icones" aria-hidden="true">
          {origens.map((o) => {
            const I = ORIGEM_ICONE[o];
            return <I key={o} size={13} />;
          })}
        </span>
        {origens.map((o) => ORIGENS[o].rotulo).join(' · ')}
      </span>
    );
  return (
    <span className="origens">
      {origens.map((o) => (
        <OrigemChip key={o} origem={o} />
      ))}
    </span>
  );
}

const TIPO_ICONE = { alagamento: Waves, calor: ThermometerSun, energia: Zap, agua: Droplets, transporte: TrainFront };

export function TipoIcone({ tipo, tamanho = 18 }) {
  const I = TIPO_ICONE[tipo];
  return (
    <span className={`tipo-icone tipo-${tipo}`} title={TIPOS[tipo].rotulo}>
      <I size={tamanho} aria-hidden="true" />
    </span>
  );
}

export function EstadoChip({ estado }) {
  return <span className={`chip estado estado-${slug(estado)}`}>{estado}</span>;
}

// voltar = rota de reserva: usada quando a página foi aberta direto por link (sem histórico no app)
export function PageHeader({ titulo, subtitulo, acoes, voltar }) {
  const navigate = useNavigate();
  const irVoltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(voltar));
  return (
    <header className="page-header">
      <div>
        {voltar && (
          <button className="link-voltar" onClick={irVoltar}>
            <ArrowLeft size={16} aria-hidden="true" /> Voltar
          </button>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <p className="subtitulo">{subtitulo}</p>}
      </div>
      {acoes && <div className="page-acoes">{acoes}</div>}
    </header>
  );
}

export function Vazio({ icone: I, titulo, texto, children }) {
  return (
    <div className="vazio">
      {I && <I size={28} aria-hidden="true" />}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

// to: com rota, o indicador vira atalho para a lista que ele resume
export function Kpi({ rotulo, valor, detalhe, icone: I, tom, to }) {
  const Caixa = to ? Link : 'div';
  return (
    <Caixa to={to} className={`kpi ${tom ? `kpi-${tom}` : ''} ${to ? 'kpi-link' : ''}`}>
      <div className="kpi-topo">
        <span>{rotulo}</span>
        {I && (
          <span className="kpi-icone" aria-hidden="true">
            <I size={16} />
          </span>
        )}
      </div>
      <strong>{valor}</strong>
      {detalhe && <small>{detalhe}</small>}
    </Caixa>
  );
}

export function Toggle({ checked, onChange, rotulo, descricao, disabled }) {
  return (
    <label className={`toggle ${disabled ? 'toggle-off' : ''}`}>
      <span className="toggle-texto">
        <strong>{rotulo}</strong>
        {descricao && <small>{descricao}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-trilho" aria-hidden="true" />
    </label>
  );
}
