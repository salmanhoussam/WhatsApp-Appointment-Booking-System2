"""
Entrypoint for the Salman Local AI Agent (Phase 1).

Runs on its own port (default 8010), completely separate from the main
SalmanSaaS backend — this is a standalone product, not part of that server.

Usage:
    python main.py
"""

import uvicorn

from config import settings

if __name__ == "__main__":
    uvicorn.run("app.main_app:app", host=settings.HOST, port=settings.PORT, reload=False)
