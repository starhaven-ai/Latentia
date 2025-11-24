import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET /api/approved - Get all approved outputs for the current user
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all outputs that are approved and belong to the user
    const approvedOutputs = await prisma.output.findMany({
      where: {
        isApproved: true,
        generation: {
          userId: user.id,
        },
      },
      include: {
        generation: {
          include: {
            session: {
              include: {
                project: true,
              },
            },
          },
        },
        notes: {
          where: {
            userId: user.id,
            context: 'approval',
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
    })

    return NextResponse.json(approvedOutputs, {
      headers: {
        'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
      }
    })
  } catch (error) {
    console.error('Error fetching approved outputs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approved outputs' },
      { status: 500 }
    )
  }
}
