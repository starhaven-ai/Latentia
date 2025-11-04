import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Cleanup endpoint for stuck generations
 * Marks generations as failed if they've been processing > 5 minutes
 * Can be called manually or via cron job
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

    // Find generations stuck > 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const stuckGenerations = await prisma.generation.findMany({
      where: {
        status: 'processing',
        createdAt: {
          lt: fiveMinutesAgo,
        },
      },
    })

    if (stuckGenerations.length === 0) {
      return NextResponse.json({ 
        message: 'No stuck generations found',
        cleaned: 0 
      })
    }

    // Mark each as failed individually to preserve their parameters
    const cleanedIds: string[] = []
    for (const gen of stuckGenerations) {
      try {
        await prisma.generation.update({
          where: { id: gen.id },
          data: {
            status: 'failed',
            parameters: {
              ...(gen.parameters as any || {}),
              error: 'Processing timed out - exceeded Vercel function execution limit',
              timeoutDetectedAt: new Date().toISOString(),
            },
          },
        })
        cleanedIds.push(gen.id)
      } catch (error) {
        console.error(`Failed to cleanup generation ${gen.id}:`, error)
      }
    }

    return NextResponse.json({
      message: `Cleaned up ${cleanedIds.length} stuck generation(s)`,
      cleaned: cleanedIds.length,
      generationIds: cleanedIds,
    })
  } catch (error: any) {
    console.error('Error cleaning up stuck generations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup stuck generations' },
      { status: 500 }
    )
  }
}

