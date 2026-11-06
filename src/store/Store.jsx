import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { criarEstadoInicial, VERSAO_DADOS } from '../data/mock.js';
import * as motor from '../domain/motor.js';

const CHAVE = 'radar-urbano';
const Ctx = createContext(null);

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo?.versao === VERSAO_DADOS) return salvo;
  } catch {
    /* sem armazenamento disponível: começa com os dados de demonstração */
  }
  const agora = Date.now();
  return motor.aplicarRegras(criarEstadoInicial(agora), agora);
}

function reducer(estado, acao) {
  const s = structuredClone(estado);
  const agora = Date.now();
  switch (acao.type) {
    case 'LOGIN':
      s.perfil = acao.perfil;
      if (acao.nome) s.usuarios[acao.perfil].nome = acao.nome;
      return s;
    case 'LOGOUT':
      s.perfil = null;
      return s;
    case 'TICK':
      return motor.tick(s, agora);
    case 'REGISTRAR':
      return motor.registrarRelato(s, acao.form, agora);
    case 'VOTAR':
      return motor.votar(s, acao.eventoId, acao.voto, agora);
    case 'AGENTE':
      return motor.acaoAgente(s, acao.eventoId, acao.acao, agora, acao.motivo);
    case 'INTERRUPCAO':
      return motor.registrarInterrupcao(s, acao.form, agora);
    case 'NORMALIZAR':
      return motor.normalizar(s, acao.eventoId, agora);
    case 'LER':
      for (const n of s.notificacoes[s.perfil]) if (acao.id === 'todas' || n.id === acao.id) n.lida = true;
      return s;
    case 'PREFS':
      s.prefs = acao.prefs;
      return s;
    case 'CONSENTIMENTO':
      s.consentimentos[acao.chave] = acao.valor;
      return s;
    case 'RESTAURAR':
      return motor.aplicarRegras(criarEstadoInicial(agora), agora);
    case 'DESFAZER':
      return acao.estado; // volta ao estado salvo antes da ação desfeita

    default:
      return estado;
  }
}

export function StoreProvider({ children }) {
  const [estado, dispatch] = useReducer(reducer, null, carregar);
  const [agora, setAgora] = useState(Date.now());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* armazenamento bloqueado: o app segue funcionando só nesta aba */
    }
  }, [estado]);

  // Relógio da interface (tempos relativos) e chegada simulada de novas leituras (RNF01)
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 5000);
    const leituras = setInterval(() => dispatch({ type: 'TICK' }), 15000);
    return () => {
      clearInterval(relogio);
      clearInterval(leituras);
    };
  }, []);

  // acao opcional: { rotulo, executar } — um aviso com ação (ex.: Desfazer) fica 10 s na tela
  const timer = useRef(null);
  const avisar = useCallback((msg, acao) => {
    clearTimeout(timer.current);
    setToast({ msg, acao });
    timer.current = setTimeout(() => setToast(null), acao ? 10000 : 3500);
  }, []);

  return <Ctx.Provider value={{ estado, dispatch, agora, toast, avisar }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
