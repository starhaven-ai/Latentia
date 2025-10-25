'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  imageUrl: string
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ imageUrl, isOpen, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Image */}
      <img
        src={imageUrl}
        alt="Full size preview"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

