import { useState } from 'react'
import { Download, Star, RotateCcw, Info, Copy } from 'lucide-react'
import type { GenerationWithOutputs } from '@/types/generation'
import { useUpdateOutputMutation } from '@/hooks/useOutputMutations'
import { useToast } from '@/components/ui/use-toast'
import { GenerationProgress } from './GenerationProgress'
import { ImageLightbox } from './ImageLightbox'

interface GenerationGalleryProps {
  generations: GenerationWithOutputs[]
  sessionId: string | null
  onReuseParameters: (generation: GenerationWithOutputs) => void
  pendingCount?: number
  isGenerating?: boolean
  pendingAspectRatio?: string
}

export function GenerationGallery({
  generations,
  sessionId,
  onReuseParameters,
  pendingCount = 0,
  isGenerating = false,
  pendingAspectRatio = '1:1',
}: GenerationGalleryProps) {
  const { toast } = useToast()
  const updateOutputMutation = useUpdateOutputMutation()
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

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

  const handleDownload = async (imageUrl: string, outputId: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generation-${outputId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      })
    }
  }

  const handleToggleStar = async (outputId: string, currentStarred: boolean) => {
    if (!sessionId) return
    
    try {
      await updateOutputMutation.mutateAsync({
        outputId,
        sessionId,
        isStarred: !currentStarred,
      })
      
      toast({
        title: currentStarred ? "Removed from favorites" : "Added to favorites",
        description: currentStarred ? "Image unstarred" : "Image starred",
        variant: "default",
      })
    } catch (error) {
      console.error('Error toggling star:', error)
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      })
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

  return (
    <>
      <div className="space-y-6 pb-4">
        {generations.map((generation) => (
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
                {output.fileType === 'image' ? (
                  <img
                    src={output.fileUrl}
                    alt="Generated content"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxImage(output.fileUrl)}
                  />
                ) : (
                  <video
                    src={output.fileUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}

                {/* Hover Overlay - Minimal Krea Style */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {/* Top Bar - Star indicator */}
                  {output.isStarred && (
                    <div className="absolute top-2 left-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    </div>
                  )}
                  
                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(output.fileUrl, output.id)
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
                          handleToggleStar(output.id, output.isStarred)
                        }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title={output.isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star className={`h-3.5 w-3.5 text-white ${output.isStarred ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      ))}

        {/* Show pending generations at the bottom */}
        {isGenerating && pendingCount > 0 && (
          <div className="flex gap-6 items-start">
            {/* Left Side: Generating message */}
            <div className="w-96 h-64 flex-shrink-0 bg-muted/30 rounded-xl p-6 border border-border/50 border-green-500/30 flex flex-col">
              <div className="flex-1">
                <p className="text-base font-normal leading-relaxed text-foreground/90 mb-4">
                  Generating...
                </p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium text-green-500">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/70">Outputs:</span>
                  <span className="font-medium">{pendingCount} {pendingCount === 1 ? 'image' : 'images'}</span>
                </div>
              </div>
            </div>

          {/* Right Side: Progress placeholders in 2-column grid */}
          <div className="flex-1 grid grid-cols-2 gap-3 max-w-2xl">
            {Array.from({ length: pendingCount }).map((_, idx) => (
              <GenerationProgress 
                key={`pending-${idx}`} 
                estimatedTime={25} 
                aspectRatio={pendingAspectRatio}
              />
            ))}
          </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  )
}

