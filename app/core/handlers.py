"""
app/core/handlers.py
Global FastAPI exception handlers — registered in main.py via register_handlers().

ALL errors return a consistent JSON envelope:
    {
        "success": false,
        "error": {
            "code":    "NOT_FOUND",
            "message": "Unit '...' not found.",
            "details": []          // populated for validation errors only
        }
    }

Stack traces NEVER reach the client.
"""

import logging
import traceback

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


def _error_envelope(code: str, message: str, details: list | None = None) -> dict:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
        },
    }


def register_handlers(app: FastAPI) -> None:
    """Attach all global exception handlers to the FastAPI application."""

    # ── 1. Domain exceptions (services raise these) ──────────────────────────
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning(
            "AppException [%s] %s — %s %s",
            exc.error_code,
            exc.message,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_envelope(exc.error_code, exc.message),
        )

    # ── 2. Pydantic validation errors (human-readable) ───────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = []
        for error in exc.errors():
            field_path = " → ".join(str(p) for p in error.get("loc", []))
            details.append({
                "field": field_path,
                "message": error.get("msg", "Validation error"),
                "type": error.get("type", ""),
            })

        if len(details) == 1:
            summary = f"Validation error on '{details[0]['field']}': {details[0]['message']}"
        else:
            summary = f"{len(details)} validation error(s). See 'details' for the full list."

        logger.info(
            "ValidationError — %s %s — %d field(s)",
            request.method,
            request.url.path,
            len(details),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_envelope("VALIDATION_ERROR", summary, details),
        )

    # ── 3. Starlette / FastAPI HTTPException (preserve status code) ───────────
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE",
        }.get(exc.status_code, "HTTP_ERROR")

        logger.info(
            "HTTPException [%d %s] — %s %s",
            exc.status_code,
            code,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_envelope(code, str(exc.detail)),
        )

    # ── 4. Catch-all — unhandled 500s (never leak stack traces) ─────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(
            "UNHANDLED EXCEPTION — %s %s\n%s",
            request.method,
            request.url.path,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_envelope(
                "INTERNAL_ERROR",
                "An unexpected error occurred. Our team has been notified.",
            ),
        )
