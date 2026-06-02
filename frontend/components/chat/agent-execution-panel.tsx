'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AgentStage } from '@/types'
import { Search, Lightbulb, PenTool, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react'

interface AgentExecutionPanelProps {
  stages: AgentStage[]
  isRunning: boolean
}

const stageIcons: Record<string, typeof Search> = {
  Retriever: Search,
  Planner: Lightbulb,
  Writer: PenTool,
  Critic: ShieldCheck,
}

export function AgentExecutionPanel({ stages, isRunning }: AgentExecutionPanelProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen border-l border-border bg-card/30 backdrop-blur-sm">
      <div className="flex items-center h-14 px-4 border-b border-border">
        <h3 className="text-sm font-medium">Agent Workflow</h3>
      </div>

      <div className="flex-1 p-4">
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" />

          <div className="space-y-2">
            {stages.map((stage, index) => {
              const Icon = stageIcons[stage.name] || Search
              const isActive = stage.status === 'running'
              const isCompleted = stage.status === 'completed'
              const isError = stage.status === 'error'

              return (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={cn(
                      'relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                      isActive && 'bg-primary/10 border border-primary/30',
                      isCompleted && 'bg-accent/10',
                      isError && 'bg-destructive/10'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        isActive && 'bg-primary text-primary-foreground glow',
                        isCompleted && 'bg-accent text-accent-foreground',
                        isError && 'bg-destructive text-destructive-foreground',
                        !isActive && !isCompleted && !isError && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isActive && 'text-primary',
                          isCompleted && 'text-accent',
                          !isActive && !isCompleted && 'text-muted-foreground'
                        )}
                      >
                        {stage.name}
                      </p>
                      {stage.duration && (
                        <p className="text-xs text-muted-foreground">
                          {stage.duration}ms
                        </p>
                      )}
                    </div>

                    {/* Status indicator */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-primary animate-pulse"
                      />
                    )}
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-accent"
                      />
                    )}
                  </div>

                  {/* Arrow connector */}
                  {index < stages.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 rotate-90 transition-colors',
                          isCompleted ? 'text-accent' : 'text-muted-foreground/30'
                        )}
                      />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Status summary */}
        <div className="mt-6 p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <p className="text-sm font-medium">
            {isRunning ? (
              <span className="text-primary">Processing query...</span>
            ) : stages.every((s) => s.status === 'completed') ? (
              <span className="text-accent">Completed</span>
            ) : (
              <span className="text-muted-foreground">Idle</span>
            )}
          </p>
        </div>
      </div>
    </aside>
  )
}
