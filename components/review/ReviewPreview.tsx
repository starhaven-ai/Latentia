'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'

interface ApprovedItem {
  id: string
  fileUrl: string
  fileType: string
  generation: {
    prompt: string
    user: {
      id: string
      username: string | null
      displayName: string | null
      avatarUrl: string | null
    }
    session: {
      id: string
      project: {
        id: string
        name: string
      }
    }
  }
  notes: Array<{
    id: string
    text: string
    context: string
  }>
}

export function ReviewPreview() {
  const router = useRouter()
  const [items, setItems] = useState<ApprovedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreviewItems()
  }, [])

  const fetchPreviewItems = async () => {
    try {
      const response = await fetch('/api/review?limit=5')
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Error fetching review preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSession = (projectId: string, sessionId: string) => {
    router.push(`/projects/${projectId}?sessionId=${sessionId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Loading approved items...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Review</h2>
          <p className="text-muted-foreground">
            Review and approve content submitted by your team. Approved items will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 space-y-6">
      {/* Header with View All button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Latest Approved Items</h2>
            <p className="text-sm text-muted-foreground">
              Recently approved content for review
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/review')}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
        >
          View All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Grid of preview items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item) => {
          const author = item.generation.user
          const authorName = author.displayName || author.username || 'Unknown'
          const approvalNote = item.notes.find(n => n.context === 'approval')

          return (
            <div
              key={item.id}
              className="group bg-card border-2 border-green-500/30 rounded-xl overflow-hidden hover:shadow-xl hover:border-green-500/50 transition-all duration-300"
            >
              {/* Image */}
              <div
                className="relative aspect-square cursor-pointer overflow-hidden"
                onClick={() =>
                  handleOpenSession(
                    item.generation.session.project.id,
                    item.generation.session.id
                  )
                }
              >
                {item.fileType === 'image' ? (
                  <img
                    src={item.fileUrl}
                    alt="Approved content"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <video
                    src={item.fileUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Approved badge */}
                <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approved
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <p className="text-white text-sm font-medium px-4 text-center">
                    Open in session
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0">
                    {author.avatarUrl ? (
                      <img
                        src={author.avatarUrl}
                        alt={authorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      authorName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {authorName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.generation.session.project.name}
                    </p>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Prompt
                  </p>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                    {item.generation.prompt}
                  </p>
                </div>

                {/* Approval Note */}
                {approvalNote && (
                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-500">
                      Review Note
                    </p>
                    <p className="text-sm leading-relaxed line-clamp-2 italic text-green-700 dark:text-green-400">
                      &ldquo;{approvalNote.text}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
