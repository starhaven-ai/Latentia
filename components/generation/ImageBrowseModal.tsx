'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import type { GenerationWithOutputs } from '@/types/generation'

interface ImageBrowseModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (imageUrl: string) => void
  projectId: string
}

export function ImageBrowseModal({
  isOpen,
  onClose,
  onSelectImage,
  projectId,
}: ImageBrowseModalProps) {
  const [images, setImages] = useState<Array<{ url: string; prompt: string; generationId: string }>>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen, projectId])

  const fetchImages = async () => {
    setLoading(true)
    try {
      // Fetch all image sessions for this project
      const sessionsResponse = await fetch(`/api/sessions?projectId=${projectId}`)
      if (!sessionsResponse.ok) throw new Error('Failed to fetch sessions')
      
      const sessions = await sessionsResponse.json()
      const imageSessions = sessions.filter((s: any) => s.type === 'image')

      // Fetch generations from all image sessions
      const allImages: Array<{ url: string; prompt: string; generationId: string }> = []
      
      for (const session of imageSessions) {
        const genResponse = await fetch(`/api/generations?sessionId=${session.id}`)
        if (genResponse.ok) {
          const generations: GenerationWithOutputs[] = await genResponse.json()
          
          // Extract all output images
          generations.forEach((gen) => {
            gen.outputs.forEach((output) => {
              allImages.push({
                url: output.fileUrl,
                prompt: gen.prompt,
                generationId: gen.id,
              })
            })
          })
        }
      }

      setImages(allImages)
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredImages = images.filter((img) =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectImage = (imageUrl: string) => {
    onSelectImage(imageUrl)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Generated Images</DialogTitle>
          <DialogDescription>
            Select an image from your previous generations
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg mb-2">No images found</p>
              <p className="text-sm">Generate some images first to browse them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-2">
              {filteredImages.map((image, index) => (
                <button
                  key={`${image.generationId}-${index}`}
                  onClick={() => handleSelectImage(image.url)}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
                  title={image.prompt}
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

