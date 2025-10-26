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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['generations', variables.sessionId] })

      // Snapshot the previous value
      const previousGenerations = queryClient.getQueryData<GenerationWithOutputs[]>([
        'generations',
        variables.sessionId,
      ])

      // Optimistically add a pending generation
      // Use a timestamp to ensure unique IDs
      const timestamp = Date.now()
      const optimisticGeneration: GenerationWithOutputs = {
        id: `temp-${timestamp}`,
        sessionId: variables.sessionId,
        userId: '',
        modelId: variables.modelId,
        prompt: variables.prompt,
        negativePrompt: variables.negativePrompt,
        parameters: variables.parameters,
        status: 'processing',
        createdAt: new Date(),
        outputs: [],
      }
      
      // Store the optimistic ID in context for later matching
      const optimisticId = optimisticGeneration.id

      // Add pending generation to cache ONLY if it doesn't already exist
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => {
          if (!old) return [optimisticGeneration]
          // Check if this exact optimistic generation already exists
          const exists = old.some(gen => gen.id === optimisticGeneration.id)
          if (exists) return old
          return [...old, optimisticGeneration]
        }
      )

      // Return context with previous state for rollback
      return { previousGenerations, optimisticId }
    },
    onSuccess: (data, variables, context) => {
      // Update the optimistic generation to completed status
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => {
          if (!old) return []
          
          return old.map((gen) => {
            if (gen.id === context?.optimisticId) {
              console.log('✓ Found optimistic generation to replace:', context.optimisticId)
              if (data.status === 'completed' && data.outputs) {
                return {
                  ...gen,
                  id: data.id,
                  status: 'completed' as const,
                  outputs: data.outputs.map((output, index) => ({
                    id: `${data.id}-${index}`,
                    generationId: data.id,
                    fileUrl: output.url,
                    fileType: 'image' as const,
                    width: output.width,
                    height: output.height,
                    duration: output.duration,
                    isStarred: false,
                    createdAt: new Date(),
                  })),
                }
              } else if (data.status === 'failed') {
                return {
                  ...gen,
                  id: data.id,
                  status: 'failed' as const,
                  parameters: {
                    ...gen.parameters,
                    error: data.error,
                  },
                }
              }
            }
            return gen
          })
        }
      )
      
      // Log generations after update to debug restart issue
      setTimeout(() => {
        const currentData = queryClient.getQueryData<GenerationWithOutputs[]>(['generations', variables.sessionId])
        console.log('After mutation update:', {
          count: currentData?.length || 0,
          statuses: currentData?.map(g => ({ id: g.id.substring(0, 20), status: g.status }))
        })
      }, 50)
    },
    onError: (error: Error, variables, context) => {
      console.error('Generation failed:', error)
      
      // Update the optimistic generation to show the error
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => {
          if (!old) return []
          
          return old.map((gen) => {
            if (gen.id === context?.optimisticId) {
              return {
                ...gen,
                status: 'failed' as const,
                parameters: {
                  ...gen.parameters,
                  error: error.message,
                },
              }
            }
            return gen
          })
        }
      )
    },
  })
}

