import { BaseModelAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../base'

/**
 * Google Gemini API Adapter
 * Supports Gemini 2.5 Flash Image (Nano Banana) and Veo 3.1
 */

export class GeminiAdapter extends BaseModelAdapter {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(config: ModelConfig) {
    super(config)
    this.apiKey = process.env.GEMINI_API_KEY || ''

    if (!this.apiKey) {
      console.warn('Gemini API key not configured')
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request)

    try {
      if (this.config.type === 'image') {
        return await this.generateImage(request)
      } else {
        return await this.generateVideo(request)
      }
    } catch (error: any) {
      return {
        id: `error-${Date.now()}`,
        status: 'failed',
        error: error.message || 'Generation failed',
      }
    }
  }

  private async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    console.log('Nano Banana: Starting image generation')
    console.log('Nano Banana: Prompt:', request.prompt)
    console.log('Nano Banana: Has reference image:', !!request.referenceImage)
    // Gemini 2.5 Flash Image (Nano Banana) endpoint
    const endpoint = `${this.baseUrl}/models/gemini-2.5-flash-image:generateContent`

    const numImages = request.numOutputs || 1
    
    // Generate multiple images by making multiple requests
    const promises = Array.from({ length: numImages }, () =>
      this.generateSingleImage(endpoint, request)
    )

    const results = await Promise.allSettled(promises)
    
    const outputs = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)

    if (outputs.length === 0) {
      throw new Error('All image generations failed')
    }

    return {
      id: `gen-${Date.now()}`,
      status: 'completed',
      outputs,
      metadata: {
        model: this.config.id,
        prompt: request.prompt,
      },
    }
  }

  private async generateSingleImage(endpoint: string, request: GenerationRequest): Promise<any> {
    const parts: any[] = []
    
    // Add text prompt
    parts.push({
      text: request.prompt,
    })
    
    // Add reference image if provided (for image editing)
    if (request.referenceImage) {
      // Extract base64 data and mime type from data URL
      const dataUrlMatch = request.referenceImage.match(/^data:([^;]+);base64,(.+)$/)
      if (dataUrlMatch) {
        const [, mimeType, base64Data] = dataUrlMatch
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        })
      } else {
        console.error('Invalid reference image format. Expected data URL format: data:image/png;base64,...')
        throw new Error('Invalid reference image format. Please upload the image again.')
      }
    }
    
    const payload: any = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ['image'],
        temperature: 1.0,
      },
    }

    // Add aspect ratio configuration if provided
    if (request.aspectRatio) {
      payload.generationConfig.imageConfig = {
        aspectRatio: request.aspectRatio,
      }
    }

    console.log('Nano Banana: Sending request to Gemini API')
    const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('Nano Banana: Response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('Gemini API error:', error)
      console.error('Request payload:', JSON.stringify(payload, null, 2))
      throw new Error(error.error?.message || 'Image generation failed')
    }
    
    console.log('Nano Banana: Response OK, parsing data')

    const data = await response.json()

    // Extract image from response
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    )

    if (!imagePart?.inlineData?.data) {
      console.error('Gemini response missing image data:', JSON.stringify(data, null, 2))
      throw new Error('No image data in response')
    }

    // Determine dimensions based on aspect ratio (from official Gemini docs)
    const aspectRatioDimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '2:3': { width: 832, height: 1248 },
      '3:2': { width: 1248, height: 832 },
      '3:4': { width: 864, height: 1184 },
      '4:3': { width: 1184, height: 864 },
      '4:5': { width: 896, height: 1152 },
      '5:4': { width: 1152, height: 896 },
      '9:16': { width: 768, height: 1344 },
      '16:9': { width: 1344, height: 768 },
      '21:9': { width: 1536, height: 672 },
    }

    const dimensions = aspectRatioDimensions[request.aspectRatio || '1:1'] || { width: 1024, height: 1024 }

    return {
      url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    console.log(`[Veo 3.1] Starting video generation for prompt: ${request.prompt.substring(0, 50)}...`)
    
    const duration = request.duration || 8
    const resolution = request.resolution || 720
    const aspectRatio = request.aspectRatio || '16:9'
    
    // Calculate dimensions based on aspect ratio and resolution
    const getDimensions = (aspectRatio: string, resolution: number) => {
      const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number)
      if (aspectRatio === '16:9') {
        return resolution === 1080 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 }
      }
      if (aspectRatio === '9:16') {
        return resolution === 1080 ? { width: 1080, height: 1920 } : { width: 720, height: 1280 }
      }
      if (aspectRatio === '1:1') {
        return { width: resolution, height: resolution }
      }
      // For other ratios, calculate proportionally
      const ratio = widthRatio / heightRatio
      if (ratio > 1) {
        return { width: resolution, height: Math.round(resolution / ratio) }
      } else {
        return { width: Math.round(resolution * ratio), height: resolution }
      }
    }
    
    const { width, height } = getDimensions(aspectRatio, resolution)
    
    // Using Veo 3.1 official API endpoint
    const modelId = 'veo-3.1-generate-preview'
    const endpoint = `${this.baseUrl}/models/${modelId}:predictLongRunning`
    
    // Build request payload according to Veo 3.1 API
    // If a reference image URL is provided, we need to upload it to Google's Files API first
    const instance: any = {
      prompt: request.prompt,
    }

    if ((request as any).referenceImageUrl) {
      // Veo 3.1 requires images to be uploaded via Files API
      // Download the image from our storage and upload to Google Files API
      try {
        console.log(`[Veo 3.1] Uploading reference image to Google Files API: ${(request as any).referenceImageUrl}`)
        
        // Download image from Supabase
        const imageResponse = await fetch((request as any).referenceImageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch reference image: ${imageResponse.statusText}`)
        }
        
        const imageBuffer = await imageResponse.arrayBuffer()
        const imageBytes = Buffer.from(imageBuffer)
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        
        // Upload to Google Files API
        // Try using the standard /files endpoint with proper JSON structure first
        // If that doesn't work, fall back to multipart
        const metadata = {
          file: {
            display_name: 'reference_image',
          },
        }
        
        // Convert image to base64 for JSON upload
        const imageBase64 = imageBytes.toString('base64')
        
        let uploadResponse: Response
        let fileData: any
        
        // Try JSON format first (some Google APIs accept this)
        try {
          uploadResponse = await fetch(`${this.baseUrl}/files?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...metadata,
              config: {
                file_type: 'FILE_TYPE_IMAGE',
                mime_type: contentType,
              },
              data: {
                mime_type: contentType,
                data: imageBase64,
              },
            }),
          })
          
          if (uploadResponse.ok) {
            fileData = await uploadResponse.json()
            console.log(`[Veo 3.1] Files API JSON upload response:`, JSON.stringify(fileData, null, 2))
          } else {
            throw new Error(`JSON upload failed: ${uploadResponse.status}`)
          }
        } catch (jsonError) {
          // Fall back to multipart/form-data
          console.log(`[Veo 3.1] JSON upload failed, trying multipart:`, jsonError)
          
          const boundary = `----formdata-${Date.now()}`
          const parts: Buffer[] = []
          
          parts.push(Buffer.from(`--${boundary}\r\n`))
          parts.push(Buffer.from('Content-Disposition: form-data; name="metadata"\r\n'))
          parts.push(Buffer.from('Content-Type: application/json\r\n\r\n'))
          parts.push(Buffer.from(JSON.stringify(metadata)))
          parts.push(Buffer.from(`\r\n--${boundary}\r\n`))
          parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="reference.jpg"\r\n`))
          parts.push(Buffer.from(`Content-Type: ${contentType}\r\n\r\n`))
          parts.push(imageBytes)
          parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
          
          const multipartBody = Buffer.concat(parts)
          
          uploadResponse = await fetch(`${this.baseUrl}/files?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: multipartBody,
          })
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            throw new Error(`Multipart upload also failed (${uploadResponse.status}): ${errorText}`)
          }
          
          fileData = await uploadResponse.json()
          console.log(`[Veo 3.1] Files API multipart upload response:`, JSON.stringify(fileData, null, 2))
        }
        
        // Try multiple possible response formats
        // The Files API returns a File object with name like "files/abc123" and possibly uri for downloads
        const fileResourceName = fileData.file?.name || fileData.name || null
        const fileUri = fileData.file?.uri || fileData.uri || null
        
        if (!fileResourceName && !fileUri) {
          console.error(`[Veo 3.1] Unexpected Files API response structure:`, fileData)
          throw new Error(`No file URI returned from Files API upload. Response structure: ${JSON.stringify(fileData)}`)
        }
        
        console.log(`[Veo 3.1] Reference image uploaded, file name: ${fileResourceName || 'n/a'}, uri: ${fileUri || 'n/a'}`)
        
        // Reference the uploaded file - Veo 3.1 expects a string; examples pass the file resource name
        instance.image = fileResourceName || fileUri
      } catch (error: any) {
        console.error('[Veo 3.1] Error uploading reference image:', error)
        // Fall back to text-to-video if image upload fails
        console.warn('[Veo 3.1] Falling back to text-to-video without reference image')
      }
    }
    
    const payload = {
      instances: [instance],
    }
    
    console.log(`[Veo 3.1] Calling API with ${duration}s video, ${width}x${height}, ${aspectRatio}`)
    
    try {
      // Initiate video generation
      const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Video generation request failed')
      }

      const operation = await response.json()
      const operationName = operation.name
      
      console.log(`[Veo 3.1] Generation started, operation: ${operationName}`)
      
      // Poll operation until complete (max 5 minutes)
      const maxAttempts = 30 // 5 minutes at 10s intervals
      let attempts = 0
      let operationComplete = false
      
      while (!operationComplete && attempts < maxAttempts) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10s
        
        const statusResponse = await fetch(`${this.baseUrl}/${operationName}?key=${this.apiKey}`)
        if (!statusResponse.ok) {
          throw new Error('Failed to check operation status')
        }
        
        const status = await statusResponse.json()
        operationComplete = status.done
        
        if (operationComplete) {
          const generatedVideo = status.response?.generateVideoResponse?.generatedSamples?.[0]
          if (!generatedVideo) {
            throw new Error('No video in response')
          }
          
          const videoUri = generatedVideo.video.uri
          console.log(`[Veo 3.1] Video ready: ${videoUri}`)
          
          // Return the video URI - it will be downloaded by the background processor
          return {
            id: `gen-${Date.now()}`,
            status: 'completed',
            outputs: [
              {
                url: videoUri,
                width,
                height,
                duration,
              },
            ],
            metadata: {
              model: this.config.id,
              prompt: request.prompt,
              operationName,
            },
          }
        }
      }
      
      if (!operationComplete) {
        throw new Error('Video generation timeout - please try again or contact support')
      }
      
      // This shouldn't be reached, but satisfy TypeScript
      throw new Error('Unexpected end of generation loop')
      
    } catch (error: any) {
      console.error('[Veo 3.1] Generation error:', error)
      throw new Error(error.message || 'Video generation failed')
    }
  }
}

