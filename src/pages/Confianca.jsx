// T05 — Origem e nível de confiança do dado (RF01, RF02, RF04, RF05, RF09)
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { avaliar, ORIGENS, TIPOS } from '../domain/regras.js';
import { ConfiancaBadge, OrigemChip, PageHeader, Vazio } from '../components/ui.jsx';
import { dataHora, medida, tempoRelativo } from '../utils/format.js';

const sinal = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

function StatusDado({ d }) {
  if (!d.intervaloMin) return null;
  if (d.conf.desatualizado)
    return (
      <p className="status-dado aviso">
        <AlertTriangle size={15} aria-hidden="true" /> Desatualizado: passou de 2× o intervalo esperado
      </p>
    );
  if (d.atipico)
    return (
      <p className="status-dado aviso">
        <AlertTriangle size={15} aria-hidden="true" /> Chegou no prazo, mas a leitura é atípica
      </p>
    );
  return (
    <p className="status-dado ok">
      <CheckCircle2 size={15} aria-hidden="true" /> Atualizado dentro do intervalo
    </p>
  );
}

export default function Confianca() {
  const { id } = useParams();
  const { estado, agora } = useStore();
  const ev = estado.eventos.find((e) => e.id === id);
  if (!ev)
    return (
      <Vazio titulo="Evento não encontrado" texto="Ele pode ter sido removido ao restaurar os dados de demonstração.">
        <Link to="/alertas" className="btn btn-secundario">
          Ver alertas
        </Link>
      </Vazio>
    );
  const av = avaliar(ev, agora);
  const extras = av.origens.length - 1;
  // Ordena pela contribuição: o dado mais confiável primeiro
  const dados = [...av.dados].sort((a, b) => b.conf.valor - a.conf.valor);
  const idMaior = dados[0].id;

  return (
    <>
      <PageHeader voltar={`/alertas/${ev.id}`} titulo="Origem e confiança dos dados" subtitulo={`${ev.titulo} · ${ev.bairro}`} />

      <section className="card resumo-conf" aria-labelledby="titulo-resumo">
        <div className="resumo-numero">
          <h2 id="titulo-resumo" className="muted">
            Confiança do evento
          </h2>
          <strong className="conf-grande">{av.conf}</strong>
          <ConfiancaBadge valor={av.conf} soFaixa />
        </div>
        <div className="formula">
          <span>
            Maior confiança entre os dados: <strong>{av.maxC}</strong> <small className="muted">(destacado abaixo)</small>
          </span>
          <span>
            Origens independentes: <strong>{av.origens.length}</strong> ({av.origens.map((o) => ORIGENS[o].rotulo).join(', ')})
          </span>
          <code>
            C = mín(100, {av.maxC} + 10 × {extras}) = {av.conf}
          </code>
          <small className="muted">Regra RN01: o evento parte do dado mais confiável e ganha 10 pontos por origem independente a mais.</small>
          <ul className="faixas-linha" aria-label="Faixas de confiança">
            <li>
              <ConfiancaBadge valor={90} soFaixa /> 75 a 100 · confirmado automaticamente
            </li>
            <li>
              <ConfiancaBadge valor={60} soFaixa /> 50 a 74 · um agente confere
            </li>
            <li>
              <ConfiancaBadge valor={30} soFaixa /> 0 a 49 · aguarda outras fontes
            </li>
          </ul>
        </div>
      </section>

      <h2 className="secao-titulo">Dados do evento ({dados.length})</h2>
      <div className="grade-dados">
        {dados.map((d) => (
          <article key={d.id} className={`card dado-card ${d.id === idMaior ? 'dado-ref' : ''}`}>
            <header>
              <OrigemChip origem={d.origem} />
              <ConfiancaBadge valor={d.conf.valor} />
            </header>
            {(d.id === idMaior || d.id === av.ref?.id) && (
              <div className="marcas-ref">
                {d.id === idMaior && <span className="marca-ref">Maior confiança · entra na fórmula</span>}
                {d.id === av.ref?.id && <span className="marca-ref">Define a gravidade</span>}
              </div>
            )}
            <h3>{d.fonte}</h3>
            <p>{d.descricao}</p>
            <dl className="meta">
              {d.medida != null && (
                <div>
                  <dt>{TIPOS[ev.tipo].medidaRotulo}</dt>
                  <dd>{medida(ev.tipo, d.medida)}</dd>
                </div>
              )}
              <div>
                <dt>Recebido</dt>
                <dd>
                  {tempoRelativo(d.ts, agora)} <small className="muted">({dataHora(d.ts)})</small>
                </dd>
              </div>
              {d.intervaloMin && (
                <div>
                  <dt>Intervalo esperado</dt>
                  <dd>a cada {d.intervaloMin} min</dd>
                </div>
              )}
              {d.autor && (
                <div>
                  <dt>Autor</dt>
                  <dd>{d.autor} · identidade protegida</dd>
                </div>
              )}
            </dl>
            <StatusDado d={d} />
            <table className="tabela-calculo">
              <caption className="sr-only">Cálculo da confiança de {d.fonte}</caption>
              <tbody>
                <tr>
                  <td>Nota base · {ORIGENS[d.origem].rotulo}</td>
                  <td>{d.conf.base}</td>
                </tr>
                {d.conf.itens.map((i) => (
                  <tr key={i.rotulo} className={i.pontos > 0 ? 'pos' : 'neg'}>
                    <td>{i.rotulo}</td>
                    <td>{sinal(i.pontos)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Confiança do dado</td>
                  <td>{d.conf.valor}</td>
                </tr>
              </tbody>
            </table>
          </article>
        ))}
      </div>

      <section className="card">
        <h2>Nota base por origem</h2>
        <p className="muted">Cada dado começa com a nota da sua origem. Em destaque, as origens presentes neste evento.</p>
        <table className="tabela">
          <thead>
            <tr>
              <th scope="col">Origem</th>
              <th scope="col">Nota base</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ORIGENS).map(([k, o]) => (
              <tr key={k} className={av.origens.includes(k) ? 'destaque' : ''}>
                <td>
                  <OrigemChip origem={k} />
                </td>
                <td>{o.base}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
