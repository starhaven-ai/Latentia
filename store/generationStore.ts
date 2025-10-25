import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GenerationWithOutputs } from '@/types/generation'

interface PendingGeneration {
  id: string
  prompt: string
  modelId: string
  numOutputs: number
  startTime: number
}

interface GenerationState {
  // State
  generations: GenerationWithOutputs[]
  pendingGenerations: PendingGeneration[]
  isGenerating: boolean
  
  // Actions
  setGenerations: (generations: GenerationWithOutputs[]) => void
  addGeneration: (generation: GenerationWithOutputs) => void
  updateGeneration: (id: string, updates: Partial<GenerationWithOutputs>) => void
  removeGeneration: (id: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  clearGenerations: () => void
  addPendingGeneration: (pending: PendingGeneration) => void
  removePendingGeneration: (id: string) => void
}

export const useGenerationStore = create<GenerationState>()(
  devtools(
    (set) => ({
      // Initial state
      generations: [],
      pendingGenerations: [],
      isGenerating: false,

      // Actions
      setGenerations: (generations) => 
        set({ generations }, false, 'setGenerations'),

      addGeneration: (generation) =>
        set(
          (state) => ({
            generations: [...state.generations, generation], // Add to end
          }),
          false,
          'addGeneration'
        ),

      updateGeneration: (id, updates) =>
        set(
          (state) => ({
            generations: state.generations.map((gen) =>
              gen.id === id ? { ...gen, ...updates } : gen
            ),
          }),
          false,
          'updateGeneration'
        ),

      removeGeneration: (id) =>
        set(
          (state) => ({
            generations: state.generations.filter((gen) => gen.id !== id),
          }),
          false,
          'removeGeneration'
        ),

      setIsGenerating: (isGenerating) =>
        set({ isGenerating }, false, 'setIsGenerating'),

      clearGenerations: () =>
        set({ generations: [], pendingGenerations: [] }, false, 'clearGenerations'),

      addPendingGeneration: (pending) =>
        set(
          (state) => ({
            pendingGenerations: [...state.pendingGenerations, pending],
          }),
          false,
          'addPendingGeneration'
        ),

      removePendingGeneration: (id) =>
        set(
          (state) => ({
            pendingGenerations: state.pendingGenerations.filter((p) => p.id !== id),
          }),
          false,
          'removePendingGeneration'
        ),
    }),
    { name: 'GenerationStore' }
  )
)

