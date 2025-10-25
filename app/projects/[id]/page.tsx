'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, Sun, Moon } from 'lucide-react'
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
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
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3 flex-1">
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

          {/* Center - Mode Toggle with Icons */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={generationType === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setGenerationType('image')}
              className="h-8 w-8 p-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </Button>
            <Button
              variant={generationType === 'video' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setGenerationType('video')}
              className="h-8 w-8 p-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="transition-transform hover:rotate-12"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sessions Sidebar - Always Visible */}
        <SessionSidebar
          sessions={sessions}
          activeSession={activeSession}
          generationType={generationType}
          onSessionSelect={setActiveSession}
          onSessionCreate={handleSessionCreate}
        />

        {/* Generation Interface */}
        <GenerationInterface
          session={activeSession}
          generationType={generationType}
        />
      </div>
    </div>
  )
}