// Model configurations based on official Gemini API docs
// https://ai.google.dev/gemini-api/docs/image-generation
export const NANO_BANANA_CONFIG: ModelConfig = {
  id: 'gemini-nano-banana',
  name: 'Nano Banana',
  provider: 'Google',
  type: 'image',
  description: 'Gemini 2.5 Flash Image - Highly effective and precise image generation',
  maxResolution: 1536, // Max dimension from 21:9 (1536x672)
  defaultAspectRatio: '1:1',
  // All 10 supported aspect ratios from official Gemini API documentation
  supportedAspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  capabilities: {
    editing: true,
    'text-2-image': true,
  },
  pricing: {
    perImage: 0.01,
    currency: 'USD',
  },
  parameters: [
    {
      name: 'numOutputs',
      type: 'select',
      label: 'Images',
      default: 1,
      options: [
        { label: '1 image', value: 1 },
        { label: '2 images', value: 2 },
        { label: '4 images', value: 4 },
      ],
    },
  ],
}

// Veo 3.1 configuration based on official API docs
// https://ai.google.dev/gemini-api/docs/video
export const VEO_3_1_CONFIG: ModelConfig = {
  id: 'gemini-veo-3.1',
  name: 'Veo 3.1',
  provider: 'Google',
  type: 'video',
  description: 'State-of-the-art video generation with native audio support',
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  maxResolution: 1080,
  pricing: {
    perSecond: 0.05,
    currency: 'USD',
  },
  parameters: [
    {
      name: 'resolution',
      type: 'select',
      label: 'Resolution',
      default: 720,
      options: [
        { label: '720p', value: 720 },
        { label: '1080p', value: 1080 },
      ],
    },
    {
      name: 'duration',
      type: 'select',
      label: 'Duration',
      default: 8,
      options: [
        { label: '4 seconds', value: 4 },
        { label: '6 seconds', value: 6 },
        { label: '8 seconds', value: 8 },
      ],
    },
    {
      name: 'numOutputs',
      type: 'select',
      label: 'Videos',
      default: 1,
      options: [
        { label: '1', value: 1 },
      ],
    },
  ],
}

