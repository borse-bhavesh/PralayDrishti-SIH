"""
GeoData Router — serves local GeoJSON files as API responses.
"""
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings

router = APIRouter(prefix="/geodata", tags=["geodata"])

# Only allow safe filenames (letters, digits, hyphens, underscores)
_SAFE_NAME = re.compile(r"^[a-zA-Z0-9_-]+$")


def _read_geojson(name: str) -> dict:
    """Read a GeoJSON file from the data directory."""
    if not _SAFE_NAME.match(name):
        raise HTTPException(status_code=400, detail="Invalid layer name")

    filepath: Path = settings.DATA_DIR / f"{name}.geojson"

    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Layer '{name}' not found")

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/layers")
async def list_layers():
    """Return the names of all available GeoJSON layers."""
    if not settings.DATA_DIR.exists():
        return {"layers": []}

    layers = [
        p.stem
        for p in sorted(settings.DATA_DIR.glob("*.geojson"))
        if p.is_file()
    ]
    return {"layers": layers}


@router.get("/{layer_name}")
async def get_layer(layer_name: str):
    """Return the GeoJSON data for a specific layer."""
    return _read_geojson(layer_name)
