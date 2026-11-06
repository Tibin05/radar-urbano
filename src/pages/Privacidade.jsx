// T12 — Privacidade e meus dados (RF18, RNF08, RNF09)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Lock, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { PageHeader, Toggle } from '../components/ui.jsx';

const COLETA = [
  { dado: 'Nome e e-mail', finalidade: 'Identificar a conta e enviar alertas por e-mail', retencao: 'Enquanto a conta existir' },
  { dado: 'Bairros acompanhados', finalidade: 'Decidir quais alertas você recebe (RN04)', retencao: 'Enquanto a conta existir' },
  { dado: 'Localização do relato', finalidade: 'Posicionar a ocorrência no mapa, arredondada a ~100 m', retencao: 'Anonimizada após 90 dias' },
  { dado: 'Foto do relato', finalidade: 'Aumentar a confiança do relato', retencao: 'Excluída após 90 dias' },
];

export default function Privacidade() {
  const { estado, dispatch, avisar } = useStore();
  const navigate = useNavigate();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const c = estado.consentimentos;
  const u = estado.usuarios[estado.perfil];
  const set = (chave) => (valor) => dispatch({ type: 'CONSENTIMENTO', chave, valor });

  const exportar = () => {
    const meus = {
      exportadoEm: new Date().toISOString(),
      conta: u,
      preferencias: estado.prefs,
      consentimentos: c,
      relatos: estado.meusRelatos,
      notificacoes: estado.notificacoes[estado.perfil],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(meus, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus-dados-radar-urbano.json';
    a.click();
    URL.revokeObjectURL(url);
    avisar('Arquivo com seus dados baixado');
  };

  return (
    <>
      <PageHeader titulo="Privacidade e meus dados" subtitulo="Você controla o que coletamos. Seus direitos seguem a LGPD (Lei 13.709/2018)." />

      <div className="grade-2">
        <section className="card">
          <h2>Consentimentos</h2>
          <div className="lista-toggles">
            <Toggle rotulo="Essencial" descricao="E-mail e bairro para enviar alertas. Necessário para usar a conta." checked={c.essencial} disabled onChange={() => {}} />
            <Toggle rotulo="Localização ao registrar" descricao="Usada só no momento do relato" checked={c.localizacao} onChange={set('localizacao')} />
            <Toggle rotulo="Receber notificações" descricao="Push, e-mail ou SMS conforme as preferências" checked={c.notificacoes} onChange={set('notificacoes')} />
            <Toggle rotulo="Estatísticas anonimizadas" descricao="Seus relatos, sem identificação, nas análises da cidade" checked={c.analises} onChange={set('analises')} />
          </div>
        </section>

        <section className="card">
          <h2>Como você aparece</h2>
          <div className="identidade">
            <Lock size={20} aria-hidden="true" />
            <div>
              <strong>{estado.usuarios.morador.pseudonimo}</strong>
              <p className="muted">
                É o único identificador mostrado nos seus relatos. Nome e contato ficam em um cofre separado, criptografado, que só o módulo de privacidade lê.
              </p>
            </div>
          </div>
          <h3>Seus direitos</h3>
          <div className="botoes coluna-botoes">
            <button className="btn btn-secundario" onClick={exportar}>
              <Download size={16} aria-hidden="true" /> Exportar meus dados (JSON)
            </button>
            {!confirmarExclusao ? (
              <button className="btn btn-perigo-leve" onClick={() => setConfirmarExclusao(true)}>
                <Trash2 size={16} aria-hidden="true" /> Excluir minha conta
              </button>
            ) : (
              <div className="confirmar">
                <p>
                  Isso apaga conta, preferências e relatos. Pelo RNF09 a exclusão é concluída em até 15 dias. <strong>Confirma?</strong>
                </p>
                <div className="botoes">
                  <button
                    className="btn btn-perigo"
                    onClick={() => {
                      dispatch({ type: 'RESTAURAR' });
                      navigate('/login');
                    }}
                  >
                    Sim, excluir
                  </button>
                  <button className="btn btn-fantasma" onClick={() => setConfirmarExclusao(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <h2>O que coletamos e por quê</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Dado</th>
                <th>Finalidade</th>
                <th>Retenção</th>
              </tr>
            </thead>
            <tbody>
              {COLETA.map((l) => (
                <tr key={l.dado}>
                  <td>{l.dado}</td>
                  <td>{l.finalidade}</td>
                  <td>{l.retencao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card demo">
        <div>
          <strong>Protótipo de demonstração</strong>
          <p className="muted">Todos os dados são fictícios e ficam só neste navegador. Restaure para recomeçar a demonstração do zero.</p>
        </div>
        <button
          className="btn btn-secundario"
          onClick={() => {
            dispatch({ type: 'RESTAURAR' });
            navigate('/login');
          }}
        >
          <RotateCcw size={16} aria-hidden="true" /> Restaurar dados de demonstração
        </button>
      </section>
    </>
  );
}
