export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  plan?: string
  critique?: string
}

export interface Document {
  id: string
  name: string
  size: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  uploadedAt: Date
  chunks?: number
}

export interface AgentStage {
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: number
  details?: string
}

export interface RetrievedChunk {
  id: string
  content: string
  score: number
  source: string
}

export interface QueryResponse {
  answer: string
  plan?: string
  critique?: string
  chunks?: RetrievedChunk[]
}

export interface DashboardStats {
  totalDocuments: number
  totalChunks: number
  totalConversations: number
  totalQueries: number
  avgResponseTime: number
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
