import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Debug endpoint to find and fix stuck generations
 * GET /api/debug/stuck-generations
 */
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

    // Find stuck generations (processing for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const stuckGenerations = await prisma.generation.findMany({
      where: {
        userId: session.user.id,
        status: 'processing',
        createdAt: {
          lt: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        prompt: true,
        modelId: true,
        status: true,
        createdAt: true,
        sessionId: true,
        outputs: {
          select: {
            id: true,
            fileUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const report = {
      totalStuck: stuckGenerations.length,
      generations: stuckGenerations.map((gen) => ({
        id: gen.id,
        prompt: gen.prompt.substring(0, 50) + '...',
        modelId: gen.modelId,
        minutesStuck: Math.floor((Date.now() - gen.createdAt.getTime()) / 60000),
        hasOutputs: gen.outputs.length > 0,
        outputCount: gen.outputs.length,
      })),
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error checking stuck generations:', error)
    return NextResponse.json(
      { error: 'Failed to check stuck generations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/debug/stuck-generations - Fix stuck generations
 */
export async function POST(request: NextRequest) {
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
    const { generationId, action } = body

    if (action === 'fix-all') {
      // Mark all stuck generations as failed
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      
      const result = await prisma.generation.updateMany({
        where: {
          userId: session.user.id,
          status: 'processing',
          createdAt: {
            lt: fiveMinutesAgo,
          },
        },
        data: {
          status: 'failed',
          parameters: {
            error: 'Generation timeout - automatically stopped',
          },
        },
      })

      return NextResponse.json({
        message: `Fixed ${result.count} stuck generation(s)`,
        count: result.count,
      })
    } else if (action === 'fix-one' && generationId) {
      // Mark specific generation as failed
      const result = await prisma.generation.update({
        where: {
          id: generationId,
          userId: session.user.id,
        },
        data: {
          status: 'failed',
          parameters: {
            error: 'Generation timeout - manually stopped',
          },
        },
      })

      return NextResponse.json({
        message: 'Generation marked as failed',
        generation: result,
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "fix-all" or "fix-one" with generationId' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fixing stuck generations:', error)
    return NextResponse.json(
      { error: 'Failed to fix stuck generations' },
      { status: 500 }
    )
  }
}

