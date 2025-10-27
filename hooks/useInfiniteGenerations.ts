import { useInfiniteQuery } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

interface PaginatedGenerationsResponse {
  data: GenerationWithOutputs[]
  nextCursor?: string
  hasMore: boolean
}

async function fetchGenerations({
  sessionId,
  cursor,
  limit = 10,
}: {
  sessionId: string
  cursor?: string
  limit?: number
}): Promise<PaginatedGenerationsResponse> {
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

  const data = await response.json()

  // Handle both old format (array) and new format (paginated)
  if (Array.isArray(data)) {
    return {
      data,
      nextCursor: undefined,
      hasMore: false,
    }
  }

  return data
}

export function useInfiniteGenerations(sessionId: string | null, limit: number = 10) {
  return useInfiniteQuery({
    queryKey: ['generations', 'infinite', sessionId],
    queryFn: ({ pageParam }) =>
      fetchGenerations({
        sessionId: sessionId!,
        cursor: pageParam as string | undefined,
        limit,
      }),
    enabled: !!sessionId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Return the cursor for the next page, or undefined if no more pages
      return lastPage.hasMore ? (lastPage.nextCursor as string | undefined) : undefined
    },
    staleTime: 10 * 1000, // 10 seconds - same as regular generations
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory for faster navigation
    refetchOnMount: true, // ALWAYS refetch to get latest status - critical for processing generations
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Poll more frequently if there are processing generations
      const allData = query.state.data
      if (!allData) return false

      const allGenerations = allData.pages.flatMap((page) => page.data)
      const processingGenerations = allGenerations.filter((gen) => gen.status === 'processing')
      const hasProcessingGenerations = processingGenerations.length > 0

      if (hasProcessingGenerations) {
        return 2000 // Poll every 2 seconds
      }

      return false
    },
  })
}

