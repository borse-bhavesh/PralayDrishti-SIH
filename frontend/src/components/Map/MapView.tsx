import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { MAP_CONFIG, LAYERS, type LayerDef } from "../../config/mapConfig";
import type { GeoLayerState, SimulationResponse, RoutingResponse, CompareResponse, DecisionResponse } from "../../types";
import { RISK_COLORS } from "../../types";

/* ── Fix default marker icons (Leaflet + bundler issue) ─────────── */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ── Props ───────────────────────────────────────────────────────── */
interface MapViewProps {
  layers: GeoLayerState[];
  simulationData?: SimulationResponse | null;
  currentTimelineStep?: number;
  routingData?: RoutingResponse | null;
  comparisonData?: CompareResponse | null;
  decisionData?: DecisionResponse | null;
}

/* ── Fit‑bounds helper ───────────────────────────────────────────── */
function FitBounds({ data }: { data: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data || data.features.length === 0) return;
    const geoLayer = L.geoJSON(data as GeoJSON.GeoJsonObject);
    const bounds = geoLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [data, map]);
  return null;
}

/* ── Layer style helpers ─────────────────────────────────────────── */
function getLayerDef(id: string): LayerDef | undefined {
  return LAYERS.find((l) => l.id === id);
}

function getRoadSimResult(
  feature: Feature<Geometry>,
  simulationData?: SimulationResponse | null,
  currentTimelineStep?: number
) {
  if (!simulationData || currentTimelineStep === undefined) return null;
  
  // Extract road ID (matching backend logic: road_ + name)
  const name = feature.properties?.name || "";
  let roadId = "road_000"; // fallback
  if (name) {
    roadId = "road_" + name.toLowerCase().replace(/ /g, "_").replace(/–/g, "_").replace(/\//g, "_").substring(0, 40);
  }
  
  const roadSim = simulationData.roads.find((r) => r.road_id === roadId);
  if (!roadSim) return null;
  
  return roadSim.results.find((r) => r.time_minutes === currentTimelineStep);
}

function styleForFeature(
  feature: Feature<Geometry> | undefined,
  layerId: string,
  simulationData?: SimulationResponse | null,
  currentTimelineStep?: number,
  routingData?: RoutingResponse | null,
  comparisonData?: CompareResponse | null
) {
  const def = getLayerDef(layerId);
  const baseColor = def?.color ?? "#38bdf8";

  if (layerId === "catchment_boundary") {
    return {
      color: baseColor,
      weight: 2.5,
      fillColor: baseColor,
      fillOpacity: 0.08,
      dashArray: "8 4",
    };
  }
  if (layerId === "roads") {
    let roadId = "road_000";
    if (feature && feature.properties?.name) {
      roadId = "road_" + feature.properties.name.toLowerCase().replace(/ /g, "_").replace(/–/g, "_").replace(/\//g, "_").substring(0, 40);
    }

    let isRouteA = false;
    let isRouteB = false;

    if (routingData && routingData.route_found) {
      isRouteA = routingData.route_road_ids.includes(roadId);
    } else if (comparisonData) {
      isRouteA = comparisonData.scenario_a.route_found && comparisonData.scenario_a.route_road_ids.includes(roadId);
      isRouteB = comparisonData.scenario_b.route_found && comparisonData.scenario_b.route_road_ids.includes(roadId);
    }

    if (isRouteA && isRouteB) {
      return { color: "#a855f7", weight: 6, opacity: 1 }; // Purple for common
    } else if (isRouteB) {
      return { color: "#f97316", weight: 6, opacity: 1 }; // Orange for Scenario B
    } else if (isRouteA) {
      return { color: "#10b981", weight: 6, opacity: 1 }; // Bright green for normal route or Scenario A
    }

    const hasAnyRoute = !!(routingData || comparisonData);

    if (feature && simulationData) {
      const simResult = getRoadSimResult(feature, simulationData, currentTimelineStep);
      if (simResult) {
        return {
          color: RISK_COLORS[simResult.risk_level],
          weight: 4,
          opacity: hasAnyRoute ? 0.25 : 0.9,
        };
      }
    }
    return { color: baseColor, weight: 3, opacity: hasAnyRoute ? 0.15 : 0.85 };
  }
  // default
  return { color: baseColor, weight: 2, fillOpacity: 0.3 };
}

function pointToLayer(layerId: string) {
  const def = getLayerDef(layerId);
  const color = def?.color ?? "#10b981";

  return (_feature: Feature<Geometry>, latlng: L.LatLng) => {
    return L.circleMarker(latlng, {
      radius: layerId === "critical_infra" ? 8 : 7,
      fillColor: color,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });
  };
}

function getPopupContent(
  feature: Feature<Geometry>,
  layerId: string,
  simulationData?: SimulationResponse | null,
  currentTimelineStep?: number
) {
  if (!feature.properties) return "";
  const props = feature.properties;

  let rows = Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:3px 8px 3px 0;color:#94a3b8;font-weight:500;text-transform:capitalize">${k.replace(/_/g, " ")}</td>
          <td style="padding:3px 0;color:#f1f5f9">${v}</td>
        </tr>`
    )
    .join("");

  if (layerId === "roads" && simulationData) {
    const simResult = getRoadSimResult(feature, simulationData, currentTimelineStep);
    if (simResult) {
      rows += `
        <tr><td colspan="2"><hr style="border:none;border-top:1px solid rgba(148,163,184,0.2);margin:6px 0;" /></td></tr>
        <tr>
          <td style="padding:3px 8px 3px 0;color:#38bdf8;font-weight:600;">Simulated Depth</td>
          <td style="padding:3px 0;color:#f1f5f9;font-weight:600;">${simResult.water_depth_m.toFixed(2)} m</td>
        </tr>
        <tr>
          <td style="padding:3px 8px 3px 0;color:#38bdf8;font-weight:600;">Simulated Risk</td>
          <td style="padding:3px 0;color:${RISK_COLORS[simResult.risk_level]};font-weight:600;text-transform:capitalize;">${simResult.risk_level}</td>
        </tr>
      `;
    }
  }

  return `<table style="border-collapse:collapse;width:100%">${rows}</table>`;
}

function onEachFeatureWithSim(
  simulationData?: SimulationResponse | null,
  currentTimelineStep?: number,
  layerId?: string
) {
  return (feature: Feature<Geometry>, layer: L.Layer) => {
    if (!layerId) return;
    const content = getPopupContent(feature, layerId, simulationData, currentTimelineStep);
    layer.bindPopup(content, { maxWidth: 320 });
  };
}

/* ── Component ───────────────────────────────────────────────────── */
export function MapView({ layers, simulationData, currentTimelineStep, routingData, comparisonData, decisionData }: MapViewProps) {
  const catchmentData = useMemo(
    () => layers.find((l) => l.id === "catchment_boundary")?.data ?? null,
    [layers]
  );

  /* A unique key per GeoJSON data snapshot forces re-render on data change */
  const keyRef = useRef(0);

  return (
    <div className="map-container" style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer url={MAP_CONFIG.tileUrl} attribution={MAP_CONFIG.attribution} />

        <FitBounds data={catchmentData} />

        {layers
          .filter((l) => l.visible && l.data)
          .map((l) => {
            const hasPoints = l.data!.features.some(
              (f) => f.geometry.type === "Point" || f.geometry.type === "MultiPoint"
            );
            
            const routingKey = routingData ? `route-${routingData.routing_mode}` : comparisonData ? `compare` : "";
            const simKey = (l.id === "roads" && simulationData) ? `${simulationData.scenario}-${currentTimelineStep}-${routingKey}` : "";

            return (
              <GeoJSON
                key={`${l.id}-${++keyRef.current}-${simKey}`}
                data={l.data!}
                style={(feature) => styleForFeature(feature as Feature<Geometry>, l.id, simulationData, currentTimelineStep, routingData, comparisonData)}
                pointToLayer={hasPoints ? pointToLayer(l.id) : undefined}
                onEachFeature={onEachFeatureWithSim(simulationData, currentTimelineStep, l.id)}
              />
            );
          })}
        <RouteOverlays routingData={routingData} comparisonData={comparisonData} />
        <HotspotOverlays decisionData={decisionData} layers={layers} />
      </MapContainer>
    </div>
  );
}

import { Marker, Tooltip, CircleMarker } from "react-leaflet";

function RouteOverlays({ routingData, comparisonData }: { routingData?: RoutingResponse | null, comparisonData?: CompareResponse | null }) {
  if (!routingData && !comparisonData) return null;

  const renderRoute = (geom: any, type: "safe" | "dangerous" | "shared", label: string) => {
    if (!geom || !geom.features || geom.features.length === 0) return null;
    
    const isSafe = type === "safe";
    const isShared = type === "shared";
    const outerColor = isShared ? "#7e22ce" : isSafe ? "#065f46" : "#7f1d1d";
    const innerColor = isShared ? "#a855f7" : isSafe ? "#10b981" : "#ef4444";
    
    // Find a coordinate for the tooltip (e.g. middle of first feature)
    const firstCoords = geom.features[0].geometry.coordinates;
    const midPoint = firstCoords[Math.floor(firstCoords.length / 2)];
    const tooltipPos = L.latLng(midPoint[1], midPoint[0]);

    return (
      <div key={`route-${type}`}>
        {/* Outer outline */}
        <GeoJSON
          data={geom}
          style={{ color: outerColor, weight: 12, opacity: 0.8 }}
        />
        {/* Inner bright line */}
        <GeoJSON
          data={geom}
          style={{ color: innerColor, weight: 6, opacity: 1 }}
        />
        {label && (
          <Tooltip position={tooltipPos} permanent direction="top" className={`route-tooltip ${type}`}>
            <div style={{ background: "rgba(15, 23, 42, 0.9)", border: `1px solid ${innerColor}`, padding: "6px 10px", borderRadius: 8, color: innerColor, fontWeight: "bold", textAlign: "center", fontSize: 11, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)" }}>
              <div style={{ fontSize: 13, textTransform: "uppercase" }}>{label.split("—")[0]}</div>
              <div style={{ color: "#cbd5e1", fontWeight: "normal", marginTop: 2 }}>{label.split("—")[1]}</div>
            </div>
          </Tooltip>
        )}
      </div>
    );
  };

  const renderMarker = (geom: any, isStart: boolean) => {
    if (!geom || !geom.features || geom.features.length === 0) return null;
    const feature = isStart ? geom.features[0] : geom.features[geom.features.length - 1];
    const coords = feature.geometry.coordinates;
    const pt = isStart ? coords[0] : coords[coords.length - 1];
    const color = isStart ? "#10b981" : "#ef4444";
    
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    return (
      <Marker position={[pt[1], pt[0]]} icon={icon}>
        <Tooltip direction={isStart ? "right" : "left"} permanent className="marker-tooltip">
          <div style={{ background: "rgba(15,23,42,0.8)", padding: "4px 8px", borderRadius: 4, color, fontWeight: "bold", fontSize: 11, border: `1px solid ${color}` }}>
            {isStart ? "Start" : "Destination"}
          </div>
        </Tooltip>
      </Marker>
    );
  };

  if (routingData) {
    const isSafe = routingData.routing_mode === "safest";
    const label = isSafe ? "SAFE ROUTE — Longer but Lower Risk" : "DANGEROUS ROUTE — Shorter but Higher Risk";
    return (
      <>
        {renderRoute(routingData.route_geometry, isSafe ? "safe" : "dangerous", label)}
        {renderMarker(routingData.route_geometry, true)}
        {renderMarker(routingData.route_geometry, false)}
      </>
    );
  }

  if (comparisonData) {
    return (
      <>
        {renderRoute(comparisonData.scenario_a.route_geometry, "safe", "SCENARIO A — " + comparisonData.scenario_a.scenario)}
        {renderRoute(comparisonData.scenario_b.route_geometry, "dangerous", "SCENARIO B — " + comparisonData.scenario_b.scenario)}
        {renderMarker(comparisonData.scenario_a.route_geometry, true)}
        {renderMarker(comparisonData.scenario_a.route_geometry, false)}
      </>
    );
  }

  return null;
}

function HotspotOverlays({ decisionData, layers }: { decisionData?: DecisionResponse | null, layers: GeoLayerState[] }) {
  if (!decisionData || !decisionData.hotspots || decisionData.hotspots.length === 0) return null;

  const roadLayer = layers.find(l => l.id === "roads");
  if (!roadLayer || !roadLayer.data) return null;

  const topHotspots = decisionData.hotspots.filter(h => h.priority === "critical" || h.priority === "high").slice(0, 3);
  if (topHotspots.length === 0) return null;

  return (
    <>
      {topHotspots.map(hotspot => {
        const feature = roadLayer.data?.features.find(f => {
          const name = f.properties?.name || "";
          const rid = name ? "road_" + name.toLowerCase().replace(/ /g, "_").replace(/–/g, "_").replace(/\//g, "_").substring(0, 40) : "";
          return rid === hotspot.road_id;
        });

        if (!feature || feature.geometry.type !== "LineString" && feature.geometry.type !== "MultiLineString") return null;

        // Get rough midpoint
        const coords = feature.geometry.coordinates;
        let midPt;
        if (feature.geometry.type === "LineString") {
          midPt = coords[Math.floor(coords.length / 2)];
        } else {
          midPt = coords[0][Math.floor(coords[0].length / 2)];
        }

        const latLng = L.latLng((midPt as any)[1], (midPt as any)[0]);
        const color = RISK_COLORS[hotspot.risk_level] || "#f43f5e";

        return (
          <div key={`hotspot-${hotspot.road_id}`}>
            <CircleMarker 
              center={latLng} 
              radius={24} 
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "4 4",
                className: "hotspot-pulse"
              }}
            />
            <CircleMarker 
              center={latLng} 
              radius={6} 
              pathOptions={{
                color: "#fff",
                fillColor: color,
                fillOpacity: 1,
                weight: 2
              }}
            >
              <Tooltip direction="top" permanent className="hotspot-tooltip">
                <div style={{ background: "rgba(15,23,42,0.9)", border: `1px solid ${color}`, padding: "6px 8px", borderRadius: 8, textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", textTransform: "uppercase", marginBottom: 2 }}>
                    {hotspot.road_name}
                  </div>
                  <div style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: "uppercase" }}>
                    {hotspot.risk_level} • {hotspot.water_depth_m.toFixed(2)}m
                  </div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>
                    T+{hotspot.arrival_time_minutes} min
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          </div>
        );
      })}
    </>
  );
}
