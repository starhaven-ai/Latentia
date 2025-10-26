import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Image, Video, Pencil, Check, X, Lock, Globe } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { Session } from '@/types/project'

interface SessionSidebarProps {
  sessions: Session[]
  activeSession: Session | null
  generationType: 'image' | 'video'
  projectOwnerId: string
  currentUserId?: string
  onSessionSelect: (session: Session) => void
  onSessionCreate: (type: 'image' | 'video') => void
  onSessionUpdate?: () => void
}

export function SessionSidebar({
  sessions,
  activeSession,
  generationType,
  projectOwnerId,
  currentUserId,
  onSessionSelect,
  onSessionCreate,
  onSessionUpdate,
}: SessionSidebarProps) {
  const { toast } = useToast()
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const [newSessionName, setNewSessionName] = useState('')
  
  const filteredSessions = sessions.filter((s) => s.type === generationType)
  const isOwner = currentUserId === projectOwnerId

  const handleRenameStart = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingSessionId(session.id)
    setNewSessionName(session.name)
  }

  const handleRenameSubmit = async (sessionId: string) => {
    if (!newSessionName.trim()) return
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName.trim() }),
      })

      if (!response.ok) throw new Error('Failed to rename session')

      toast({
        title: "Session renamed",
        description: "Session name updated successfully",
        variant: "default",
      })

      setRenamingSessionId(null)
      onSessionUpdate?.()
    } catch (error) {
      console.error('Error renaming session:', error)
      toast({
        title: "Rename failed",
        description: "Failed to update session name",
        variant: "destructive",
      })
    }
  }

  const handleRenameCancel = () => {
    setRenamingSessionId(null)
    setNewSessionName('')
  }

  const handleTogglePrivacy = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isOwner) {
      toast({
        title: "Permission denied",
        description: "Only the project owner can change session privacy",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !session.isPrivate }),
      })

      if (!response.ok) throw new Error('Failed to update privacy')

      const newStatus = !session.isPrivate ? 'Private' : 'Public'
      toast({
        title: "Privacy updated",
        description: `Session is now ${newStatus}`,
        variant: "default",
      })

      onSessionUpdate?.()
    } catch (error) {
      console.error('Error updating privacy:', error)
      toast({
        title: "Update failed",
        description: "Failed to update session privacy",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-72 border-r border-border/50 bg-muted/20 flex flex-col p-3 gap-3">
      {/* New Session Card */}
      <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
        <Button
          size="sm"
          className="w-full h-9 text-sm font-medium rounded-lg"
          onClick={() => onSessionCreate(generationType)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Sessions List with Card Styling */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredSessions.length === 0 ? (
          <div className="bg-card/50 border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">No {generationType} sessions yet</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`w-full text-left rounded-lg transition-all group ${
                activeSession?.id === session.id
                  ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                  : 'bg-card border border-border hover:border-primary/50 hover:shadow-md'
              }`}
            >
              {renamingSessionId === session.id ? (
                <div className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {session.type === 'image' ? (
                      <Image className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <Video className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <Input
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(session.id)
                        if (e.key === 'Escape') handleRenameCancel()
                      }}
                      autoFocus
                      className="h-7 text-sm flex-1 text-foreground bg-background border-border"
                    />
                    <button
                      onClick={() => handleRenameSubmit(session.id)}
                      className="p-1 rounded hover:bg-primary/20 text-green-600 hover:text-green-700 transition-colors"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRenameCancel}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onSessionSelect(session)}
                  className="w-full text-left"
                >
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      {session.type === 'image' ? (
                        <Image className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Video className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.name}</p>
                        <p className={`text-xs mt-1 ${
                          activeSession?.id === session.id 
                            ? 'text-primary-foreground/80' 
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isOwner ? (
                          <button
                            onClick={(e) => handleTogglePrivacy(session, e)}
                            className={`rounded-full p-0.5 flex items-center gap-0.5 transition-all relative opacity-0 group-hover:opacity-100 ${
                              activeSession?.id === session.id
                                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                            title={session.isPrivate ? 'Click to make public' : 'Click to make private'}
                          >
                            {/* Lock Icon - Left */}
                            <div className={`p-1 rounded-full transition-all z-10 ${
                              session.isPrivate
                                ? activeSession?.id === session.id ? 'text-primary' : 'text-background'
                                : activeSession?.id === session.id ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            }`}>
                              <Lock className="h-3 w-3" />
                            </div>
                            
                            {/* Globe Icon - Right */}
                            <div className={`p-1 rounded-full transition-all z-10 ${
                              !session.isPrivate
                                ? activeSession?.id === session.id ? 'text-primary' : 'text-background'
                                : activeSession?.id === session.id ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            }`}>
                              <Globe className="h-3 w-3" />
                            </div>

                            {/* Sliding Background */}
                            <div
                              className={`absolute top-0.5 bottom-0.5 w-6 rounded-full transition-all duration-300 ${
                                activeSession?.id === session.id ? 'bg-primary-foreground' : 'bg-primary'
                              } ${
                                !session.isPrivate ? 'left-[calc(50%-1px)]' : 'left-0.5'
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="rounded-full p-0.5 flex items-center gap-0.5 bg-white/5 opacity-50">
                            <div className={`p-1 ${session.isPrivate ? 'opacity-100' : 'opacity-40'}`}>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className={`p-1 ${!session.isPrivate ? 'opacity-100' : 'opacity-40'}`}>
                              <Globe className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                        )}
                        <button
                          onClick={(e) => handleRenameStart(session, e)}
                          className={`p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ${
                            activeSession?.id === session.id ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}
                          title="Rename session"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

