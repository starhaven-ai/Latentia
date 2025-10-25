'use client'

import { useState, useEffect } from 'react'
import { GenerationGallery } from './GenerationGallery'
import { ChatInput } from './ChatInput'
import { ModelPicker } from './ModelPicker'
import type { Session } from '@/types/project'
import type { GenerationWithOutputs } from '@/types/generation'

interface GenerationInterfaceProps {
  session: Session | null
  generationType: 'image' | 'video'
}

export function GenerationInterface({
  session,
  generationType,
}: GenerationInterfaceProps) {
  const [generations, setGenerations] = useState<GenerationWithOutputs[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('gemini-nano-banana')
  const [parameters, setParameters] = useState({
    aspectRatio: '1:1',
    resolution: 1024,
    numOutputs: 4,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Load generations when session changes
  useEffect(() => {
    const loadGenerations = async () => {
      if (!session) {
        setGenerations([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/generations?sessionId=${session.id}`)
        if (response.ok) {
          const data = await response.json()
          setGenerations(data)
        } else {
          console.error('Failed to load generations:', await response.text())
        }
      } catch (error) {
        console.error('Error loading generations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGenerations()
  }, [session?.id])

  const handleGenerate = async (prompt: string, referenceImage?: File) => {
    if (!session || !prompt.trim()) return

    try {
      // Call the generation API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          modelId: selectedModel,
          prompt,
          parameters: {
            aspectRatio: parameters.aspectRatio,
            resolution: parameters.resolution,
            numOutputs: parameters.numOutputs,
          },
        }),
      })

      const result = await response.json()

      if (response.ok && result.status === 'completed' && result.outputs) {
        // Add the generation to the list
        const newGeneration: GenerationWithOutputs = {
          id: result.id,
          sessionId: session.id,
          userId: '',
          modelId: selectedModel,
          prompt,
          negativePrompt: undefined,
          parameters: parameters as any,
          status: 'completed',
          createdAt: new Date(),
          outputs: result.outputs.map((output: any, index: number) => ({
            id: `${result.id}-${index}`,
            generationId: result.id,
            fileUrl: output.url,
            fileType: generationType,
            width: output.width,
            height: output.height,
            duration: output.duration,
            isStarred: false,
            createdAt: new Date(),
          })),
        }

        setGenerations((prev) => [newGeneration, ...prev])
      } else {
        console.error('Generation failed:', result.error)
        alert(result.error || 'Generation failed')
      }
    } catch (error: any) {
      console.error('Generation error:', error)
      alert(error.message || 'Failed to generate')
    }
  }

  const handleReuseParameters = (generation: GenerationWithOutputs) => {
    setSelectedModel(generation.modelId)
    setParameters(generation.parameters as any)
    // The prompt will be set by the ChatInput component
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No session selected</p>
          <p className="text-sm">Create or select a session to start generating</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Gallery Area - Always show, even if empty */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading state
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Loading generations...</p>
            </div>
          </div>
        ) : generations.length > 0 ? (
          <div className="p-6 flex justify-center">
            <div className="w-full max-w-7xl">
              <GenerationGallery
                generations={generations}
                onReuseParameters={handleReuseParameters}
              />
            </div>
          </div>
        ) : (
          // Empty state
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">No generations yet</p>
              <p className="text-sm">Enter a prompt below to generate your first {generationType}</p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input - Floating Card at Bottom */}
      <div className="border-t border-border/50 bg-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-lg p-4">
            <ChatInput
              onGenerate={handleGenerate}
              parameters={parameters}
              onParametersChange={setParameters}
              generationType={generationType}
            />
          </div>
        </div>
      </div>

      {/* Model Picker (Bottom Left) */}
      <div className="absolute bottom-28 left-6 z-10">
        <ModelPicker
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          generationType={generationType}
        />
      </div>
    </div>
  )
}

