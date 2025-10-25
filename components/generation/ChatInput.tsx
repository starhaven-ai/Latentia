'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Image as ImageIcon, Wand2, Ratio, Grid3x3, ImagePlus } from 'lucide-react'
import { useModelCapabilities } from '@/hooks/useModelCapabilities'

interface ChatInputProps {
  onGenerate: (prompt: string, referenceImage?: File) => void
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
  }
  onParametersChange: (parameters: any) => void
  generationType: 'image' | 'video'
  selectedModel: string
}

export function ChatInput({
  onGenerate,
  parameters,
  onParametersChange,
  generationType,
  selectedModel,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState('')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get model-specific capabilities
  const { modelConfig, supportedAspectRatios, maxResolution, parameters: modelParameters } = useModelCapabilities(selectedModel)
  
  // Get resolution options from model config or use defaults
  const resolutionOptions = modelParameters.find(p => p.name === 'resolution')?.options || [
    { label: '512px', value: 512 },
    { label: '1024px', value: 1024 },
    { label: '2048px', value: 2048 },
  ]
  
  // Get output count options from model config or use defaults
  const outputCountOptions = modelParameters.find(p => p.name === 'numOutputs')?.options || [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
  ]
  
  // Update parameters when model changes if current values aren't supported
  useEffect(() => {
    if (modelConfig) {
      const updates: any = {}
      
      // Check aspect ratio
      if (!supportedAspectRatios.includes(parameters.aspectRatio)) {
        updates.aspectRatio = modelConfig.defaultAspectRatio || supportedAspectRatios[0]
      }
      
      // Check resolution
      if (parameters.resolution > maxResolution) {
        updates.resolution = maxResolution
      }
      
      if (Object.keys(updates).length > 0) {
        onParametersChange({ ...parameters, ...updates })
      }
    }
  }, [modelConfig, selectedModel])

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
      {/* Main Input Area - Card Style */}
      <div className="flex items-center gap-3">
        {/* Input */}
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[52px] max-h-[104px] px-4 py-3 text-sm rounded-lg bg-muted/50 border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            disabled={generating}
          />
        </div>
        
        {/* Generate Button */}
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="default"
          className="h-[52px] px-8 rounded-lg font-semibold shadow-sm hover:shadow transition-all"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Parameter Controls - Clean Row */}
      <div className="flex items-center gap-2">
        {/* Style Transfer Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={generating}
          className="h-8 text-xs px-3 rounded-lg"
        >
          <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
          Style
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Parameter Controls with Borders */}
        <Select
          value={parameters.aspectRatio}
          onValueChange={(value) =>
            onParametersChange({ ...parameters, aspectRatio: value })
          }
        >
          <SelectTrigger className="w-[90px] h-8 text-xs rounded-lg border bg-background">
            <Ratio className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedAspectRatios.map((ratio) => (
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
          <SelectTrigger className="w-[85px] h-8 text-xs rounded-lg border bg-background">
            <Grid3x3 className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resolutionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()} className="text-xs">
                {option.label}
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
            <SelectTrigger className="w-[80px] h-8 text-xs rounded-lg border bg-background">
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outputCountOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Keyboard Shortcut */}
        <span className="text-xs text-muted-foreground ml-auto hidden lg:inline-flex items-center gap-1">
          <kbd className="px-2 py-0.5 bg-muted rounded text-[10px] border">⌘</kbd>
          <span>+</span>
          <kbd className="px-2 py-0.5 bg-muted rounded text-[10px] border">Enter</kbd>
        </span>
      </div>

      {/* Reference Image Preview */}
      {referenceImage && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs shadow-sm">
            <ImagePlus className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{referenceImage.name}</span>
            <button
              onClick={() => setReferenceImage(null)}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1 text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

