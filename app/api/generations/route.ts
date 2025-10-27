import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

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
    const limit = parseInt(searchParams.get('limit') || '20') // Default to 20 for performance
    const cursor = searchParams.get('cursor') // Cursor for pagination (generation ID)

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Build where clause with cursor for pagination
    const where: any = {
      sessionId,
      userId: session.user.id, // Only fetch user's own generations
    }

    // If cursor is provided, fetch generations older than the cursor
    if (cursor) {
      where.id = {
        lt: cursor, // Less than cursor (older generations)
      }
    }

    // Fetch generations with their outputs and user profile (paginated)
    const generations = await prisma.generation.findMany({
      where,
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
        createdAt: 'desc', // Newest first for pagination
      },
      take: Math.min(limit + 1, 51), // Fetch one extra to determine if there are more results (max 50)
    })

    // Check if there are more results
    const hasMore = generations.length > limit
    const items = hasMore ? generations.slice(0, limit) : generations
    const nextCursor = hasMore ? items[items.length - 1].id : null

    // Fetch bookmarks separately for efficiency
    const outputIds = items.flatMap((g: any) => g.outputs.map((o: any) => o.id))
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
    const generationsWithBookmarks = items.map((generation: any) => ({
      ...generation,
      outputs: generation.outputs.map((output: any) => ({
        ...output,
        isBookmarked: bookmarkedOutputIds.has(output.id),
      })),
    }))

    // Return data with pagination metadata
    return NextResponse.json({
      data: generationsWithBookmarks,
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

