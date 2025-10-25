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
  const [selectedModel, setSelectedModel] = useState<string>('flux_1_1_pro')
  const [parameters, setParameters] = useState({
    aspectRatio: '1:1',
    resolution: 1024,
    numOutputs: 4,
  })

  const handleGenerate = async (prompt: string, referenceImage?: File) => {
    if (!session || !prompt.trim()) return

    console.log('Generating with:', {
      prompt,
      model: selectedModel,
      parameters,
      referenceImage: referenceImage?.name,
    })

    // TODO: Implement actual generation logic
    // This would call the API to generate images/videos
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

  const hasGenerations = generations.length > 0

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Gallery or Centered Input */}
      <div className="flex-1 overflow-y-auto">
        {hasGenerations ? (
          <div className="p-6">
            <GenerationGallery
              generations={generations}
              onReuseParameters={handleReuseParameters}
            />
          </div>
        ) : (
          // Centered layout when no generations (Krea-style)
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-3xl space-y-6">
              {/* Session Title */}
              <div className="text-center">
                <h1 className="text-2xl font-semibold mb-2">{session.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Enter a prompt below to generate your first image or video
                </p>
              </div>

              {/* Centered Chat Input */}
              <ChatInput
                onGenerate={handleGenerate}
                parameters={parameters}
                onParametersChange={setParameters}
                generationType={generationType}
                centered={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Chat Input (shown when there are generations) */}
      {hasGenerations && (
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-5xl mx-auto">
            <ChatInput
              onGenerate={handleGenerate}
              parameters={parameters}
              onParametersChange={setParameters}
              generationType={generationType}
              centered={false}
            />
          </div>
        </div>
      )}

      {/* Model Picker (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-10">
        <ModelPicker
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          generationType={generationType}
        />
      </div>
    </div>
  )
}

