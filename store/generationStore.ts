import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { GenerationWithOutputs } from '@/types/generation'

interface GenerationState {
  // State
  generations: GenerationWithOutputs[]
  isGenerating: boolean
  
  // Actions
  setGenerations: (generations: GenerationWithOutputs[]) => void
  addGeneration: (generation: GenerationWithOutputs) => void
  updateGeneration: (id: string, updates: Partial<GenerationWithOutputs>) => void
  removeGeneration: (id: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  clearGenerations: () => void
}

export const useGenerationStore = create<GenerationState>()(
  devtools(
    (set) => ({
      // Initial state
      generations: [],
      isGenerating: false,

      // Actions
      setGenerations: (generations) => 
        set({ generations }, false, 'setGenerations'),

      addGeneration: (generation) =>
        set(
          (state) => ({
            generations: [generation, ...state.generations],
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
        set({ generations: [] }, false, 'clearGenerations'),
    }),
    { name: 'GenerationStore' }
  )
)

