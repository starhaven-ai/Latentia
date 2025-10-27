'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Image as ImageIcon, ImagePlus, Ratio, ChevronDown, Upload, FolderOpen, X } from 'lucide-react'
import { useModelCapabilities } from '@/hooks/useModelCapabilities'
import { AspectRatioSelector } from './AspectRatioSelector'
import { ModelPicker } from './ModelPicker'
import { ImageBrowseModal } from './ImageBrowseModal'
import { PromptEnhancementButton } from './PromptEnhancementButton'
import { useParams } from 'next/navigation'

interface ChatInputProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  onGenerate: (prompt: string, referenceImage?: File) => void
  parameters: {
    aspectRatio: string
    resolution: number
    numOutputs: number
  }
  onParametersChange: (parameters: any) => void
  generationType: 'image' | 'video'
  selectedModel: string
  onModelSelect: (modelId: string) => void
  isGenerating?: boolean
}

export function ChatInput({
  prompt,
  onPromptChange,
  onGenerate,
  parameters,
  onParametersChange,
  generationType,
  selectedModel,
  onModelSelect,
  isGenerating = false,
}: ChatInputProps) {
  const params = useParams()
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [browseModalOpen, setBrowseModalOpen] = useState(false)
  const [stylePopoverOpen, setStylePopoverOpen] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get model-specific capabilities
  const { modelConfig, supportedAspectRatios, maxResolution, parameters: modelParameters } = useModelCapabilities(selectedModel)
  
  // Check if model supports image editing (reference images)
  const supportsImageEditing = modelConfig?.capabilities?.editing === true
  
  // Get resolution options from model config or use defaults
  const resolutionOptions = modelParameters.find(p => p.name === 'resolution')?.options || [
    { label: '512px', value: 512 },
    { label: '1024px', value: 1024 },
    { label: '2048px', value: 2048 },
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
      
      // Clear reference image if switching to a model that doesn't support editing
      if (!supportsImageEditing && referenceImage) {
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl)
        }
        setImagePreviewUrl(null)
        setReferenceImage(null)
      }
      
      if (Object.keys(updates).length > 0) {
        onParametersChange({ ...parameters, ...updates })
      }
    }
  }, [modelConfig, selectedModel])

  const handleSubmit = async () => {
    if (!prompt.trim()) return

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
      // Error handling is done in the mutation
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
    // Convert URL to File for image generation
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
            placeholder="Describe an image and click generate..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`resize-none min-h-[52px] max-h-[104px] px-4 py-3 text-sm rounded-lg bg-muted/50 border transition-all pr-10 ${
              isEnhancing 
                ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10' 
                : 'border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary'
            }`}
          />
          <PromptEnhancementButton
            prompt={prompt}
            modelId={selectedModel}
            onEnhancementComplete={(enhancedPrompt) => {
              setIsEnhancing(true)
              onPromptChange(enhancedPrompt)
              setTimeout(() => setIsEnhancing(false), 1500)
            }}
            disabled={isGenerating}
          />
        </div>

        {/* Reference Image Thumbnail - Left of Generate Button */}
        {referenceImage && imagePreviewUrl && (
          <div className="relative group">
            <div className="w-[52px] h-[52px] rounded-lg overflow-hidden border-2 border-primary shadow-md">
              <img
                src={imagePreviewUrl}
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
          disabled={!prompt.trim()}
          size="default"
          className="h-[52px] px-8 rounded-lg font-semibold shadow-sm hover:shadow transition-all"
        >
          Generate
        </Button>
      </div>

      {/* Parameter Controls - Compact Row */}
      <div className="flex items-center gap-2">
        {/* Model Picker - Inline */}
        <div className="[&>button]:h-8 [&>button]:text-xs [&>button]:px-3 [&>button]:rounded-lg">
          <ModelPicker
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            generationType={generationType}
          />
        </div>

        {/* Style/Image Input - Popover with Upload/Browse - Only show if model supports editing */}
        {supportsImageEditing && (
          <Popover open={stylePopoverOpen} onOpenChange={setStylePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
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
        )}
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
                onChange={(value) =>
                  onParametersChange({ ...parameters, aspectRatio: value })
                }
                options={supportedAspectRatios}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Keyboard Shortcut */}
        <span className="text-xs text-muted-foreground ml-auto hidden lg:inline-flex items-center gap-1">
          <kbd className="px-2 py-0.5 bg-muted rounded text-[10px] border">⌘</kbd>
          <span>+</span>
          <kbd className="px-2 py-0.5 bg-muted rounded text-[10px] border">Enter</kbd>
        </span>
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

