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
    session: {
      id: string
      project: {
        id: string
      }
    }
  }
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg overflow-hidden border-2 border-green-500/30 cursor-pointer hover:border-green-500/60 transition-all duration-300 hover:shadow-lg"
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
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <video
                src={item.fileUrl}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            )}

            {/* Approved badge */}
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <p className="text-white text-sm font-medium">View in session</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
