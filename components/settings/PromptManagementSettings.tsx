'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Edit, Save, X } from 'lucide-react'

interface EnhancementPrompt {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  isActive: boolean
  modelIds: string[]
  createdAt: string
  updatedAt: string
}

export function PromptManagementSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [prompts, setPrompts] = useState<EnhancementPrompt[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState<Partial<EnhancementPrompt>>({})
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    description: '',
    systemPrompt: '',
  })

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      setFetching(true)
      const response = await fetch('/api/admin/prompt-enhancements')
      if (!response.ok) throw new Error('Failed to fetch prompts')
      const data = await response.json()
      setPrompts(data)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Failed to load enhancement prompts',
        variant: 'destructive',
      })
    } finally {
      setFetching(false)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/prompt-enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrompt),
      })
      if (!response.ok) throw new Error('Failed to create')
      toast({ title: 'Success', description: 'Prompt created' })
      setShowNewForm(false)
      setNewPrompt({ name: '', description: '', systemPrompt: '' })
      await fetchPrompts()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt?')) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/prompt-enhancements/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Success', description: 'Prompt deleted' })
      await fetchPrompts()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Prompt Enhancement</CardTitle>
            <CardDescription>Manage AI prompt enhancement system prompts</CardDescription>
          </div>
          <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
            <Plus className="mr-2 h-4 w-4" />
            New Prompt
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showNewForm && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">Create New Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="e.g., Veo 3.1 Video Enhancement"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <Label>System Prompt</Label>
                <Textarea
                  value={newPrompt.systemPrompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, systemPrompt: e.target.value })}
                  placeholder="Enter system prompt..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!newPrompt.name || !newPrompt.systemPrompt || loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      {prompt.isActive && <Badge>Active</Badge>}
                    </div>
                    <CardDescription>{prompt.description || 'No description'}</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(prompt.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{prompt.systemPrompt}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No prompts configured.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
