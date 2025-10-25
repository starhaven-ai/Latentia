'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, Menu, X } from 'lucide-react'
import { SessionSidebar } from '@/components/sessions/SessionSidebar'
import { GenerationInterface } from '@/components/generation/GenerationInterface'
import type { Session } from '@/types/project'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [projectName, setProjectName] = useState('Loading...')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchProject()
  }, [params.id])

  const fetchProject = async () => {
    try {
      // TODO: Fetch project and sessions from database
      setProjectName('My Project')
      
      // Create a default session if none exist
      const defaultSession: Session = {
        id: '1',
        projectId: params.id as string,
        name: 'Session 1',
        type: 'image',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSessions([defaultSession])
      setActiveSession(defaultSession)
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const handleSessionCreate = (type: 'image' | 'video') => {
    const newSession: Session = {
      id: Math.random().toString(36).substring(7),
      projectId: params.id as string,
      name: `${type === 'image' ? 'Image' : 'Video'} Session ${sessions.length + 1}`,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setSessions([...sessions, newSession])
    setActiveSession(newSession)
    setGenerationType(type)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{projectName}</h1>
            <p className="text-xs text-muted-foreground">
              {activeSession?.name || 'No session'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setGenerationType('image')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                generationType === 'image'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => setGenerationType('video')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                generationType === 'video'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Video
            </button>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sessions Sidebar - Collapsible */}
        {sidebarOpen && (
          <>
            {/* Overlay for mobile */}
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 z-30 lg:relative">
              <SessionSidebar
                sessions={sessions}
                activeSession={activeSession}
                generationType={generationType}
                onSessionSelect={(session) => {
                  setActiveSession(session)
                  setSidebarOpen(false)
                }}
                onSessionCreate={handleSessionCreate}
              />
            </div>
          </>
        )}

        {/* Generation Interface - Full width when sidebar closed */}
        <GenerationInterface
          session={activeSession}
          generationType={generationType}
        />
      </div>
    </div>
  )
}

