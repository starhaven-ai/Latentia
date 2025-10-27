'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wand2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface PromptEnhancementButtonProps {
  prompt: string
  modelId: string
  onEnhancementComplete: (enhancedPrompt: string) => void
  disabled?: boolean
}

export function PromptEnhancementButton({
  prompt,
  modelId,
  onEnhancementComplete,
  disabled = false,
}: PromptEnhancementButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleEnhance = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/prompts/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enhance prompt')
      }

      const data = await response.json()
      
      // Show enhancement in toast and apply the first enhanced version
      toast({
        title: 'Prompt Enhanced',
        description: 'Your prompt has been optimized',
      })
      
      // Auto-apply the enhanced prompt
      onEnhancementComplete(data.enhancedPrompt)
    } catch (error: any) {
      console.error('Error enhancing prompt:', error)
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance prompt. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}

