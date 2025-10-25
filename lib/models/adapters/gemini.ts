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
    const payload = {
      contents: [
        {
          parts: [
            {
              text: request.prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['image'],
        temperature: 1.0,
      },
    }

    const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Image generation failed')
    }

    const data = await response.json()

    // Extract image from response
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    )

    if (!imagePart?.inlineData?.data) {
      throw new Error('No image data in response')
    }

    return {
      url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      width: 1024,
      height: 1024,
    }
  }

  private async generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
    // Veo 3.1 endpoint
    const endpoint = `${this.baseUrl}/models/veo-3.1:generateContent`

    const payload = {
      contents: [
        {
          parts: [
            {
              text: request.prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['video'],
        temperature: 1.0,
      },
    }

    const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Video generation failed')
    }

    const data = await response.json()

    // Extract video from response
    const videoPart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('video/')
    )

    if (!videoPart?.inlineData?.data) {
      throw new Error('No video data in response')
    }

    return {
      id: `gen-${Date.now()}`,
      status: 'completed',
      outputs: [
        {
          url: `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`,
          width: 1280,
          height: 720,
          duration: 8, // Veo 3.1 default
        },
      ],
      metadata: {
        model: this.config.id,
        prompt: request.prompt,
      },
    }
  }
}

// Model configurations based on official Gemini API docs
export const NANO_BANANA_CONFIG: ModelConfig = {
  id: 'gemini-nano-banana',
  name: 'Nano Banana',
  provider: 'Google',
  type: 'image',
  description: 'Gemini 2.5 Flash Image - Highly effective and precise image generation',
  maxResolution: 1024, // Gemini 2.5 Flash Image max resolution
  defaultAspectRatio: '1:1',
  supportedAspectRatios: ['1:1'], // Gemini currently only supports square images
  pricing: {
    perImage: 0.01,
    currency: 'USD',
  },
  parameters: [
    {
      name: 'resolution',
      type: 'select',
      label: 'Resolution',
      default: 1024,
      options: [
        { label: '512px', value: 512 },
        { label: '1024px', value: 1024 },
      ],
    },
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

export const VEO_3_1_CONFIG: ModelConfig = {
  id: 'gemini-veo-3.1',
  name: 'Veo 3.1',
  provider: 'Google',
  type: 'video',
  description: 'State-of-the-art video generation with native audio support',
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  pricing: {
    perSecond: 0.05,
    currency: 'USD',
  },
}

