from fastapi import APIRouter
from fastapi.responses import JSONResponse
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.agents.workflow import graph

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=2)

@router.get("/query")
async def query_rag(q: str):
    try:
        # Run blocking graph.invoke() in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            graph.invoke,
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
            "plan": result.get("plan", ""),
            "answer": result.get("answer", ""),
            "critique": result.get("critique", "")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )