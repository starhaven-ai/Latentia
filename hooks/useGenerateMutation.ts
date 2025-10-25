import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GenerationWithOutputs } from '@/types/generation'

interface GenerateParams {
  sessionId: string
  modelId: string
  prompt: string
  negativePrompt?: string
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
  }
}

interface GenerateResponse {
  id: string
  status: 'completed' | 'failed'
  outputs?: Array<{
    url: string
    width?: number
    height?: number
    duration?: number
  }>
  error?: string
}

async function generateImage(params: GenerateParams): Promise<GenerateResponse> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Generation failed')
  }

  return response.json()
}

export function useGenerateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateImage,
    onSuccess: (data, variables) => {
      // Invalidate and refetch generations for this session
      queryClient.invalidateQueries({
        queryKey: ['generations', variables.sessionId],
      })

      // Optionally add optimistic update
      if (data.status === 'completed' && data.outputs) {
        const newGeneration: GenerationWithOutputs = {
          id: data.id,
          sessionId: variables.sessionId,
          userId: '', // Will be populated by the backend
          modelId: variables.modelId,
          prompt: variables.prompt,
          negativePrompt: variables.negativePrompt,
          parameters: variables.parameters,
          status: 'completed',
          createdAt: new Date(),
          outputs: data.outputs.map((output, index) => ({
            id: `${data.id}-${index}`,
            generationId: data.id,
            fileUrl: output.url,
            fileType: 'image',
            width: output.width,
            height: output.height,
            duration: output.duration,
            isStarred: false,
            createdAt: new Date(),
          })),
        }

        // Update cache optimistically - add to end (bottom)
        queryClient.setQueryData<GenerationWithOutputs[]>(
          ['generations', variables.sessionId],
          (old) => (old ? [...old, newGeneration] : [newGeneration])
        )
      }
    },
    onError: (error: Error) => {
      console.error('Generation failed:', error)
    },
  })
}

