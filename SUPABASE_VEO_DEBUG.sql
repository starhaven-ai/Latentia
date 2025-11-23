-- ============================================
-- VEO 3.1 API DEBUGGING SCRIPT FOR SUPABASE
-- ============================================
-- Run these queries in your Supabase SQL Editor to diagnose Veo API issues
-- Copy and paste each section as needed

-- ============================================
-- SECTION 1: RECENT VEO FAILURES (MOST IMPORTANT)
-- Shows all failed Veo generations with full error details
-- ============================================
SELECT
  g.id,
  g.status,
  g.created_at,
  EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 60 AS age_minutes,
  LEFT(g.prompt, 60) AS prompt_preview,
  g.model_id,
  -- Error information
  g.parameters->>'error' AS error_message,
  g.parameters->>'lastStep' AS last_step,
  g.parameters->>'lastHeartbeatAt' AS last_heartbeat,
  -- Reference image information
  CASE
    WHEN g.parameters->>'referenceImage' IS NOT NULL THEN 'inline-base64'
    WHEN g.parameters->>'referenceImageUrl' IS NOT NULL THEN 'url'
    ELSE 'none'
  END AS reference_image_type,
  g.parameters->>'referenceImageUrl' AS reference_url,
  g.parameters->>'referenceImageMimeType' AS reference_mime_type,
  -- Request parameters
  g.parameters->'aspectRatio' AS aspect_ratio,
  g.parameters->'resolution' AS resolution,
  g.parameters->'duration' AS duration,
  -- Debug log count
  jsonb_array_length(COALESCE(g.parameters->'debugLogs', '[]'::jsonb)) AS debug_log_count,
  -- Output count
  (SELECT COUNT(*) FROM outputs WHERE generation_id = g.id) AS output_count
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'failed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
ORDER BY g.created_at DESC
LIMIT 20;

-- ============================================
-- SECTION 2: SPECIFIC GENERATION DEEP DIVE
-- Replace 'YOUR_GENERATION_ID' with the ID from Section 1
-- ============================================
SELECT
  g.id,
  g.status,
  g.created_at,
  g.prompt,
  g.model_id,
  g.parameters->>'error' AS error_message,
  g.parameters->>'lastStep' AS last_processing_step,
  g.parameters->>'lastHeartbeatAt' AS last_heartbeat,
  -- Full reference image details
  g.parameters->'referenceImage' AS reference_image_data_preview,
  g.parameters->>'referenceImageUrl' AS reference_image_url,
  g.parameters->>'referenceImagePath' AS reference_image_path,
  g.parameters->>'referenceImageBucket' AS reference_image_bucket,
  g.parameters->>'referenceImageMimeType' AS reference_image_mime_type,
  g.parameters->>'referenceImageChecksum' AS reference_image_checksum,
  g.parameters->>'referenceImageId' AS reference_image_id,
  -- All parameters
  g.parameters AS full_parameters,
  -- All debug logs
  g.parameters->'debugLogs' AS debug_logs
FROM generations g
WHERE g.id = 'YOUR_GENERATION_ID';

-- ============================================
-- SECTION 3: DEBUG LOG TIMELINE FOR SPECIFIC GENERATION
-- Shows the step-by-step execution timeline
-- Replace 'YOUR_GENERATION_ID' with actual ID
-- ============================================
SELECT
  log->>'at' AS timestamp,
  log->>'step' AS step_name,
  log - 'at' - 'step' AS extra_data
FROM
  generations g,
  jsonb_array_elements(g.parameters->'debugLogs') AS log
WHERE g.id = 'YOUR_GENERATION_ID'
ORDER BY log->>'at' ASC;

-- ============================================
-- SECTION 4: ERROR PATTERN ANALYSIS
-- Groups failures by error message to find patterns
-- ============================================
SELECT
  g.parameters->>'error' AS error_message,
  COUNT(*) AS occurrence_count,
  MIN(g.created_at) AS first_seen,
  MAX(g.created_at) AS last_seen,
  -- Show if reference images were involved
  COUNT(*) FILTER (WHERE g.parameters->>'referenceImageUrl' IS NOT NULL
                        OR g.parameters->>'referenceImage' IS NOT NULL) AS with_reference_image,
  COUNT(*) FILTER (WHERE g.parameters->>'referenceImageUrl' IS NULL
                        AND g.parameters->>'referenceImage' IS NULL) AS text_to_video_only
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'failed'
  AND g.created_at > NOW() - INTERVAL '7 days'
GROUP BY g.parameters->>'error'
ORDER BY occurrence_count DESC;

-- ============================================
-- SECTION 5: LAST PROCESSING STEP ANALYSIS
-- Shows where generations are failing in the pipeline
-- ============================================
SELECT
  g.parameters->>'lastStep' AS last_step,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 60) AS avg_age_minutes,
  -- Sample error messages
  array_agg(DISTINCT g.parameters->>'error') FILTER (WHERE g.parameters->>'error' IS NOT NULL) AS error_samples
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'failed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
GROUP BY g.parameters->>'lastStep'
ORDER BY count DESC;

