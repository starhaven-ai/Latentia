import { BaseModelAdapter, ModelConfig, GenerationRequest, GenerationResponse } from '../base'

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

if (!REPLICATE_API_KEY) {
  console.warn('REPLICATE_API_KEY is not set. Replicate models will not work.')
}

/**
 * Seedream 4 Model Configuration
 * Image-to-image generation and editing model by ByteDance via Replicate
 * Documentation: https://replicate.com/bytedance/seedream-4
 */
export const SEEDREAM_4_CONFIG: ModelConfig = {
  id: 'replicate-seedream-4',
  name: 'Seedream 4',
  provider: 'ByteDance (Replicate)',
  type: 'image',
  description: 'Unified text-to-image generation and precise single-sentence editing at up to 4K resolution',
  supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  defaultAspectRatio: '1:1',
  maxResolution: 4096,
  parameters: [
    {
      name: 'aspectRatio',
      type: 'select',
      label: 'Aspect Ratio',
      options: [
        { label: '1:1 (Square)', value: '1:1' },
        { label: '16:9 (Landscape)', value: '16:9' },
        { label: '9:16 (Portrait)', value: '9:16' },
        { label: '4:3 (Landscape)', value: '4:3' },
        { label: '3:4 (Portrait)', value: '3:4' },
      ],
    },
    {
      name: 'numOutputs',
      type: 'number',
      label: 'Number of outputs',
      min: 1,
      max: 4,
      default: 1,
      options: [
        { label: '1', value: 1 },
        { label: '4', value: 4 },
      ],
    },
  ],
}

/**
 * Replicate API Adapter
 * Handles image generation via Replicate.com
 * Documentation: https://replicate.com/docs
 */
export class ReplicateAdapter extends BaseModelAdapter {
  private apiKey: string
  private baseUrl = 'https://api.replicate.com/v1'

  constructor(config: ModelConfig) {
    super(config)
    this.apiKey = REPLICATE_API_KEY || ''
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
    if (!this.apiKey) {
      throw new Error('REPLICATE_API_KEY is not configured. Please add your Replicate API key to .env.local and restart the dev server. Get your key from: https://replicate.com/account/api-tokens')
    }

    const {
      prompt,
      parameters = {},
      referenceImage,
    } = request

    // Map aspect ratios to Replicate format
    const aspectRatioMap: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
    }

    // Get parameters with safe fallbacks
    const aspectRatio = parameters?.aspectRatio || request.aspectRatio || '1:1'
    const numOutputs = parameters?.numOutputs || request.numOutputs || 1

    // Map aspect ratio to size resolution
    // Replicate Seedream 4 supports: 1K (1024px), 2K (2048px), 4K (4096px)
    const size = '2K' // Use 2K as default (2048px)

    try {
      // Convert data URL to file URL if needed
      let imageInput: string[] = []
      if (referenceImage) {
        // Replicate can accept data URLs directly
        imageInput = [referenceImage]
      }

      // Prepare input for Replicate API
      const input: any = {
        prompt,
        aspect_ratio: aspectRatioMap[aspectRatio] || aspectRatio,
        size,
        sequential_image_generation: numOutputs > 1 ? 'auto' : 'disabled',
        max_images: numOutputs,
      }

      // Add image input if provided
      if (imageInput.length > 0) {
        input.image_input = imageInput
      }

      console.log('Submitting to Replicate:', input)

      // Fetch latest version for the model
      const versionsResponse = await fetch(`${this.baseUrl}/models/bytedance/seedream-4/versions`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      })

      if (!versionsResponse.ok) {
        throw new Error(`Failed to fetch model versions: ${versionsResponse.statusText}`)
      }

      const versionsData = await versionsResponse.json()
      const latestVersion = versionsData.results?.[0]?.id

      if (!latestVersion) {
        throw new Error('Could not find latest version for Seedream 4')
      }

      console.log('Using Seedream 4 version:', latestVersion)

      // Submit prediction to Replicate
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: latestVersion,
          input,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Replicate API error:', errorText)
        throw new Error(`Replicate API error: ${errorText}`)
      }

      const data = await response.json()
      const predictionId = data.id

      console.log('Replicate prediction started:', predictionId)

      // Poll for results
      let attempts = 0
      const maxAttempts = 120 // 10 minutes max (Replicate can take longer)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        const statusResponse = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${this.apiKey}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error(`Failed to check prediction status: ${statusResponse.statusText}`)
        }

        const statusData = await statusResponse.json()
        console.log(`Replicate status: ${statusData.status} (attempt ${attempts + 1})`)

        if (statusData.status === 'succeeded') {
          // Parse output URLs
          const outputUrls = statusData.output || []
          
          if (!outputUrls.length) {
            throw new Error('No images generated')
          }

          return {
            id: `replicate-${Date.now()}`,
            status: 'completed',
            outputs: outputUrls.map((url: string) => ({
              url,
              width: 2048, // Default for 2K
              height: 2048,
            })),
            metadata: {
              seed: statusData.metrics?.seed,
              model: request.modelId,
            },
          }
        } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
          throw new Error(`Generation failed: ${statusData.error || 'Unknown error'}`)
        }

        attempts++
      }

      throw new Error('Generation timeout - request took too long')
    } catch (error: any) {
      console.error('Replicate generation error:', error)
      throw new Error(error.message || 'Failed to generate with Replicate')
    }
  }

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    throw new Error('Video generation not yet implemented for Replicate')
  }
}

