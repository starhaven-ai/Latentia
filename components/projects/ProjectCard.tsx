import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Users, Globe, User, Pencil, Check, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(project.name)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUserId && project.ownerId === currentUserId

  // Fetch latest generation thumbnail
  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        // Get all sessions for this project
        const sessionsResponse = await fetch(`/api/sessions?projectId=${project.id}`)
        if (!sessionsResponse.ok) return
        
        const sessions = await sessionsResponse.json()
        if (!sessions || sessions.length === 0) return

        // Get the latest session (sorted by createdAt desc)
        const latestSession = sessions.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]

        // Get generations for the latest session
        const generationsResponse = await fetch(`/api/generations?sessionId=${latestSession.id}`)
        if (!generationsResponse.ok) return
        
        const generations = await generationsResponse.json()
        if (!generations || generations.length === 0) return

        // Get the latest generation with an image output
        const latestGeneration = generations
          .filter((g: any) => g.outputs && g.outputs.length > 0 && g.outputs[0].fileType === 'image')
          .sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]

        if (latestGeneration && latestGeneration.outputs && latestGeneration.outputs[0]) {
          setThumbnailUrl(latestGeneration.outputs[0].fileUrl)
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error)
      }
    }

    fetchThumbnail()
  }, [project.id])

  const handleClick = () => {
    if (!isEditingName) {
      router.push(`/projects/${project.id}`)
    }
  }

  const handleEditName = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditingName(true)
  }

  const handleSaveName = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!editedName.trim() || editedName === project.name) {
      setIsEditingName(false)
      setEditedName(project.name)
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      })

      if (response.ok) {
        toast({
          title: 'Project renamed',
          description: `Project renamed to "${editedName.trim()}"`,
          variant: 'default',
        })
        setIsEditingName(false)
        onProjectUpdate?.()
      } else {
        throw new Error('Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      toast({
        title: 'Update failed',
        description: 'Failed to update project name',
        variant: 'destructive',
      })
      setEditedName(project.name)
    } finally {
      setUpdating(false)
    }
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

  const handleDeleteStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete project')

      toast({
        title: "Project deleted",
        description: "Project and all its contents have been permanently deleted",
        variant: "default",
      })

      // Navigate back to projects page
      router.push('/projects')
      onProjectUpdate?.()
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
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
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
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
              <button
                onClick={handleTogglePrivacy}
                disabled={updating}
                className="bg-background/90 backdrop-blur-sm rounded-full p-1 flex items-center gap-0.5 hover:bg-background/95 transition-all relative"
                title={project.isShared ? 'Click to make private' : 'Click to make shared'}
              >
                {/* Lock Icon - Left */}
                <div className={`p-1.5 rounded-full transition-all z-10 ${
                  !project.isShared 
                    ? 'text-background' 
                    : 'text-muted-foreground'
                }`}>
                  <Lock className="h-3.5 w-3.5" />
                </div>
                
                {/* Globe Icon - Right */}
                <div className={`p-1.5 rounded-full transition-all z-10 ${
                  project.isShared 
                    ? 'text-background' 
                    : 'text-muted-foreground'
                }`}>
                  <Globe className="h-3.5 w-3.5" />
                </div>

                {/* Sliding Background */}
                <div
                  className={`absolute top-1 bottom-1 w-7 bg-primary rounded-full transition-all duration-300 ${
                    project.isShared ? 'left-[calc(50%-2px)]' : 'left-1'
                  }`}
                />
              </button>
            ) : (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1 flex items-center gap-0.5">
                <div className={`p-1.5 ${!project.isShared ? 'opacity-100' : 'opacity-40'}`}>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className={`p-1.5 ${project.isShared ? 'opacity-100' : 'opacity-40'}`}>
                  <Globe className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 space-y-1">
        {isEditingName ? (
          <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveName(e as any)
                } else if (e.key === 'Escape') {
                  setIsEditingName(false)
                  setEditedName(project.name)
                }
              }}
              className="text-lg font-semibold h-9 text-foreground bg-background border-border"
              autoFocus
              disabled={updating}
            />
            <button
              onClick={handleSaveName}
              disabled={updating}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
              title="Save name"
            >
              <Check className="h-4 w-4 text-primary" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full group/title">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors flex-1">
              {project.name}
            </h3>
            {isOwner && (
              <>
                <button
                  onClick={handleEditName}
                  className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-muted rounded transition-all"
                  title="Rename project"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={handleDeleteStart}
                  className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                  title="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </>
            )}
          </div>
        )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title="Delete Project?"
        description={`⚠️ WARNING: You are about to delete "${project.name}" and ALL of its contents, including all sessions, generations, and images. This action is PERMANENT and CANNOT be undone. Are you absolutely sure?`}
        confirmText={isDeleting ? "Deleting..." : "Delete Forever"}
        cancelText="Cancel"
        variant="destructive"
      />
    </Card>
  )
}

