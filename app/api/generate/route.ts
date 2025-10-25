import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getModel } from '@/lib/models/registry'

export async function POST(request: NextRequest) {
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
      parameters,
    } = body

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

    // Create generation record in database
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        model_id: modelId,
        prompt,
        negative_prompt: negativePrompt,
        parameters: parameters || {},
        status: 'processing',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create generation record' },
        { status: 500 }
      )
    }

    // Generate using the model
    const result = await model.generate({
      prompt,
      negativePrompt,
      ...parameters,
    })

    // Update generation status
    if (result.status === 'completed' && result.outputs) {
      // Store outputs in database
      const outputRecords = result.outputs.map((output) => ({
        generation_id: generation.id,
        file_url: output.url,
        file_type: model.getConfig().type,
        width: output.width,
        height: output.height,
        duration: output.duration,
      }))

      const { error: outputError } = await supabase
        .from('outputs')
        .insert(outputRecords)

      if (outputError) {
        console.error('Output storage error:', outputError)
      }

      // Update generation status
      await supabase
        .from('generations')
        .update({ status: 'completed' })
        .eq('id', generation.id)
    } else if (result.status === 'failed') {
      await supabase
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', generation.id)
    }

    return NextResponse.json({
      id: generation.id,
      status: result.status,
      outputs: result.outputs,
      error: result.error,
    })
  } catch (error: any) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    )
  }
}

