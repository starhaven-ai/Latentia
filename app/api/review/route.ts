import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Fetch approved outputs with all necessary relations
    const approvedOutputs = await prisma.output.findMany({
      where: {
        isApproved: true,
      },
      include: {
        generation: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            session: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(approvedOutputs)
  } catch (error) {
    console.error('Error fetching approved outputs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approved outputs' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to update approval status
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { outputId, isApproved } = body

    if (!outputId || typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the approval status
    const updatedOutput = await prisma.output.update({
      where: { id: outputId },
      data: { isApproved },
    })

    return NextResponse.json(updatedOutput)
  } catch (error) {
    console.error('Error updating approval status:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
