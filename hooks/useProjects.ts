import { useQuery } from '@tanstack/react-query'
import type { Project } from '@/types/project'

async function fetchProjects(): Promise<(Project & { thumbnailUrl?: string | null })[]> {
  const response = await fetch('/api/projects/with-thumbnails')
  
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  
  const data = await response.json()
  
  // Parse dates from strings to Date objects
  return data.map((p: any) => ({
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }))
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes - projects rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory for faster navigation
    refetchOnMount: false, // Use cached data if fresh (within staleTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
}

