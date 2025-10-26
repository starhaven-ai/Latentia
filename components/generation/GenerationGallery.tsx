import { useState } from 'react'
import { Download, RotateCcw, Info, Copy, Bookmark, Check, Video, Wand2, Ratio } from 'lucide-react'
import type { GenerationWithOutputs } from '@/types/generation'
import type { Session } from '@/types/project'
import { useUpdateOutputMutation } from '@/hooks/useOutputMutations'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { GenerationProgress } from './GenerationProgress'
import { ImageLightbox } from './ImageLightbox'
import { VideoSessionSelector } from './VideoSessionSelector'

interface GenerationGalleryProps {
  generations: GenerationWithOutputs[]
  sessionId: string | null
  onReuseParameters: (generation: GenerationWithOutputs) => void
  pendingCount?: number
  isGenerating?: boolean
  pendingPrompt?: string
  pendingModelName?: string
  pendingAspectRatio?: string
  pendingEstimatedTime?: number
  pendingIsVideo?: boolean
  videoSessions?: Session[]
  onConvertToVideo?: (generation: GenerationWithOutputs, videoSessionId: string, imageUrl?: string) => void
  onCreateVideoSession?: ((type: 'image' | 'video', name: string) => Promise<Session | null>) | undefined
  currentGenerationType?: 'image' | 'video'
}

