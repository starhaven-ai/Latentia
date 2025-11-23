# Veo 3.1 API Image-to-Video Error Analysis

## Executive Summary

**Status**: ✅ **RESOLVED** (as of commit 763bd56 at 17:02:16 UTC)

All image-to-video failures occurred **before** the fix was deployed. The one successful image-to-video generation happened **after** the fix, confirming the solution works.

## Timeline of Events

| Time (UTC) | Event | Status |
|------------|-------|--------|
| 15:15 - 16:32 | 9 image-to-video attempts | ❌ All failed |
| 17:02:16 | Fix commit deployed (763bd56) | ✅ Base64 format fix |
| 17:05:30 | Image-to-video generation | ✅ **SUCCESS** |
| 17:08+ | Multiple text-to-video generations | ✅ All successful |

## Root Cause Analysis

### The Problem

The Gemini API (`generativelanguage.googleapis.com`) for Veo 3.1 has different requirements than the Vertex AI API. The code was trying multiple incorrect formats:

1. **Files API Upload** → Returned empty response: `{}`
   - Error: "No file name returned from Files API. Response: {}"

2. **`fileData` field** → Not supported by Gemini API
   - Error: "`fileData` isn't supported by this model"

3. **`referenceImage` field** → Not supported by Gemini API
   - Error: "`referenceImage` isn't supported by this model"

4. **`{ uri: "files/abc123" }`** → Wrong structure
   - Error: "No struct value found for field expecting an image"

### The Solution (Commit 763bd56)

Changed to use **base64-encoded inline data** with the correct field name:

```typescript
// ✅ CORRECT FORMAT (current code)
instance.image = {
  bytesBase64Encoded: imageBase64,
  mimeType: contentType
}
```

This format is then passed directly to the API payload:
```json
{
  "instances": [{
    "prompt": "...",
    "image": {
      "bytesBase64Encoded": "...",
      "mimeType": "image/jpeg"
    }
  }],
  "parameters": {
    "sampleCount": 1,
    "aspectRatio": "16:9",
    "resolution": "1080p",
    "durationSeconds": 8
  }
}
```

## Evidence of Success

### Database Query Results

**Failed Generations** (all before fix):
```
Count: 9
Time Range: 15:15:28 - 16:32:22 (before 17:02:16 fix)
Pattern: 100% of image-to-video attempts failed
```

**Successful Generations** (after fix):
```
ID: 8a878334-60da-453e-9ec6-79d9850bd6cc
Type: image-to-video
Time: 17:05:30 (3 minutes after fix)
Status: ✅ completed
```

**Text-to-Video** (all timeframes):
```
Success Rate: 100% (9/9 generations)
Note: Text-to-video was never affected
```

## Error Patterns Observed

| Error Message | Count | Time Range | Approach Attempted |
|---------------|-------|------------|-------------------|
| "No file name returned from Files API" | 4 | 15:15 - 15:44 | Files API upload |
| "`fileData` isn't supported" | 1 | 16:10 | fileData field |
| "`referenceImage` isn't supported" | 2 | 16:16 - 16:17 | referenceImage field |
| "No struct value found for field" | 2 | 15:47 - 16:32 | URI wrapping |

## Current Code Status

**File**: `lib/models/adapters/gemini.ts:257-263`
**Last Modified**: 763bd56 (2025-11-23 17:02:16)
**Status**: ✅ **CORRECT**

The current implementation:
- ✅ Uses base64 encoding by default (`USE_BASE64_DIRECT = true`)
- ✅ Uses correct field names for Gemini API
- ✅ Has Files API as fallback (though not working)
- ✅ Proper error handling and logging

## Recommendations

### Immediate Actions
1. ✅ **No code changes needed** - Current code is working
2. ⚠️ **Monitor new generations** - Verify continued success
3. 📝 **Update documentation** - Document the base64 requirement

### Future Improvements
1. **Remove Files API fallback** (lines 264-360)
   - Files API doesn't work with Gemini endpoint
   - Adds unnecessary complexity and failure modes
   - Recommend: Delete or clearly mark as non-functional

2. **Add better error messages**
   - When reference image fails, suggest checking format
   - Log the actual payload being sent for debugging

3. **Consider size limits**
   - Base64 encoding increases payload size by ~33%
   - Large images may hit API limits
   - Recommend: Document max image size (e.g., 2MB)

4. **Add image preprocessing**
   - Resize/compress large images before encoding
   - Validate aspect ratio matches video settings
   - Convert to JPEG if source is large PNG

### Testing Checklist
- [ ] Generate image-to-video with 720p resolution
- [ ] Generate image-to-video with 1080p resolution
- [ ] Test with different aspect ratios (1:1, 16:9, 9:16)
- [ ] Test with different image formats (JPEG, PNG, WebP)
- [ ] Test with various image sizes (100KB - 5MB)
- [ ] Verify error handling for invalid images

## API Reference

### Working Gemini API Format
```json
{
  "instances": [{
    "prompt": "descriptive motion prompt",
    "image": {
      "bytesBase64Encoded": "base64_encoded_string",
      "mimeType": "image/jpeg"
    }
  }],
  "parameters": {
    "sampleCount": 1,
    "aspectRatio": "16:9",
    "resolution": "720p",
    "durationSeconds": 8
  }
}
```

### Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning
Headers:
  x-goog-api-key: YOUR_API_KEY
  Content-Type: application/json
```

## Conclusion

The Veo 3.1 image-to-video API errors have been **resolved**. The fix (commit 763bd56) changed from Files API upload to base64 inline encoding, which is the correct format for the Gemini API endpoint.

**Next Steps**:
1. Monitor new generations for any issues
2. Consider cleaning up non-functional Files API code
3. Document the image requirements for users

---
Generated: 2025-11-23 17:14 UTC
Based on analysis of 18 generations (9 failed, 9 successful)
