from fastapi import APIRouter

router = APIRouter(prefix="/ingest")


@router.post("/twitter")
def ingest(data: dict):
    print(data)
    return {"message": "Data ingested successfully"}
