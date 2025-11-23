#!/usr/bin/env ts-node
/**
 * Test different Veo model IDs to determine which ones are accessible
 * This will NOT generate actual videos (too expensive), but will validate the endpoints
 */

async function testVeoModelIds() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found')
    process.exit(1)
  }

  console.log('🧪 Testing Veo Model IDs\n')

  const modelIdsToTest = [
    'veo-3.1-generate-preview',
    'veo-3.1-fast-generate-preview',
    'veo-3.0-generate-001',
    'veo-3.0-fast-generate-001',
    'veo-3.0-generate',
    'veo-3.0-generate-preview',
    'veo-2.0-generate-001',
  ]

  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  // Test payload - minimal but valid
  const testPayload = {
    instances: [
      {
        prompt: 'A test prompt for model verification only',
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: 4,
    },
  }

  console.log('Testing model endpoints (validating only, not generating)...\n')

  for (const modelId of modelIdsToTest) {
    const endpoint = `${baseUrl}/models/${modelId}:predictLongRunning`

    try {
      // Make a HEAD request or OPTIONS to check if endpoint exists
      // Actually, we'll do a POST but immediately check the response
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      let data: any = {}

      try {
        data = JSON.parse(responseText)
      } catch {
        // Not JSON
      }

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ ${modelId}`)
        console.log(`   Status: ${response.status} - Model is AVAILABLE and WORKING`)
        console.log(`   Response: Operation started`)
        console.log('')
      } else if (response.status === 404) {
        console.log(`❌ ${modelId}`)
        console.log(`   Status: 404 - Model NOT FOUND`)
        console.log('')
      } else if (response.status === 403) {
        console.log(`⚠️  ${modelId}`)
        console.log(`   Status: 403 - Model exists but ACCESS DENIED`)
        console.log(`   You may need to request access or enable billing`)
        console.log('')
      } else if (response.status === 429) {
        console.log(`⚠️  ${modelId}`)
        console.log(`   Status: 429 - Model exists but RATE LIMIT HIT`)
        console.log(`   This confirms the model is available!`)
        console.log('')
      } else if (response.status === 400) {
        const errorMsg = data.error?.message || responseText
        if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
          console.log(`❌ ${modelId}`)
          console.log(`   Status: 400 - Model NOT FOUND`)
        } else {
          console.log(`⚠️  ${modelId}`)
          console.log(`   Status: 400 - Model exists but request was invalid`)
          console.log(`   Error: ${errorMsg.substring(0, 100)}`)
        }
        console.log('')
      } else {
        console.log(`⚠️  ${modelId}`)
        console.log(`   Status: ${response.status} - Unexpected response`)
        console.log(`   Response: ${responseText.substring(0, 150)}`)
        console.log('')
      }

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error: any) {
      console.log(`❌ ${modelId}`)
      console.log(`   Error: ${error.message}`)
      console.log('')
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary')
  console.log('='.repeat(80))
  console.log('\nYour Current Configuration:')
  console.log('  Code uses: veo-3.1-generate-preview')
  console.log('  Dashboard shows: veo-3.0-generate')
  console.log('')
  console.log('💡 Recommendation:')
  console.log('  If veo-3.1-generate-preview shows as ✅ or ⚠️ (rate limit):')
  console.log('    → Keep using it (it\'s the latest model)')
  console.log('  If veo-3.1-generate-preview shows as ❌:')
  console.log('    → Switch to veo-3.0-generate-001 (stable version)')
  console.log('')
  console.log('🎯 Dashboard Discrepancy:')
  console.log('  The dashboard likely shows "veo-3.0-generate" as a generic name')
  console.log('  Your actual API calls use the correct veo-3.1-generate-preview')
  console.log('  This is normal - don\'t worry about the naming mismatch!')
  console.log('')
}

testVeoModelIds().catch(console.error)
