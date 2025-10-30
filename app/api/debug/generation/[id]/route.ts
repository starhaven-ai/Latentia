import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Debug endpoint to inspect a generation end-to-end.
 * Returns DB status, outputs count, age, lastHeartbeatAt, lastStep, and debugLogs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Generation ID required' }, { status: 400 })
    }

    const generation = await prisma.generation.findUnique({
      where: { id },
      include: {
        outputs: true,
        session: { select: { type: true } },
      },
    })

    if (!generation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const params = (generation.parameters as any) || {}
    const createdAt = generation.createdAt as unknown as Date
    const ageMs = Date.now() - new Date(createdAt).getTime()

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      modelId: generation.modelId,
      sessionType: generation.session.type,
      createdAt: generation.createdAt,
      ageMs,
      outputs: generation.outputs.length,
      lastStep: params.lastStep,
      lastHeartbeatAt: params.lastHeartbeatAt,
      debugLogs: Array.isArray(params.debugLogs) ? params.debugLogs : [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}


