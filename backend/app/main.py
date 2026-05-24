from fastapi import FastAPI
from backend.app.api.upload import router as upload_router
from backend.app.api.query import router as query_router
from backend.app.websocket.chat_socket import router as websocket_router

app = FastAPI()

app.include_router(upload_router)
app.include_router(query_router)
app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"message": "AgentFlow running"}