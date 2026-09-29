/**
 * Map configuration — change these values to point at a different pilot catchment.
 */
export const MAP_CONFIG = {
  /** Map center coordinates [lat, lng] */
  center: [19.08, 72.89] as [number, number],

  /** Initial zoom level */
  zoom: 13,

  /** Min / Max zoom */
  minZoom: 10,
  maxZoom: 18,

  /** Tile layer URL template (OpenStreetMap) */
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

  /** Tile attribution */
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/**
 * Layer definitions — IDs must match the GeoJSON filenames in backend/data/
 */
export interface LayerDef {
  id: string;
  label: string;
  color: string;
  icon?: string;
  defaultVisible: boolean;
}

export const LAYERS: LayerDef[] = [
  {
    id: "catchment_boundary",
    label: "Catchment Boundary",
    color: "#38bdf8",
    defaultVisible: true,
  },
  {
    id: "roads",
    label: "Major Roads",
    color: "#f59e0b",
    defaultVisible: true,
  },
  {
    id: "drainage_nodes",
    label: "Drainage Nodes",
    color: "#10b981",
    defaultVisible: true,
  },
  {
    id: "critical_infra",
    label: "Critical Infrastructure",
    color: "#f43f5e",
    defaultVisible: true,
  },
];
