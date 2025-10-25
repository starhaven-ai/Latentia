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
    <div className="w-56 border-r border-border/50 bg-background/95 flex flex-col">
      <div className="p-3 border-b border-border/50">
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs font-medium rounded-lg"
          onClick={() => onSessionCreate(generationType)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground/60">
            No {generationType} sessions yet
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors text-xs ${
                activeSession?.id === session.id
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                {session.type === 'image' ? (
                  <Image className="h-3 w-3 flex-shrink-0 opacity-60" />
                ) : (
                  <Video className="h-3 w-3 flex-shrink-0 opacity-60" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{session.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
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

