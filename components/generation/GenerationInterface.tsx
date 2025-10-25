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

