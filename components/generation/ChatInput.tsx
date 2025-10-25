'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Sparkles } from 'lucide-react'
import { ParameterControls } from './ParameterControls'

interface ChatInputProps {
  onGenerate: (prompt: string, referenceImage?: File) => void
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
  }
  onParametersChange: (parameters: any) => void
  generationType: 'image' | 'video'
}

export function ChatInput({
  onGenerate,
  parameters,
  onParametersChange,
  generationType,
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
    <div className="space-y-3">
      {/* Parameter Controls */}
      <ParameterControls
        parameters={parameters}
        onParametersChange={onParametersChange}
        generationType={generationType}
      />

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] pr-12 resize-none"
            disabled={generating}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-2 bottom-2 p-2 rounded-lg hover:bg-muted transition-colors"
            disabled={generating}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="lg"
          className="px-8"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Reference Image Preview */}
      {referenceImage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Reference image: {referenceImage.name}</span>
          <button
            onClick={() => setReferenceImage(null)}
            className="text-destructive hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded">⌘</kbd> +{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd> to generate
      </p>
    </div>
  )
}

