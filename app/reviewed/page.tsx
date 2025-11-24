'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, Sun, Moon, LogOut, Settings, Bookmark } from 'lucide-react'

export default function ReviewedPage() {
  const [approvedItems, setApprovedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const router = useRouter()
  const supabase = createClient()

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
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/approved')
      if (response.ok) {
        const data = await response.json()
        setApprovedItems(data)
      } else {
        console.error('Failed to fetch approved items')
      }
    } catch (error) {
      console.error('Error fetching approved items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSession = (projectId: string, sessionId: string) => {
    router.push(`/projects/${projectId}?sessionId=${sessionId}`)
  }

  const handleRemoveApproval = async (outputId: string) => {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: false }),
      })

      if (response.ok) {
        // Remove from local state
        setApprovedItems(approvedItems.filter(item => item.id !== outputId))
      } else {
        throw new Error('Failed to remove approval')
      }
    } catch (error) {
      console.error('Error removing approval:', error)
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
              onClick={() => router.push('/projects?tab=review')}
              title="Back to Projects"
            />
            <div className="border-l border-border pl-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Reviewed
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              onClick={() => router.push('/reviewed')}
              title="Reviewed"
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => router.push('/bookmarks')}
              title="Bookmarks"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
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
      <main
        className="w-full min-h-screen bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/Full page_Sketch${theme === 'light' ? ' (Light)' : ''}.png')`
        }}
      >
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading approved items...</p>
            </div>
          ) : approvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">No Approved Items</h2>
                <p className="text-muted-foreground">
                  Items you approve in your projects will appear here for review.
                  Click the checkmark icon on any generated image or video to approve it.
                </p>
                <Button
                  onClick={() => router.push('/projects')}
                  className="mt-4"
                >
                  Go to Projects
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {approvedItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Image/Video */}
                  <div
                    className="aspect-square cursor-pointer relative"
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
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.fileUrl}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Approved badge */}
                    <div className="absolute top-2 right-2 bg-green-500/90 p-1.5 rounded-lg">
                      <Check className="h-4 w-4 text-white" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-medium px-4 text-center">
                        Open in {item.generation.session.name}
                      </p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">
                      {item.generation.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {item.generation.session.project.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveApproval(item.id)
                        }}
                        className="h-7 px-2"
                        title="Remove approval"
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
