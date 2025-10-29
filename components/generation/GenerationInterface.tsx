'use client'

import { useEffect, useRef, useState } from 'react'
import { GenerationGallery } from './GenerationGallery'
import { ChatInput } from './ChatInput'
import { VideoInput } from './VideoInput'
import type { Session } from '@/types/project'
import type { GenerationWithOutputs } from '@/types/generation'
import { useInfiniteGenerations } from '@/hooks/useInfiniteGenerations'
import { useGenerationsRealtime } from '@/hooks/useGenerationsRealtime'
import { useGenerateMutation } from '@/hooks/useGenerateMutation'
import { useUIStore } from '@/store/uiStore'
import { useToast } from '@/components/ui/use-toast'
import { getAllModels, getModelsByType } from '@/lib/models/registry'
import { createClient } from '@/lib/supabase/client'

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
  const [userId, setUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ displayName: string | null } | null>(null)
  const previousSessionIdRef = useRef<string | null>(null)
  
  // Get current user for realtime subscriptions
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      
      // Also fetch profile for display name
      if (data.user?.id) {
        supabase
          .from('profiles')
          .select('displayName')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            setCurrentUser(profile ? { displayName: profile.displayName } : null)
          })
      }
    })
  }, [])
  
  // Use Zustand store for UI state
  const { selectedModel, parameters, setSelectedModel, setParameters } = useUIStore()
  
  // Use infinite query for progressive loading (loads 10 at a time)
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteGenerations(session?.id || null, 10)
  
  // Flatten all pages into a single array
  const generations = infiniteData?.pages.flatMap((page) => page.data) || []
  
  console.log('🟢 Generations from infinite query:', generations.length)
  if (generations.length > 0) {
    console.log('🟢 Sample generation:', { id: generations[0].id, status: generations[0].status, outputs: (generations[0].outputs || []).length })
    console.log('🟢 All generation statuses:', generations.map(g => ({ id: g.id, status: g.status })))
  }
  
  // Subscribe to real-time updates
  useGenerationsRealtime(session?.id || null, userId)
  
  // Use React Query mutation for generating
  const generateMutation = useGenerateMutation()

  // Set numOutputs based on generationType
  useEffect(() => {
    const defaultNumOutputs = generationType === 'image' ? 4 : 1
    if (parameters.numOutputs !== defaultNumOutputs) {
      setParameters({ numOutputs: defaultNumOutputs })
    }
    // Enforce model type per view: image sessions -> image models, video sessions -> video models
    const all = getAllModels()
    const current = all.find(m => m.id === selectedModel)
    const requiredType = generationType
    if (!current || current.type !== requiredType) {
      const fallback = getModelsByType(requiredType)[0]
      if (fallback) {
        setSelectedModel(fallback.id)
      }
    }
  }, [generationType])

  // Auto-scroll to bottom when:
  // 1. Session changes (user opened a different session)
  // 2. New generations are added
  // 3. Data finishes loading
  useEffect(() => {
    const isNewSession = session?.id !== previousSessionIdRef.current
    previousSessionIdRef.current = session?.id || null

    if (!isLoading && generations.length > 0 && scrollContainerRef.current) {
      // Longer delay for new sessions to ensure content is fully rendered
      // Shorter delay for updates to existing content
      const delay = isNewSession ? 300 : 100

      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: isNewSession ? 'auto' : 'smooth', // Instant for new sessions, smooth for updates
        })
      }, delay)
    }
  }, [generations, isLoading, session?.id])

  const handleGenerate = async (prompt: string, referenceImage?: File) => {
    if (!session || !prompt.trim()) return

    // Create pending generation ID
    const pendingId = `pending-${Date.now()}`

    try {
      // Convert referenceImage File to base64 data URL if provided
      // COMPRESS to prevent HTTP 413 errors (Vercel limit: 4.5MB)
      let referenceImageData: string | undefined
      if (referenceImage) {
        referenceImageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            
            // Check size and compress if necessary
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              if (!ctx) {
                resolve(dataUrl) // Fallback to original if canvas not supported
                return
              }
              
              // Calculate new dimensions (max 2048px to keep size reasonable)
              let { width, height } = img
              if (width > 2048 || height > 2048) {
                const ratio = 2048 / Math.max(width, height)
                width = Math.floor(width * ratio)
                height = Math.floor(height * ratio)
              }
              
              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
              
              // Convert to JPEG at 85% quality for better compression
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
              
              // Final size check - reject if still too large
              const sizeInMB = compressedDataUrl.length / (1024 * 1024)
              if (sizeInMB > 3.5) {
                console.warn('Compressed image still too large, using original')
                resolve(dataUrl)
              } else {
                resolve(compressedDataUrl)
              }
            }
            img.onerror = () => resolve(dataUrl) // Fallback on error
            img.src = dataUrl
          }
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
      
      // Success is indicated by the progress bar, no toast needed
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

    // Do NOT copy the image prompt into the video prompt box.
    // The user will write a video-specific prompt (optionally enhanced).
    setPrompt('')
    // Force default video model when moving into a video session
    const videoDefault = getModelsByType('video')[0]
    if (videoDefault) {
      setSelectedModel(videoDefault.id)
    }
    
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
      description: "Reference image sent. Write a video prompt or use the wand to enhance.",
      variant: "success",
    })
  }

  // Get video sessions
  const videoSessions = allSessions.filter(s => s.type === 'video')
  
  // Get all processing generations (in-progress) - exclude cancelled as they shouldn't show progress
  const processingGenerations = generations.filter(g => 
    g.status === 'processing'
  )
  
  // Get cancelled generations separately (they will be shown in the gallery but without progress)
  const cancelledGenerations = generations.filter(g => 
    g.status === 'cancelled'
  )
  
  console.log('🟡 Processing generations:', processingGenerations.length, processingGenerations.map(g => ({ id: g.id, status: g.status })))
  
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
                generations={generations.filter(g => g.status !== 'processing' && g.status !== 'cancelled')}
                sessionId={session?.id || null}
                onReuseParameters={handleReuseParameters}
                processingGenerations={processingGenerations}
                cancelledGenerations={cancelledGenerations}
                videoSessions={videoSessions}
                onConvertToVideo={handleConvertToVideo}
                onCreateVideoSession={onSessionCreate}
                currentGenerationType={generationType}
                currentUser={currentUser}
              />
              
              {/* Load More Button */}
              {hasNextPage && (
                <div className="flex justify-center mt-8 mb-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
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
                isGenerating={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

