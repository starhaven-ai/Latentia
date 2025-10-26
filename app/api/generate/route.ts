import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getModel } from '@/lib/models/registry'

export async function POST(request: NextRequest) {
  let generation: any = null
  let parameters: any = null
  
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
    
    parameters = requestParameters

    // Validate required fields
    if (!sessionId || !modelId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, modelId, prompt' },
        { status: 400 }
      )
    }

    // Get model adapter
    const model = getModel(modelId)
    if (!model) {
      return NextResponse.json(
        { error: `Model not found: ${modelId}` },
        { status: 404 }
      )
    }

    // Create generation record in database using Prisma
    generation = await prisma.generation.create({
      data: {
        sessionId,
        userId: user.id,
        modelId,
        prompt,
        negativePrompt: negativePrompt || null,
        parameters: parameters || {},
        status: 'processing',
      },
    })

    // Generate using the model
    // Extract referenceImage from parameters and pass it at the top level
    const { referenceImage, ...otherParameters } = parameters || {}
    const result = await model.generate({
      prompt,
      negativePrompt,
      referenceImage,
      parameters: otherParameters, // Pass parameters as an object
      ...otherParameters, // Also spread at top level for backward compatibility
    })

    // Update generation status
    if (result.status === 'completed' && result.outputs) {
      // Store outputs in database using Prisma
      const outputRecords = result.outputs.map((output) => ({
        generationId: generation.id,
        fileUrl: output.url,
        fileType: model.getConfig().type,
        width: output.width,
        height: output.height,
        duration: output.duration,
      }))

      await prisma.output.createMany({
        data: outputRecords,
      })

      // Update generation status
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'completed' },
      })
    } else if (result.status === 'failed') {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'failed' },
      })
    }

    return NextResponse.json({
      id: generation.id,
      status: result.status,
      outputs: result.outputs,
      error: result.error,
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    
    // Update generation status to failed
    if (generation) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { 
          status: 'failed',
          parameters: {
            ...parameters,
            error: error.message,
          }
        },
      })
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

