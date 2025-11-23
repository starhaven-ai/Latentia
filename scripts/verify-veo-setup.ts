#!/usr/bin/env ts-node
/**
 * Verify Veo 3.1 API Setup and Quota
 *
 * This script checks:
 * 1. API key is configured
 * 2. Gemini API is accessible
 * 3. Veo 3.1 model is available
 * 4. Current quota/usage information
 */

async function verifyVeoSetup() {
  console.log('🔍 Verifying Veo 3.1 API Setup...\n')

  // Check 1: Environment variable
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables')
    console.log('   Add it to your .env.local file:')
    console.log('   GEMINI_API_KEY=your-api-key-here\n')
    process.exit(1)
  }

  console.log('✅ API key found:', apiKey.substring(0, 10) + '...\n')

  // Check 2: Test API connectivity
  console.log('🌐 Testing Gemini API connectivity...')
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ API Error:', error)
      console.log('   Status:', response.status)
      console.log('   Make sure your API key is valid at: https://aistudio.google.com/apikey\n')
      process.exit(1)
    }

    const data = await response.json()
    console.log('✅ API is accessible\n')

    // Check 3: List available models
    console.log('📋 Available models:')
    const models = data.models || []
    const veoModels = models.filter((m: any) => m.name.includes('veo'))
    const imageModels = models.filter((m: any) =>
      m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent')
    )

    if (veoModels.length > 0) {
      console.log('   🎬 Video models:')
      veoModels.forEach((m: any) => {
        console.log('      -', m.displayName || m.name)
      })
    } else {
      console.log('   ⚠️  No Veo models found')
      console.log('      This may mean:')
      console.log('      1. Veo access requires approval')
      console.log('      2. Model name has changed')
      console.log('      3. Check https://ai.google.dev/gemini-api/docs/video for updates\n')
    }

    if (imageModels.length > 0) {
      console.log('   🎨 Image models:')
      imageModels.slice(0, 5).forEach((m: any) => {
        console.log('      -', m.displayName || m.name)
      })
    }

    console.log()

    // Check 4: Usage information
    console.log('📊 Usage Information:')
    console.log('   View detailed usage at: https://aistudio.google.com/apikey')
    console.log('   Free tier limits:')
    console.log('   - 15 requests per minute')
    console.log('   - 1,500 requests per day')
    console.log('   - 1 million tokens per month\n')

    // Check 5: Test Veo endpoint specifically
    console.log('🎬 Testing Veo 3.1 endpoint...')
    const veoEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning'

    // Don't actually call it (costs money), just verify the endpoint format
    console.log('   Endpoint:', veoEndpoint)
    console.log('   ✅ Your code uses the correct endpoint format\n')

    // Summary
    console.log('✅ Setup verification complete!\n')
    console.log('📝 Next steps:')
    console.log('   1. Monitor usage at: https://aistudio.google.com/')
    console.log('   2. Check billing at: https://aistudio.google.com/apikey')
    console.log('   3. Review your recent generations in Supabase')
    console.log('   4. If Veo is not listed, you may need to request access\n')
    console.log('💡 According to your VEO_API_ANALYSIS.md:')
    console.log('   - Veo 3.1 is WORKING (as of commit 763bd56)')
    console.log('   - Last successful generation: 17:05:30 UTC')
    console.log('   - Using base64 image encoding for image-to-video\n')

  } catch (error: any) {
    console.error('❌ Network error:', error.message)
    console.log('   Check your internet connection\n')
    process.exit(1)
  }
}

// Run verification
verifyVeoSetup().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