-- ============================================
-- SECTION 6: SUCCESS VS FAILURE COMPARISON
-- Compare successful and failed generations
-- ============================================
SELECT
  g.status,
  COUNT(*) AS total,
  -- Reference image usage
  COUNT(*) FILTER (WHERE g.parameters->>'referenceImageUrl' IS NOT NULL
                        OR g.parameters->>'referenceImage' IS NOT NULL) AS with_reference_image,
  COUNT(*) FILTER (WHERE g.parameters->>'referenceImageUrl' IS NULL
                        AND g.parameters->>'referenceImage' IS NULL) AS without_reference_image,
  -- Average processing time
  AVG(EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 60) AS avg_age_minutes,
  -- Resolution breakdown
  COUNT(*) FILTER (WHERE g.parameters->>'resolution' = '720') AS resolution_720p,
  COUNT(*) FILTER (WHERE g.parameters->>'resolution' = '1080') AS resolution_1080p,
  -- Duration breakdown
  COUNT(*) FILTER (WHERE g.parameters->>'duration' = '4') AS duration_4s,
  COUNT(*) FILTER (WHERE g.parameters->>'duration' = '6') AS duration_6s,
  COUNT(*) FILTER (WHERE g.parameters->>'duration' = '8') AS duration_8s
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.created_at > NOW() - INTERVAL '24 hours'
GROUP BY g.status
ORDER BY total DESC;

-- ============================================
-- SECTION 7: RECENT VEO ACTIVITY TIMELINE
-- Shows all recent Veo activity (successes and failures)
-- ============================================
SELECT
  g.id,
  g.status,
  g.created_at,
  EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 60 AS age_minutes,
  LEFT(g.prompt, 40) AS prompt_preview,
  CASE
    WHEN g.parameters->>'referenceImage' IS NOT NULL
         OR g.parameters->>'referenceImageUrl' IS NOT NULL
    THEN '🖼️ image-to-video'
    ELSE '📝 text-to-video'
  END AS generation_type,
  g.parameters->>'resolution' AS resolution,
  g.parameters->>'duration' AS duration,
  g.parameters->>'error' AS error_message,
  (SELECT COUNT(*) FROM outputs WHERE generation_id = g.id) AS output_count
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.created_at > NOW() - INTERVAL '6 hours'
ORDER BY g.created_at DESC;

-- ============================================
-- SECTION 8: STUCK IN PROCESSING (CURRENTLY RUNNING)
-- Generations that might be stuck
-- ============================================
SELECT
  g.id,
  g.status,
  g.created_at,
  NOW() - g.created_at AS stuck_duration,
  EXTRACT(EPOCH FROM (NOW() - g.created_at)) / 60 AS stuck_minutes,
  LEFT(g.prompt, 50) AS prompt_preview,
  g.parameters->>'lastStep' AS last_step,
  g.parameters->>'lastHeartbeatAt' AS last_heartbeat,
  NOW() - (g.parameters->>'lastHeartbeatAt')::timestamptz AS time_since_heartbeat,
  jsonb_array_length(COALESCE(g.parameters->'debugLogs', '[]'::jsonb)) AS debug_log_count,
  -- Check if job is locked
  (SELECT gj.locked_at FROM generation_jobs gj WHERE gj.generation_id = g.id) AS job_locked_at,
  (SELECT gj.attempts FROM generation_jobs gj WHERE gj.generation_id = g.id) AS job_attempts
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'processing'
  AND g.created_at < NOW() - INTERVAL '2 minutes'
ORDER BY g.created_at ASC;

-- ============================================
-- SECTION 9: FILES API UPLOAD ISSUES
-- Look for reference image upload failures in debug logs
-- ============================================
SELECT
  g.id,
  g.created_at,
  LEFT(g.prompt, 40) AS prompt_preview,
  g.parameters->>'error' AS error_message,
  -- Extract file upload related logs
  (
    SELECT jsonb_agg(log ORDER BY log->>'at')
    FROM jsonb_array_elements(g.parameters->'debugLogs') AS log
    WHERE log->>'step' LIKE '%upload%'
       OR log->>'step' LIKE '%file%'
       OR log->>'step' LIKE '%image%'
  ) AS file_related_logs
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'failed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
  AND (g.parameters->>'referenceImageUrl' IS NOT NULL
       OR g.parameters->>'referenceImage' IS NOT NULL)
ORDER BY g.created_at DESC
LIMIT 10;

