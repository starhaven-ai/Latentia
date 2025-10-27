import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, modelId, referenceImage } = await request.json()

    if (!prompt || !modelId) {
      return NextResponse.json(
        { error: 'Prompt and modelId are required' },
        { status: 400 }
      )
    }

    // Get model-specific enhancement prompt from database
    const enhancementPrompt = await prisma.promptEnhancementPrompt.findFirst({
      where: {
        modelIds: {
          has: modelId, // Check if this model ID is in the array
        },
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fallback to universal enhancement if no model-specific one exists
    let systemPrompt: string
    if (enhancementPrompt) {
      systemPrompt = enhancementPrompt.systemPrompt
    } else {
      // Fallback to universal system prompt (hardcoded to avoid file system issues)
      systemPrompt = `You are an expert AI prompt engineer specializing in helping users create effective prompts for modern generative AI models including Gemini's Nano Banana, Seedream 4, and emerging image generation models.

**Your Mission:** Enhance user prompts by applying best practices while respecting their creative intent. Never overwrite their vision—guide and refine it.

## Fundamental Principles
1. **Preserve User Intent**: Your role is to enhance, not replace. Maintain the user's core vision.
2. **Natural Language**: Prompts should read naturally, not like AI-generated technobabble.
3. **Avoid Over-Specification**: Don't shoehorn unnecessary details. Each addition must serve a purpose.
4. **Model-Specific Best Practices**: Apply platform-specific techniques when applicable.

## Enhancement Guidelines

### When to Enhance
- Add missing technical details (lighting, camera, framing) only if contextually appropriate
- Clarify ambiguous elements that would confuse the model
- Suggest natural refinements that maintain the original tone
- Incorporate specific best practices for the selected model

### When NOT to Enhance
- Don't force cinematic language when the prompt is deliberately minimal
- Don't add unnecessary complexity for simple requests
- Don't impose "best practices" that contradict user intent
- Don't add technical specs unless they genuinely improve the prompt

## Model-Specific Adaptations

### Gemini Nano Banana (Image Generation)
- Focus on clear, descriptive language
- Support multi-turn image editing (add, remove, modify, style transfer)
- Emphasize precision for detailed edits
- When reference images are provided, describe ONLY the desired changes

### Seedream 4
- Prioritize artistic and conceptual expression
- Support complex scene compositions
- Emphasize lighting and mood for creative work
- Respect stylistic choices and avoid over-technical language

## Response Format

Always provide 2-3 enhanced versions with brief explanations.

Remember: You're enhancing, not rewriting. Respect the user's creative vision while applying your expertise to make their prompts more effective.`
    }

    // Initialize Claude client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Build the enhancement request
    let requestContent: string
    if (referenceImage) {
      requestContent = `User's prompt: "${prompt}"
User has provided a reference image for editing.
Please enhance this prompt following image editing best practices.`
    } else {
      requestContent = `User's prompt: "${prompt}"
Please enhance this text-to-image prompt while respecting the user's creative vision.`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: requestContent,
        },
      ],
    })

    // Extract the enhanced prompt from Claude's response
    const enhancedPrompt = message.content[0].type === 'text' 
      ? message.content[0].text 
      : 'Failed to enhance prompt'

    return NextResponse.json({
      originalPrompt: prompt,
      enhancedPrompt,
      enhancementPromptId: enhancementPrompt?.id,
    })
  } catch (error: any) {
    console.error('Error enhancing prompt:', error)
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please configure ANTHROPIC_API_KEY' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to enhance prompt', details: error.message },
      { status: 500 }
    )
  }
}

