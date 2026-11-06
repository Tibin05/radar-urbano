import { Navigate, Route, Routes } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useStore } from './store/Store.jsx';
import Layout, { PERFIS } from './components/Layout.jsx';
import { Vazio } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Painel from './pages/Painel.jsx';
import Alertas from './pages/Alertas.jsx';
import AlertaDetalhe from './pages/AlertaDetalhe.jsx';
import Confianca from './pages/Confianca.jsx';
import Registrar from './pages/Registrar.jsx';
import Notificacoes from './pages/Notificacoes.jsx';
import Preferencias from './pages/Preferencias.jsx';
import Validacao from './pages/Validacao.jsx';
import Interrupcao from './pages/Interrupcao.jsx';
import Analises from './pages/Analises.jsx';
import Privacidade from './pages/Privacidade.jsx';

function Restrito({ perfis, children }) {
  const { estado } = useStore();
  if (perfis.includes(estado.perfil)) return children;
  return (
    <Vazio
      icone={Lock}
      titulo="Tela restrita"
      texto={`Disponível para: ${perfis.map((p) => PERFIS[p]).join(' e ')}. Troque o perfil em “Ver como”, no topo.`}
    />
  );
}

function Protegido() {
  const { estado } = useStore();
  return estado.perfil ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protegido />}>
        <Route path="/painel" element={<Painel />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/alertas/:id" element={<AlertaDetalhe />} />
        <Route path="/eventos/:id/confianca" element={<Confianca />} />
        <Route path="/registrar" element={<Restrito perfis={['morador']}><Registrar /></Restrito>} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/preferencias" element={<Preferencias />} />
        <Route path="/validacao" element={<Restrito perfis={['agente']}><Validacao /></Restrito>} />
        <Route path="/interrupcao" element={<Restrito perfis={['operador']}><Interrupcao /></Restrito>} />
        <Route path="/analises" element={<Restrito perfis={['agente', 'operador']}><Analises /></Restrito>} />
        <Route path="/privacidade" element={<Privacidade />} />
      </Route>
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
}