-- ============================================
-- SECTION 10: API RESPONSE STRUCTURE ISSUES
-- Look for "unexpected response" or structure-related errors
-- ============================================
SELECT
  g.id,
  g.created_at,
  g.parameters->>'error' AS error_message,
  LEFT(g.prompt, 40) AS prompt_preview,
  -- Show the last few debug logs
  (
    SELECT jsonb_agg(log ORDER BY log->>'at' DESC)
    FROM (
      SELECT log
      FROM jsonb_array_elements(g.parameters->'debugLogs') AS log
      ORDER BY log->>'at' DESC
      LIMIT 5
    ) AS recent_logs
  ) AS last_5_logs
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'failed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
  AND (
    g.parameters->>'error' LIKE '%response%'
    OR g.parameters->>'error' LIKE '%structure%'
    OR g.parameters->>'error' LIKE '%unexpected%'
    OR g.parameters->>'error' LIKE '%format%'
  )
ORDER BY g.created_at DESC;

-- ============================================
-- SECTION 11: SUCCESSFUL GENERATIONS (FOR COMPARISON)
-- Shows what worked to compare against failures
-- ============================================
SELECT
  g.id,
  g.created_at,
  LEFT(g.prompt, 40) AS prompt_preview,
  CASE
    WHEN g.parameters->>'referenceImageUrl' IS NOT NULL
         OR g.parameters->>'referenceImage' IS NOT NULL
    THEN 'image-to-video'
    ELSE 'text-to-video'
  END AS type,
  g.parameters->>'resolution' AS resolution,
  g.parameters->>'duration' AS duration,
  g.parameters->>'aspectRatio' AS aspect_ratio,
  (SELECT COUNT(*) FROM outputs WHERE generation_id = g.id) AS output_count,
  -- Show successful flow
  (
    SELECT jsonb_agg(log->>'step' ORDER BY log->>'at')
    FROM jsonb_array_elements(g.parameters->'debugLogs') AS log
  ) AS processing_steps
FROM generations g
WHERE g.model_id LIKE '%veo%'
  AND g.status = 'completed'
  AND g.created_at > NOW() - INTERVAL '24 hours'
ORDER BY g.created_at DESC
LIMIT 5;

-- ============================================
-- SECTION 12: QUEUE STATUS (if queue is enabled)
-- Shows pending generation jobs
-- ============================================
SELECT
  gj.id AS job_id,
  gj.generation_id,
  gj.created_at AS job_created,
  gj.run_after,
  gj.attempts,
  gj.locked_at,
  CASE
    WHEN gj.locked_at IS NOT NULL AND gj.locked_at > NOW() - INTERVAL '60 seconds'
    THEN '🔒 locked'
    WHEN gj.run_after IS NOT NULL AND gj.run_after > NOW()
    THEN '⏰ scheduled'
    ELSE '🟢 ready'
  END AS job_status,
  g.status AS generation_status,
  g.model_id,
  LEFT(g.prompt, 40) AS prompt_preview
FROM generation_jobs gj
JOIN generations g ON g.id = gj.generation_id
WHERE g.model_id LIKE '%veo%'
ORDER BY gj.created_at DESC
LIMIT 20;

-- ============================================
-- SECTION 13: SUMMARY STATISTICS
-- Quick overview of Veo API health
-- ============================================
SELECT
  '📊 VEO API SUMMARY (Last 24 hours)' AS metric_name,
  COUNT(*) AS total_generations,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing,
  COUNT(*) FILTER (WHERE status = 'queued') AS queued,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) AS success_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60), 1) AS avg_age_minutes
FROM generations
WHERE model_id LIKE '%veo%'
  AND created_at > NOW() - INTERVAL '24 hours';

-- ============================================
-- SECTION 14: MARK FAILED GENERATION (USE WITH CAUTION)
-- Replace 'YOUR_GENERATION_ID' to manually fail a stuck generation
-- ============================================
-- UPDATE generations
-- SET status = 'failed',
--     parameters = jsonb_set(
--       COALESCE(parameters, '{}'::jsonb),
--       '{error}',
--       '"Manually marked as failed via debug script"'
--     )
-- WHERE id = 'YOUR_GENERATION_ID'
-- RETURNING id, status, prompt;

-- ============================================
-- SECTION 15: EXPORT FULL DEBUG DATA FOR SPECIFIC GENERATION
-- Use this to get all data for sharing with support/debugging
-- Replace 'YOUR_GENERATION_ID' with actual ID
-- ============================================
SELECT
  json_build_object(
    'generation_id', g.id,
    'status', g.status,
    'model_id', g.model_id,
    'created_at', g.created_at,
    'prompt', g.prompt,
    'parameters', g.parameters,
    'outputs', (
      SELECT json_agg(
        json_build_object(
          'id', o.id,
          'file_url', o.file_url,
          'file_type', o.file_type,
          'width', o.width,
          'height', o.height,
          'duration', o.duration
        )
      )
      FROM outputs o
      WHERE o.generation_id = g.id
    ),
    'queue_job', (
      SELECT json_build_object(
        'id', gj.id,
        'attempts', gj.attempts,
        'locked_at', gj.locked_at,
        'run_after', gj.run_after,
        'created_at', gj.created_at
      )
      FROM generation_jobs gj
      WHERE gj.generation_id = g.id
    )
  ) AS full_debug_export
FROM generations g
WHERE g.id = 'YOUR_GENERATION_ID';
