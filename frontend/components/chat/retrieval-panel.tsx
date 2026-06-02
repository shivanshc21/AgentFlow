'use client'

import { motion } from 'framer-motion'
import { X, FileText, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RetrievedChunk } from '@/types'

interface RetrievalPanelProps {
  chunks: RetrievedChunk[]
  onClose: () => void
}

export function RetrievalPanel({ chunks, onClose }: RetrievalPanelProps) {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-screen border-l border-border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        <h3 className="text-sm font-medium">Retrieved Context</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="p-4 space-y-3">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No context retrieved yet
            </p>
          ) : (
            chunks.map((chunk, index) => (
              <motion.div
                key={chunk.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium truncate max-w-[150px]">
                      {chunk.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="w-3 h-3" />
                    {(chunk.score * 100).toFixed(0)}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-4">
                  {chunk.content}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.aside>
  )
}
