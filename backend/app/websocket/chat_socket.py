from fastapi import APIRouter
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from backend.app.rag.retriever import retrieve_chunks
from backend.app.rag.generator import stream_response

router = APIRouter()

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):

    await websocket.accept()

    try:

        while True:

            query = await websocket.receive_text()

            results = retrieve_chunks(query)

            contexts = [row[0] for row in results]

            stream = stream_response(
                query=query,
                contexts=contexts
            )

            for chunk in stream:

                await websocket.send_text(chunk)

            await websocket.send_text("[END]")

    except WebSocketDisconnect:

        print("Client disconnected")