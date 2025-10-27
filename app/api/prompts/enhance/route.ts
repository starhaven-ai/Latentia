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
      // Use universal system prompt from file
      const { readFileSync } = await import('fs')
      const path = await import('path')
      systemPrompt = readFileSync(
        path.join(process.cwd(), 'lib/prompts/enhancement-system.md'),
        'utf-8'
      )
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

