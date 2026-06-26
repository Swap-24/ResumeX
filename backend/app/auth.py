from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError  # pyrefly: ignore[missing-source-for-stubs]
import requests

from app.config import SUPABASE_JWT_SECRET, SUPABASE_URL
from dataclasses import dataclass
from typing import Optional

security = HTTPBearer(auto_error=False)

@dataclass
class AuthUser:
    id: str
    email: str
    role: str          # 'company' | 'candidate' — stored in user_metadata by trigger
    display_name: str


_JWKS_CACHE = None


def _decode_token(token: str) -> AuthUser:
    """
    Shared decode logic. Raises HTTPException on any failure.
    Called by both get_current_user and get_optional_user so neither
    calls a Depends-wired function directly (which confuses Pyright).
    """
    global _JWKS_CACHE
    import base64

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if alg == "ES256":
        if _JWKS_CACHE is None:
            try:
                jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
                res = requests.get(jwks_url, timeout=5)
                if res.status_code == 200:
                    _JWKS_CACHE = res.json()
            except Exception:
                pass

        jwk = None
        if _JWKS_CACHE and "keys" in _JWKS_CACHE:
            for k in _JWKS_CACHE["keys"]:
                if k.get("kid") == kid:
                    jwk = k
                    break

        if not jwk:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not find matching key in JWKS",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                token,
                jwk,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Legacy HS256/HS512 secret key validation
        secret = SUPABASE_JWT_SECRET
        try:
            # Supabase JWT secrets are typically base64-encoded HS256/HS512 keys.
            # We need to decode it to binary bytes for signature verification.
            missing_padding = len(secret) % 4
            if missing_padding:
                secret += '=' * (4 - missing_padding)
            decoded = base64.b64decode(secret)
            # Verify it decodes to binary bytes (typically 32 or 64 bytes)
            if len(decoded) in (32, 64):
                secret = decoded
        except Exception:
            secret = SUPABASE_JWT_SECRET

        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},   # Supabase JWTs use 'authenticated' as aud
            )
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user_id: str = payload.get("sub") or ""
    email: str = payload.get("email") or ""

    # Role is stored in user_metadata (set during signup via raw_user_meta_data)
    user_metadata: dict = payload.get("user_metadata") or {}
    app_metadata: dict = payload.get("app_metadata") or {}
    role: str = user_metadata.get("role") or app_metadata.get("role") or "candidate"
    display_name: str = user_metadata.get("display_name") or email

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    return AuthUser(id=user_id, email=email, role=role, display_name=display_name)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    """
    Decodes and validates the Supabase JWT. Raises 401 if missing or invalid.
    Use as a FastAPI dependency on protected routes.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_token(credentials.credentials)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthUser]:
    """
    Same as get_current_user but returns None instead of raising if no token.
    Use on routes that behave differently for authenticated vs. anonymous users.
    """
    if credentials is None:
        return None
    try:
        return _decode_token(credentials.credentials)
    except HTTPException:
        return None
