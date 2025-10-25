import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    // Get or create profile
    let profile = await prisma.profile.findUnique({
      where: { id: session.user.id },
    })

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await prisma.profile.create({
        data: {
          id: session.user.id,
          username: session.user.email?.split('@')[0] || null,
          displayName: session.user.user_metadata?.full_name || null,
          avatarUrl: session.user.user_metadata?.avatar_url || null,
          role: 'studio',
        },
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { displayName, username, avatarUrl, role } = body

    // Update profile
    const profile = await prisma.profile.upsert({
      where: { id: session.user.id },
      update: {
        displayName: displayName?.trim() || null,
        username: username?.trim() || null,
        avatarUrl: avatarUrl || null,
        role: role || 'studio',
        updatedAt: new Date(),
      },
      create: {
        id: session.user.id,
        displayName: displayName?.trim() || null,
        username: username?.trim() || null,
        avatarUrl: avatarUrl || null,
        role: role || 'studio',
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

