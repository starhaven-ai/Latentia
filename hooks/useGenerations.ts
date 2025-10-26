import { useQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

async function fetchGenerations(sessionId: string, limit: number = 50): Promise<GenerationWithOutputs[]> {
  const response = await fetch(`/api/generations?sessionId=${sessionId}&limit=${limit}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch generations')
  }
  
  return response.json()
}

export function useGenerations(sessionId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['generations', sessionId, limit],
    queryFn: () => fetchGenerations(sessionId!, limit),
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 30000, // Cache for 30 seconds - data is fresh for 30s
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are processing generations
      const data = query.state.data as GenerationWithOutputs[] | undefined
      if (!data) return false
      
      // Check if any generations are processing
      const hasProcessingGenerations = data.some(gen => gen.status === 'processing')
      
      // Silently poll - don't log on every check to avoid spam
      
      return hasProcessingGenerations ? 3000 : false
    },
  })
}

