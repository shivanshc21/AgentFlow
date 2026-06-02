import axios from "axios";
import type { QueryResponse, Document } from "@/types";

const BASE_URL = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
});

export async function queryAgent(query: string): Promise<QueryResponse> {
  const response = await api.get("/query", {
    params: { q: query },
  });

  return response.data;
}

export async function getDocuments(): Promise<Document[]> {
  const response = await api.get("/documents");
  return response.data.map((doc: any) => ({
    id: doc.id,
    name: doc.filename,
    size: doc.size || 0,
    status: doc.status || "completed",
    uploadedAt: new Date(doc.uploaded_at),
    chunks: doc.chunks || 0,
  }));
}

export async function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload", formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(progress);
      }
    },
  });

  return response.data;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  onMessage?: (data: unknown) => void;
  onStatusChange?: (
    status: "connecting" | "connected" | "disconnected" | "error",
  ) => void;

  constructor(path: string = "/api/ws/chat") {
    this.url = `ws://127.0.0.1:8000${path}`;
  }

  connect() {
    this.onStatusChange?.("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange?.("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage?.(data);
        } catch {
          this.onMessage?.(event.data);
        }
      };

      this.ws.onclose = () => {
        this.onStatusChange?.("disconnected");
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this.onStatusChange?.("error");
      };
    } catch {
      this.onStatusChange?.("error");
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.maxReconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
  }
}

export const websocketClient = new WebSocketClient();
