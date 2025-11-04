import { useQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

async function fetchGenerations(sessionId: string, limit: number = 20): Promise<GenerationWithOutputs[]> {
  const response = await fetch(`/api/generations?sessionId=${sessionId}&limit=${limit}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch generations')
  }
  
  return response.json()
}

/**
 * Check for stuck generations and trigger cleanup if needed
 * A generation is considered stuck if it's been processing for > 5 minutes
 */
async function checkAndCleanupStuckGenerations(generations: GenerationWithOutputs[]) {
  const now = Date.now()
  const FIVE_MINUTES = 5 * 60 * 1000
  
  const stuckGenerations = generations.filter(gen => {
    if (gen.status !== 'processing') return false
    const createdAt = new Date(gen.createdAt).getTime()
    return (now - createdAt) > FIVE_MINUTES
  })
  
  if (stuckGenerations.length > 0) {
    console.warn(`⚠️ Found ${stuckGenerations.length} stuck generation(s), triggering cleanup...`)
    // Trigger cleanup endpoint (best effort, don't await)
    fetch('/api/admin/cleanup-stuck-generations', {
      method: 'POST',
    }).catch(err => {
      console.error('Failed to trigger cleanup:', err)
    })
  }
}

export function useGenerations(sessionId: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['generations', sessionId],
    queryFn: async () => {
      const data = await fetchGenerations(sessionId!, limit)
      // Check for stuck generations after fetching
      checkAndCleanupStuckGenerations(data)
      return data
    },
    enabled: !!sessionId, // Only run if sessionId exists
    staleTime: 10 * 1000, // 10 seconds - generations update frequently during processing
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes for faster navigation
    refetchOnMount: false, // Use cached data if fresh - real-time updates handle new data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: (query) => {
      // Poll more frequently if there are processing generations
      const data = query.state.data as GenerationWithOutputs[] | undefined
      if (!data) return false
      
      // Check if any generations are processing
      const processingGenerations = data.filter(gen => gen.status === 'processing')
      const hasProcessingGenerations = processingGenerations.length > 0
      
      if (hasProcessingGenerations) {
        // Check for stuck generations periodically (every 10th poll ~20 seconds)
        if (Math.random() < 0.1) {
          checkAndCleanupStuckGenerations(data)
        }
        
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

