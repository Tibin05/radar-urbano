import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  List,
  Lock,
  LogOut,
  Map as MapIcon,
  Menu,
  PlusCircle,
  Settings,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { tempoRelativo } from '../utils/format.js';

export const PERFIS = {
  morador: 'Morador',
  agente: 'Agente da Defesa Civil',
  operador: 'Operador de serviço',
};

export const NAV = [
  { to: '/painel', rotulo: 'Painel', icone: MapIcon },
  { to: '/alertas', rotulo: 'Alertas', icone: List },
  { to: '/registrar', rotulo: 'Registrar ocorrência', icone: PlusCircle, perfis: ['morador'] },
  { to: '/validacao', rotulo: 'Fila de validação', icone: ClipboardCheck, perfis: ['agente'] },
  { to: '/interrupcao', rotulo: 'Registrar interrupção', icone: Wrench, perfis: ['operador'] },
  { to: '/notificacoes', rotulo: 'Notificações', icone: Bell, contador: true },
  { to: '/analises', rotulo: 'Análises', icone: BarChart3, perfis: ['agente', 'operador'] },
  { to: '/preferencias', rotulo: 'Preferências', icone: Settings },
  { to: '/privacidade', rotulo: 'Privacidade e dados', icone: Lock },
];

function Marca() {
  return (
    <div className="marca">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f4c81" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="16" cy="16" r="4" fill="#f97316" />
      </svg>
      <span>Radar Urbano</span>
    </div>
  );
}

export default function Layout() {
  const { estado, dispatch, agora, toast, avisar } = useStore();
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const local = useLocation();
  const perfil = estado.perfil;
  const usuario = estado.usuarios[perfil];
  const naoLidas = estado.notificacoes[perfil].filter((n) => !n.lida).length;
  const itens = NAV.filter((i) => !i.perfis || i.perfis.includes(perfil));

  // Cada tela nova abre do topo (antes herdava a rolagem da tela anterior)
  useEffect(() => {
    setMenuAberto(false);
    window.scrollTo(0, 0);
  }, [local.pathname]);

  const nav = (
    <nav className="nav" aria-label="Principal">
      {itens.map(({ to, rotulo, icone: I, contador }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'ativo' : ''}`}>
          <I size={18} aria-hidden="true" />
          <span>{rotulo}</span>
          {contador && naoLidas > 0 && <span className="contador">{naoLidas}</span>}
        </NavLink>
      ))}
    </nav>
  );

  const rodape = (
    <div className="lateral-rodape">
      <div className="usuario">
        <span className="avatar" aria-hidden="true">
          {usuario.nome
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </span>
        <span>
          <strong>{usuario.nome}</strong>
          <small>{PERFIS[perfil]}</small>
        </span>
      </div>
      <button
        className="btn btn-fantasma btn-bloco"
        onClick={() => {
          dispatch({ type: 'LOGOUT' });
          navigate('/login');
        }}
      >
        <LogOut size={16} aria-hidden="true" /> Sair
      </button>
    </div>
  );

  return (
    <div className="app">
      <aside className="lateral">
        <Marca />
        {nav}
        {rodape}
      </aside>

      {menuAberto && (
        <div className="gaveta-fundo" onClick={() => setMenuAberto(false)}>
          <aside className="lateral gaveta" onClick={(e) => e.stopPropagation()}>
            <div className="gaveta-topo">
              <Marca />
              <button className="btn-icone" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
                <X size={20} />
              </button>
            </div>
            {nav}
            {rodape}
          </aside>
        </div>
      )}

      <div className="principal">
        <header className="topo">
          <button className="btn-icone so-mobile" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
            <Menu size={20} />
          </button>
          <span className="so-mobile topo-marca">
            <Marca />
          </span>
          <span className="sync" title="Tempo desde a última leitura recebida das fontes automáticas (RNF01)">
            <span className="pulso" aria-hidden="true" />
            Dados atualizados {tempoRelativo(estado.ultimaSync, agora)}
          </span>
          <span className="pill-demo">Dados simulados</span>
          <div className="topo-direita">
            <label className="ver-como">
              <span>Ver como</span>
              <select
                name="perfil"
                value={perfil}
                onChange={(e) => {
                  dispatch({ type: 'LOGIN', perfil: e.target.value });
                  navigate('/painel');
                }}
              >
                {Object.entries(PERFIS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <NavLink to="/notificacoes" className="sino" aria-label={`Notificações: ${naoLidas} ${naoLidas === 1 ? 'não lida' : 'não lidas'}`}>
              <Bell size={20} />
              {naoLidas > 0 && <span className="contador">{naoLidas}</span>}
            </NavLink>
          </div>
        </header>
        <main className="conteudo">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.acao && (
            <button
              className="toast-acao"
              onClick={() => {
                toast.acao.executar();
                avisar('Ação desfeita');
              }}
            >
              {toast.acao.rotulo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
