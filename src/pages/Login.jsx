// T01 — Login e cadastro (RF18). Layout adaptado do componente "sign-in" (21st.dev) para o CSS do projeto.
// Animação de entrada: classes de src/entry-animation.css.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Eye, EyeOff, Home, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { BAIRROS } from '../data/mock.js';
import { avaliar } from '../domain/regras.js';
import { FINAIS } from '../domain/motor.js';
import MapaEventos from '../components/MapaEventos.jsx';

const CONTAS = [
  { perfil: 'morador', icone: Home, rotulo: 'Morador' },
  { perfil: 'agente', icone: ShieldCheck, rotulo: 'Agente' },
  { perfil: 'operador', icone: BadgeCheck, rotulo: 'Operador' },
];

// Falas das personas do documento de requisitos (seção 2)
const PERSONAS = [
  { iniciais: 'AS', nome: 'Ana Souza', papel: 'Moradora · Jardim Pantanal', texto: 'Agora eu sei se a minha rua vai alagar antes de sair de casa.' },
  { iniciais: 'CM', nome: 'Carlos Mendes', papel: 'Agente da Defesa Civil', texto: 'Os relatos chegam com a confiança calculada. Valido primeiro o que importa.' },
  { iniciais: 'JR', nome: 'Juliana Rocha', papel: 'Operadora de energia', texto: 'As falhas que a população relata chegam junto com o meu registro técnico.' },
];

