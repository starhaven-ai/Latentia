import { Card, CardContent, CardFooter } from '@/components/ui/card'

export function ProjectSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted relative overflow-hidden">
          <div className="w-full h-full bg-muted-foreground/10" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start p-4 space-y-2">
        <div className="h-6 bg-muted-foreground/10 rounded w-3/4" />
        <div className="h-4 bg-muted-foreground/10 rounded w-1/2" />
        <div className="h-3 bg-muted-foreground/10 rounded w-2/3" />
      </CardFooter>
    </Card>
  )
}

export function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProjectSkeleton key={i} />
      ))}
    </div>
  )
}
