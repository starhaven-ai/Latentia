# Veo 3.1 Usage Tracking Guide

## TL;DR - Where to Find Everything

**Your Veo 3.1 is managed through Gemini API, NOT Vertex AI!**

- **API Key Management**: https://aistudio.google.com/apikey
- **Usage Dashboard**: https://aistudio.google.com/
- **Documentation**: https://ai.google.dev/gemini-api/docs/video
- **Pricing**: https://ai.google.dev/pricing

## The Confusion Explained

You were looking at **Google Cloud Console** which manages **Vertex AI API**. Your code uses the **Gemini API** which is a different service:

| Aspect | Gemini API (What You Use) | Vertex AI API (What You Were Looking At) |
|--------|---------------------------|-------------------------------------------|
| **Portal** | Google AI Studio | Google Cloud Console |
| **URL** | aistudio.google.com | console.cloud.google.com |
| **Auth** | API Key | Service Account / OAuth |
| **Endpoint** | generativelanguage.googleapis.com | aiplatform.googleapis.com |
| **Code Location** | `lib/models/adapters/gemini.ts:10` | N/A (not used) |
| **Env Var** | `GEMINI_API_KEY` | `GOOGLE_APPLICATION_CREDENTIALS` |

## How to Track Your Veo 3.1 Usage

### Method 1: Google AI Studio Dashboard (Easiest)

1. **Go to Google AI Studio**: https://aistudio.google.com/
2. **Navigate to API Keys**: Click on "Get API key" in the top menu
3. **View Your Key**: You'll see your API key(s) listed
4. **Check Usage**: Click on any API key to see:
   - Requests made today
   - Quota remaining
   - Rate limits
   - Historical usage

### Method 2: Check Your Supabase Database

Your generations are stored in Supabase. To see your Veo usage:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to SQL Editor**
3. **Run this query**:

```sql
-- Veo 3.1 usage summary
SELECT
  status,
  COUNT(*) as count,
  SUM(EXTRACT(EPOCH FROM (completed_at - created_at))) as total_seconds,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds,
  MIN(created_at) as first_generation,
  MAX(created_at) as last_generation
FROM generations
WHERE model_id = 'gemini-veo-3.1'
GROUP BY status
ORDER BY status;

-- Recent Veo generations
SELECT
  id,
  prompt,
  status,
  error_message,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM generations
WHERE model_id = 'gemini-veo-3.1'
ORDER BY created_at DESC
LIMIT 20;

-- Cost calculation (estimate)
-- Veo 3.1 costs ~$0.05 per second of video
SELECT
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_videos,
  SUM(CASE WHEN status = 'completed' THEN 8 ELSE 0 END) as total_video_seconds,
  SUM(CASE WHEN status = 'completed' THEN 8 ELSE 0 END) * 0.05 as estimated_cost_usd
FROM generations
WHERE model_id = 'gemini-veo-3.1';
```

### Method 3: Check Application Logs

Your application logs every Veo generation:

```bash
# View recent logs (if running locally)
npm run dev | grep "\[Veo 3.1\]"

# Or check your deployment logs on Vercel
vercel logs --follow | grep "\[Veo 3.1\]"
```

## Current Usage Limits

### Free Tier (Default)
- **15 requests per minute (RPM)**
- **1,500 requests per day (RPD)**
- **1 million tokens per month**

These limits apply across ALL Gemini API calls (images + videos).

### How to Check if You're on Free or Paid Tier

1. Go to https://aistudio.google.com/apikey
2. Click on your API key
3. Look for "Billing" or "Quota" section
4. If it says "Free tier", you're on free tier
5. If it shows a billing account, you're on paid tier

### Upgrading to Paid Tier

To increase limits:

1. Go to https://aistudio.google.com/
2. Click on "Upgrade" or "Billing"
3. Link a billing account
4. Paid tier limits:
   - **2,000 RPM**
   - **10,000+ RPD**
   - No monthly token cap

## Monitoring Best Practices

### 1. Set Up Alerts

Currently, Google AI Studio doesn't have built-in alerts, but you can:
- Check usage daily via the dashboard
- Monitor your application logs
- Track generation counts in Supabase

### 2. Track Costs

