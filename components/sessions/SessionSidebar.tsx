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
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-3 border-b border-border">
        <Button
          size="sm"
          className="w-full"
          onClick={() => onSessionCreate(generationType)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No {generationType} sessions yet
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                activeSession?.id === session.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-start gap-2">
                {session.type === 'image' ? (
                  <Image className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <Video className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

