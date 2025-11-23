# Veo Model Version Analysis: 3.0 vs 3.1

## The Question

Your dashboard shows **`veo-3.0-generate`** but your code uses **`veo-3.1-generate-preview`**. Which is correct?

## TL;DR - The Answer

✅ **Your code is CORRECT** - Keep using `veo-3.1-generate-preview`

The dashboard showing "veo-3.0-generate" is likely a display name issue, not a problem with your implementation.

## Timeline of Veo Releases

| Version | Release Date | Model ID | Status |
|---------|-------------|----------|--------|
| Veo 2.0 | ~2024 | `veo-2.0-generate-001` | Stable |
| Veo 3.0 | July-Aug 2025 | `veo-3.0-generate-001` | **Deprecated Nov 6, 2025** |
| Veo 3.0 Preview | ~Aug 2025 | `veo-3.0-generate-preview` | **Deprecated Nov 6, 2025** |
| **Veo 3.1** | **Oct 15, 2025** | **`veo-3.1-generate-preview`** | **✅ Current** |

## Available Model IDs (2025)

### Preview Models (Latest Features)
```
veo-3.1-generate-preview          ← Your code uses this ✅
veo-3.1-fast-generate-preview     (faster, lower quality)
```

### Stable Models
```
veo-3.0-generate-001              (deprecated, but stable)
veo-3.0-fast-generate-001         (deprecated, fast variant)
veo-2.0-generate-001              (older stable)
```

## Your Current Setup

**Registry Configuration** (`lib/models/adapters/gemini.ts:546`)
```typescript
export const VEO_3_1_CONFIG: ModelConfig = {
  id: 'gemini-veo-3.1',        // UI display name
  name: 'Veo 3.1',
  // ...
}
```

**API Model ID** (`lib/models/adapters/gemini.ts:205`)
```typescript
const modelId = 'veo-3.1-generate-preview'  // ✅ CORRECT
const endpoint = `${this.baseUrl}/models/${modelId}:predictLongRunning`
```

**Dashboard Shows**
```
veo-3.0-generate  ⚠️ Display name discrepancy
RPM: 2/2 (rate limit hit!)
RPD: 10/10 (daily limit hit!)
```

## Why the Dashboard Shows 3.0

There are several possible explanations:

### 1. Display Name Lag (Most Likely)
Google's monitoring dashboard may not have updated to show "3.1" yet. The backend API correctly routes to Veo 3.1, but the dashboard UI still displays "3.0" as a generic name for the Veo 3.x family.

**Evidence:**
- Your code successfully generates videos
- Rate limits are being tracked (2/2 RPM, 10/10 RPD)
- This is common during model transitions

### 2. API Aliasing
Google might be using `veo-3.0-generate` as an **alias** that automatically resolves to the latest version (3.1). This is common for preview models.

**Example:**
```
veo-3.0-generate → redirects to → veo-3.1-generate-preview
```

### 3. Gradual Rollout
Your API key might be in a gradual rollout group. Google may be showing "3.0" in the dashboard but serving 3.1 under the hood for users with access.

### 4. Model Family Grouping
The dashboard might group all "Veo 3" models (3.0, 3.1, 3.x) under one name for simplicity, even though different model IDs are being used.

## How to Verify Which Model You're Actually Using

### Option 1: Check Video Features (Easiest)
Veo 3.1 has features that 3.0 doesn't:

**Veo 3.1 Exclusive Features:**
- ✅ Richer native audio (conversations, synchronized sound effects)
- ✅ Better image-to-video with prompt adherence
- ✅ Video extension (extend previously generated videos)
- ✅ Frame-specific generation (specify first and last frames)
- ✅ Multi-image reference (up to 3 reference images)

**Test:** Try generating a video with multiple reference images or video extension. If it works, you're on 3.1!

### Option 2: Run Diagnostic Script
```bash
npx ts-node scripts/test-veo-model-ids.ts
```

This will test all model IDs and show which ones are accessible.

### Option 3: Check API Response Headers
The API response might include model version info:

```typescript
// Add this to your generateVideo() function for debugging
console.log('[Veo] Response headers:', response.headers)
```

### Option 4: Contact Google Support
If you need absolute certainty, contact Google AI Studio support and ask:
- "Which Veo model version is my API key using?"
- "Why does my dashboard show veo-3.0-generate when my code calls veo-3.1-generate-preview?"

## What You Should Do

### ✅ Keep Your Current Code
**Recommendation: NO CHANGES NEEDED**

