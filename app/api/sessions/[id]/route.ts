import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 }
      )
    }

    // Update session
    const updatedSession = await prisma.session.update({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this session
      },
      data: {
        name: name.trim(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

