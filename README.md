# Radar Urbano — Urban Risk Intelligence Platform

Protótipo funcional da Global Solution 2026.2 (Engenharia de Software · FIAP). A plataforma monitora alagamentos, ilhas de calor e interrupções de energia, água e transporte em São Paulo. Ela combina dados de sensores, bases públicas e relatos da comunidade, e mostra em todo dado **a origem e o nível de confiança**.

| Integrante | RM |
| --- | --- |
| Enzo Raddatz | RM556312 |
| Eric Perez Martinez Melillo Siciliano | RM558651 |
| Lucas Costa Sanson | RM556042 |

- **Protótipo (deploy):** _a preencher_
- **Documentação (requisitos, diagramas e arquitetura):** _a preencher (PDF)_
- **Vídeo de demonstração:** _a preencher_

## Como executar

Pré-requisito: [Node.js](https://nodejs.org) 18 ou superior.

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Para gerar a versão de produção: `npm run build` (saída em `dist/`).

Os dados são fictícios e ficam salvos só no navegador (localStorage). Para recomeçar a demonstração do zero, use **Privacidade e dados → Restaurar dados de demonstração**.

## Perfis de demonstração

Na tela de login, escolha uma das três contas. Depois de entrar, dá para trocar de perfil pelo seletor **Ver como**, no topo.

| Perfil | Persona | O que faz |
| --- | --- | --- |
| Morador | Ana Souza | Acompanha alertas, registra ocorrências, confirma ou contesta relatos |
| Agente da Defesa Civil | Carlos Mendes | Valida eventos, emite e encerra alertas, vê análises |
| Operador de serviço | Juliana Rocha | Registra interrupções com previsão de retorno e a normalização |

## Telas (12)

| Tela | Rota | Requisitos |
| --- | --- | --- |
| T01 Login e cadastro (consentimento LGPD) | `#/login` | RF18 |
| T02 Painel de acompanhamento (mapa) | `#/painel` | RF01, RF02, RF07, RF09 |
| T03 Lista de alertas | `#/alertas` | RF06, RF08, RF09 |
| T04 Detalhe do alerta | `#/alertas/:id` | RF06, RF08, RF09, RF14, RF16 |
| T05 Origem e confiança do dado | `#/eventos/:id/confianca` | RF01, RF02, RF04, RF05, RF09 |
| T06 Registro comunitário (3 passos) | `#/registrar` | RF03 |
| T07 Central de notificações | `#/notificacoes` | RF10, RF11 |
| T08 Preferências de notificação | `#/preferencias` | RF12 |
| T09 Fila de validação (agente) | `#/validacao` | RF04, RF13, RF14 |
| T10 Registro oficial de interrupção (operador) | `#/interrupcao` | RF15 |
| T11 Análises e indicadores | `#/analises` | RF17 |
| T12 Privacidade e meus dados | `#/privacidade` | RF18 |

## Fluxo principal (roteiro do vídeo)

1. Entre como **Ana (morador)**. O painel mostra os eventos ativos no mapa, coloridos por risco, com o selo de confiança.
2. **Registrar ocorrência** → Alagamento → "Acima do joelho" → **Usar minha localização**. O app avisa que existe um evento a menos de 500 m. Envie.
3. A tela de sucesso mostra o protocolo e a confiança do evento subindo de **80 para 90**. O relato foi agrupado com o sensor NV-114 (RF04, RN01).
4. Clique no selo de confiança para ver a tela **Origem e confiança**, com nota base, ajustes e fórmula.
5. Troque para **Carlos (agente)** → **Fila de validação**. O evento aparece no topo com prioridade **5,4** (S = 3 × 2 = 6, risco Alto) e contagem para a emissão automática.
6. Clique em **Emitir alerta**. Troque de volta para **Ana** → **Notificações**: o alerta chegou com as orientações e os canais usados.

## Como as regras foram implementadas

As regras de negócio do documento estão em [`src/domain/regras.js`](src/domain/regras.js) (cálculos puros) e [`src/domain/motor.js`](src/domain/motor.js) (ciclo de vida do evento):

- **RN01 – confiança:** nota base por origem (operador 90, base pública 85, sensor 80, comunidade 40) mais ajustes (foto, confirmações, reputação) e penalidades (contestações, leitura atípica, dado desatualizado). Evento = maior dado + 10 por origem independente a mais.
- **RN02 – risco:** severidade (1 a 4) × exposição (1 a 3) = S; Baixo 1–2, Moderado 3–5, Alto 6–8, Crítico 9–12.
- **RN03 – prioridade e emissão:** prioridade = S × C/100. Confiança ≥ 75 confirma sozinho; Crítico emite automaticamente; Alto sem ação do agente em 10 min também.
- **RN04 – destinatários:** bairros, tipos e nível mínimo das preferências; Crítico sempre chega.
- **RN05 – encerramento e dado desatualizado:** idade maior que 2× o intervalo da fonte gera penalidade; 6 h sem dados encerra o evento.

As transições seguem o Diagrama de Estados: Reportado → Em validação → Confirmado → Alerta emitido → Em monitoramento → Encerrado / Descartado.

## Tecnologias

React 18, Vite 5, React Router 6, Leaflet com mapas do OpenStreetMap, ícones Lucide. No protótipo, só a camada de apresentação é real; as camadas de aplicação e dados da arquitetura são simuladas no navegador, aplicando as mesmas regras.

## Estrutura

```
src/
  domain/      regras de negócio (RN01–RN05) e máquina de estados
  data/        dados fictícios de demonstração
  store/       estado global, persistência e chegada simulada de leituras
  components/  layout, mapa e componentes visuais (selos de risco e confiança)
  pages/       as 12 telas
```
