'use client'

import { useEffect, useRef, useState } from 'react'
import { GenerationGallery } from './GenerationGallery'
import { ChatInput } from './ChatInput'
import { VideoInput } from './VideoInput'
import type { Session } from '@/types/project'
import type { GenerationWithOutputs } from '@/types/generation'
import { useGenerations } from '@/hooks/useGenerations'
import { useGenerateMutation } from '@/hooks/useGenerateMutation'
import { useUIStore } from '@/store/uiStore'
import { useToast } from '@/components/ui/use-toast'
import { getAllModels } from '@/lib/models/registry'

interface GenerationInterfaceProps {
  session: Session | null
  generationType: 'image' | 'video'
  allSessions?: Session[]
  onSessionCreate?: (type: 'image' | 'video', name: string) => Promise<Session | null>
  onSessionSwitch?: (sessionId: string) => void
}

export function GenerationInterface({
  session,
  generationType,
  allSessions = [],
  onSessionCreate,
  onSessionSwitch,
}: GenerationInterfaceProps) {
  const { toast } = useToast()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null)
  
  // Use Zustand store for UI state
  const { selectedModel, parameters, setSelectedModel, setParameters } = useUIStore()
  
  // Use React Query for data fetching
  const { data: generations = [], isLoading } = useGenerations(session?.id || null)
  
  // Use React Query mutation for generating
  const generateMutation = useGenerateMutation()

  // Set numOutputs based on generationType
  useEffect(() => {
    const defaultNumOutputs = generationType === 'image' ? 4 : 1
    if (parameters.numOutputs !== defaultNumOutputs) {
      setParameters({ numOutputs: defaultNumOutputs })
    }
  }, [generationType])

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
      // Convert referenceImage File to base64 data URL if provided
      let referenceImageData: string | undefined
      if (referenceImage) {
        referenceImageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(referenceImage)
        })
      }

      const result = await generateMutation.mutateAsync({
        sessionId: session.id,
        modelId: selectedModel,
        prompt,
        parameters: {
          aspectRatio: parameters.aspectRatio,
          resolution: parameters.resolution,
          numOutputs: parameters.numOutputs,
          ...(parameters.duration && { duration: parameters.duration }),
          ...(referenceImageData && { referenceImage: referenceImageData }),
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
      // Re-throw the error so the ChatInput knows not to clear the prompt
      throw error
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
      ...(genParams.duration && { duration: genParams.duration }),
    })
    
    // Show toast to confirm
    toast({
      title: "Parameters reused",
      description: "Prompt and settings have been loaded. You can now modify and regenerate.",
      variant: "default",
    })
  }

  const handleConvertToVideo = async (generation: GenerationWithOutputs, videoSessionId: string, imageUrl?: string) => {
    if (!onSessionSwitch) return

    // Switch to the video session
    onSessionSwitch(videoSessionId)

    // Set prompt and parameters from the image generation
    setPrompt(generation.prompt)
    setSelectedModel(generation.modelId)
    
    // Set the reference image URL for the thumbnail
    if (imageUrl) {
      setReferenceImageUrl(imageUrl)
    }
    
    const genParams = generation.parameters as any
    setParameters({
      aspectRatio: genParams.aspectRatio || '16:9', // Default to 16:9 for video
      resolution: genParams.resolution || 1024,
      numOutputs: 1, // Videos typically generate one at a time
    })

    toast({
      title: "Converted to video",
      description: "Prompt copied to video session. Ready to generate!",
      variant: "success",
    })
  }

  // Get video sessions
  const videoSessions = allSessions.filter(s => s.type === 'video')
  
  // Get all processing generations (in-progress)
  const processingGenerations = generations.filter(g => g.status === 'processing')
  
  // Get model name for pending generation display
  const allModels = getAllModels()
  const currentModelConfig = allModels.find(m => m.id === selectedModel)
  const modelName = currentModelConfig?.name || 'Unknown Model'

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
                generations={generations.filter(g => g.status !== 'processing')}
                sessionId={session?.id || null}
                onReuseParameters={handleReuseParameters}
                processingGenerations={processingGenerations}
                videoSessions={videoSessions}
                onConvertToVideo={handleConvertToVideo}
                onCreateVideoSession={onSessionCreate}
                currentGenerationType={generationType}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat Input - Floating Card at Bottom */}
      <div className="border-t border-border/50 bg-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-lg p-4">
            {generationType === 'video' ? (
              <VideoInput
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                parameters={parameters}
                onParametersChange={setParameters}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                referenceImageUrl={referenceImageUrl}
                onClearReferenceImage={() => setReferenceImageUrl(null)}
                onSetReferenceImageUrl={setReferenceImageUrl}
              />
            ) : (
              <ChatInput
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                parameters={parameters}
                onParametersChange={setParameters}
                generationType={generationType}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                isGenerating={generateMutation.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

