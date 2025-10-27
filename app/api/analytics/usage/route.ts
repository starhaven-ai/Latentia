import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { modelRegistry } from '@/lib/models/registry'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get total generations
    const totalGenerations = await prisma.generation.count({
      where: { userId },
    })

    // Get image generations count
    const imageGenerations = await prisma.generation.count({
      where: {
        userId,
        outputs: {
          some: {
            fileType: 'image',
          },
        },
      },
    })

    // Get video generations count
    const videoGenerations = await prisma.generation.count({
      where: {
        userId,
        outputs: {
          some: {
            fileType: 'video',
          },
        },
      },
    })

    // Get model usage statistics
    const modelUsage = await prisma.generation.groupBy({
      by: ['modelId'],
      where: { userId },
      _count: {
        modelId: true,
      },
      orderBy: {
        _count: {
          modelId: 'desc',
        },
      },
      take: 10, // Top 10 models
    })

    // Map model IDs to names and calculate percentages
    const topModels = modelUsage.map((usage) => {
      const model = modelRegistry.getModel(usage.modelId)
      const modelName = model?.getConfig().name || usage.modelId
      const count = usage._count.modelId
      const percentage = totalGenerations > 0 ? (count / totalGenerations) * 100 : 0

      return {
        modelId: usage.modelId,
        modelName,
        count,
        percentage,
      }
    })

    return NextResponse.json({
      totalGenerations,
      totalImages: imageGenerations,
      totalVideos: videoGenerations,
      topModels,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

