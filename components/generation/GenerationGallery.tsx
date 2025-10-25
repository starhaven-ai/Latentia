import { Download, Star, Trash2, RotateCcw, Info } from 'lucide-react'
import type { GenerationWithOutputs } from '@/types/generation'
import { useState } from 'react'

interface GenerationGalleryProps {
  generations: GenerationWithOutputs[]
  onReuseParameters: (generation: GenerationWithOutputs) => void
  onGenerationsUpdate?: (generations: GenerationWithOutputs[]) => void
}

export function GenerationGallery({
  generations,
  onReuseParameters,
  onGenerationsUpdate,
}: GenerationGalleryProps) {
  const [localGenerations, setLocalGenerations] = useState(generations)

  // Update local state when generations prop changes
  useState(() => {
    setLocalGenerations(generations)
  })

  const handleToggleStar = async (outputId: string, currentStarred: boolean) => {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isStarred: !currentStarred,
        }),
      })

      if (response.ok) {
        // Update local state
        const updatedGenerations = localGenerations.map((gen) => ({
          ...gen,
          outputs: gen.outputs.map((output) =>
            output.id === outputId
              ? { ...output, isStarred: !currentStarred }
              : output
          ),
        }))
        setLocalGenerations(updatedGenerations)
        onGenerationsUpdate?.(updatedGenerations)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const handleDelete = async (outputId: string, generationId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Update local state - remove output
        const updatedGenerations = localGenerations
          .map((gen) => ({
            ...gen,
            outputs: gen.outputs.filter((output) => output.id !== outputId),
          }))
          .filter((gen) => gen.outputs.length > 0) // Remove generations with no outputs

        setLocalGenerations(updatedGenerations)
        onGenerationsUpdate?.(updatedGenerations)
      }
    } catch (error) {
      console.error('Error deleting output:', error)
    }
  }

  if (localGenerations.length === 0) {
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
    <div className="space-y-6 pb-4">
      {localGenerations.map((generation) => (
        <div key={generation.id} className="flex gap-4 items-start">
          {/* Left Side: Prompt Display - Krea Style */}
          <div className="w-64 flex-shrink-0 bg-muted/30 rounded-xl p-4 border border-border/50">
            <p className="text-sm font-normal leading-relaxed text-foreground/90 mb-3">
              {generation.prompt}
            </p>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                <span className="capitalize">{generation.modelId.replace('gemini-', '').replace('-', ' ')}</span>
              </div>
              {generation.parameters?.aspectRatio && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/70">Ratio:</span>
                  <span>{generation.parameters.aspectRatio}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/70">Date:</span>
                <span>{new Date(generation.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Outputs in Horizontal Grid - Krea Style */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {generation.outputs.map((output) => (
              <div
                key={output.id}
                className="group relative aspect-square bg-muted rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
              >
                {output.fileType === 'image' ? (
                  <img
                    src={output.fileUrl}
                    alt="Generated content"
                    className="w-full h-full object-cover"
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
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = output.fileUrl
                          link.download = `generation-${output.id}.${output.fileType === 'image' ? 'png' : 'mp4'}`
                          link.click()
                        }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => onReuseParameters(generation)}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title="Reuse"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStar(output.id, output.isStarred)}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                        title={output.isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star className={`h-3.5 w-3.5 text-white ${output.isStarred ? 'fill-white' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(output.id, generation.id)}
                        className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded-lg hover:bg-red-600/90 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

