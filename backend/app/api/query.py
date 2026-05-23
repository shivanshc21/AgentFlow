from fastapi import APIRouter

from backend.app.rag.retriever import retrieve_chunks

router = APIRouter()

@router.get("/query")
async def query_rag(q: str):

    results = retrieve_chunks(q)

    chunks = []

    for row in results:

        chunks.append({
            "content": row[0],
            "distance": float(row[1])
        })

    return {
        "query": q,
        "results": chunks
    }