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
      {/* Main Input Area - Minimal Krea Style */}
      <div className="flex items-center gap-2">
        {/* Compact Input */}
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[48px] max-h-[96px] px-4 py-3 text-sm rounded-lg bg-background border border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
            disabled={generating}
          />
        </div>
        
        {/* Compact Generate Button */}
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="default"
          className="h-[48px] px-6 rounded-lg font-medium transition-all"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Parameter Controls - Minimal Row */}
      <div className="flex items-center gap-1.5 px-0.5">
        {/* Style Transfer Button - Minimal */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={generating}
          className="h-7 text-[11px] px-2.5 rounded-md hover:bg-accent/50"
        >
          <ImagePlus className="h-3 w-3 mr-1" />
          Style
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Compact Controls */}
        <Select
          value={parameters.aspectRatio}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, aspectRatio: value })
          }
        >
          <SelectTrigger className="w-[80px] h-7 text-[11px] rounded-md border-0 bg-muted/50 hover:bg-muted">
            <Ratio className="h-3 w-3 mr-1" />
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

        <Select
          value={parameters.resolution.toString()}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, resolution: parseInt(value) })
          }
        >
          <SelectTrigger className="w-[75px] h-7 text-[11px] rounded-md border-0 bg-muted/50 hover:bg-muted">
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

        {generationType === 'image' && (
          <Select
            value={parameters.numOutputs.toString()}
            onValueChange={(value) =>
              onParametersChange({ ...parameters, numOutputs: parseInt(value) })
            }
          >
            <SelectTrigger className="w-[70px] h-7 text-[11px] rounded-md border-0 bg-muted/50 hover:bg-muted">
              <ImageIcon className="h-3 w-3 mr-1" />
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

        {/* Keyboard Shortcut - Subtle */}
        <span className="text-[10px] text-muted-foreground/60 ml-auto hidden lg:inline">
          ⌘ + Enter
        </span>
      </div>

      {/* Reference Image Preview - Minimal Pill */}
      {referenceImage && (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs">
            <ImagePlus className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{referenceImage.name}</span>
            <button
              onClick={() => setReferenceImage(null)}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

