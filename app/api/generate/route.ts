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
    // Use retry logic for serverless environments where internal fetches can fail
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : request.nextUrl.origin
    
    const triggerProcessing = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          // Don't use timeout for internal serverless calls - let it take as long as needed
          // The process endpoint will handle its own timeouts
          const response = await fetch(`${baseUrl}/api/generate/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              generationId: generation.id,
            }),
          })
          
          if (response.ok) {
            console.log(`[${generation.id}] Background processing triggered successfully`)
            return
          }
          
          // If not OK, try again unless last retry
          if (i < retries - 1) {
            // Longer backoff for serverless - wait 2s, 4s, 6s between retries
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
            continue
          }
        } catch (error: any) {
          console.error(`[${generation.id}] Background processing trigger attempt ${i + 1} failed:`, error.message || error.toString())
          
          // If last retry failed, update generation status
          if (i === retries - 1) {
            console.error(`[${generation.id}] All retries exhausted, marking generation as failed`)
            await prisma.generation.update({
              where: { id: generation.id },
              data: { 
                status: 'failed',
                parameters: {
                  ...(requestParameters || {}),
                  error: 'Failed to start background processing after retries',
                }
              },
            }).catch(console.error)
          } else {
            // Wait before retry with longer backoff for serverless
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
          }
        }
      }
    }
    
    // Start processing in background (don't await)
    triggerProcessing().catch((error) => {
      console.error(`[${generation.id}] Background processing trigger failed completely:`, error)
      // Final fallback - mark as failed
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

