'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Settings, Sun, Moon, LogOut, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface ApprovedItem {
  id: string
  createdAt: string
  fileUrl: string
  fileType: string
  generation: {
    id: string
    prompt: string
    modelId: string
    user: {
      id: string
      username: string | null
      displayName: string | null
      avatarUrl: string | null
    }
    session: {
      id: string
      name: string
      project: {
        id: string
        name: string
      }
    }
  }
  notes: Array<{
    id: string
    text: string
    context: string | null
    createdAt: string
  }>
}

export default function ReviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    fetchApprovedItems()
  }, [])

  const fetchApprovedItems = async () => {
    try {
      const response = await fetch('/api/review')
      if (response.ok) {
        const data = await response.json()
        setApprovedItems(data)
      } else {
        throw new Error('Failed to fetch approved items')
      }
    } catch (error) {
      console.error('Error fetching approved items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load review items',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSession = (projectId: string, sessionId: string) => {
    router.push(`/projects/${projectId}?sessionId=${sessionId}`)
  }

  const handleUnapprove = async (outputId: string) => {
    try {
      const response = await fetch('/api/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId, isApproved: false }),
      })

      if (response.ok) {
        toast({
          title: 'Item unapproved',
          description: 'Item removed from review',
          variant: 'default',
        })
        // Remove from local state
        setApprovedItems(approvedItems.filter(item => item.id !== outputId))
      } else {
        throw new Error('Failed to unapprove item')
      }
    } catch (error) {
      console.error('Error unapproving item:', error)
      toast({
        title: 'Error',
        description: 'Failed to unapprove item',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={theme === 'light' ? "/images/Loop Vesper (Black).svg" : "/images/Loop Vesper (White).svg"}
              alt="Loop Vesper Logo"
              className="h-8 object-contain cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/projects')}
              title="Back to Projects"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="transition-transform hover:rotate-12"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Review</h1>
              <p className="text-sm text-muted-foreground">
                {approvedItems.length} {approvedItems.length === 1 ? 'item' : 'items'} approved for review
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading approved items...</p>
          </div>
        ) : approvedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-2xl font-semibold">No approved items yet</h2>
              <p className="text-muted-foreground">
                Items approved for review will appear here. Start by approving content from your sessions.
              </p>
              <Button onClick={() => router.push('/projects')} className="mt-6">
                Browse Projects
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {approvedItems.map((item) => {
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

                    {/* Unapprove button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnapprove(item.id)
                      }}
                      className="absolute top-3 right-3 w-9 h-9 bg-black/50 hover:bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Remove from review"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0">
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
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Prompt
                      </p>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                        {item.generation.prompt}
                      </p>
                    </div>

                    {/* Approval Note */}
                    {approvalNote && (
                      <div className="space-y-1.5 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-500">
                          Review Note
                        </p>
                        <p className="text-sm leading-relaxed line-clamp-3 italic text-green-700 dark:text-green-400">
                          &ldquo;{approvalNote.text}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
