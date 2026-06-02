from fastapi import APIRouter, UploadFile
import shutil

from sqlalchemy import text

from app.worker.tasks import process_document
from app.db.document_repository import save_document
from app.db.database import engine

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile):

    filepath = f"uploads/{file.filename}"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    save_document(file.filename)

    process_document.delay(filepath)

    return {
        "message": "Document uploaded successfully",
        "status": "processing"
    }


@router.get("/documents")
async def get_documents():

    query = text("""
        SELECT
            id,
            filename,
            uploaded_at,
            status
        FROM documents
        ORDER BY uploaded_at DESC
    """)

    with engine.connect() as conn:

        result = conn.execute(query)

        documents = []

        for row in result:
            documents.append({
                "id": row.id,
                "filename": row.filename,
                "uploaded_at": str(row.uploaded_at),
                "status": row.status
            })

    return documents