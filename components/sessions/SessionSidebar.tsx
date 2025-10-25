import { Button } from '@/components/ui/button'
import { Plus, Image, Video } from 'lucide-react'
import type { Session } from '@/types/project'

interface SessionSidebarProps {
  sessions: Session[]
  activeSession: Session | null
  generationType: 'image' | 'video'
  onSessionSelect: (session: Session) => void
  onSessionCreate: (type: 'image' | 'video') => void
}

export function SessionSidebar({
  sessions,
  activeSession,
  generationType,
  onSessionSelect,
  onSessionCreate,
}: SessionSidebarProps) {
  const filteredSessions = sessions.filter((s) => s.type === generationType)

  return (
    <div className="w-60 border-r border-border/50 bg-muted/20 flex flex-col p-3 gap-3">
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
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full text-left rounded-lg transition-all ${
                activeSession?.id === session.id
                  ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                  : 'bg-card border border-border hover:border-primary/50 hover:shadow-md'
              }`}
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
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

