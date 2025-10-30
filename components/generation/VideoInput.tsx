'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Video as VideoIcon, ImagePlus, Ratio, ChevronDown, X, Upload, FolderOpen, Clock } from 'lucide-react'
import { useModelCapabilities } from '@/hooks/useModelCapabilities'
import { AspectRatioSelector } from './AspectRatioSelector'
import { ModelPicker } from './ModelPicker'
import { ImageBrowseModal } from './ImageBrowseModal'
import { useParams } from 'next/navigation'
import { PromptEnhancementButton } from './PromptEnhancementButton'

interface VideoInputProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  onGenerate: (prompt: string, referenceImage?: File) => void
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
    duration?: number
  }
  onParametersChange: (parameters: any) => void
  selectedModel: string
  onModelSelect: (modelId: string) => void
  referenceImageUrl?: string | null
  onClearReferenceImage?: () => void
  onSetReferenceImageUrl?: (url: string) => void
}

export function VideoInput({
  prompt,
  onPromptChange,
  onGenerate,
  parameters,
  onParametersChange,
  selectedModel,
  onModelSelect,
  referenceImageUrl,
  onClearReferenceImage,
  onSetReferenceImageUrl,
}: VideoInputProps) {
  const params = useParams()
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [browseModalOpen, setBrowseModalOpen] = useState(false)
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get model-specific capabilities
  const { modelConfig, supportedAspectRatios, maxResolution, parameters: modelParameters } = useModelCapabilities(selectedModel)
  
  // Get resolution options from model config or use defaults
  const resolutionOptions = modelParameters.find(p => p.name === 'resolution')?.options || [
    { label: '720p', value: 720 },
    { label: '1080p', value: 1080 },
  ]
  
  // Get duration options from model config
  const durationOptions = modelParameters.find(p => p.name === 'duration')?.options || []
  const hasDuration = durationOptions.length > 0
  
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
      onPromptChange('')
      // Clean up preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setImagePreviewUrl(null)
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
      // Clean up old preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      // Create new preview URL
      const previewUrl = URL.createObjectURL(file)
      setImagePreviewUrl(previewUrl)
      setReferenceImage(file)
    }
  }

  const handleBrowseSelect = async (imageUrl: string) => {
    // Convert URL to File for consistent handling
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'reference.png', { type: blob.type })
      
      // Clean up old preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      // Set the imageUrl as preview (it's already a valid URL)
      setImagePreviewUrl(imageUrl)
      setReferenceImage(file)
    } catch (error) {
      console.error('Error loading image from URL:', error)
    }
  }

  // If a referenceImageUrl is provided from parent (e.g., convert-to-video),
  // hydrate the local preview + File so it appears in the prompt bar and is
  // included in the generation request.
  useEffect(() => {
    if (!referenceImageUrl) return
    // If we've already set a preview for this URL, skip
    if (imagePreviewUrl === referenceImageUrl && referenceImage) return
    ;(async () => {
      try {
        const response = await fetch(referenceImageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'reference.png', { type: blob.type })
        // Clean up old preview URL
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imagePreviewUrl)
        }
        setImagePreviewUrl(referenceImageUrl)
        setReferenceImage(file)
      } catch (err) {
        console.error('Failed to hydrate referenceImageUrl for video input:', err)
      }
    })()
  }, [referenceImageUrl])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  return (
    <div className="space-y-3">
      {/* Main Input Area - Card Style */}
      <div className="flex items-center gap-3">
        {/* Input */}
        <div className="flex-1 relative">
          <Textarea
            placeholder="Describe a video to animate from the reference image..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[52px] max-h-[104px] px-4 py-3 text-sm rounded-lg bg-muted/50 border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            disabled={generating}
          />
          <PromptEnhancementButton
            prompt={prompt}
            modelId={selectedModel}
            referenceImage={referenceImage || imagePreviewUrl || null}
            onEnhancementComplete={(enhanced) => onPromptChange(enhanced)}
            disabled={generating}
          />
        </div>

        {/* Reference Image Thumbnail - Left of Generate Button */}
        {(referenceImage || imagePreviewUrl) && (
          <div className="relative group">
            <div className="w-[52px] h-[52px] rounded-lg overflow-hidden border-2 border-primary shadow-md">
              <img
                src={imagePreviewUrl || ''}
                alt="Reference"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => {
                if (imagePreviewUrl) {
                  URL.revokeObjectURL(imagePreviewUrl)
                }
                setImagePreviewUrl(null)
                setReferenceImage(null)
              }}
              className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive hover:text-destructive-foreground"
              title="Remove reference image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
        {/* Generate Button */}
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || generating}
          size="default"
          className="h-[52px] px-8 rounded-lg font-semibold shadow-sm hover:shadow transition-all"
        >
          <VideoIcon className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Parameter Controls - Compact Row */}
      <div className="flex items-center gap-2">
        {/* Model Picker - Inline */}
        <div className="[&>button]:h-8 [&>button]:text-xs [&>button]:px-3 [&>button]:rounded-lg">
          <ModelPicker
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            generationType="video"
          />
        </div>

        {/* Style/Image Input - Popover with Upload/Browse */}
        <Popover open={stylePopoverOpen} onOpenChange={setStylePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              className="h-8 px-3 rounded-lg"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => {
                  fileInputRef.current?.click()
                  setStylePopoverOpen(false)
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => {
                  setBrowseModalOpen(true)
                  setStylePopoverOpen(false)
                }}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                Browse
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Aspect Ratio Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              className="h-8 text-xs px-3 rounded-lg"
            >
              <Ratio className="h-3.5 w-3.5 mr-1.5" />
              {parameters.aspectRatio}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Aspect Ratio</p>
              <AspectRatioSelector
                value={parameters.aspectRatio}
                onChange={(ratio: string) => onParametersChange({ ...parameters, aspectRatio: ratio })}
                options={supportedAspectRatios}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Resolution Dropdown */}
        <Select
          value={String(parameters.resolution)}
          onValueChange={(value) => onParametersChange({ ...parameters, resolution: parseInt(value) })}
          disabled={generating}
        >
          <SelectTrigger className="h-8 text-xs px-3 rounded-lg w-auto min-w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resolutionOptions.map(option => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Duration Dropdown - Only for video models that support it */}
        {hasDuration && (
          <Select
            value={String(parameters.duration || 8)}
            onValueChange={(value) => onParametersChange({ ...parameters, duration: parseInt(value) })}
            disabled={generating}
          >
            <SelectTrigger className="h-8 text-xs px-3 rounded-lg w-auto min-w-[100px]">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Image Browse Modal */}
      <ImageBrowseModal
        isOpen={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        onSelectImage={handleBrowseSelect}
        projectId={params.id as string}
      />
    </div>
  )
}

