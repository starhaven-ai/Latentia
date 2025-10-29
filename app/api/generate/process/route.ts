import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getModel } from '@/lib/models/registry'
import { uploadBase64ToStorage, uploadUrlToStorage } from '@/lib/supabase/storage'

/**
 * Background processor for async generation
 * This endpoint processes a generation that's already been created in the database
 * It's called asynchronously after the main generate endpoint returns
 */
export async function POST(request: NextRequest) {
  // Read body once and store it for error handling
  let requestBody: any = {}
  let generationId: string | undefined
  
  try {
    requestBody = await request.json()
    generationId = requestBody.generationId
  } catch (error) {
    console.error('Failed to parse request body:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
  
  try {

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    // Fetch the generation from database with session
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        session: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Skip if already completed or failed
    if (generation.status === 'completed' || generation.status === 'failed') {
      return NextResponse.json({ 
        message: 'Generation already processed',
        status: generation.status 
      })
    }

    // Get model adapter
    const model = getModel(generation.modelId)
    if (!model) {
      await prisma.generation.update({
        where: { id: generationId },
        data: { 
          status: 'failed',
          parameters: {
            ...(generation.parameters as any),
            error: `Model not found: ${generation.modelId}`,
          }
        },
      })
      return NextResponse.json(
        { error: `Model not found: ${generation.modelId}` },
        { status: 404 }
      )
    }

    // Extract parameters
    const parameters = generation.parameters as any
    const { referenceImage, ...otherParameters } = parameters || {}

    // If a base64 reference image was provided, upload it to storage and convert to a URL
    let referenceImageUrl: string | undefined
    if (referenceImage && typeof referenceImage === 'string' && referenceImage.startsWith('data:')) {
      try {
        const extension = referenceImage.includes('image/png') ? 'png' : 'jpg'
        const storagePath = `${generation.userId}/${generationId}/reference.${extension}`
        // Store in existing images bucket
        referenceImageUrl = await uploadBase64ToStorage(referenceImage, 'generated-images', storagePath)
      } catch (e) {
        console.error(`[${generationId}] Failed to upload reference image:`, e)
      }
    }

    console.log(`[${generationId}] Starting generation with model ${generation.modelId}`)

    // Generate using the model
    const result = await model.generate({
      prompt: generation.prompt,
      negativePrompt: generation.negativePrompt || undefined,
      referenceImage,
      referenceImageUrl,
      parameters: otherParameters,
      ...otherParameters,
    })

    console.log(`[${generationId}] Generation result:`, result.status)

    // Process outputs and upload to storage
    if (result.status === 'completed' && result.outputs) {
      const outputRecords = []

      for (let i = 0; i < result.outputs.length; i++) {
        const output = result.outputs[i]
        let finalUrl = output.url

        // Upload to Supabase Storage if it's a data URL or external URL
        if (output.url.startsWith('data:')) {
          // Base64 data URL - upload to storage
          // Determine file extension based on session type
          const extension = generation.session.type === 'video' 
            ? 'mp4' // Videos from models might be base64 encoded
            : (output.url.includes('image/png') ? 'png' : 'jpg')
          const bucket = generation.session.type === 'video' ? 'generated-videos' : 'generated-images'
          const storagePath = `${generation.userId}/${generationId}/${i}.${extension}`
          
          console.log(`[${generationId}] Uploading base64 ${generation.session.type} ${i} to storage`)
          finalUrl = await uploadBase64ToStorage(
            output.url,
            bucket,
            storagePath
          )
          console.log(`[${generationId}] Uploaded to: ${finalUrl}`)
        } else if (output.url.startsWith('http')) {
          // External URL - download and re-upload to our storage for consistency
          // For video sessions, default to mp4 extension since Veo returns media streams without file extension
          const extension = generation.session.type === 'video'
            ? 'mp4'
            : (output.url.includes('.png') ? 'png' : 'jpg')
          const bucket = generation.session.type === 'video' ? 'generated-videos' : 'generated-images'
          const storagePath = `${generation.userId}/${generationId}/${i}.${extension}`
          
          console.log(`[${generationId}] Uploading external URL ${i} to storage`)
          try {
            // Google Generative Language file downloads require API key auth
            const isGeminiFile = output.url.includes('generativelanguage.googleapis.com')
            const headers = isGeminiFile && process.env.GEMINI_API_KEY
              ? { 'x-goog-api-key': process.env.GEMINI_API_KEY as string }
              : undefined
            finalUrl = await uploadUrlToStorage(
              output.url,
              bucket,
              storagePath,
              headers ? { headers } : undefined
            )
            console.log(`[${generationId}] Uploaded to: ${finalUrl}`)
          } catch (error) {
            console.error(`[${generationId}] Failed to upload to storage, using original URL:`, error)
            // Keep original URL if upload fails
          }
        }

        outputRecords.push({
          generationId: generation.id,
          fileUrl: finalUrl,
          fileType: generation.session.type,
          width: output.width,
          height: output.height,
          duration: output.duration,
        })
      }

      // Store outputs in database
      await prisma.output.createMany({
        data: outputRecords,
      })

      // Update generation status to completed
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'completed' },
      })

      console.log(`[${generationId}] Generation completed successfully`)

      return NextResponse.json({
        id: generation.id,
        status: 'completed',
        outputCount: outputRecords.length,
      })
    } else if (result.status === 'failed') {
      // Update generation status to failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: { 
          status: 'failed',
          parameters: {
            ...(generation.parameters as any),
            error: result.error || 'Generation failed',
          }
        },
      })

      console.log(`[${generationId}] Generation failed:`, result.error)

      return NextResponse.json({
        id: generation.id,
        status: 'failed',
        error: result.error,
      })
    }

    return NextResponse.json({
      id: generation.id,
      status: result.status,
    })
  } catch (error: any) {
    console.error('Background generation error:', error)
    
    // Try to update generation status if we have the ID
    if (generationId) {
      try {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
        })
        
        if (generation) {
          await prisma.generation.update({
            where: { id: generationId },
            data: { 
              status: 'failed',
              parameters: {
                ...(generation.parameters as any),
                error: error.message || 'Generation failed',
              }
            },
          })
        }
      } catch (updateError) {
        console.error('Failed to update generation status:', updateError)
      }
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Generation failed',
        status: 'failed',
      },
      { status: 500 }
    )
  }
}

