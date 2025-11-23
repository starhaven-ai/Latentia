import { useInfiniteQuery } from '@tanstack/react-query'
import { logMetric } from '@/lib/metrics'
import { fetchGenerationsPage, PaginatedGenerationsResponse } from '@/lib/api/generations'

async function fetchGenerations({
  sessionId,
  cursor,
  limit = 10,
}: {
  sessionId: string
  cursor?: string
  limit?: number
}): Promise<PaginatedGenerationsResponse> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()

  try {
    const normalized = await fetchGenerationsPage({
      sessionId,
      cursor,
      limit,
    })

    logMetric({
      name: 'hook_fetch_generations_infinite',
      status: 'success',
      durationMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
      meta: {
        sessionId,
        limit,
        cursor,
        resultCount: normalized.data.length,
        hasMore: normalized.hasMore,
      },
    })

    return normalized
  } catch (error: any) {
    logMetric({
      name: 'hook_fetch_generations_infinite',
      status: 'error',
      durationMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
      meta: { sessionId, limit, cursor, error: error?.message },
    })
    throw error
  }
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
    refetchOnMount: false, // Don't auto-refetch - rely on optimistic updates and real-time subscriptions
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

