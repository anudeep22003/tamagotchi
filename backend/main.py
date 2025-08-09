from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.api.routers import router

app = FastAPI(title="Your AI Tamagotchi", version="0.0.1")

# Add CORS middleware for extension communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # Allow all chrome extensions
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}


@router.get("/health")
def health_check() -> dict[str, str]:
    """Health check endpoint for extension to test server connectivity."""
    return {"status": "ok", "message": "Server is running"}
