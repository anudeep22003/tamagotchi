from fastapi import APIRouter, File, UploadFile

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/whisper")
async def transcribe_whisper(file: UploadFile = File(...)) -> str:
    # audio_file = await file.read()
    # transcript = await async_openai_client.audio.transcriptions.create(
    #     model="whisper-1",
    #     file=audio_file,
    # )
    return f"transcription requested and mock done with audio file {file.file}"
