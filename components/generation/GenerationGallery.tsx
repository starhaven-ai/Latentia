import { Download, Star, Trash2, RotateCcw, Info } from 'lucide-react'
import type { GenerationWithOutputs } from '@/types/generation'

interface GenerationGalleryProps {
  generations: GenerationWithOutputs[]
  onReuseParameters: (generation: GenerationWithOutputs) => void
}

export function GenerationGallery({
  generations,
  onReuseParameters,
}: GenerationGalleryProps) {
  if (generations.length === 0) {
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
    <div className="space-y-8 pb-4">
      {generations.map((generation) => (
        <div key={generation.id} className="space-y-4">
          {/* Prompt Display - Krea Style */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm font-medium leading-relaxed">{generation.prompt}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="capitalize">{generation.modelId.replace('gemini-', '').replace('-', ' ')}</span>
              <span>•</span>
              <span>{new Date(generation.createdAt).toLocaleDateString()}</span>
              {generation.parameters?.aspectRatio && (
                <>
                  <span>•</span>
                  <span>{generation.parameters.aspectRatio}</span>
                </>
              )}
            </div>
          </div>

          {/* Outputs Grid - Krea Style */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {generation.outputs.map((output) => (
              <div
                key={output.id}
                className="group relative aspect-square bg-muted rounded-lg overflow-hidden border border-border hover:border-primary transition-all duration-200"
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

                {/* Hover Overlay - Cleaner Design */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onReuseParameters(generation)}
                        className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                        title="Reuse parameters"
                      >
                        <RotateCcw className="h-4 w-4 text-white" />
                      </button>
                      <button
                        className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                        title="Star"
                      >
                        <Star className="h-4 w-4 text-white" />
                      </button>
                      <button
                        className="p-2 bg-red-500/80 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Model Badge - Subtle */}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {output.width && output.height && `${output.width}×${output.height}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