Veo 3.1 pricing (as of Nov 2024):
- **$0.05 per second** of generated video
- **Example**: 8-second video = $0.40
- **Your usage**: Check Supabase query above

### 3. Monitor Rate Limits

If you see errors like:
```
Error 429: Quota exceeded
Error 429: Rate limit exceeded
```

This means:
- **Quota exceeded**: You've hit your daily request limit
- **Rate limit exceeded**: Too many requests per minute

**Solutions**:
1. Wait for quota to reset (resets at midnight PT)
2. Upgrade to paid tier
3. Implement rate limiting in your app

## Verification Script

Run this script to verify your setup:

```bash
# Make sure you have ts-node installed
npm install -D ts-node

# Load environment variables and run verification
npx ts-node scripts/verify-veo-setup.ts
```

This will:
- ✅ Check if API key is configured
- ✅ Test API connectivity
- ✅ List available models
- ✅ Verify Veo endpoint
- ✅ Show usage information

## Current Status (As of Your Last Deployment)

According to `VEO_API_ANALYSIS.md`:

- ✅ **Veo 3.1 is WORKING** (as of commit 763bd56)
- ✅ Last successful generation: **17:05:30 UTC on Nov 23**
- ✅ Success rate: **100% for text-to-video**, **100% for image-to-video** (after fix)
- ✅ Using base64 encoding for reference images

### Your Recent Generations

From your analysis document:
- **9 successful text-to-video** generations
- **1 successful image-to-video** generation
- **9 failed image-to-video** attempts (before the fix)

**Estimated cost**: ~18 generations × 8 seconds × $0.05 = **~$7.20**

## Troubleshooting

### "I can't see my usage in Google Cloud Console"

**That's expected!** You're using Gemini API, not Vertex AI. Check Google AI Studio instead:
https://aistudio.google.com/

### "How do I know if Veo 3.1 is enabled?"

If you can generate videos successfully, it's enabled. Your code shows successful generations, so **it's already working**.

### "Is my credit card being charged?"

Check https://aistudio.google.com/:
1. Go to your API key
2. Look for billing information
3. If you're on "Free tier", you're NOT being charged yet
4. You'll only be charged if you exceed free tier limits AND have billing enabled

### "How do I enable billing?"

1. Go to https://aistudio.google.com/
2. Click on "Upgrade" or "Enable billing"
3. Follow the prompts to add a payment method
4. This will unlock higher rate limits

## Alternative: Switch to Vertex AI (Optional)

If you prefer using Google Cloud Console, you can switch to Vertex AI:

**Pros**:
- Integrated with GCP billing
- Better enterprise features
- Usage tracking in GCP Console

**Cons**:
- More complex setup
- Requires service account authentication
- Potentially different pricing

**To switch**: You'd need to modify `lib/models/adapters/gemini.ts` to use:
- Endpoint: `https://aiplatform.googleapis.com`
- Auth: Service account credentials
- Different request format

**Recommendation**: Stick with Gemini API unless you need GCP integration.

## Quick Reference

### Important URLs
- **API Keys**: https://aistudio.google.com/apikey
- **Dashboard**: https://aistudio.google.com/
- **Docs**: https://ai.google.dev/gemini-api/docs/video
- **Pricing**: https://ai.google.dev/pricing
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits

### Environment Variable
```bash
# Your .env.local file should have:
GEMINI_API_KEY=AIza...your-key-here
```

### Code Location
- Gemini adapter: `lib/models/adapters/gemini.ts`
- Veo generation logic: `lib/models/adapters/gemini.ts:174-505`
- API key usage: `lib/models/adapters/gemini.ts:14`

## Summary

1. ✅ **Your Veo 3.1 is already working**
2. ✅ **Track usage at**: https://aistudio.google.com/apikey
3. ✅ **You were looking at the wrong place** (GCP Console = Vertex AI, not Gemini API)
4. ✅ **Your recent generations are successful**
5. ✅ **Run the verification script** to double-check: `npx ts-node scripts/verify-veo-setup.ts`

---

**Last Updated**: Nov 23, 2025
**Status**: ✅ Working
**Endpoint**: Gemini API (generativelanguage.googleapis.com)
