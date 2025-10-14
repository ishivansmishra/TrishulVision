from fastapi import APIRouter
from .router import router as main_router
from .google_auth import router as google_router
from .admin_router import router as admin_router

router = APIRouter()
router.include_router(main_router)
router.include_router(google_router)
router.include_router(admin_router)
