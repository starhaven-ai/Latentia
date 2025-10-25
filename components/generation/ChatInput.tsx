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
    <div className="space-y-3">
      {/* Main Input Area - Krea Style Centered */}
      <div className="flex items-start gap-3">
        {/* Input with rounded design */}
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[60px] max-h-[120px] px-4 py-3.5 rounded-xl bg-background border-2 border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm"
            disabled={generating}
          />
        </div>
        
        {/* Generate Button - Krea Style */}
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="lg"
          className="h-[60px] px-8 rounded-xl shadow-md font-semibold text-base hover:shadow-lg transition-all"
        >
          <Wand2 className="mr-2 h-5 w-5" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Parameter Controls - Cleaner Row */}
      <div className="flex items-center gap-2 px-1">
        {/* Style Transfer Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={generating}
          className="h-9 text-xs px-3.5 rounded-lg border hover:bg-accent transition-colors"
        >
          <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
          Style transfer
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Aspect Ratio Pills */}
        <Select
          value={parameters.aspectRatio}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, aspectRatio: value })
          }
        >
          <SelectTrigger className="w-[100px] h-9 text-xs rounded-lg border hover:bg-accent">
            <Ratio className="h-3.5 w-3.5 mr-1.5" />
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

        {/* 6K Button - Resolution */}
        <Select
          value={parameters.resolution.toString()}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, resolution: parseInt(value) })
          }
        >
          <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border hover:bg-accent">
            <Grid3x3 className="h-3.5 w-3.5 mr-1.5" />
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

        {/* Image Count */}
        {generationType === 'image' && (
          <Select
            value={parameters.numOutputs.toString()}
            onValueChange={(value) =>
              onParametersChange({ ...parameters, numOutputs: parseInt(value) })
            }
          >
            <SelectTrigger className="w-[85px] h-9 text-xs rounded-lg border hover:bg-accent">
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()} className="text-xs">
                  {count} {count === 1 ? 'image' : 'images'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Keyboard Shortcut Hint */}
        <span className="text-[11px] text-muted-foreground ml-auto hidden lg:inline">
          <kbd className="px-2 py-1 bg-muted/50 rounded text-[10px] border border-border/50">⌘</kbd>
          <span className="mx-0.5">+</span>
          <kbd className="px-2 py-1 bg-muted/50 rounded text-[10px] border border-border/50">Enter</kbd>
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

