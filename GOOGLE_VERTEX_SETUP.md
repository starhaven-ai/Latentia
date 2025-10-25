# Google Vertex AI Setup Guide

This guide will help you set up Google Vertex AI to use Imagen 3 and Veo 2 in Latentia.

## Prerequisites

- Google Cloud account
- Google Cloud Project with billing enabled

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "latentia-ai")
4. Click "Create"
5. Note your **Project ID** (you'll need this)

## Step 2: Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Enable the following APIs:
   - **Vertex AI API**
   - **Cloud AI Platform API**

## Step 3: Set Up Authentication

### Option A: Using API Key (Simpler, for development)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Recommended) Click **Restrict Key**:
   - Under "API restrictions", select "Restrict key"
   - Choose "Vertex AI API"
   - Save

### Option B: Using Service Account (Production recommended)

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Enter details:
   - Name: `latentia-vertex-ai`
   - Description: "Service account for Latentia AI generation"
4. Click "Create and Continue"
5. Grant roles:
   - **Vertex AI User**
   - **AI Platform Developer**
6. Click "Continue" → "Done"
7. Click on the created service account
8. Go to **Keys** tab → **Add Key** → **Create new key**
9. Choose **JSON** → **Create**
10. Save the downloaded JSON file securely

## Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Google Vertex AI Configuration
GOOGLE_VERTEX_API_KEY=your-api-key-here
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1

# OR use Service Account (if using Option B)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Step 5: Enable Imagen 3 and Veo 2

1. Go to **Vertex AI** → **Model Garden**
2. Search for **Imagen 3**
   - Click **Enable**
   - Accept terms
3. Search for **Veo 2**
   - Click **Enable**
   - Accept terms

## Step 6: Test Your Setup

In Latentia:
1. Restart your dev server: `npm run dev`
2. Go to a project
3. Select **"Imagen 3"** from the model picker
4. Enter a prompt and click Generate

## Pricing

### Imagen 3
- ~$0.04 per image (1024x1024)
- Varies by resolution and features

### Veo 2
- ~$0.10 per second of video
- 5-second video = ~$0.50

**Free Tier:**
- Google Cloud offers $300 credit for new accounts
- Some services have always-free tier

## Troubleshooting

### "API not enabled" error
- Make sure you enabled **Vertex AI API** in Google Cloud Console
- Wait 1-2 minutes after enabling

### "Authentication failed" error
- Check your API key is correct
- Verify the API key has Vertex AI API restrictions

### "Project ID not found" error
- Use your Project ID (not project name)
- Format: `your-project-123456`

### "Quota exceeded" error
- Check [Quotas page](https://console.cloud.google.com/iam-admin/quotas)
- Request quota increase if needed

## Security Best Practices

1. **Never commit API keys** to Git
2. Use **Service Accounts** for production
3. **Restrict API keys** to only Vertex AI
4. Enable **Cloud Audit Logs**
5. Set up **Budget alerts** in Google Cloud

## Alternative: Use Google AI Studio (Simpler)

For simpler setup, you can use Google AI Studio API:
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Get an API key
3. Use Gemini API instead (separate adapter needed)

---

**Need Help?**
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen 3 Guide](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Veo 2 Guide](https://cloud.google.com/vertex-ai/docs/generative-ai/video/overview)

