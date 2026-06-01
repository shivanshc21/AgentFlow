from fastapi import APIRouter, UploadFile
import shutil

from app.worker.tasks import process_document

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile):

    filepath = f"uploads/{file.filename}"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    process_document.delay(filepath)

    return {
        "message": "Document uploaded successfully",
        "status": "processing"
    }