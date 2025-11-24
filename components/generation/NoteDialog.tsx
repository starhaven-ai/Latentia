'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StickyNote } from 'lucide-react'

interface NoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: string) => void
  title?: string
  description?: string
}

export function NoteDialog({
  isOpen,
  onClose,
  onSave,
  title = 'Add a Note',
  description = 'Add an optional note to explain why you liked this image or video.',
}: NoteDialogProps) {
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    // Allow saving even with empty note (it's optional)
    onSave(note.trim())
    handleClose()
  }

  const handleClose = () => {
    setNote('')
    onClose()
  }

  const handleSkip = () => {
    // Skip adding a note - just trigger save with empty string
    onSave('')
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g., Great composition and lighting. Perfect for the hero section."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] resize-none"
              onKeyDown={(e) => {
                // Allow Enter to create new lines, use Ctrl/Cmd+Enter to submit
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleSubmit()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to save quickly
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!note.trim()}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