function CampoVidro({ rotulo, children, ajuda }) {
  return (
    <label className="campo-vidro">
      <span>{rotulo}</span>
      <div className="vidro">{children}</div>
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}

export default function Login() {
  const { estado, dispatch, agora, avisar } = useStore();
  const navigate = useNavigate();
  const [modo, setModo] = useState('entrar');
  const [perfil, setPerfil] = useState('morador');
  const [verSenha, setVerSenha] = useState(false);
  const [cad, setCad] = useState({ nome: '', email: '', bairro: 'Jardim Pantanal', termos: false, localizacao: true, analises: false });

  const itensMapa = useMemo(
    () => estado.eventos.filter((e) => !FINAIS.includes(e.estado)).map((ev) => ({ ev, av: avaliar(ev, agora) })),
    [estado.eventos, agora],
  );

  const entrar = (e) => {
    e.preventDefault();
    dispatch({ type: 'LOGIN', perfil });
    navigate('/painel');
  };

  const cadastrar = (e) => {
    e.preventDefault();
    dispatch({ type: 'CONSENTIMENTO', chave: 'localizacao', valor: cad.localizacao });
    dispatch({ type: 'CONSENTIMENTO', chave: 'analises', valor: cad.analises });
    dispatch({ type: 'LOGIN', perfil: 'morador', nome: cad.nome.trim() || undefined });
    navigate('/painel');
  };

  return (
    <div className="login">
      <section className="login-coluna">
        {/* key: ao trocar entre Entrar e Criar conta, a sequência de entrada roda de novo */}
        <div className="login-caixa entry-stagger" key={modo}>
          <div className="marca">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#0f4c81" />
              <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeWidth="2" />
              <circle cx="16" cy="16" r="4" fill="#f97316" />
            </svg>
            <span>Radar Urbano</span>
          </div>

          <h1 className="login-titulo">
            {modo === 'entrar' ? (
              'Bem-vindo'
            ) : (
              <>
                <span className="fino">Crie sua</span> conta
              </>
            )}
          </h1>
          <p className="muted login-desc">
            {modo === 'entrar'
              ? 'Alertas de alagamento, calor e falta de serviços em São Paulo, com a origem e a confiança de cada dado.'
              : 'Receba alertas dos bairros que você acompanha. Seu nome nunca aparece nos relatos.'}
          </p>

          {modo === 'entrar' ? (
            <form className="form entry-stagger" onSubmit={entrar}>
              <div>
                <span className="rotulo-perfil">Entrar como (conta de demonstração)</span>
                <div className="segmentado perfis-seg" role="radiogroup" aria-label="Perfil">
                  {CONTAS.map(({ perfil: p, icone: I, rotulo }) => (
                    <button type="button" key={p} role="radio" aria-checked={perfil === p} className={perfil === p ? 'sel' : ''} onClick={() => setPerfil(p)}>
                      <I size={16} aria-hidden="true" /> {rotulo}
                    </button>
                  ))}
                </div>
                <small className="muted">{estado.usuarios[perfil].nome}</small>
              </div>

              <CampoVidro rotulo="E-mail">
                <input type="email" value={estado.usuarios[perfil].email} readOnly />
              </CampoVidro>

              <CampoVidro rotulo="Senha">
                <div className="vidro-senha">
                  <input type={verSenha ? 'text' : 'password'} value="demonstracao" readOnly />
                  <button type="button" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                    {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </CampoVidro>

              {perfil !== 'morador' && (
                <CampoVidro rotulo="Código de verificação (MFA)" ajuda="Agentes e operadores entram com segundo fator (RNF09).">
                  <input inputMode="numeric" value="482 913" readOnly />
                </CampoVidro>
              )}

              <div className="login-linha">
                <label className="check">
                  <input type="checkbox" defaultChecked />
                  <span>Manter conectado</span>
                </label>
                <button type="button" className="link-texto" onClick={() => avisar(`Enviamos um link de redefinição para ${estado.usuarios[perfil].email}`)}>
                  Esqueci minha senha
                </button>
              </div>

              <button type="submit" className="btn btn-primario btn-grande">
                Entrar
              </button>

              <p className="login-rodape">
                Ainda não tem conta?{' '}
                <button type="button" className="link-texto" onClick={() => setModo('cadastro')}>
                  Criar conta
                </button>
              </p>
            </form>
          ) : (
            <form className="form entry-stagger" onSubmit={cadastrar}>
              <CampoVidro rotulo="Nome">
                <input required value={cad.nome} onChange={(e) => setCad({ ...cad, nome: e.target.value })} placeholder="Como devemos te chamar" />
              </CampoVidro>
              <CampoVidro rotulo="E-mail">
                <input required type="email" value={cad.email} onChange={(e) => setCad({ ...cad, email: e.target.value })} placeholder="voce@exemplo.com" />
              </CampoVidro>
              <CampoVidro rotulo="Bairro onde mora">
                <select value={cad.bairro} onChange={(e) => setCad({ ...cad, bairro: e.target.value })}>
                  {Object.keys(BAIRROS).map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </CampoVidro>
              <fieldset className="consentimentos">
                <legend>Consentimento (LGPD)</legend>
                <label className="check">
                  <input type="checkbox" required checked={cad.termos} onChange={(e) => setCad({ ...cad, termos: e.target.checked })} />
                  <span>
                    <strong>Obrigatório:</strong> li a política de privacidade e autorizo o uso do e-mail e do bairro para enviar alertas.
                  </span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={cad.localizacao} onChange={(e) => setCad({ ...cad, localizacao: e.target.checked })} />
                  <span>Usar minha localização ao registrar ocorrências (opcional).</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={cad.analises} onChange={(e) => setCad({ ...cad, analises: e.target.checked })} />
                  <span>Usar meus relatos, anonimizados, em estatísticas da cidade (opcional).</span>
                </label>
              </fieldset>
              <button className="btn btn-primario btn-grande" type="submit" disabled={!cad.termos}>
                Criar conta e entrar
              </button>
              <p className="login-rodape">
                Já tem conta?{' '}
                <button type="button" className="link-texto" onClick={() => setModo('entrar')}>
                  Entrar
                </button>
              </p>
            </form>
          )}
        </div>
      </section>

      <section className="login-hero" aria-label="Mapa de riscos ativos em São Paulo">
        <div className="hero-cartao entry-right">
          <MapaEventos itens={itensMapa} altura="100%" zoom={11} popups={false} estatico />
          <div className="hero-veu" aria-hidden="true" />
          <div className="hero-texto">
            <span className="hero-ao-vivo">
              <span className="pulso" aria-hidden="true" /> {itensMapa.length} eventos ativos agora
            </span>
            <h2>Saiba do risco antes dele chegar até você.</h2>
          </div>
          <div className="hero-depoimentos">
            <span className="hero-legenda">Personas do projeto</span>
            <div className="hero-cards entry-stagger entry-late">
              {PERSONAS.map((p, i) => (
                <figure key={p.nome} className={`depoimento ${i === 1 ? 'so-xl' : ''} ${i === 2 ? 'so-2xl' : ''}`}>
                  <span className="depo-avatar" aria-hidden="true">
                    {p.iniciais}
                  </span>
                  <figcaption>
                    <strong>{p.nome}</strong>
                    <small>{p.papel}</small>
                    <q>{p.texto}</q>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
