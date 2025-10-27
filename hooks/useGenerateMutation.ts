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
  status: 'processing' | 'completed' | 'failed'
  outputs?: Array<{
    url: string
    width?: number
    height?: number
    duration?: number
  }>
  error?: string
  message?: string
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
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text()
        errorMessage = text || errorMessage
      } catch {
        // Last resort: use status
      }
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data
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
      // Update the optimistic generation with real ID and status
      queryClient.setQueryData<GenerationWithOutputs[]>(
        ['generations', variables.sessionId],
        (old) => {
          if (!old) return []
          
          return old.map((gen) => {
            if (gen.id === context?.optimisticId) {
              console.log('✓ Replacing optimistic generation:', context.optimisticId, '→', data.id)
              
              // Handle different statuses from async API
              if (data.status === 'processing') {
                // Generation is processing in background - update ID and keep status
                return {
                  ...gen,
                  id: data.id,
                  status: 'processing' as const,
                }
              } else if (data.status === 'completed' && data.outputs) {
                // Synchronous completion (shouldn't happen with new API, but handle it)
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
      
      // Trigger immediate refetch to start polling for processing generations
      queryClient.invalidateQueries({ 
        queryKey: ['generations', variables.sessionId],
        refetchType: 'active'
      })
      
      console.log(`[${data.id}] Generation mutation success - status: ${data.status}`)
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

