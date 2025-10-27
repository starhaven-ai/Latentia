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

    // Build the enhancement request with model-specific guidance
    let requestContent: string
    
    if (referenceImage) {
      // Image editing mode - get model-specific guidance
      if (modelId === 'gemini-nano-banana') {
        requestContent = `User wants to edit an image. Their instruction: "${prompt}"
Reference image will be provided.

IMPORTANT: For Nano Banana image editing:
- Describe ONLY the specific changes to make
- Use precise, action-oriented language
- Reference the provided image as "the provided image" or "this image"
- Focus on what to add, remove, or modify
- Be concise and specific about placement and style

Enhance this edit instruction to be clearer and more effective. Return ONLY the enhanced edit instruction.`
      } else if (modelId === 'fal-seedream-v4' || modelId === 'replicate-seedream-4') {
        requestContent = `User wants to edit an image. Their instruction: "${prompt}"
Reference image will be provided.

IMPORTANT: For Seedream 4 image editing:
- Describe the desired transformation artistically
- Focus on scene composition and mood
- Use conceptual language about spatial relationships
- Reference lighting and atmosphere
- Maintain coherence with the provided image

Enhance this edit instruction to be clearer and more effective. Return ONLY the enhanced edit instruction.`
      } else {
        // Generic image editing
        requestContent = `User wants to edit an image. Their instruction: "${prompt}"
Reference image will be provided.

Enhance this edit instruction to be clearer and more effective. Return ONLY the enhanced edit instruction.`
      }
    } else {
      // Text-to-image mode
      requestContent = `User's prompt: "${prompt}"
Please enhance this text-to-image prompt while respecting the user's creative vision.

Guidelines:
- Add helpful details (lighting, camera, framing) if appropriate
- Clarify ambiguous elements
- Keep the original tone and style
- Don't add unnecessary complexity

Return ONLY the enhanced prompt text. Nothing else.`
    }

    // Prepare message content
    const messageContent: any[] = []
    
    if (referenceImage) {
      // Add image for analysis
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: referenceImage.split(',')[1], // Remove data URL prefix
        },
      })
      messageContent.push({
        type: 'text',
        text: requestContent,
      })
    } else {
      messageContent.push({
        type: 'text',
        text: requestContent,
      })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent.length > 1 
            ? messageContent 
            : messageContent[0],
        },
      ],
    })

    // Extract the enhanced prompt from Claude's response
    let enhancedPrompt = 'Failed to enhance prompt'
    
    // Claude returns content as an array - find the text block
    const textBlocks = message.content.filter(block => block.type === 'text')
    if (textBlocks.length > 0 && textBlocks[0].type === 'text') {
      enhancedPrompt = textBlocks[0].text
    }

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

