from typing import Optional

from pydantic import BaseModel


class SetupRequest(BaseModel):
    context: Optional[str] = None


class SetupResponse(BaseModel):
    plugin: str
    tables_created: list[str]
    context_received: Optional[str] = None


class CommandRequest(BaseModel):
    text: str


class CommandResponse(BaseModel):
    reply: str
