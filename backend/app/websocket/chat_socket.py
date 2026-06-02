from fastapi import APIRouter
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
import traceback

from app.rag.retriever import retrieve_chunks
from app.rag.generator import stream_response

router = APIRouter()


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):

    print("🔵 WebSocket connection requested")

    await websocket.accept()

    print("🟢 WebSocket accepted")

    try:

        while True:

            query = await websocket.receive_text()

            print(f"📩 Received query: {query}")

            try:

                print("🔍 Retrieving chunks...")
                results = retrieve_chunks(query)

                print(f"✅ Retrieved {len(results)} chunks")

                contexts = [row[0] for row in results]

                print("🤖 Starting generation...")

                stream = stream_response(
                    query=query,
                    contexts=contexts
                )

                for chunk in stream:

                    print(f"📤 Sending chunk: {chunk[:50]}")

                    await websocket.send_text(chunk)

                print("✅ Generation completed")

                await websocket.send_text("[END]")

            except Exception as e:

                print("❌ Query Processing Error")
                print(str(e))
                traceback.print_exc()

                await websocket.send_text(
                    f"Error: {str(e)}"
                )

                await websocket.send_text("[END]")

    except WebSocketDisconnect:

        print("🔴 Client disconnected")

    except Exception as e:

        print("❌ WebSocket Error")
        print(str(e))
        traceback.print_exc()