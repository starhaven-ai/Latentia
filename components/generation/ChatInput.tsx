'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Image as ImageIcon, Wand2, Ratio, Grid3x3, ImagePlus } from 'lucide-react'

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

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const RESOLUTIONS = [512, 1024, 2048]
const OUTPUT_COUNTS = [1, 2, 4]

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
    <div className="space-y-2">
      {/* Main Input Area - Krea Style */}
      <div className="flex items-start gap-2">
        {/* Compact Input */}
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[56px] max-h-[120px] pr-3 py-3 rounded-2xl bg-muted/50 border border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
            disabled={generating}
          />
        </div>
        
        {/* Generate Button - Compact */}
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="default"
          className="h-[56px] px-6 rounded-2xl shadow-sm font-medium"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Parameter Controls - Compact Row */}
      <div className="flex items-center gap-1.5 px-1">
        {/* Aspect Ratio Select - Compact */}
        <Select
          value={parameters.aspectRatio}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, aspectRatio: value })
          }
        >
          <SelectTrigger className="w-[90px] h-8 text-xs rounded-full border bg-muted/50">
            <Ratio className="h-3 w-3 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map((ratio) => (
              <SelectItem key={ratio} value={ratio} className="text-xs">
                {ratio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resolution Select - Compact */}
        <Select
          value={parameters.resolution.toString()}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, resolution: parseInt(value) })
          }
        >
          <SelectTrigger className="w-[90px] h-8 text-xs rounded-full border bg-muted/50">
            <Grid3x3 className="h-3 w-3 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((res) => (
              <SelectItem key={res} value={res.toString()} className="text-xs">
                {res}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Image Count Select - Compact */}
        {generationType === 'image' && (
          <Select
            value={parameters.numOutputs.toString()}
            onValueChange={(value) =>
              onParametersChange({ ...parameters, numOutputs: parseInt(value) })
            }
          >
            <SelectTrigger className="w-[80px] h-8 text-xs rounded-full border bg-muted/50">
              <ImageIcon className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()} className="text-xs">
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Image Upload Button - Compact */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={generating}
          className="h-8 text-xs px-3 rounded-full border bg-muted/50"
        >
          <ImagePlus className="h-3 w-3 mr-1.5" />
          {referenceImage ? 'Image' : 'Image'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Keyboard Shortcut Hint - Compact */}
        <span className="text-[10px] text-muted-foreground ml-auto hidden lg:inline">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘</kbd>+<kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
        </span>
      </div>

      {/* Reference Image Preview - Minimal */}
      {referenceImage && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
          <span className="truncate max-w-[200px]">{referenceImage.name}</span>
          <button
            onClick={() => setReferenceImage(null)}
            className="text-destructive hover:underline text-[11px]"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

