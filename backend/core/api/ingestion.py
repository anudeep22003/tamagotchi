import json
from typing import Dict

from fastapi import APIRouter

from core.twitter_models import TwitterBackendPayload

router = APIRouter(prefix="/ingest")


@router.post("/twitter")
def ingest(data: TwitterBackendPayload) -> Dict[str, str]:
    try:
        with open("storage/twitter.json", "r+") as f:
            file_content = f.read().strip()
            if file_content:
                existing_data = json.loads(file_content)
            else:
                existing_data = []

            if existing_data is None:
                existing_data = []

            existing_data.append(data.model_dump(mode="json"))
            f.seek(0)  # Move to the beginning of the file
            f.truncate()
            json.dump(existing_data, f)
    except (json.JSONDecodeError, FileNotFoundError):
        # If file doesn't exist or contains invalid JSON, start fresh
        existing_data = [data.model_dump(mode="json")]
        with open("storage/twitter.json", "w") as f:
            json.dump(existing_data, f)

    return {"message": "Data ingested successfully"}
