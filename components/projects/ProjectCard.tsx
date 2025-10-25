import { useRouter } from 'next/navigation'
import { Lock, Users } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/projects/${project.id}`)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
            {project.isShared ? (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                <Users className="h-4 w-4 text-accent" />
              </div>
            ) : (
              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                <Lock className="h-4 w-4 text-muted-foreground" />
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
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(project.updatedAt)}
        </p>
      </CardFooter>
    </Card>
  )
}

