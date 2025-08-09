from fastapi import APIRouter

router = APIRouter(prefix="/ingest")


@router.post("/")
def ingest(data: dict):
    return {"message": "Data ingested successfully"}
