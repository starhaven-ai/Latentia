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
    staleTime: 30 * 1000, // 30 seconds
  })
}

