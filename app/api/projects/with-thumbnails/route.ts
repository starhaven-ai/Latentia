import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Optimized endpoint to fetch projects with thumbnails
 * Uses a single query with joins instead of N+1 pattern
 * 
 * Returns projects with:
 * - Owner profile (displayName, username)
 * - Latest generation thumbnail for each project
 * - Session count per project
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized single query with includes to fetch all related data at once
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          {
            AND: [
              { isShared: true },
              { ownerId: { not: user.id } },
            ],
          },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        isShared: true,
        createdAt: true,
        updatedAt: true,
        // Include owner profile in a single query
        owner: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        // Include sessions with aggregation
        sessions: {
          select: {
            id: true,
            // Get the most recent generation with an image for thumbnail
            generations: {
              where: {
                status: 'completed',
              },
              select: {
                outputs: {
                  where: {
                    fileType: 'image',
                  },
                  select: {
                    fileUrl: true,
                  },
                  take: 1,
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        // Count sessions efficiently
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Transform the data to match the expected format
    const projectsWithThumbnails = projects.map(project => {
      // Find first thumbnail from sessions
      let thumbnailUrl: string | null = null

      for (const session of project.sessions) {
        if (session.generations.length > 0 && session.generations[0].outputs.length > 0) {
          thumbnailUrl = session.generations[0].outputs[0].fileUrl
          break
        }
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        isShared: project.isShared,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        owner: project.owner || {
          id: project.ownerId,
          displayName: null,
          username: null,
        },
        thumbnailUrl,
        sessionCount: project._count.sessions,
      }
    })

    // Add cache headers for better performance
    return NextResponse.json(projectsWithThumbnails, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    })
  } catch (error) {
    console.error('Error fetching projects with thumbnails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

