'use client'

import { useEffect, useRef, useState } from 'react'
import { GenerationGallery } from './GenerationGallery'
import { ChatInput } from './ChatInput'
import type { Session } from '@/types/project'
import type { GenerationWithOutputs } from '@/types/generation'
import { useGenerations } from '@/hooks/useGenerations'
import { useGenerateMutation } from '@/hooks/useGenerateMutation'
import { useUIStore } from '@/store/uiStore'
import { useToast } from '@/components/ui/use-toast'

interface GenerationInterfaceProps {
  session: Session | null
  generationType: 'image' | 'video'
}

export function GenerationInterface({
  session,
  generationType,
}: GenerationInterfaceProps) {
  const { toast } = useToast()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState('')
  
  // Use Zustand store for UI state
  const { selectedModel, parameters, setSelectedModel, setParameters } = useUIStore()
  
  // Use React Query for data fetching
  const { data: generations = [], isLoading } = useGenerations(session?.id || null)
  
  // Use React Query mutation for generating
  const generateMutation = useGenerateMutation()

  // Auto-scroll to bottom when generations load or update
  useEffect(() => {
    if (!isLoading && generations.length > 0 && scrollContainerRef.current) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 100)
    }
  }, [generations, isLoading])

  const handleGenerate = async (prompt: string, referenceImage?: File) => {
    if (!session || !prompt.trim()) return

    // Create pending generation ID
    const pendingId = `pending-${Date.now()}`

    try {
      const result = await generateMutation.mutateAsync({
        sessionId: session.id,
        modelId: selectedModel,
        prompt,
        parameters: {
          aspectRatio: parameters.aspectRatio,
          resolution: parameters.resolution,
          numOutputs: parameters.numOutputs,
        },
      })
      
      // Show success toast
      toast({
        title: "Generation complete!",
        description: `Successfully generated ${parameters.numOutputs} ${generationType}${parameters.numOutputs > 1 ? 's' : ''}`,
        variant: "success",
      })
    } catch (error: any) {
      console.error('Generation error:', error)
      toast({
        title: "Generation failed",
        description: error.message || 'Failed to generate. Please try again.',
        variant: "destructive",
      })
    }
  }

  const handleReuseParameters = (generation: GenerationWithOutputs) => {
    // Set prompt
    setPrompt(generation.prompt)
    
    // Set model
    setSelectedModel(generation.modelId)
    
    // Set parameters
    const genParams = generation.parameters as any
    setParameters({
      aspectRatio: genParams.aspectRatio || '1:1',
      resolution: genParams.resolution || 1024,
      numOutputs: genParams.numOutputs || 1,
    })
    
    // Show toast to confirm
    toast({
      title: "Parameters reused",
      description: "Prompt and settings have been loaded. You can now modify and regenerate.",
      variant: "default",
    })
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading state
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Loading generations...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 flex justify-center">
            <div className="w-full max-w-7xl">
              <GenerationGallery
                generations={generations}
                sessionId={session?.id || null}
                onReuseParameters={handleReuseParameters}
                isGenerating={generateMutation.isPending}
                pendingCount={generateMutation.isPending ? parameters.numOutputs : 0}
                pendingAspectRatio={parameters.aspectRatio}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat Input - Floating Card at Bottom */}
      <div className="border-t border-border/50 bg-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-lg p-4">
            <ChatInput
              prompt={prompt}
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              parameters={parameters}
              onParametersChange={setParameters}
              generationType={generationType}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

