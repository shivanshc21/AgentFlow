from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.generator import stream_response

router = APIRouter()

@router.get("/query")
async def query_rag(q: str):

    results = retrieve_chunks(q)

    contexts = [row[0] for row in results]

    generator = stream_response(
        query=q,
        contexts=contexts
    )

    return StreamingResponse(
        generator,
        media_type="text/plain"
    )