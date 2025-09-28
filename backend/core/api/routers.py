from fastapi import APIRouter

from .session import router as session_router

router = APIRouter(prefix="/api")
router.include_router(session_router)
