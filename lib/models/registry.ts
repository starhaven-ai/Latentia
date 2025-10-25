import { BaseModelAdapter, ModelConfig } from './base'
import {
  GoogleVertexAdapter,
  IMAGEN_3_CONFIG,
  VEO_2_CONFIG,
} from './adapters/google-vertex'

/**
 * Model Registry
 * Central registry for all available AI models
 */

class ModelRegistry {
  private models: Map<string, { config: ModelConfig; adapter: typeof BaseModelAdapter }>

  constructor() {
    this.models = new Map()
    this.registerDefaultModels()
  }

  private registerDefaultModels() {
    // Register Google models
    this.register(IMAGEN_3_CONFIG, GoogleVertexAdapter)
    this.register(VEO_2_CONFIG, GoogleVertexAdapter)
  }

  /**
   * Register a new model
   */
  register(config: ModelConfig, adapter: typeof BaseModelAdapter) {
    this.models.set(config.id, { config, adapter })
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: string): BaseModelAdapter | null {
    const model = this.models.get(modelId)
    if (!model) {
      return null
    }
    // @ts-ignore - TypeScript doesn't understand that adapter is a constructor
    return new model.adapter(model.config)
  }

  /**
   * Get all models
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values()).map((m) => m.config)
  }

  /**
   * Get models by type
   */
  getModelsByType(type: 'image' | 'video'): ModelConfig[] {
    return this.getAllModels().filter((m) => m.type === type)
  }

  /**
   * Get model config
   */
  getModelConfig(modelId: string): ModelConfig | null {
    const model = this.models.get(modelId)
    return model ? model.config : null
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry()

// Export convenience functions
export const getModel = (modelId: string) => modelRegistry.getModel(modelId)
export const getAllModels = () => modelRegistry.getAllModels()
export const getModelsByType = (type: 'image' | 'video') => modelRegistry.getModelsByType(type)
export const getModelConfig = (modelId: string) => modelRegistry.getModelConfig(modelId)

