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
      const optimisticGeneration: GenerationWithOutputs = {
        id: `temp-${Date.now()}`,
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

      // Add pending generation to cache (at the end)
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => (old ? [...old, optimisticGeneration] : [optimisticGeneration])
      )

      // Return context with previous state for rollback
      return { previousGenerations, optimisticId: optimisticGeneration.id }
    },
    onSuccess: (data, variables, context) => {
      // Remove optimistic generation and add real one
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => {
          if (!old) return []
          
          // Remove the optimistic placeholder
          const withoutOptimistic = old.filter(gen => gen.id !== context?.optimisticId)
          
          // Add the real generation (completed or failed)
          if (data.status === 'completed' && data.outputs) {
            const newGeneration: GenerationWithOutputs = {
              id: data.id,
              sessionId: variables.sessionId,
              userId: '',
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
            return [...withoutOptimistic, newGeneration]
          } else if (data.status === 'failed') {
            // Keep the generation in the list but mark it as failed
            const failedGeneration: GenerationWithOutputs = {
              id: data.id,
              sessionId: variables.sessionId,
              userId: '',
              modelId: variables.modelId,
              prompt: variables.prompt,
              negativePrompt: variables.negativePrompt,
              parameters: {
                ...variables.parameters,
                error: data.error,
              },
              status: 'failed',
              createdAt: new Date(),
              outputs: [],
            }
            return [...withoutOptimistic, failedGeneration]
          }
          
          return withoutOptimistic
        }
      )

      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['generations', variables.sessionId],
      })
    },
    onError: (error: Error, variables, context) => {
      console.error('Generation failed:', error)
      
      // Instead of rolling back, update the optimistic generation to show the error
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

