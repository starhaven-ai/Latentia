'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wand2, Loader2, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface PromptEnhancementButtonProps {
  prompt: string
  modelId: string
  referenceImage?: string | File | null
  onEnhancementComplete: (enhancedPrompt: string) => void
  disabled?: boolean
}

export function PromptEnhancementButton({
  prompt,
  modelId,
  referenceImage,
  onEnhancementComplete,
  disabled = false,
}: PromptEnhancementButtonProps) {
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const { toast } = useToast()

  const handleEnhance = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setEnhancing(true)
    
    try {
      // Convert reference image to base64 if it's a File
      let imageData = null
      if (referenceImage) {
        if (referenceImage instanceof File) {
          imageData = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => resolve('')
            reader.readAsDataURL(referenceImage)
          })
        } else if (typeof referenceImage === 'string') {
          imageData = referenceImage
        }
      }
      
      const response = await fetch('/api/prompts/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelId,
          referenceImage: imageData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enhance prompt')
      }

      const data = await response.json()
      
      // Wait a moment for visual effect before applying
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Show success toast
      toast({
        title: '✨ Prompt Enhanced',
        description: 'Your prompt has been optimized with AI',
      })
      
      // Apply the enhanced prompt with animation trigger
      onEnhancementComplete(data.enhancedPrompt)
      
      // Keep enhancing state briefly for fade effect
      setTimeout(() => setEnhancing(false), 1000)
    } catch (error: any) {
      console.error('Error enhancing prompt:', error)
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance prompt. Please try again.',
        variant: 'destructive',
      })
      setEnhancing(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleEnhance}
        disabled={disabled || !prompt.trim() || loading}
        className="absolute right-3 top-3 h-6 w-6 text-primary hover:text-primary/80 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        title="Enhance prompt with AI"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
      </Button>
      
      {/* Enhancement Animation Indicator */}
      {enhancing && (
        <div className="absolute right-12 top-3 flex items-center gap-1.5 text-primary animate-pulse">
          <Sparkles className="h-3 w-3 animate-spin" />
          <span className="text-xs font-medium">Enhancing...</span>
        </div>
      )}
    </>
  )
}

