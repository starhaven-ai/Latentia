'use client'

import { useEffect, useState } from 'react'

interface GenerationProgressProps {
  estimatedTime?: number // in seconds
  onComplete?: () => void
  aspectRatio?: string
  isVideo?: boolean
}

// Generation stages with approximate durations
const GENERATION_STAGES = [
  { name: 'Initializing models', duration: 0.15 }, // 15% of total time
  { name: 'Processing prompt', duration: 0.25 }, // 25% of total time
  { name: 'Generating frames', duration: 0.45 }, // 45% of total time
  { name: 'Finalizing output', duration: 0.15 }, // 15% of total time
]

export function GenerationProgress({ 
  estimatedTime = 30, 
  onComplete, 
  aspectRatio = '1:1',
  isVideo = false 
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000
      setElapsed(elapsedSeconds)
      
      // Calculate progress
      const calculatedProgress = Math.min(
        (elapsedSeconds / estimatedTime) * 95, // Cap at 95% until complete
        95
      )
      
      setProgress(calculatedProgress)

      // Determine current stage
      let cumulativeDuration = 0
      for (let i = 0; i < GENERATION_STAGES.length; i++) {
        cumulativeDuration += GENERATION_STAGES[i].duration
        if (calculatedProgress / 100 < cumulativeDuration) {
          setCurrentStage(i)
          break
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [estimatedTime])

  const getAspectRatioStyle = (ratio: string) => {
    return ratio.replace(':', ' / ')
  }

  const remaining = Math.max(0, estimatedTime - elapsed)
  const remainingMinutes = Math.floor(remaining / 60)
  const remainingSeconds = Math.ceil(remaining % 60)

  return (
    <div 
      className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl overflow-hidden border border-border/50"
      style={{ aspectRatio: getAspectRatioStyle(aspectRatio) }}
    >
      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        {/* Simple circular progress indicator */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-muted-foreground/20"
              strokeLinecap="round"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
              className="text-primary transition-all duration-300"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-primary">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Stage text below */}
        <p className="text-sm text-muted-foreground mt-4">
          {GENERATION_STAGES[currentStage]?.name || 'Processing...'}
        </p>
      </div>
    </div>
  )
}