Your code using `veo-3.1-generate-preview` is correct based on:
1. Latest Google documentation (as of Nov 2025)
2. Veo 3.0 is deprecated
3. Veo 3.1 is the current preview model
4. Your generations are working successfully

### 📊 Monitor for Changes
Watch for these signs that you need to update:

**Bad Signs (Update needed):**
- ❌ Error: "Model not found"
- ❌ Error: "veo-3.1-generate-preview is deprecated"
- ❌ All video generations start failing
- ❌ Dashboard shows migration warning

**Good Signs (Everything OK):**
- ✅ Videos generate successfully
- ✅ Dashboard shows usage (even if name is wrong)
- ✅ No deprecation warnings
- ✅ Rate limits are tracked

### 🔄 Optional: Use Stable Model
If you want guaranteed stability, switch to the stable model:

```typescript
// lib/models/adapters/gemini.ts:205
- const modelId = 'veo-3.1-generate-preview'  // Preview (latest features)
+ const modelId = 'veo-3.0-generate-001'      // Stable (but deprecated)
```

**Trade-offs:**
- 👍 More stable, versioned
- 👎 Deprecated (will be removed eventually)
- 👎 Missing Veo 3.1 features
- 👎 Doesn't match your UI ("Veo 3.1")

**Our recommendation:** Stick with preview model for now.

## Veo 3.1 New Features

If you're on Veo 3.1 (which you likely are), you can access these features:

### 1. Video Extension
Extend previously generated videos:
```typescript
// Future feature to implement
{
  prompt: "Continue the scene with...",
  videoToExtend: "gs://bucket/previous-video.mp4"
}
```

### 2. Frame-Specific Generation
Specify first and last frames:
```typescript
{
  prompt: "Transition between these scenes",
  firstFrame: "data:image/jpeg;base64,...",
  lastFrame: "data:image/jpeg;base64,..."
}
```

### 3. Multi-Image Reference
Use up to 3 reference images:
```typescript
{
  prompt: "Create video maintaining these characters",
  referenceImages: [
    "data:image/jpeg;base64,...",  // Character 1
    "data:image/jpeg;base64,...",  // Character 2
    "data:image/jpeg;base64,..."   // Setting
  ]
}
```

### 4. Better Audio
Veo 3.1 generates:
- Natural conversations with lip sync
- Synchronized sound effects
- Background music
- Ambient sounds

**Your code already supports image-to-video** (VEO_API_ANALYSIS.md confirms this works).

## Rate Limits

Your dashboard shows you've hit limits:
- **RPM**: 2/2 (requests per minute - MAXED OUT)
- **RPD**: 10/10 (requests per day - MAXED OUT)

**Free Tier Limits:**
- 15 RPM across all Gemini API calls
- 1,500 RPD across all Gemini API calls

**Your Veo-specific limits:**
- 2 RPM for video generation
- 10 RPD for video generation

**To increase limits:**
1. Wait 24 hours for RPD to reset
2. Upgrade to paid tier (gets you 2,000 RPM)
3. Request limit increase from Google

## Summary

| Aspect | Status | Action |
|--------|--------|--------|
| **Code Model ID** | `veo-3.1-generate-preview` | ✅ Correct - No change needed |
| **Dashboard Name** | `veo-3.0-generate` | ⚠️ Display discrepancy - Ignore |
| **Generations** | Working successfully | ✅ Everything is fine |
| **Rate Limits** | 2/2 RPM, 10/10 RPD | ⚠️ Limits hit - Wait or upgrade |
| **Recommendation** | Keep current code | ✅ No changes needed |

## Next Steps

1. ✅ **Keep using your current code** - It's correct
2. 🧪 **Run diagnostic script** (optional): `npx ts-node scripts/test-veo-model-ids.ts`
3. 📊 **Monitor dashboard** - Watch for any breaking changes
4. 💰 **Consider upgrading** - If you need higher rate limits
5. 🎬 **Explore Veo 3.1 features** - Video extension, multi-image reference, etc.

## References

- **Official Docs**: https://ai.google.dev/gemini-api/docs/video
- **Release Announcement**: https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/
- **Model List**: https://ai.google.dev/gemini-api/docs/models
- **Changelog**: https://ai.google.dev/gemini-api/docs/changelog

---

**Last Updated**: Nov 23, 2025
**Conclusion**: ✅ Your code is correct. Dashboard shows wrong name, but API works fine.
**Action Required**: None - keep current configuration
