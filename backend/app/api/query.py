from fastapi import APIRouter

from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.generator import generate_response

router = APIRouter()

@router.get("/query")
async def query_rag(q: str):

    results = retrieve_chunks(q)

    contexts = [row[0] for row in results]

    answer = generate_response(
        query=q,
        contexts=contexts
    )

    return {
        "query": q,
        "answer": answer
    }