export function GenerationGallery({
  generations,
  sessionId,
  onReuseParameters,
  pendingCount = 0,
  isGenerating = false,
  pendingPrompt,
  pendingModelName,
  pendingAspectRatio = '1:1',
  pendingEstimatedTime = 25,
  pendingIsVideo = false,
  videoSessions = [],
  onConvertToVideo,
  onCreateVideoSession,
  currentGenerationType = 'image',
}: GenerationGalleryProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const updateOutputMutation = useUpdateOutputMutation()
  const [lightboxData, setLightboxData] = useState<{
    imageUrl: string
    output: any
    generation: GenerationWithOutputs
  } | null>(null)
  const [videoSelectorOpen, setVideoSelectorOpen] = useState(false)
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationWithOutputs | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  // Convert aspect ratio string to CSS aspect-ratio value
  const getAspectRatioStyle = (aspectRatio?: string) => {
    if (!aspectRatio) return '1 / 1'
    return aspectRatio.replace(':', ' / ')
  }

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast({
        title: "Copied",
        description: "Prompt copied to clipboard",
        variant: "default",
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: "Copy failed",
        description: "Failed to copy prompt to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async (fileUrl: string, outputId: string, fileType: string = 'image') => {
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = fileType === 'video' ? 'mp4' : 'png'
      link.download = `generation-${outputId}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast({
        title: "Download failed",
        description: `Failed to download ${fileType}`,
        variant: "destructive",
      })
    }
  }

  const handleToggleApproval = async (outputId: string, currentApproved: boolean) => {
    if (!sessionId) return
    
    try {
      await updateOutputMutation.mutateAsync({
        outputId,
        sessionId,
        isApproved: !currentApproved,
      })
      
      toast({
        title: currentApproved ? "Approval removed" : "Approved",
        description: currentApproved ? "Image unapproved" : "Image approved for review",
        variant: "default",
      })
    } catch (error) {
      console.error('Error toggling approval:', error)
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive",
      })
    }
  }

  const handleToggleBookmark = async (outputId: string, isBookmarked: boolean) => {
    if (!sessionId) return
    
    try {
      const method = isBookmarked ? 'DELETE' : 'POST'
      
      const response = await fetch('/api/bookmarks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId }),
      })

      if (!response.ok) throw new Error('Failed to toggle bookmark')
      
      toast({
        title: isBookmarked ? "Bookmark removed" : "Bookmarked",
        description: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        variant: "default",
      })

      // Invalidate generations query to refetch with updated bookmark status
      queryClient.invalidateQueries({ queryKey: ['generations', sessionId] })
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast({
        title: "Error",
        description: "Failed to update bookmark status",
        variant: "destructive",
      })
    }
  }

  const handleVideoConversion = (generation: GenerationWithOutputs, imageUrl: string) => {
    setSelectedGeneration(generation)
    setSelectedImageUrl(imageUrl)
    setVideoSelectorOpen(true)
  }

  const handleSelectVideoSession = async (videoSessionId: string) => {
    if (selectedGeneration && onConvertToVideo) {
      onConvertToVideo(selectedGeneration, videoSessionId, selectedImageUrl || undefined)
    }
  }

  const handleCreateVideoSession = async (sessionName: string) => {
    if (selectedGeneration && onCreateVideoSession) {
      const newSession = await onCreateVideoSession('video', sessionName)
      if (newSession && onConvertToVideo) {
        onConvertToVideo(selectedGeneration, newSession.id, selectedImageUrl || undefined)
      }
    }
  }


  if (generations.length === 0 && !isGenerating) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No generations yet</p>
          <p className="text-sm">Enter a prompt below to generate your first image or video</p>
        </div>
      </div>
    )
  }

  // Check if this is a video generation
  const isVideoGeneration = (gen: GenerationWithOutputs) => {
    return gen.outputs.some(output => output.fileType === 'video')
  }

  return (
    <>
      <div className="space-y-6 pb-4">
        {generations.map((generation) => {
          const isVideo = isVideoGeneration(generation)
          
          // Failed generation layout
          if (generation.status === 'failed') {
            const errorMessage = (generation.parameters as any)?.error || 'Generation failed'
            return (
              <div key={generation.id} className="flex gap-6 items-start">
                {/* Left Side: Prompt Display with Error State */}
                <div className="w-96 h-64 flex-shrink-0 bg-destructive/10 rounded-xl p-6 border border-destructive/50 flex flex-col">
                  <div className="flex-1 overflow-hidden hover:overflow-y-auto transition-all group relative">
                    <p 
                      className="text-base font-normal leading-relaxed text-foreground/90 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleCopyPrompt(generation.prompt)}
                      title="Click to copy"
                    >
                      {generation.prompt}
                    </p>
                    <Copy className="h-3.5 w-3.5 absolute top-0 right-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground mt-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <Info className="h-3.5 w-3.5" />
                      <span className="font-medium">Failed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">Model:</span>
                      <span className="font-medium">{generation.modelId.replace('gemini-', '').replace('fal-', '')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">Generated:</span>
                      <span className="font-medium">{new Date(generation.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Error Message */}
                <div className="flex-1 max-w-2xl">
                  <div className="bg-destructive/10 rounded-xl p-6 border border-destructive/50">
                    <h3 className="text-lg font-semibold text-destructive mb-2">Generation Failed</h3>
                    <p className="text-sm text-foreground/80 mb-4">{errorMessage}</p>
                    <button
                      onClick={() => onReuseParameters(generation)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )
          }
          
          // Video layout: Prompt above, video below with more space
          if (isVideo) {
            return (
              <div key={generation.id} className="space-y-3 max-w-4xl mx-auto">
                {/* Prompt above video - truncated with click to copy */}
                <div 
                  className="bg-muted/30 rounded-lg px-4 py-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => handleCopyPrompt(generation.prompt)}
                  title="Click to copy prompt"
                >
                  <p className="text-sm text-foreground/90 line-clamp-2 group-hover:text-primary transition-colors">
                    {generation.prompt}
                  </p>
                </div>

                {/* Video outputs - same width as prompt */}
                <div className="grid grid-cols-1 gap-4">
                  {generation.outputs.map((output) => {
                    const aspectRatio = (generation.parameters as any)?.aspectRatio || '16:9'
                    return (
                      <div
                        key={output.id}
                        className="group relative bg-muted rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                        style={{ aspectRatio: getAspectRatioStyle(aspectRatio) }}
                      >
                        <video
                          src={output.fileUrl}
                          className="w-full h-full object-cover"
                          controls
                        />

                        {/* Hover Overlay with Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                          {/* Top Right - Approval checkmark */}
                          <div className="absolute top-2 right-2 pointer-events-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleApproval(output.id, (output as any).isApproved || false)
                              }}
                              className={`p-1.5 backdrop-blur-sm rounded-lg transition-colors ${
                                (output as any).isApproved
                                  ? 'bg-green-500/90 hover:bg-green-600/90'
                                  : 'bg-white/20 hover:bg-white/30'
                              }`}
                              title={(output as any).isApproved ? 'Approved for review' : 'Approve for review'}
                            >
                              <Check className={`h-3.5 w-3.5 ${(output as any).isApproved ? 'text-white' : 'text-white'}`} />
                            </button>
                          </div>
                          
                          {/* Bottom Action Bar */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between pointer-events-auto">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload(output.fileUrl, output.id, output.fileType)
                                }}
                                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5 text-white" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onReuseParameters(generation)
                                }}
                                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                                title="Reuse"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-white" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleBookmark(output.id, (output as any).isBookmarked || false)
                                }}
                                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                                title={(output as any).isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                              >
                                <Bookmark className={`h-3.5 w-3.5 text-white ${(output as any).isBookmarked ? 'fill-white' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          // Image layout: Original layout with prompt on left
          return (
            <div key={generation.id} className="flex gap-6 items-start">
              {/* Left Side: Prompt Display - Fixed Height with Scroll on Hover */}
              <div className="w-96 h-64 flex-shrink-0 bg-muted/30 rounded-xl p-6 border border-border/50 flex flex-col">
                <div className="flex-1 overflow-hidden hover:overflow-y-auto transition-all group relative">
                  <p 
                    className="text-base font-normal leading-relaxed text-foreground/90 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleCopyPrompt(generation.prompt)}
                    title="Click to copy"
                  >
                    {generation.prompt}
                  </p>
                  {/* Copy icon hint */}
                  <Copy className="h-3.5 w-3.5 absolute top-0 right-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-2 text-xs text-muted-foreground mt-4">
                  {generation.user && (
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="font-medium">{generation.user.displayName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    <span className="capitalize font-medium">{generation.modelId.replace('gemini-', '').replace('-', ' ')}</span>
                  </div>
                  {generation.parameters?.aspectRatio && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">Aspect Ratio:</span>
                      <span className="font-medium">{generation.parameters.aspectRatio}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/70">Generated:</span>
                    <span className="font-medium">{new Date(generation.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

            {/* Right Side: Outputs in 2-Column Grid - Smaller Images */}
            <div className="flex-1 grid grid-cols-2 gap-3 max-w-2xl">
              {generation.outputs.map((output) => {
                const aspectRatio = (generation.parameters as any)?.aspectRatio || '1:1'
                return (
                <div
                  key={output.id}
                  className="group relative bg-muted rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                  style={{ aspectRatio: getAspectRatioStyle(aspectRatio) }}
                >
                  {output.fileType === 'image' && (
                    <img
                      src={output.fileUrl}
                      alt="Generated content"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxData({
                        imageUrl: output.fileUrl,
                        output: output,
                        generation: generation
                      })}
                    />
                  )}

                {/* Hover Overlay - Minimal Krea Style - pointer-events-none to allow image clicks */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                  {/* Top Right - Approval checkmark (always visible when approved) */}
                  <div className="absolute top-2 right-2 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleApproval(output.id, (output as any).isApproved || false)
                      }}
                      className={`p-1.5 backdrop-blur-sm rounded-lg transition-colors ${
                        (output as any).isApproved
                          ? 'bg-green-500/90 hover:bg-green-600/90'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                      title={(output as any).isApproved ? 'Approved for review' : 'Approve for review'}
                    >
                      <Check className={`h-3.5 w-3.5 ${(output as any).isApproved ? 'text-white' : 'text-white'}`} />
                    </button>
                  </div>
                  
                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(output.fileUrl, output.id, output.fileType)
                        }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onReuseParameters(generation)
                        }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title="Reuse"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-white" />
                      </button>
                      {currentGenerationType === 'image' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVideoConversion(generation, output.fileUrl)
                          }}
                          className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                          title="Convert to Video"
                        >
                          <Video className="h-3.5 w-3.5 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleBookmark(output.id, (output as any).isBookmarked || false)
                        }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title={(output as any).isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                      >
                        <Bookmark className={`h-3.5 w-3.5 text-white ${(output as any).isBookmarked ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
          )
        })}

        {/* Show pending generations at the bottom */}
        {isGenerating && pendingCount > 0 && (
          <>
            {pendingIsVideo ? (
              // Video layout: Prompt above, preview below
              <div className="space-y-3 max-w-4xl mx-auto">
                {/* Prompt above */}
                <div className="bg-muted/30 rounded-lg px-4 py-3 border border-border/50 border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium text-primary">Generating...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingCount} {pendingCount === 1 ? 'video' : 'videos'}
                  </p>
                </div>

                {/* Progress preview below */}
                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: pendingCount }).map((_, idx) => (
                    <GenerationProgress 
                      key={`pending-${idx}`} 
                      estimatedTime={pendingEstimatedTime} 
                      aspectRatio={pendingAspectRatio}
                      isVideo={pendingIsVideo}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Image layout: Prompt on left, previews on right
              <div className="flex gap-6 items-start">
                {/* Left Side: Generating with prompt and metadata */}
                <div className="w-96 h-64 flex-shrink-0 bg-muted/30 rounded-xl p-6 border border-border/50 border-primary/30 flex flex-col">
                  <div className="flex-1 mb-4">
                    {/* Show prompt if available, otherwise show placeholder */}
                    <p className="text-base font-normal leading-relaxed text-foreground/90">
                      {pendingPrompt || 'Generating...'}
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {/* Model info if available */}
                    {pendingModelName && (
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{pendingModelName}</span>
                      </div>
                    )}
                    {/* Aspect Ratio */}
                    <div className="flex items-center gap-2">
                      <Ratio className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">Aspect Ratio:</span>
                      <span className="font-medium">{pendingAspectRatio}</span>
                    </div>
                    {/* Output count */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">Outputs:</span>
                      <span className="font-medium">
                        {pendingCount} {pendingCount === 1 ? 'image' : 'images'}
                      </span>
                    </div>
                    {/* Generation date */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">Generated:</span>
                      <span className="font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Progress placeholders in 2-column grid */}
                <div className="flex-1 grid grid-cols-2 gap-3 max-w-2xl">
                  {Array.from({ length: pendingCount }).map((_, idx) => (
                    <GenerationProgress 
                      key={`pending-${idx}`} 
                      estimatedTime={pendingEstimatedTime} 
                      aspectRatio={pendingAspectRatio}
                      isVideo={pendingIsVideo}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxData?.imageUrl || ''}
        output={lightboxData?.output || null}
        isOpen={!!lightboxData}
        onClose={() => setLightboxData(null)}
        onBookmark={handleToggleBookmark}
        onApprove={handleToggleApproval}
        onReuse={() => {
          if (lightboxData?.generation) {
            onReuseParameters(lightboxData.generation)
            setLightboxData(null)
          }
        }}
        onDownload={handleDownload}
      />

      {/* Video Session Selector */}
      <VideoSessionSelector
        isOpen={videoSelectorOpen}
        onClose={() => {
          setVideoSelectorOpen(false)
          setSelectedGeneration(null)
          setSelectedImageUrl(null)
        }}
        videoSessions={videoSessions}
        onSelectSession={handleSelectVideoSession}
        onCreateNewSession={handleCreateVideoSession}
      />
    </>
  )
}

