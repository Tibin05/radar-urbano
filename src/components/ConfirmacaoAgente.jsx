// Confirmação antes das ações irreversíveis do agente (RF13): emitir e descartar.
// Mostra o que vai acontecer, para quem e com qual mensagem, e avisa quando a confiança é baixa.
// O foco começa em Cancelar: a ação de maior impacto nunca fica a um Enter de distância.
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BAIRROS } from '../data/mock.js';
import { EMERGENCIA, ORIGENS, orientacao } from '../domain/regras.js';
import { num } from '../utils/format.js';

export const MOTIVOS = ['Relato sem correspondência no local', 'Relato duplicado', 'Dado de sensor com defeito'];

// O nome do botão diz o que acontece: em Alto/Crítico, confirmar já põe a emissão em andamento (RN03)
export const rotuloConfirmar = (nivel) =>
  nivel === 'Crítico' ? 'Confirmar (emite agora)' : nivel === 'Alto' ? 'Confirmar (emite em 10 min)' : 'Confirmar sem emitir';

// Devolve o foco ao botão que abriu a confirmação (ele volta a existir depois do cancelamento)
export const focarAbridor = (chave) => setTimeout(() => document.querySelector(`[data-abre="${chave}"]`)?.focus(), 0);

export default function ConfirmacaoAgente({ ev, av, acao, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const fecharComEsc = (e) => e.key === 'Escape' && onCancelar();
  const origens = av.origens.map((o) => ORIGENS[o].rotulo.toLowerCase()).join(', ');

  if (acao === 'emitir') {
    const inscritos = BAIRROS[ev.bairro]?.inscritos ?? 0;
    return (
      <div className="confirmacao" role="group" aria-labelledby={`conf-${ev.id}`} onKeyDown={fecharComEsc}>
        <strong id={`conf-${ev.id}`}>
          Emitir alerta para cerca de {num(inscritos)} inscritos em {ev.bairro}?
        </strong>
        <ul className="confirmacao-resumo">
          <li>Risco {av.nivel}</li>
          <li>
            Confiança {av.conf} ({av.faixa.toLowerCase()})
          </li>
          <li>
            {av.origens.length} {av.origens.length === 1 ? 'origem' : 'origens'}: {origens}
          </li>
        </ul>
        <figure className="previa-mensagem">
          <figcaption>Mensagem que a população vai receber</figcaption>
          <blockquote>
            <strong>
              Alerta {av.nivel}: {ev.titulo}
            </strong>
            <span>
              {orientacao(ev.tipo, av.nivel)} {EMERGENCIA}
            </span>
          </blockquote>
        </figure>
        {av.conf < 50 && (
          <p className="aviso-confirmacao">
            <AlertTriangle size={16} aria-hidden="true" />
            Confiança baixa. Se possível, espere outra fonte confirmar ou verifique no local: um alerta falso faz a população deixar de confiar nos avisos.
          </p>
        )}
        <div className="botoes">
          <button className={`btn ${av.conf < 50 ? 'btn-secundario' : 'btn-primario'}`} onClick={() => onConfirmar()}>
            Confirmar emissão
          </button>
          <button className="btn btn-fantasma" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Confirmar em risco Alto/Crítico já põe a emissão em andamento (RN03): o agente precisa saber disso antes
  if (acao === 'confirmar') {
    const prazo = av.nivel === 'Crítico' ? 'imediatamente' : 'em 10 minutos se ninguém agir';
    return (
      <div className="confirmacao" role="group" aria-labelledby={`confi-${ev.id}`} onKeyDown={fecharComEsc}>
        <strong id={`confi-${ev.id}`}>Confirmar “{ev.titulo}”?</strong>
        <p className="aviso-confirmacao">
          <AlertTriangle size={16} aria-hidden="true" />
          Com risco {av.nivel}, um evento confirmado é emitido automaticamente {prazo} (RN03), para cerca de {num(BAIRROS[ev.bairro]?.inscritos ?? 0)} inscritos.
        </p>
        <div className="botoes">
          <button className="btn btn-secundario" onClick={() => onConfirmar()}>
            Confirmar mesmo assim
          </button>
          <button className="btn btn-fantasma" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (acao === 'encerrar') {
    return (
      <div className="confirmacao" role="group" aria-labelledby={`enc-${ev.id}`} onKeyDown={fecharComEsc}>
        <strong id={`enc-${ev.id}`}>Encerrar “{ev.titulo}”?</strong>
        <p className="muted">
          Os moradores de {ev.bairro} deixam de ver o alerta como ativo. Você pode desfazer por 10 segundos.
        </p>
        <div className="botoes">
          <button className="btn btn-primario" onClick={() => onConfirmar()}>
            Encerrar evento
          </button>
          <button className="btn btn-fantasma" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmacao confirmacao-perigo" role="group" aria-labelledby={`desc-${ev.id}`} onKeyDown={fecharComEsc}>
      <strong id={`desc-${ev.id}`}>Descartar “{ev.titulo}”?</strong>
      <p className="muted">O evento sai do mapa e da fila. Você pode desfazer por 10 segundos.</p>
      <label className="campo">
        Motivo do descarte
        <select name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {MOTIVOS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="botoes">
        <button className="btn btn-perigo" onClick={() => onConfirmar(motivo)}>
          Confirmar descarte
        </button>
        <button className="btn btn-fantasma" onClick={onCancelar} autoFocus>
          Cancelar
        </button>
      </div>
    </div>
  );
}
