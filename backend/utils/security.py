import secrets

from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

from utils.config import settings

admin_api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def verify_admin_key(api_key: str | None = Security(admin_api_key_header)) -> str:
    if not api_key or not secrets.compare_digest(api_key, settings.admin_api_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return api_key
