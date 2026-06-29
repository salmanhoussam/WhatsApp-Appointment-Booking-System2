"""
app/core/exceptions.py
Domain exceptions for the Hotel/Chalet SaaS platform.

Services MUST raise these — never HTTPException directly.
The global handler in handlers.py converts them to a consistent JSON envelope:
    { "success": false, "error": { "code": "...", "message": "..." } }

Usage:
    from app.core.exceptions import NotFoundError, BookingConflictError, AuthError

    raise NotFoundError("Unit", unit_id)
    raise BookingConflictError("Unit is already booked for the selected dates.")
    raise AuthError("Invalid credentials.")
    raise BusinessLogicError("Check-out date must be after check-in date.")
    raise ConfigurationError("WhatsApp credentials are not configured.")
"""


class AppException(Exception):
    """
    Base domain exception. All custom exceptions extend this.
    Never raise this directly — use a specific subclass.
    """
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, error_code: str | None = None):
        self.message = message
        if error_code:
            self.error_code = error_code
        super().__init__(message)


class NotFoundError(AppException):
    """Resource was not found (HTTP 404)."""
    status_code = 404
    error_code = "NOT_FOUND"

    def __init__(self, resource: str, identifier: str | None = None):
        msg = f"{resource} '{identifier}' not found." if identifier else f"{resource} not found."
        super().__init__(msg)


class ConflictError(AppException):
    """Duplicate / already-exists conflict (HTTP 409)."""
    status_code = 409
    error_code = "CONFLICT"

    def __init__(self, message: str):
        super().__init__(message)


class BookingConflictError(AppException):
    """Unit is unavailable for the requested dates (HTTP 409)."""
    status_code = 409
    error_code = "BOOKING_CONFLICT"

    def __init__(self, message: str = "This unit is already booked for the selected dates."):
        super().__init__(message)


class AuthError(AppException):
    """Authentication or authorization failure (HTTP 401)."""
    status_code = 401
    error_code = "UNAUTHORIZED"

    def __init__(self, message: str = "Authentication failed."):
        super().__init__(message)


class ForbiddenError(AppException):
    """Access denied to a resource (HTTP 403)."""
    status_code = 403
    error_code = "FORBIDDEN"

    def __init__(self, message: str = "Access denied."):
        super().__init__(message)


class BusinessLogicError(AppException):
    """
    Business rule violation (HTTP 400).
    Use for invalid date ranges, capacity checks, state transitions, etc.
    """
    status_code = 400
    error_code = "BUSINESS_RULE_VIOLATION"

    def __init__(self, message: str):
        super().__init__(message)


class ConfigurationError(AppException):
    """
    Tenant mis-configuration that blocks an operation (HTTP 422).
    Example: WhatsApp phone not set, missing payment gateway credentials.
    """
    status_code = 422
    error_code = "CONFIGURATION_ERROR"

    def __init__(self, message: str):
        super().__init__(message)


class TenantNotFoundError(NotFoundError):
    """Alias for a missing tenant (HTTP 404)."""
    error_code = "TENANT_NOT_FOUND"

    def __init__(self, slug: str):
        super().__init__("Tenant", slug)
