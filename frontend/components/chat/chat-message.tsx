'use client'

import { cn } from '@/lib/utils'
import type { Message } from '@/types'
import { User, Bot, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [planOpen, setPlanOpen] = useState(false)
  const [critiqueOpen, setCritiqueOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-4 px-4 py-6', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          isUser
            ? 'bg-primary/20 text-primary'
            : 'bg-gradient-to-br from-primary to-accent text-primary-foreground'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 max-w-3xl', isUser ? 'text-right' : 'text-left')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card glass rounded-tl-sm'
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Plan Section */}
        {message.plan && (
          <div className="mt-3">
            <Collapsible open={planOpen} onOpenChange={setPlanOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={cn('w-3 h-3 transition-transform', planOpen && 'rotate-180')}
                />
                <span>View Plan</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-left">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.plan}</ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Critique Section */}
        {message.critique && (
          <div className="mt-2">
            <Collapsible open={critiqueOpen} onOpenChange={setCritiqueOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={cn('w-3 h-3 transition-transform', critiqueOpen && 'rotate-180')}
                />
                <span>View Critique</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border text-xs text-left">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.critique}</ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-2 text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </motion.div>
  )
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-4 px-4 py-6"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="bg-card glass rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-6 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

interface ChatMessagesProps {
  messages: Message[]
  isTyping?: boolean
}

export function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isTyping && <TypingIndicator />}
      </AnimatePresence>
    </div>
  )
}
