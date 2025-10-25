import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Users, Globe, User } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
  currentUserId?: string
  onProjectUpdate?: () => void
}

export function ProjectCard({ project, currentUserId, onProjectUpdate }: ProjectCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [updating, setUpdating] = useState(false)

  const isOwner = currentUserId && project.ownerId === currentUserId

  const handleClick = () => {
    router.push(`/projects/${project.id}`)
  }

  const handleTogglePrivacy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOwner) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShared: !project.isShared }),
      })

      if (response.ok) {
        toast({
          title: project.isShared ? 'Project set to private' : 'Project shared',
          description: project.isShared
            ? 'Only you can see this project now'
            : 'Other users can now see this project',
          variant: 'default',
        })
        onProjectUpdate?.()
      } else {
        throw new Error('Failed to update privacy')
      }
    } catch (error) {
      console.error('Error updating privacy:', error)
      toast({
        title: 'Update failed',
        description: 'Failed to update project privacy',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getOwnerName = () => {
    if (!project.owner) return 'Unknown'
    return project.owner.displayName || project.owner.username || 'Unknown'
  }

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors group"
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl text-muted-foreground">
                {project.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            {isOwner ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-auto p-1.5 bg-background/90 backdrop-blur-sm hover:bg-background/95"
                onClick={handleTogglePrivacy}
                disabled={updating}
                title={project.isShared ? 'Make private' : 'Make shared'}
              >
                {project.isShared ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                {project.isShared ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 space-y-1">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
          <User className="h-3 w-3" />
          <span>{getOwnerName()}</span>
          <span>•</span>
          <span>{formatDate(project.updatedAt)}</span>
        </div>
      </CardFooter>
    </Card>
  )
}

