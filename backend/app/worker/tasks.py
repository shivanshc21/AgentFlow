from app.worker.celery_app import celery

from app.services.pdf_parser import extract_text_from_pdf
from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embedding
from app.rag.vector_store import store_chunks

@celery.task
def process_document(filepath):

    print(f"Processing: {filepath}")

    text = extract_text_from_pdf(filepath)

    chunks = chunk_text(text)

    processed_chunks = []

    for chunk in chunks:

        embedding = generate_embedding(chunk)

        processed_chunks.append(
            {
                "content": chunk,
                "embedding": embedding
            }
        )

    store_chunks(processed_chunks)

    print("Document processing completed")

    return {
        "status": "completed"
    }