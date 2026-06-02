'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { uploadDocument, getDocuments } from '@/services/api'
import type { Document } from '@/types'
import { cn } from '@/lib/utils'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Load documents on page mount
  useEffect(() => {
    loadDocuments()
  }, [])

 const loadDocuments = async () => {
  try {
    setIsLoading(true)

    const docs = await getDocuments()

    setDocuments(docs)
  } catch (error) {
    console.error('Failed to load documents:', error)

    toast({
      title: 'Failed to load documents',
      description: 'Could not fetch documents from server.',
      variant: 'destructive',
    })
  } finally {
    setIsLoading(false)
  }
}

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === 'application/pdf'
      )

      if (files.length === 0) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload PDF files only.',
          variant: 'destructive',
        })
        return
      }

      for (const file of files) {
        await uploadFile(file)
      }
    },
    [toast]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      for (const file of Array.from(files)) {
        await uploadFile(file)
      }

      e.target.value = ''
    },
    []
  )

  const uploadFile = async (file: File) => {
    const tempId = Date.now().toString()
    const newDoc: Document = {
      id: tempId,
      name: file.name,
      size: file.size,
      status: 'queued',
      uploadedAt: new Date(),
    }

    setDocuments((prev) => [newDoc, ...prev])
    setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }))

    try {
      setDocuments((prev) =>
        prev.map((d) => (d.id === tempId ? { ...d, status: 'processing' } : d))
      )

      await uploadDocument(file, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [tempId]: progress }))
      })

      toast({
        title: 'Upload successful',
        description: `${file.name} has been processed.`,
      })

      // Refresh documents from backend
      await loadDocuments()
    } catch (error) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === tempId ? { ...d, status: 'failed' } : d))
      )

      toast({
        title: 'Upload failed',
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: 'destructive',
      })
      console.error('Upload error:', error)
    } finally {
      setUploadProgress((prev) => {
        const { [tempId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: Document['status']) => {
    const config = {
      queued: { icon: Clock, label: 'Queued', variant: 'secondary' as const },
      processing: { icon: Loader2, label: 'Processing', variant: 'default' as const },
      completed: { icon: CheckCircle2, label: 'Completed', variant: 'default' as const },
      failed: { icon: AlertCircle, label: 'Failed', variant: 'destructive' as const },
    }

    const { icon: Icon, label, variant } = config[status]

    return (
      <Badge variant={variant} className="gap-1">
        <Icon
          className={cn('w-3 h-3', status === 'processing' && 'animate-spin')}
        />
        {label}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/50 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-semibold">Documents</h1>
          <p className="text-xs text-muted-foreground">
            Upload and manage your PDF documents
          </p>
        </div>
        <Badge variant="secondary">{documents.length} documents</Badge>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Upload Zone */}
        <Card className="mb-6 glass">
          <CardHeader>
            <CardTitle className="text-base">Upload Documents</CardTitle>
            <CardDescription>
              Drag and drop PDF files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <motion.div
                animate={{ scale: isDragging ? 1.1 : 1 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4"
              >
                <Upload className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drop PDF files here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse from your computer
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
            <CardDescription>
              {documents.length === 0
                ? 'No documents uploaded yet'
                : `${documents.filter((d) => d.status === 'completed').length} of ${documents.length} processed`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <Loader2 className="w-8 h-8 mb-4 animate-spin" />
                <p className="text-sm">Loading documents...</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {documents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                  >
                    <FileText className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm">No documents uploaded yet</p>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        layout
                        className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.size)}</span>
                            {doc.chunks && (
                              <>
                                <span>•</span>
                                <span>{doc.chunks} chunks</span>
                              </>
                            )}
                          </div>
                          {uploadProgress[doc.id] !== undefined && (
                            <Progress
                              value={uploadProgress[doc.id]}
                              className="h-1 mt-2"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(doc.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDocument(doc.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
