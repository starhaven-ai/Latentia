'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Image as ImageIcon, Wand2 } from 'lucide-react'

interface ChatInputProps {
  onGenerate: (prompt: string, referenceImage?: File) => void
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
  }
  onParametersChange: (parameters: any) => void
  generationType: 'image' | 'video'
  centered?: boolean
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const RESOLUTIONS = [512, 1024, 2048]

export function ChatInput({
  onGenerate,
  parameters,
  onParametersChange,
  generationType,
  centered = false,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState('')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    try {
      await onGenerate(prompt, referenceImage || undefined)
      setPrompt('')
      setReferenceImage(null)
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setReferenceImage(file)
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Input Area - Krea Style */}
      <div className="relative">
        <Textarea
          placeholder="Describe an image and click generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`resize-none ${centered ? 'min-h-[120px] text-center text-lg' : 'min-h-[80px]'}`}
          disabled={generating}
        />
        
        {/* Generate Button - Positioned on the right like Krea */}
        <div className="absolute right-3 bottom-3">
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || generating}
            size={centered ? 'lg' : 'default'}
            className="shadow-lg"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {/* Inline Parameter Controls - Krea Style */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {/* Aspect Ratio Button */}
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>{parameters.aspectRatio}</span>
        </button>

        {/* Image Prompt Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          disabled={generating}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>{referenceImage ? referenceImage.name : 'Image prompt'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Resolution */}
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
          <span className="text-xs">📐</span>
          <span>{parameters.resolution}</span>
        </button>

        {/* Image Count */}
        {generationType === 'image' && (
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <span className="text-xs">🔢</span>
            <span>{parameters.numOutputs}</span>
          </button>
        )}

        {/* Keyboard Shortcut Hint */}
        {!centered && (
          <span className="text-xs text-muted-foreground ml-auto">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>
          </span>
        )}
      </div>

      {/* Reference Image Preview */}
      {referenceImage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Reference: {referenceImage.name}</span>
          <button
            onClick={() => setReferenceImage(null)}
            className="text-destructive hover:underline text-xs"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

