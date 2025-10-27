import { useQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

async function fetchGenerations(sessionId: string, limit: number = 20): Promise<GenerationWithOutputs[]> {
  const response = await fetch(`/api/generations?sessionId=${sessionId}&limit=${limit}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch generations')
  }
  
  return response.json()
}

export function useGenerations(sessionId: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['generations', sessionId],
    queryFn: () => fetchGenerations(sessionId!, limit),
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 10 * 1000, // 10 seconds - generations update frequently during processing
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: 'always', // Always refetch to get latest status
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: (query) => {
      // Poll more frequently if there are processing generations
      const data = query.state.data as GenerationWithOutputs[] | undefined
      if (!data) return false
      
      // Check if any generations are processing
      const processingGenerations = data.filter(gen => gen.status === 'processing')
      const hasProcessingGenerations = processingGenerations.length > 0
      
      if (hasProcessingGenerations) {
        // Log occasionally for debugging (every 10th poll)
        if (Math.random() < 0.1) {
          console.log(`📊 Polling: ${processingGenerations.length} generation(s) in progress`)
        }
        
        // Poll every 2 seconds for faster updates
        return 2000
      }
      
      return false
    },
  })
}

