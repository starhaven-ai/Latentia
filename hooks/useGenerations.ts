import { useQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

async function fetchGenerations(sessionId: string): Promise<GenerationWithOutputs[]> {
  const response = await fetch(`/api/generations?sessionId=${sessionId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch generations')
  }
  
  return response.json()
}

export function useGenerations(sessionId: string | null) {
  return useQuery({
    queryKey: ['generations', sessionId],
    queryFn: () => fetchGenerations(sessionId!),
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 0, // Always refetch when invalidated
    refetchOnMount: true, // Refetch on component mount
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

