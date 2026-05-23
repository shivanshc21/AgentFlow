from fastapi import APIRouter, UploadFile, File
import os
import shutil

from backend.app.services.pdf_parser import extract_text_from_pdf
from backend.app.rag.chunker import chunk_text
from backend.app.rag.embeddings import generate_embedding

router = APIRouter()

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):

    file_path = f"{UPLOAD_DIR}/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)

    chunks = chunk_text(extracted_text)

    first_embedding = generate_embedding(chunks[0])

    return {
        "filename": file.filename,
        "total_chunks": len(chunks),
        "embedding_dimension": len(first_embedding)
    }