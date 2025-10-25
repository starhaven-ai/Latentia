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
      {/* Main Input Area */}
      <div className="relative">
        <Textarea
          placeholder="Describe an image and click generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className="resize-none min-h-[100px] pr-32 bg-background border-2 focus-visible:ring-2 focus-visible:ring-primary"
          disabled={generating}
        />
        
        {/* Generate Button - Inside textarea */}
        <div className="absolute right-3 bottom-3">
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || generating}
            size="default"
            className="shadow-md font-medium"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {/* Parameter Controls using shadcn Select */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Aspect Ratio Select */}
        <Select
          value={parameters.aspectRatio}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, aspectRatio: value })
          }
        >
          <SelectTrigger className="w-[120px] h-10 border-2 bg-background">
            <Ratio className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map((ratio) => (
              <SelectItem key={ratio} value={ratio}>
                {ratio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resolution Select */}
        <Select
          value={parameters.resolution.toString()}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, resolution: parseInt(value) })
          }
        >
          <SelectTrigger className="w-[120px] h-10 border-2 bg-background">
            <Grid3x3 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((res) => (
              <SelectItem key={res} value={res.toString()}>
                {res}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Image Count Select */}
        {generationType === 'image' && (
          <Select
            value={parameters.numOutputs.toString()}
            onValueChange={(value) =>
              onParametersChange({ ...parameters, numOutputs: parseInt(value) })
            }
          >
            <SelectTrigger className="w-[100px] h-10 border-2 bg-background">
              <ImageIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} {count === 1 ? 'image' : 'images'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Image Upload Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={generating}
          className="h-10 border-2 bg-background font-medium"
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          {referenceImage ? referenceImage.name.substring(0, 15) + '...' : 'Image prompt'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Keyboard Shortcut Hint */}
        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline font-medium">
          <kbd className="px-2 py-1 bg-muted rounded-md text-xs font-medium">⌘</kbd> + <kbd className="px-2 py-1 bg-muted rounded-md text-xs font-medium">Enter</kbd>
        </span>
      </div>

      {/* Reference Image Preview */}
      {referenceImage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Reference: {referenceImage.name}</span>
          <button
            onClick={() => setReferenceImage(null)}
            className="text-destructive hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

