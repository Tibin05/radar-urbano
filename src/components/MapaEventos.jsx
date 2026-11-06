import { useEffect, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { TIPOS } from '../domain/regras.js';
import { CONTORNO_RISCO, COR_RISCO, ConfiancaBadge, EstadoChip, Origens, RiscoBadge } from './ui.jsx';

const CENTRO_SP = [-23.56, -46.63];

// O evento é desenhado como ÁREA afetada (em metros), não como ponto exato:
// o raio vem da exposição da RN02 e evita apontar para a casa de alguém (RNF08).
export const RAIO_AREA_M = { 1: 200, 2: 600, 3: 1200 };
const ZOOM_SO_AREA = 14; // a partir deste zoom a área já é visível; o marcador de referência some

function Recentrar({ centro, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (centro) map.setView(centro, zoom ?? map.getZoom());
  }, [centro?.[0], centro?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Eventos({ onClique, onZoom }) {
  useMapEvents({
    click: (e) => onClique?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    zoomend: (e) => onZoom(e.target.getZoom()),
  });
  return null;
}

function Detalhe({ ev, av }) {
  return (
    <Popup>
      <div className="popup">
        <strong>{ev.titulo}</strong>
        <span className="popup-sub">
          {TIPOS[ev.tipo].rotulo} · {ev.bairro} · área aproximada de {RAIO_AREA_M[ev.exposicao] >= 1000 ? `${RAIO_AREA_M[ev.exposicao] / 1000} km` : `${RAIO_AREA_M[ev.exposicao]} m`}
        </span>
        <div className="linha-badges">
          <RiscoBadge nivel={av.nivel} />
          <ConfiancaBadge valor={av.conf} eventoId={ev.id} curto />
        </div>
        <Origens origens={av.origens} />
        <div className="popup-rodape">
          <EstadoChip estado={ev.estado} />
          <Link to={`/alertas/${ev.id}`}>Ver detalhe →</Link>
        </div>
      </div>
    </Popup>
  );
}

// itens: [{ ev, av }] já avaliados
export default function MapaEventos({ itens = [], altura = 480, centro, zoom = 11, pino, onClique, popups = true, estatico = false }) {
  const [zoomAtual, setZoomAtual] = useState(zoom);
  const mostrarMarcador = zoomAtual < ZOOM_SO_AREA;
  const interativo = !estatico;

  return (
    <div className="mapa" style={{ height: altura }}>
      <MapContainer
        center={centro ?? CENTRO_SP}
        zoom={zoom}
        scrollWheelZoom={interativo}
        dragging={interativo}
        zoomControl={interativo}
        doubleClickZoom={interativo}
        touchZoom={interativo}
        keyboard={interativo}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recentrar centro={centro} zoom={zoom} />
        <Eventos onClique={onClique} onZoom={setZoomAtual} />
        {itens.map(({ ev, av }) => {
          const cor = COR_RISCO[av.nivel];
          const incerto = av.faixa === 'Baixa';
          return (
            <Circle
              key={`area-${ev.id}`}
              center={[ev.lat, ev.lng]}
              radius={RAIO_AREA_M[ev.exposicao]}
              pathOptions={{ color: CONTORNO_RISCO[av.nivel], weight: 2, fillColor: cor, fillOpacity: incerto ? 0.12 : 0.24, dashArray: incerto ? '6 6' : null }}
            >
              {popups && <Detalhe ev={ev} av={av} />}
            </Circle>
          );
        })}
        {mostrarMarcador &&
          itens.map(({ ev, av }) => (
            <CircleMarker
              key={`ref-${ev.id}`}
              center={[ev.lat, ev.lng]}
              radius={6 + av.S / 2}
              pathOptions={{
                color: CONTORNO_RISCO[av.nivel],
                weight: 2,
                fillColor: COR_RISCO[av.nivel],
                fillOpacity: av.faixa === 'Baixa' ? 0.55 : 0.95,
                // Mesma convenção da área: tracejado = confiança baixa
                dashArray: av.faixa === 'Baixa' ? '3 3' : null,
              }}
            >
              {popups && <Detalhe ev={ev} av={av} />}
            </CircleMarker>
          ))}
        {pino && (
          <CircleMarker center={[pino.lat, pino.lng]} radius={9} pathOptions={{ color: '#0f4c81', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }} />
        )}
      </MapContainer>
    </div>
  );
}
