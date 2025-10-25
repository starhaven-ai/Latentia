'use client'

import { useState } from 'react'
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
  const [selectedModel, setSelectedModel] = useState<string>('google-imagen-3')
  const [parameters, setParameters] = useState({
    aspectRatio: '1:1',
    resolution: 1024,
    numOutputs: 4,
  })

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
        {generations.length > 0 ? (
          <div className="p-6">
            <GenerationGallery
              generations={generations}
              onReuseParameters={handleReuseParameters}
            />
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

      {/* Chat Input - Always at Bottom */}
      <div className="border-t border-border bg-card p-6">
        <div className="max-w-5xl mx-auto">
          <ChatInput
            onGenerate={handleGenerate}
            parameters={parameters}
            onParametersChange={setParameters}
            generationType={generationType}
          />
        </div>
      </div>

      {/* Model Picker (Bottom Left) */}
      <div className="absolute bottom-24 left-6 z-10">
        <ModelPicker
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          generationType={generationType}
        />
      </div>
    </div>
  )
}

