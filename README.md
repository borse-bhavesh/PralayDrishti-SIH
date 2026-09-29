# 🌊 PralayDrishti — Urban Flood Nowcasting

Real-time urban flood monitoring and nowcasting dashboard prototype. Built for the Smart India Hackathon (SIH).

## Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | React + TypeScript + Vite + Tailwind v4 |
| Map      | Leaflet + React-Leaflet + OpenStreetMap |
| Backend  | Python FastAPI + Uvicorn               |
| Data     | Local GeoJSON files                    |

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **pip**

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API will be available at `http://localhost:8000`.  
Health check: `http://localhost:8000/api/health`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> The Vite dev server proxies `/api` requests to `http://localhost:8000` automatically.

## Project Structure

```
PralayDrishti SIH/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings
│   │   └── routers/
│   │       └── geodata.py       # GeoJSON API endpoints
│   ├── data/                    # GeoJSON data files
│   │   ├── catchment_boundary.geojson
│   │   ├── roads.geojson
│   │   ├── drainage_nodes.geojson
│   │   └── critical_infra.geojson
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/             # MapView, MapLegend
│   │   │   ├── Sidebar/         # Sidebar, LayerControl, SystemStatus
│   │   │   └── Dashboard/       # Header
│   │   ├── config/mapConfig.ts  # Map center, zoom, layers
│   │   ├── hooks/useGeoData.ts  # Data fetching hook
│   │   ├── types/index.ts       # TypeScript types
│   │   └── App.tsx              # Root component
│   └── vite.config.ts
└── README.md
```

## API Endpoints

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| GET    | `/api/health`               | Health check                       |
| GET    | `/api/geodata/layers`       | List available GeoJSON layer names |
| GET    | `/api/geodata/{layer_name}` | Get GeoJSON data for a layer       |

## Configuring the Pilot Catchment

The default pilot area is **Mumbai (Mithi River Catchment)**. To change it:

1. Update `frontend/src/config/mapConfig.ts` — change `center` coordinates and `zoom`.
2. Replace the GeoJSON files in `backend/data/` with your own data.

## Features (Prototype)

- ✅ Interactive Leaflet map with OpenStreetMap tiles
- ✅ GeoJSON layers: catchment boundary, roads, drainage nodes, critical infrastructure
- ✅ Collapsible sidebar with layer toggles
- ✅ System status monitoring (API health, data status)
- ✅ Dark theme with glassmorphism design
- ✅ Feature popups with metadata on click
- ✅ Live clock and responsive layout
- ✅ **Simplified Flood Simulation Engine** (Scenario-based modeling)
- ✅ **Flood-Aware Routing & What-If Scenario Comparison** (Shortest, Safest, Emergency)

## Flood Simulation (Prototype)

> **IMPORTANT**: This is a simplified prototype simulation. It is NOT a production hydraulic model. Results are purely illustrative and scenario-based to demonstrate the dashboard's capabilities.

The backend exposes a simulation endpoint that generates time-series flood depth and risk data for road segments based on simple deterministic models.

### Supported Scenarios
- `normal`: Baseline drainage behavior.
- `blocked_drain`: Simulates partially blocked drains (slower runoff).
- `pump_failure`: Simulates offline pump stations (reduced capacity).
- `extreme_rainfall`: Amplifies rainfall accumulation.

### API Request Example

\`POST /api/simulation/run\`
```json
{
  "rainfall_intensity_mm_hr": 80,
  "duration_minutes": 180,
  "drainage_condition": 0.7,
  "scenario": "blocked_drain"
}
```

### API Response Example

```json
{
  "status": "simulated",
  "scenario": "blocked_drain",
  "rainfall_intensity_mm_hr": 80,
  "duration_minutes": 180,
  "drainage_condition": 0.7,
  "time_steps": [0, 30, 60, 90, 120, 150, 180],
  "roads": [
    {
      "road_id": "road_example",
      "name": "Example Road",
      "results": [
        {
          "time_minutes": 60,
          "water_depth_m": 0.128,
          "risk_level": "moderate",
          "arrival_time_minutes": 60
        }
      ]
    }
  ],
  "disclaimer": "These results are SIMULATED using a simplified illustrative model..."
}
```

### Known Limitations
- The simulation does not perform real hydrodynamic routing.
- Elevation effects are approximated.
- Water does not dynamically flow from one road to another.

## Phase 3: Flood-Aware Routing (Prototype)

The prototype includes a **fully-connected demonstration road network** within the Mithi catchment to demonstrate shortest versus safest path tradeoffs.

### Network Topology
The `roads.geojson` provides a segmented network of arterial roads and highways (`jvlr_west`, `weh_mid`, `ak_road`, etc.) that share perfectly aligned endpoints. This allows the backend to build a connected graph using a ~100m Haversine snapping tolerance.

### Routing Features
- **Shortest Route**: Disregards flood conditions. Often results in a shorter path but may pass directly through severe waterlogging. Rendered prominently in Red/Orange.
- **Safest Route**: Avoids high-risk roads by applying risk penalties. Rendered in bright Green with detailed callouts.
- **Scenario Comparison**: Visually compares two simulations simultaneously, color-coding shared and unique paths (Green, Red, Purple) to demonstrate how changing rainfall affects the optimal route.
- **Backend Metrics**: The backend serves as the single source of truth, returning calculated metrics such as `maximum_water_depth_m`, `high_risk_roads_included`, and `high_risk_roads_avoided`, and dynamically generating `route_geometry` for the frontend to render.
- **Timeline-Aware**: Routing is directly tied to the simulation timeline. Adjusting the time step correctly marks the active route as outdated until recalculated.

> **IMPORTANT**: The routing engine is a prototype demonstration tool. Do not claim or use these routes for actual emergency dispatch operations without integration into production hydrodynamic and traffic models.

## Roadmap & Future Improvements

- 🔲 **Production Hydraulic Modeling**: Integration with SWMM or HEC-RAS.
- 🔲 **Topographical Analysis**: DEM-based surface flow modeling.
- 🔲 **Real-time Sensors**: Integration with IoT water level sensors.
- 🔲 **Weather Data**: Real rainfall data (IMD / OpenWeatherMap).
- 🔲 **ML Forecasting**: Machine learning models for predictive nowcasting.
- 🔲 Alert & notification system (SMS/Email routing).
- 🔲 Historical flood data analysis and reporting.

## License

This project is developed for the Smart India Hackathon (SIH). All rights reserved.
