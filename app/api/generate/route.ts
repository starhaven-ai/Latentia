import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getModel } from '@/lib/models/registry'

export async function POST(request: NextRequest) {
  let generation: any = null
  
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user

    // Parse request body
    const body = await request.json()
    const {
      sessionId,
      modelId,
      prompt,
      negativePrompt,
      parameters: requestParameters,
    } = body

    // Validate required fields
    if (!sessionId || !modelId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, modelId, prompt' },
        { status: 400 }
      )
    }

    // Verify model exists
    const model = getModel(modelId)
    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${modelId}` },
        { status: 404 }
      )
    }

    // Create generation record in database with 'processing' status
    generation = await prisma.generation.create({
      data: {
        sessionId,
        userId: user.id,
        modelId,
        prompt,
        negativePrompt: negativePrompt || null,
        parameters: requestParameters || {},
        status: 'processing',
      },
    })

    console.log(`[${generation.id}] Generation created, starting async processing`)

    // Trigger background processing asynchronously (fire and forget)
    // Don't await - this allows us to return immediately
    const baseUrl = request.nextUrl.origin
    fetch(`${baseUrl}/api/generate/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationId: generation.id,
      }),
    }).catch((error) => {
      console.error(`[${generation.id}] Failed to trigger background processing:`, error)
      // If fetch fails, update status to failed
      prisma.generation.update({
        where: { id: generation.id },
        data: { 
          status: 'failed',
          parameters: {
            ...(requestParameters || {}),
            error: 'Failed to start background processing',
          }
        },
      }).catch(console.error)
    })

    // Return immediately with processing status
    return NextResponse.json({
      id: generation.id,
      status: 'processing',
      message: 'Generation started. Poll for updates.',
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    
    // Update generation status to failed if we created it
    if (generation) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { 
          status: 'failed',
          parameters: {
            ...(generation.parameters as any),
            error: error.message,
          }
        },
      }).catch(console.error)
    }
    
    return NextResponse.json(
      { 
        id: generation?.id,
        status: 'failed',
        error: error.message || 'Generation failed' 
      },
      { status: 500 }
    )
  }
}

