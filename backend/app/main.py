"""
PralayDrishti — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import geodata
from app.routers import simulation
from app.routers import routing
from app.routers import decision

# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_TITLE,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(geodata.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(routing.router)
app.include_router(decision.router, prefix="/api")


# ── Health check ─────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
    }
