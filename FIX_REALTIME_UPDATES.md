# Fix: Real-Time Updates Not Working

## Problem

You're experiencing two issues:

1. **Generation statuses don't update automatically** - you have to refresh the page to see if a generation completed or failed
2. **Stuck generations** - generations appear to hang in "processing" status

## Root Cause

**Supabase Realtime is not enabled for your database tables.** The app has real-time subscription code in place (`hooks/useGenerationsRealtime.ts`), but Supabase needs to be configured to broadcast database changes.

## Solution

### Step 1: Enable Supabase Realtime (CRITICAL)

This will fix the automatic UI updates:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Database → Replication
3. **Enable replication for these tables**:
   - ✅ `generations`
   - ✅ `outputs`
4. **Click "Save"**

**What this does:**
- When a generation's status changes in the database (e.g., `processing` → `completed`), Supabase will broadcast that change via WebSocket
- The app will receive the change and automatically update the UI
- No more manual page refreshes needed!

### Step 2: Check Your Current Stuck Generation

Run this SQL query in your **Supabase SQL Editor** to check the status of your latest generation:

```sql
-- Check the most recent generation
SELECT
  id,
  status,
  prompt,
  model_id,
  created_at,
  NOW() - created_at AS age,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS age_minutes,
  parameters->>'error' AS error_message,
  parameters->>'lastStep' AS last_step,
  parameters->'debugLogs'->-1 AS last_debug_log,
  (SELECT COUNT(*) FROM outputs WHERE generation_id = generations.id) AS output_count
FROM generations
ORDER BY created_at DESC
LIMIT 1;
```

### Step 3: If Generation is Truly Stuck

If the generation has been "processing" for more than 2-5 minutes, it's likely stuck. Mark it as failed:

```sql
-- Replace 'YOUR_GENERATION_ID' with the ID from Step 2
UPDATE generations
SET status = 'failed',
    parameters = jsonb_set(
      COALESCE(parameters, '{}'::jsonb),
      '{error}',
      '"Processing timed out - manually marked as failed"'
    )
WHERE id = 'YOUR_GENERATION_ID'
  AND status = 'processing'
RETURNING id, status, prompt;
```

### Step 4: Check for Recent Veo API Errors

If you're using Veo 3.1 for video generation, check if there are any new API errors:

```sql
-- Check recent Veo failures
SELECT
  id,
  status,
  created_at,
  LEFT(prompt, 60) AS prompt_preview,
  model_id,
  parameters->>'error' AS error_message,
  CASE
    WHEN parameters->>'referenceImage' IS NOT NULL THEN 'image-to-video'
    WHEN parameters->>'referenceImageUrl' IS NOT NULL THEN 'image-to-video'
    ELSE 'text-to-video'
  END AS generation_type,
  (SELECT COUNT(*) FROM outputs WHERE generation_id = generations.id) AS output_count
FROM generations
WHERE model_id LIKE '%veo%'
  AND created_at > NOW() - INTERVAL '6 hours'
ORDER BY created_at DESC
LIMIT 10;
```

## How to Verify It's Working

After enabling Supabase Realtime:

1. **Start a new generation** (image or video)
2. **Watch the UI** - you should see:
   - Progress indicator appears immediately
   - Status updates automatically when processing completes
   - No need to refresh the page
3. **Check browser console** - you should see logs like:
   ```
   🔴 Subscribing to real-time updates for session: <session-id>
   🔴 Realtime subscription status: SUBSCRIBED
   🔴 Generation change detected: UPDATE <generation-id>
   ```

## Technical Details

### What the App Does

The app subscribes to Supabase Realtime in `components/generation/GenerationInterface.tsx:101`:

```typescript
useGenerationsRealtime(session?.id || null, userId)
```

This hook (`hooks/useGenerationsRealtime.ts`) listens for:
- **Generation updates** (status changes, errors)
- **New outputs** (when videos/images are generated)

When changes are detected, it invalidates the React Query cache, triggering an automatic refetch and UI update.

### Why You Need to Enable Replication

Supabase Realtime uses PostgreSQL's **logical replication** feature. Without enabling it:
- Database changes occur silently
- No events are broadcast to subscribers
- The app never knows when generations complete

With replication enabled:
- Every INSERT/UPDATE/DELETE is broadcast
- Subscribers receive events in real-time
- UI updates automatically

## Additional Resources

- **Stuck Generations**: See `SUPABASE_CHECK_STUCK_GENERATIONS.sql` for more queries
- **Veo API Debugging**: See `SUPABASE_VEO_DEBUG.sql` and `VEO_API_ANALYSIS.md`
- **Performance**: See `PERFORMANCE_IMPLEMENTATION_SUMMARY.md` for system architecture

## Testing Checklist

After enabling Realtime:

- [ ] Generate an image - UI updates automatically when complete
- [ ] Generate a video - progress shows and updates without refresh
- [ ] Open two browser tabs - changes in one tab appear in the other
- [ ] Check browser console for `🔴 Realtime subscription status: SUBSCRIBED`
- [ ] Try marking a generation as failed in SQL - UI updates immediately

---

**Once you enable Supabase Realtime, your UI should update automatically!** No code changes needed - the real-time subscription code is already in place, it just needs Supabase to be configured to broadcast the changes.
