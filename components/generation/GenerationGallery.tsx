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
    <div className="space-y-8">
      {generations.map((generation) => (
        <div key={generation.id} className="space-y-3">
          {/* Prompt */}
          <div className="text-sm">
            <p className="text-muted-foreground">Prompt:</p>
            <p className="font-medium">{generation.prompt}</p>
          </div>

          {/* Outputs Grid */}
          <div className="grid grid-cols-2 gap-4">
            {generation.outputs.map((output) => (
              <div
                key={output.id}
                className="group relative aspect-square bg-muted rounded-lg overflow-hidden"
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

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onReuseParameters(generation)}
                    className="p-2 bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                    title="Reuse parameters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 bg-background/90 rounded-lg hover:bg-background transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 bg-background/90 rounded-lg hover:bg-background transition-colors"
                    title="Star"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 bg-background/90 rounded-lg hover:bg-background transition-colors"
                    title="Info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 bg-destructive rounded-lg hover:bg-destructive/90 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Model Badge */}
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  {generation.modelId}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

