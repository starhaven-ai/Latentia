#!/usr/bin/env ts-node
/**
 * List all available Gemini API models
 * This helps identify the correct model IDs for Veo
 */

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment')
    process.exit(1)
  }

  console.log('🔍 Fetching available models from Gemini API...\n')

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ API Error:', error)
      process.exit(1)
    }

    const data = await response.json()
    const models = data.models || []

    // Filter for video generation models
    console.log('🎬 Video Generation Models:')
    console.log('=' .repeat(80))
    const videoModels = models.filter((m: any) =>
      m.name.toLowerCase().includes('veo') ||
      m.supportedGenerationMethods?.includes('generateVideo')
    )

    if (videoModels.length === 0) {
      console.log('   No video models found')
      console.log('   This might mean:')
      console.log('   - Veo access requires separate approval')
      console.log('   - Video models use different discovery method\n')
    } else {
      videoModels.forEach((model: any) => {
        const modelId = model.name.replace('models/', '')
        console.log(`\n📹 ${model.displayName || modelId}`)
        console.log(`   ID: ${modelId}`)
        console.log(`   Name: ${model.name}`)
        console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`)
        console.log(`   Description: ${model.description || 'N/A'}`)
      })
    }

    // Filter for image generation models
    console.log('\n\n🎨 Image Generation Models:')
    console.log('=' .repeat(80))
    const imageModels = models.filter((m: any) =>
      m.name.toLowerCase().includes('flash') ||
      m.name.toLowerCase().includes('imagen') ||
      (m.supportedGenerationMethods?.includes('generateContent') &&
       m.name.toLowerCase().includes('gemini'))
    ).slice(0, 5)

    imageModels.forEach((model: any) => {
      const modelId = model.name.replace('models/', '')
      console.log(`\n🖼️  ${model.displayName || modelId}`)
      console.log(`   ID: ${modelId}`)
      console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`)
    })

    // Check specifically for veo-3.0 and veo-3.1
    console.log('\n\n🔍 Searching for specific Veo versions:')
    console.log('=' .repeat(80))

    const veoVariants = [
      'veo-3.0-generate',
      'veo-3.1-generate',
      'veo-3.1-generate-preview',
      'veo-3-generate',
      'veo-generate',
    ]

    for (const variant of veoVariants) {
      const found = models.find((m: any) =>
        m.name.includes(variant) || m.name.endsWith(variant)
      )
      if (found) {
        console.log(`   ✅ ${variant} - FOUND`)
        console.log(`      Full name: ${found.name}`)
      } else {
        console.log(`   ❌ ${variant} - NOT FOUND`)
      }
    }

    // Current code configuration
    console.log('\n\n⚙️  Your Current Code Configuration:')
    console.log('=' .repeat(80))
    console.log('   File: lib/models/adapters/gemini.ts:205')
    console.log('   Model ID: veo-3.1-generate-preview')
    console.log('   Endpoint: https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning')

    console.log('\n\n📊 Your Dashboard Shows:')
    console.log('=' .repeat(80))
    console.log('   Model: veo-3.0-generate')
    console.log('   Usage: 2/2 RPM, 10/10 RPD (LIMIT REACHED!)')

    console.log('\n\n💡 Analysis:')
    console.log('=' .repeat(80))
    if (videoModels.some((m: any) => m.name.includes('veo-3.1'))) {
      console.log('   ✅ Veo 3.1 is available - code is correct')
    } else if (videoModels.some((m: any) => m.name.includes('veo-3.0'))) {
      console.log('   ⚠️  Only Veo 3.0 is available - need to update code to use veo-3.0-generate')
    } else {
      console.log('   ⚠️  Video models not found in discovery API')
      console.log('   This is normal - Veo models may not appear in model list')
      console.log('   They still work via direct API calls')
      console.log('')
      console.log('   Next step: Test both model IDs directly:')
      console.log('   1. veo-3.0-generate (shown in dashboard)')
      console.log('   2. veo-3.1-generate-preview (used in code)')
    }

    console.log('\n\n🎯 Recommendation:')
    console.log('=' .repeat(80))
    console.log('   Since your dashboard shows "veo-3.0-generate" with actual usage,')
    console.log('   this suggests your code is successfully calling Veo 3.0.')
    console.log('')
    console.log('   Possible explanations:')
    console.log('   1. Google is redirecting veo-3.1-generate-preview → veo-3.0-generate')
    console.log('   2. Veo 3.1 requires separate access/approval')
    console.log('   3. Model naming changed and 3.0 is actually the latest')
    console.log('')
    console.log('   Action: Update code to explicitly use veo-3.0-generate')
    console.log('   This will match your dashboard and avoid confusion.')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

listModels()
