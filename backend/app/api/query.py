from fastapi import APIRouter

from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.generator import generate_response
from backend.app.rag.memory import (
    save_message,
    get_memory
)

router = APIRouter()

@router.get("/query")
async def query_rag(
    q: str,
    session_id: str = "default"
):

    results = retrieve_chunks(q)

    contexts = [row[0] for row in results]

    memory = get_memory(session_id)

    answer = generate_response(
        query=q,
        contexts=contexts,
        memory=memory
    )

    save_message(
        session_id,
        "user",
        q
    )

    save_message(
        session_id,
        "assistant",
        answer
    )

    return {
        "query": q,
        "answer": answer,
        "session_id": session_id
    }