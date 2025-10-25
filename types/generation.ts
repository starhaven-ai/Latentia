export interface Generation {
  id: string
  sessionId: string
  userId: string
  modelId: string
  prompt: string
  negativePrompt?: string
  parameters: Record<string, any>
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: Date
}

export interface Output {
  id: string
  generationId: string
  fileUrl: string
  fileType: 'image' | 'video'
  width?: number
  height?: number
  duration?: number
  isStarred: boolean
  createdAt: Date
}

export interface GenerationUser {
  id: string
  displayName: string
  username?: string | null
}

export interface GenerationWithOutputs extends Generation {
  outputs: Output[]
  user?: GenerationUser
}

