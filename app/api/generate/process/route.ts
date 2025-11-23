import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getModel } from '@/lib/models/registry'
import { uploadBase64ToStorage, uploadUrlToStorage } from '@/lib/supabase/storage'
import { logMetric } from '@/lib/metrics'
import { downloadReferenceImageAsDataUrl } from '@/lib/reference-images'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Background processor for async generation
 * This endpoint processes a generation that's already been created in the database
 * It's called asynchronously after the main generate endpoint returns
 */
export async function POST(request: NextRequest) {
  // Read body once and store it for error handling
  let requestBody: any = {}
  let generationId: string | undefined
  let heartbeatTimer: NodeJS.Timeout | null = null
  let stopHeartbeatRef: (() => void) | null = null
  const startedAt = Date.now()
  let metricStatus: 'success' | 'error' = 'success'
  let statusCode = 200
  const metricMeta: Record<string, any> = {}

  const respond = (body: any, status: number = 200) => {
    statusCode = status
    metricStatus = status >= 400 ? 'error' : 'success'
    return NextResponse.json(body, { status })
  }
  
  try {
    requestBody = await request.json()
    generationId = requestBody.generationId
    console.log(`[${generationId || 'unknown'}] Process endpoint called with body:`, JSON.stringify(requestBody))
  } catch (error) {
    console.error('Failed to parse request body:', error)
    metricStatus = 'error'
    return respond(
      { error: 'Invalid request body' },
      400
    )
  }
  
  try {

    if (!generationId) {
      return respond(
        { error: 'Generation ID is required' },
        400
      )
    }

    metricMeta.generationId = generationId

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
      return respond(
        { error: 'Generation not found' },
        404
      )
    }

    // Skip if already completed, failed, or cancelled
    if (generation.status === 'completed' || generation.status === 'failed' || generation.status === 'cancelled') {
      return respond({ 
        message: 'Generation already processed or cancelled',
        status: generation.status 
      })
    }

    // Helper: append debug log and heartbeat safely (best-effort; don't throw)
    const appendLog = async (step: string, extra?: Record<string, any>) => {
      try {
        const existing = await prisma.generation.findUnique({ where: { id: generationId } })
        if (!existing) return
        const prev = (existing.parameters as any) || {}
        const logs = Array.isArray(prev.debugLogs) ? prev.debugLogs : []
        logs.push({
          at: new Date().toISOString(),
          step,
          ...((extra || {}) as any),
        })
        await prisma.generation.update({
          where: { id: generationId },
          data: {
            parameters: {
              ...prev,
              lastHeartbeatAt: new Date().toISOString(),
              lastStep: step,
              debugLogs: logs.slice(-100),
            },
          },
        })
      } catch (_) {}
    }

    const startHeartbeat = (label: string) => {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      heartbeatTimer = setInterval(() => {
        appendLog(label)
      }, 10000)
    }
    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
    }
    stopHeartbeatRef = stopHeartbeat

    await appendLog('process:start')

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
      metricMeta.modelId = generation.modelId
      return respond(
        { error: `Model not found: ${generation.modelId}` },
        404
      )
    }

    metricMeta.modelId = generation.modelId

    // Extract parameters
    const parameters = generation.parameters as any
    const {
      referenceImage,
      referenceImageUrl: persistedReferenceUrl,
      referenceImagePath,
      referenceImageBucket,
      referenceImageMimeType,
      referenceImageChecksum,
      referenceImageId,
      ...otherParameters
    } = parameters || {}

    let inlineReferenceImage = referenceImage as string | undefined
    let referenceImageUrl = persistedReferenceUrl as string | undefined

    // Backwards compatibility: upload inline base64 if pointer is missing
    if (inlineReferenceImage && inlineReferenceImage.startsWith('data:') && !referenceImageUrl) {
      try {
        const extension = inlineReferenceImage.includes('image/png') ? 'png' : 'jpg'
        const storagePath = `${generation.userId}/${generationId}/reference.${extension}`
        referenceImageUrl = await uploadBase64ToStorage(inlineReferenceImage, 'generated-images', storagePath)
      } catch (e) {
        console.error(`[${generationId}] Failed to upload inline reference image:`, e)
      }
    }

    // If we only have a pointer, download it as base64 for adapters that expect inline data
    if (!inlineReferenceImage && referenceImageUrl) {
      try {
        inlineReferenceImage = await downloadReferenceImageAsDataUrl(referenceImageUrl, referenceImageMimeType)
      } catch (error) {
        console.error(`[${generationId}] Failed to hydrate reference image from storage:`, error)
      }
    }

    if (referenceImageUrl || inlineReferenceImage) {
      console.log(`[${generationId}] Reference image resolved`, {
        hasInline: Boolean(inlineReferenceImage),
        referenceImageUrl,
        referenceImageId,
        referenceImagePath,
        referenceImageBucket,
        referenceImageChecksum,
      })
    }

    console.log(`[${generationId}] Starting generation with model ${generation.modelId}`)
    await appendLog('model:generate:start', { modelId: generation.modelId })
    startHeartbeat('model:generate:heartbeat')

    // Generate using the model
    const result = await model.generate({
      prompt: generation.prompt,
      negativePrompt: generation.negativePrompt || undefined,
      referenceImage: inlineReferenceImage,
      referenceImageUrl,
      parameters: otherParameters,
      ...otherParameters,
    })
    stopHeartbeat()
    await appendLog('model:generate:end', { status: result?.status })

    console.log(`[${generationId}] Generation result:`, result.status)

    // Before processing outputs, re-check cancellation
    try {
      const latest = await prisma.generation.findUnique({ where: { id: generation.id } })
      if (latest && latest.status === 'cancelled') {
        await appendLog('cancelled:skip-after-generate')
        return respond({ id: generation.id, status: 'cancelled' })
      }
    } catch (_) {}

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
          startHeartbeat('storage:upload:heartbeat')
          finalUrl = await uploadBase64ToStorage(
            output.url,
            bucket,
            storagePath
          )
          console.log(`[${generationId}] Uploaded to: ${finalUrl}`)
          stopHeartbeat()
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
            startHeartbeat('storage:upload-url:heartbeat')
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
            stopHeartbeat()
          } catch (error) {
            console.error(`[${generationId}] Failed to upload to storage, using original URL:`, error)
            // Keep original URL if upload fails
            stopHeartbeat()
            await appendLog('storage:upload-url:failed', { error: (error as any)?.message })
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
      await appendLog('process:completed', { outputCount: outputRecords.length })

      return respond({
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
      await appendLog('process:failed', { error: result.error })

      return respond({
        id: generation.id,
        status: 'failed',
        error: result.error,
      })
    }

    return respond({
      id: generation.id,
      status: result.status,
    })
  } catch (error: any) {
    console.error('Background generation error:', error)
    // Best-effort: no appendLog here (out of scope)
    metricStatus = 'error'
    
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
    
    return respond(
      { 
        error: error.message || 'Generation failed',
        status: 'failed',
      },
      500
    )
  } finally {
    stopHeartbeatRef?.()
    logMetric({
      name: 'api_generate_process_post',
      status: metricStatus,
      durationMs: Date.now() - startedAt,
      meta: {
        ...metricMeta,
        statusCode,
      },
    })
  }
}

