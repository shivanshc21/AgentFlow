'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessages, ChatMessageSkeleton } from './chat-message'
import { ChatInput } from './chat-input'
import { RetrievalPanel } from './retrieval-panel'
import { AgentExecutionPanel } from './agent-execution-panel'
import { queryAgent, WebSocketClient } from '@/services/api'
import type { Message, RetrievedChunk, AgentStage, WebSocketStatus } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { Sparkles, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([])
  const [showRetrieval, setShowRetrieval] = useState(false)
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected')
  const [agentStages, setAgentStages] = useState<AgentStage[]>([
    { name: 'Retriever', status: 'pending' },
    { name: 'Planner', status: 'pending' },
    { name: 'Writer', status: 'pending' },
    { name: 'Critic', status: 'pending' },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocketClient | null>(null)
  const { toast } = useToast()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    wsRef.current = new WebSocketClient()
    wsRef.current.onStatusChange = (status) => {
      setWsStatus(status)
      if (status === 'disconnected') {
        toast({
          title: 'WebSocket Disconnected',
          description: 'Attempting to reconnect...',
          variant: 'destructive',
        })
      }
    }
    wsRef.current.onMessage = (data) => {
      if (typeof data === 'object' && data !== null) {
        const wsData = data as { type?: string; content?: string; stage?: string; chunks?: RetrievedChunk[] }
        if (wsData.type === 'stream' && wsData.content) {
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + wsData.content },
              ]
            }
            return prev
          })
        }
        if (wsData.stage) {
          updateAgentStage(wsData.stage)
        }
        if (wsData.chunks) {
          setRetrievedChunks(wsData.chunks)
          setShowRetrieval(true)
        }
      }
    }
    wsRef.current.connect()

    return () => {
      wsRef.current?.disconnect()
    }
  }, [toast])

  const updateAgentStage = (stageName: string) => {
    setAgentStages((prev) =>
      prev.map((stage) => {
        if (stage.name.toLowerCase() === stageName.toLowerCase()) {
          return { ...stage, status: 'running' }
        }
        const stageIndex = prev.findIndex(
          (s) => s.name.toLowerCase() === stageName.toLowerCase()
        )
        const currentIndex = prev.findIndex((s) => s.name === stage.name)
        if (currentIndex < stageIndex) {
          return { ...stage, status: 'completed' }
        }
        return stage
      })
    )
  }

  const resetAgentStages = () => {
    setAgentStages([
      { name: 'Retriever', status: 'pending' },
      { name: 'Planner', status: 'pending' },
      { name: 'Writer', status: 'pending' },
      { name: 'Critic', status: 'pending' },
    ])
  }

  const handleSend = async (content: string) => {
    setShowWelcome(false)
    resetAgentStages()
    setRetrievedChunks([])

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await queryAgent(content)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        plan: response.plan,
        critique: response.critique,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (response.chunks) {
        setRetrievedChunks(response.chunks)
        setShowRetrieval(true)
      }

      setAgentStages((prev) =>
        prev.map((stage) => ({ ...stage, status: 'completed' }))
      )
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive',
      })
      console.error('Query error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/50 backdrop-blur-sm">
          <h1 className="text-sm font-medium">New Conversation</h1>
          <div className="flex items-center gap-2">
            <Badge
              variant={wsStatus === 'connected' ? 'default' : 'destructive'}
              className="gap-1.5"
            >
              {wsStatus === 'connected' ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {wsStatus}
            </Badge>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <WelcomeScreen />
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <ChatMessageSkeleton />
            </div>
          ) : (
            <>
              <ChatMessages messages={messages} isTyping={isLoading} />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* Agent Execution Panel */}
      <AgentExecutionPanel stages={agentStages} isRunning={isLoading} />

      {/* Retrieval Panel */}
      {showRetrieval && (
        <RetrievalPanel
          chunks={retrievedChunks}
          onClose={() => setShowRetrieval(false)}
        />
      )}
    </div>
  )
}

function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 glow">
        <Sparkles className="w-8 h-8 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-balance text-center">
        Welcome to AgentFlow
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8 text-pretty">
        Your AI-powered document assistant. Upload documents and ask questions to get intelligent answers with source citations.
      </p>
      <div className="grid gap-3 w-full max-w-md">
        {[
          'What are the key findings in my documents?',
          'Summarize the main topics discussed',
          'Find information about specific topics',
        ].map((suggestion, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="p-3 text-sm text-left rounded-xl bg-card glass border border-border hover:border-primary/50 transition-colors"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
