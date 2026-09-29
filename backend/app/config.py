"""
PralayDrishti Backend Configuration
"""
import os
from pathlib import Path


class Settings:
    """Application settings — all configurable via environment variables."""

    APP_TITLE: str = "PralayDrishti API"
    APP_DESCRIPTION: str = "Urban Flood Nowcasting Backend"
    APP_VERSION: str = "0.1.0"

    # Server
    HOST: str = os.getenv("PRALAY_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", os.getenv("PRALAY_PORT", "8000")))

    # Data directory (GeoJSON files live here)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"

    # CORS — allowed origins (Vite dev server by default)
    _cors_env = os.getenv("PRALAY_CORS_ORIGINS")
    if _cors_env:
        CORS_ORIGINS: list[str] = [x.strip() for x in _cors_env.split(",") if x.strip()]
    else:
        CORS_ORIGINS: list[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]


settings = Settings()
