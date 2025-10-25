'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface GenerationProgressProps {
  estimatedTime?: number // in seconds
  onComplete?: () => void
}

export function GenerationProgress({ estimatedTime = 30, onComplete }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000
      setElapsed(elapsedSeconds)
      
      // Calculate progress (with a slight curve to feel natural)
      const calculatedProgress = Math.min(
        (elapsedSeconds / estimatedTime) * 95, // Cap at 95% until complete
        95
      )
      
      setProgress(calculatedProgress)
    }, 100)

    return () => clearInterval(interval)
  }, [estimatedTime])

  return (
    <div className="relative aspect-square bg-muted/30 rounded-xl overflow-hidden border border-border/50">
      {/* Placeholder content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary/60 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground mb-2">Generating...</p>
        <p className="text-xs text-muted-foreground/60">{Math.ceil(elapsed)}s elapsed</p>
      </div>
      
      {/* Green progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-green-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

