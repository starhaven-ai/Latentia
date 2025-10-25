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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-8">
        {/* Chip Animation */}
        <div className="relative w-32 h-32">
          {/* Circuit lines - animated */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
            {/* Horizontal lines */}
            <line x1="0" y1="40" x2="128" y2="40" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            <line x1="0" y1="64" x2="128" y2="64" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            <line x1="0" y1="88" x2="128" y2="88" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            
            {/* Vertical lines */}
            <line x1="40" y1="0" x2="40" y2="128" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            <line x1="64" y1="0" x2="64" y2="128" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            <line x1="88" y1="0" x2="88" y2="128" stroke="currentColor" strokeWidth="1" className="text-green-500/30" />
            
            {/* Animated progress lines */}
            <line x1="0" y1="40" x2={`${progress * 1.28}`} y2="40" stroke="currentColor" strokeWidth="2" className="text-green-500 transition-all duration-300" />
            <line x1="0" y1="88" x2={`${progress * 1.28}`} y2="88" stroke="currentColor" strokeWidth="2" className="text-green-500 transition-all duration-300" />
          </svg>
          
          {/* Chip */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-lg border-2 border-border shadow-lg">
              {/* Chip pins */}
              <div className="absolute -left-2 top-2 w-2 h-1 bg-border rounded-l" />
              <div className="absolute -left-2 top-6 w-2 h-1 bg-border rounded-l" />
              <div className="absolute -left-2 top-10 w-2 h-1 bg-border rounded-l" />
              <div className="absolute -left-2 top-14 w-2 h-1 bg-border rounded-l" />
              
              <div className="absolute -right-2 top-2 w-2 h-1 bg-border rounded-r" />
              <div className="absolute -right-2 top-6 w-2 h-1 bg-border rounded-r" />
              <div className="absolute -right-2 top-10 w-2 h-1 bg-border rounded-r" />
              <div className="absolute -right-2 top-14 w-2 h-1 bg-border rounded-r" />
              
              <div className="absolute -top-2 left-2 h-2 w-1 bg-border rounded-t" />
              <div className="absolute -top-2 left-6 h-2 w-1 bg-border rounded-t" />
              <div className="absolute -top-2 left-10 h-2 w-1 bg-border rounded-t" />
              <div className="absolute -top-2 left-14 h-2 w-1 bg-border rounded-t" />
              
              <div className="absolute -bottom-2 left-2 h-2 w-1 bg-border rounded-b" />
              <div className="absolute -bottom-2 left-6 h-2 w-1 bg-border rounded-b" />
              <div className="absolute -bottom-2 left-10 h-2 w-1 bg-border rounded-b" />
              <div className="absolute -bottom-2 left-14 h-2 w-1 bg-border rounded-b" />
              
              {/* Chip center with progress ring */}
              <div className="absolute inset-2 rounded flex items-center justify-center">
                <div className="relative w-12 h-12">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-muted-foreground/20"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                      className="text-green-500 transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-green-500">
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time remaining */}
        <div className="text-center space-y-1">
          <p className="text-2xl font-semibold text-foreground">
            {remainingMinutes > 0 && `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} `}
            {remainingSeconds > 0 && `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`}
            {' '}remaining
          </p>
          <p className="text-sm text-muted-foreground">
            {GENERATION_STAGES[currentStage]?.name || 'Processing...'}
          </p>
        </div>
      </div>
      
      {/* Green progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/50">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300 ease-out shadow-lg shadow-green-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

