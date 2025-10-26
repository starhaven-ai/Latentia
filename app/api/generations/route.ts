import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/generations?sessionId=xxx - Get all generations for a session
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
    const limit = parseInt(searchParams.get('limit') || '20') // Default to 20 for performance, max 100

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch generations with their outputs and user profile (paginated)
    const generations = await prisma.generation.findMany({
      where: {
        sessionId,
        userId: session.user.id, // Only fetch user's own generations
      },
      take: Math.min(limit, 500), // Max 500
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
            isApproved: true,
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
      take: Math.min(limit, 100), // Max 100 generations
    })

    // Fetch bookmarks separately for efficiency
    const outputIds = generations.flatMap(g => g.outputs.map(o => o.id))
    const bookmarks = outputIds.length > 0
      ? await prisma.bookmark.findMany({
          where: {
            outputId: { in: outputIds },
            userId: session.user.id,
          },
          select: {
            outputId: true,
          },
        })
      : []

    const bookmarkedOutputIds = new Set(bookmarks.map(b => b.outputId))

    // Add isBookmarked field to outputs
    const generationsWithBookmarks = generations.map((generation: any) => ({
      ...generation,
      outputs: generation.outputs.map((output: any) => ({
        ...output,
        isBookmarked: bookmarkedOutputIds.has(output.id),
      })),
    }))

    return NextResponse.json(generationsWithBookmarks)
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

