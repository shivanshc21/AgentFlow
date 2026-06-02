'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Lightbulb,
  PenTool,
  ShieldCheck,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface AgentRun {
  id: string
  query: string
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  duration?: number
  stages: {
    name: string
    status: 'pending' | 'running' | 'completed' | 'error'
    duration?: number
    details?: string
  }[]
}

const stageIcons = {
  Retriever: Search,
  Planner: Lightbulb,
  Writer: PenTool,
  Critic: ShieldCheck,
}

const mockRuns: AgentRun[] = [
  {
    id: '1',
    query: 'What are the key findings in the research paper?',
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 5),
    duration: 2340,
    stages: [
      { name: 'Retriever', status: 'completed', duration: 450, details: 'Retrieved 8 relevant chunks' },
      { name: 'Planner', status: 'completed', duration: 320, details: 'Generated 3-step plan' },
      { name: 'Writer', status: 'completed', duration: 1200, details: 'Generated 450 word response' },
      { name: 'Critic', status: 'completed', duration: 370, details: 'Verified accuracy and coherence' },
    ],
  },
  {
    id: '2',
    query: 'Summarize the quarterly revenue data',
    status: 'running',
    startedAt: new Date(),
    stages: [
      { name: 'Retriever', status: 'completed', duration: 380 },
      { name: 'Planner', status: 'completed', duration: 290 },
      { name: 'Writer', status: 'running' },
      { name: 'Critic', status: 'pending' },
    ],
  },
  {
    id: '3',
    query: 'Compare section 2 and section 4 findings',
    status: 'failed',
    startedAt: new Date(Date.now() - 1000 * 60 * 30),
    duration: 890,
    stages: [
      { name: 'Retriever', status: 'completed', duration: 420 },
      { name: 'Planner', status: 'error', details: 'Failed to generate plan - insufficient context' },
      { name: 'Writer', status: 'pending' },
      { name: 'Critic', status: 'pending' },
    ],
  },
]

export default function RunsPage() {
  const [runs] = useState<AgentRun[]>(mockRuns)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set(['2']))

  const toggleExpand = (id: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getStatusBadge = (status: AgentRun['status']) => {
    const config = {
      running: { icon: Loader2, label: 'Running', variant: 'default' as const, className: 'animate-spin' },
      completed: { icon: CheckCircle2, label: 'Completed', variant: 'default' as const, className: '' },
      failed: { icon: XCircle, label: 'Failed', variant: 'destructive' as const, className: '' },
    }

    const { icon: Icon, label, variant, className } = config[status]

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={cn('w-3 h-3', className)} />
        {label}
      </Badge>
    )
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-semibold">Agent Runs</h1>
          <p className="text-xs text-muted-foreground">
            Monitor and debug agent execution workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {runs.filter((r) => r.status === 'running').length} running
          </Badge>
          <Badge variant="secondary">{runs.length} total</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Workflow Visualization */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="text-base">Agent Workflow Pipeline</CardTitle>
            <CardDescription>
              Visual representation of the agent execution stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-4 overflow-x-auto">
              {['Retriever', 'Planner', 'Writer', 'Critic'].map((stage, index) => {
                const Icon = stageIcons[stage as keyof typeof stageIcons]
                return (
                  <div key={stage} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center mb-2">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{stage}</span>
                    </motion.div>
                    {index < 3 && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: 48 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                        className="h-0.5 bg-gradient-to-r from-primary to-accent mx-2"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Runs List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Recent Runs</CardTitle>
            <CardDescription>Click on a run to view detailed execution info</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {runs.map((run, index) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible
                      open={expandedRuns.has(run.id)}
                      onOpenChange={() => toggleExpand(run.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start p-4 h-auto bg-secondary/30 border border-border hover:bg-secondary/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 transition-transform',
                                  expandedRuns.has(run.id) && 'rotate-180'
                                )}
                              />
                              <div className="text-left">
                                <p className="text-sm font-medium line-clamp-1">
                                  {run.query}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(run.startedAt)}</span>
                                  {run.duration && (
                                    <>
                                      <span>•</span>
                                      <span>{formatDuration(run.duration)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {getStatusBadge(run.status)}
                          </div>
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="mt-2 ml-8 p-4 rounded-lg bg-background/50 border border-border">
                          <div className="space-y-3">
                            {run.stages.map((stage, stageIndex) => {
                              const Icon = stageIcons[stage.name as keyof typeof stageIcons]
                              const isActive = stage.status === 'running'
                              const isCompleted = stage.status === 'completed'
                              const isError = stage.status === 'error'

                              return (
                                <motion.div
                                  key={stage.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: stageIndex * 0.05 }}
                                  className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg',
                                    isActive && 'bg-primary/10 border border-primary/30',
                                    isCompleted && 'bg-accent/5',
                                    isError && 'bg-destructive/10'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center',
                                      isActive && 'bg-primary text-primary-foreground',
                                      isCompleted && 'bg-accent/20 text-accent',
                                      isError && 'bg-destructive/20 text-destructive',
                                      !isActive && !isCompleted && !isError && 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {isActive ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Icon className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{stage.name}</p>
                                    {stage.details && (
                                      <p className="text-xs text-muted-foreground">
                                        {stage.details}
                                      </p>
                                    )}
                                  </div>
                                  {stage.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDuration(stage.duration)}
                                    </span>
                                  )}
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
