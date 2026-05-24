from fastapi import APIRouter

from backend.app.agents.workflow import graph

router = APIRouter()

@router.get("/query")
async def query_rag(q: str):

    result = graph.invoke(
        {
            "query": q,
            "context": "",
            "plan": "",
            "answer": "",
            "critique": ""
        }
    )

    return {
        "query": q,
        "plan": result["plan"],
        "answer": result["answer"],
        "critique": result["critique"]
    }