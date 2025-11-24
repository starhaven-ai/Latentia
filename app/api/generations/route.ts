import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET /api/generations?sessionId=xxx&cursor=xxx - Get generations for a session with cursor pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '10') // Default to 10 for infinite scroll

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Build where clause with cursor for pagination
    const whereClause: any = {
      sessionId,
      userId: session.user.id, // Only fetch user's own generations
    }

    // Add cursor for pagination (start after this ID)
    if (cursor) {
      whereClause.id = { gt: cursor }
    }

    // Fetch generations with their outputs and user profile
    const generations = await prisma.generation.findMany({
      where: whereClause,
      select: {
        id: true,
        sessionId: true,
        userId: true,
        modelId: true,
        prompt: true,
        negativePrompt: true,
        parameters: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        outputs: {
          select: {
            id: true,
            generationId: true,
            fileUrl: true,
            fileType: true,
            width: true,
            height: true,
            duration: true,
            isStarred: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
      },
    },
    orderBy: {
      createdAt: 'asc', // Oldest first, newest at bottom
    },
    take: limit + 1, // Fetch one extra to check if there's more
  })

    // Check if there's more data
    const hasMore = generations.length > limit
    const data = hasMore ? generations.slice(0, limit) : generations
    const nextCursor = hasMore ? generations[limit - 1].id : undefined

    // Fetch bookmarks separately for efficiency
    const outputIds = generations.flatMap((g: any) => g.outputs.map((o: any) => o.id))
    const bookmarks = outputIds.length > 0
      ? await (prisma as any).bookmark.findMany({
          where: {
            outputId: { in: outputIds },
            userId: session.user.id,
          },
          select: {
            outputId: true,
          },
        })
      : []

    const bookmarkedOutputIds = new Set(bookmarks.map((b: any) => b.outputId))

    // Add isBookmarked field to outputs
    const generationsWithBookmarks = data.map((generation: any) => ({
      ...generation,
      outputs: generation.outputs.map((output: any) => ({
        ...output,
        isBookmarked: bookmarkedOutputIds.has(output.id),
      })),
    }))

    return NextResponse.json({
      data: generationsWithBookmarks,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

