import { useQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

interface GenerationsResponse {
  data: GenerationWithOutputs[]
  pagination: {
    hasMore: boolean
    nextCursor: string | null
    limit: number
  }
}

async function fetchGenerations(sessionId: string, limit: number = 20, cursor?: string): Promise<GenerationsResponse> {
  const params = new URLSearchParams({
    sessionId,
    limit: limit.toString(),
  })
  
  if (cursor) {
    params.append('cursor', cursor)
  }
  
  const response = await fetch(`/api/generations?${params}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch generations')
  }
  
  const result = await response.json()
  
  // Handle backward compatibility - if API returns array directly, wrap it
  if (Array.isArray(result)) {
    return {
      data: result,
      pagination: {
        hasMore: false,
        nextCursor: null,
        limit,
      },
    }
  }
  
  return result
}

export function useGenerations(sessionId: string | null, limit: number = 20) {
  const query = useQuery({
    queryKey: ['generations', sessionId],
    queryFn: () => fetchGenerations(sessionId!, limit),
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 10000, // Cache for 10 seconds - reduce to see updates faster
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: 'always', // Always refetch to get latest status
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: (query) => {
      // Poll more frequently if there are processing generations
      const response = query.state.data as GenerationsResponse | undefined
      if (!response?.data) return false
      
      // Check if any generations are processing
      const processingGenerations = response.data.filter(gen => gen.status === 'processing')
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
    select: (response) => response.data, // Extract just the data array for easier consumption
  })
  
  return query
}

