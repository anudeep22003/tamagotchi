from fastapi import APIRouter

from .ingestion import router as ingestion_router
from .push_code import router as push_code_router

router = APIRouter(prefix="/api")
router.include_router(ingestion_router)
router.include_router(push_code_router)
