from fastapi import APIRouter, Depends
from app.auth import get_current_user, AuthUser
from app.database import supabase
from typing import cast, Any

router = APIRouter()

@router.get("/me")
def get_me(user: AuthUser = Depends(get_current_user)):
    """
    Returns the authenticated user's id, email, role, and display_name.
    The frontend calls this once after login to confirm identity.
    """
    # Also fetch display_name from profiles table as source of truth
    profile_res = supabase.table("profiles").select("display_name, role").eq("id", user.id).execute()
    if profile_res.data:
        profile = cast(dict[str, Any], profile_res.data[0])
        return {
            "id": user.id,
            "email": user.email,
            "role": profile.get("role") or user.role,
            "display_name": profile.get("display_name") or user.display_name,
        }
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "display_name": user.display_name,
    }
