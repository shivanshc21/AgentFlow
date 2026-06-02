'use client'

import { motion } from 'framer-motion'
import { FileText, Layers, MessageSquare, Search, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const stats = [
  {
    title: 'Total Documents',
    value: '24',
    change: '+3 this week',
    icon: FileText,
    gradient: 'from-primary to-primary/50',
  },
  {
    title: 'Total Chunks',
    value: '1,847',
    change: '+156 this week',
    icon: Layers,
    gradient: 'from-accent to-accent/50',
  },
  {
    title: 'Conversations',
    value: '89',
    change: '+12 this week',
    icon: MessageSquare,
    gradient: 'from-chart-3 to-chart-3/50',
  },
  {
    title: 'Total Queries',
    value: '342',
    change: '+48 this week',
    icon: Search,
    gradient: 'from-chart-4 to-chart-4/50',
  },
  {
    title: 'Avg Response Time',
    value: '1.2s',
    change: '-0.3s improvement',
    icon: Clock,
    gradient: 'from-chart-5 to-chart-5/50',
  },
  {
    title: 'Success Rate',
    value: '98.5%',
    change: '+0.5% this week',
    icon: TrendingUp,
    gradient: 'from-accent to-primary/50',
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Overview of your AgentFlow activity
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass hover:glow transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Activity Section */}
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest queries and uploads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'query', text: 'What are the main findings?', time: '2m ago' },
                    { type: 'upload', text: 'research-paper.pdf', time: '15m ago' },
                    { type: 'query', text: 'Summarize section 3', time: '1h ago' },
                    { type: 'upload', text: 'quarterly-report.pdf', time: '2h ago' },
                    { type: 'query', text: 'Find revenue figures', time: '3h ago' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activity.type === 'query'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-accent/20 text-accent'
                        }`}
                      >
                        {activity.type === 'query' ? (
                          <Search className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
                <CardDescription>System health and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'API Latency', value: '145ms', percent: 15 },
                    { label: 'Embedding Speed', value: '0.8s', percent: 40 },
                    { label: 'Retrieval Accuracy', value: '94%', percent: 94 },
                    { label: 'Cache Hit Rate', value: '78%', percent: 78 },
                    { label: 'Memory Usage', value: '2.4GB', percent: 60 },
                  ].map((metric, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{metric.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.percent}%` }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: MessageSquare, label: 'New Chat', href: '/' },
                  { icon: FileText, label: 'Upload Document', href: '/documents' },
                  { icon: Layers, label: 'View Runs', href: '/runs' },
                  { icon: Search, label: 'Search Documents', href: '/documents' },
                ].map((action, i) => {
                  const Icon = action.icon
                  return (
                    <a
                      key={i}
                      href={action.href}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 hover:border-primary/30 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{action.label}</span>
                    </a>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
