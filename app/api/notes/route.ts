import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/notes - Create a note
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { outputId, text, context } = await request.json()

    if (!outputId) {
      return NextResponse.json({ error: 'outputId is required' }, { status: 400 })
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        outputId: outputId,
        text: text.trim(),
        context: context || null,
      },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}

// GET /api/notes - Get notes for a specific output or all notes for the user
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const outputId = searchParams.get('outputId')

    const where: any = {
      userId: user.id,
    }

    if (outputId) {
      where.outputId = outputId
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        output: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
