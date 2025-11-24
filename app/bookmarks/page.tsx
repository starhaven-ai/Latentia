'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Bookmark as BookmarkIcon, Settings, Sun, Moon, LogOut } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface BookmarkedItem {
  id: string
  createdAt: string
  output: {
    id: string
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
}

export default function BookmarksPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([])
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
    fetchBookmarks()
  }, [])

  const fetchBookmarks = async () => {
    try {
      const response = await fetch('/api/bookmarks')
      if (response.ok) {
        const data = await response.json()
        setBookmarks(data)
      } else {
        throw new Error('Failed to fetch bookmarks')
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookmarks',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSession = (projectId: string, sessionId: string) => {
    router.push(`/projects/${projectId}?sessionId=${sessionId}`)
  }

  const handleRemoveBookmark = async (outputId: string) => {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId }),
      })

      if (response.ok) {
        toast({
          title: 'Bookmark removed',
          description: 'Item removed from bookmarks',
          variant: 'default',
        })
        // Remove from local state
        setBookmarks(bookmarks.filter(b => b.output.id !== outputId))
      } else {
        throw new Error('Failed to remove bookmark')
      }
    } catch (error) {
      console.error('Error removing bookmark:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove bookmark',
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
              onClick={() => router.push('/bookmarks')}
              title="Bookmarks"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <BookmarkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">No bookmarks yet</h2>
              <p className="text-muted-foreground mb-6">
                Bookmark your favorite generations to find them easily
              </p>
              <Button onClick={() => router.push('/projects')}>
                Browse Projects
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((bookmark) => {
              const author = bookmark.output.generation.user
              const authorName = author.displayName || author.username || 'Unknown'
              const note = bookmark.output.notes[0]

              return (
                <div
                  key={bookmark.id}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square cursor-pointer overflow-hidden"
                    onClick={() =>
                      handleOpenSession(
                        bookmark.output.generation.session.project.id,
                        bookmark.output.generation.session.id
                      )
                    }
                  >
                    {bookmark.output.fileType === 'image' ? (
                      <img
                        src={bookmark.output.fileUrl}
                        alt="Bookmarked content"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={bookmark.output.fileUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                      <p className="text-white text-sm font-medium px-4 text-center">
                        Open in session
                      </p>
                    </div>

                    {/* Bookmark button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveBookmark(bookmark.output.id)
                      }}
                      className="absolute top-3 right-3 w-9 h-9 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Remove bookmark"
                    >
                      <BookmarkIcon className="h-4 w-4 text-white fill-white" />
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
                          {bookmark.output.generation.session.project.name}
                        </p>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Prompt
                      </p>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                        {bookmark.output.generation.prompt}
                      </p>
                    </div>

                    {/* Note */}
                    {note && (
                      <div className="space-y-1.5 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Note
                        </p>
                        <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3 italic">
                          &ldquo;{note.text}&rdquo;
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

