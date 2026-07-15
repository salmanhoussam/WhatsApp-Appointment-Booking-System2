from fastapi import FastAPI

from app.routes import router

app = FastAPI(
    title="Salman Local AI Agent",
    description="Phase 1 proof of concept — local-only agent talking to a local database.",
    version="0.1.0",
)
app.include_router(router)
