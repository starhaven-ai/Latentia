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
      systemPrompt = `You are an expert AI prompt engineer. Your job is to enhance user prompts for generative AI models.

**CRITICAL INSTRUCTION**: Return ONLY the enhanced prompt text. Do NOT include explanations, versions, reasons, or any other text. Just the prompt itself.

## Your Mission
Enhance the user's prompt by adding helpful details while respecting their creative intent. Make it more effective without overwriting their vision.

## Guidelines
- Add missing details (lighting, camera, framing) if appropriate
- Clarify ambiguous elements
- Keep the original tone and style
- Don't add unnecessary complexity
- Don't force "best practices" that contradict intent

## Response Format
Return ONLY the enhanced prompt text. Nothing else.`
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

