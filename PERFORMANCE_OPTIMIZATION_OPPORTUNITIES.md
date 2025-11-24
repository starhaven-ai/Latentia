# Performance Optimization Opportunities for Latentia

## Executive Summary

Based on comprehensive codebase analysis, this document identifies **high-impact performance improvements** not yet implemented. Latentia already has solid foundations (React Query caching, async processing, CDN), but significant gains remain achievable through:

1. **Server-side caching** (HTTP headers, Redis)
2. **Image thumbnails** and progressive loading
3. **Database query optimization** (result caching, connection pooling improvements)
4. **Frontend optimizations** (infinite scroll, prefetching, code splitting)
5. **Backend optimizations** (response compression, batch APIs)

---

## 🔴 High Impact, Low Effort (Implement First)

### 1. HTTP Cache-Control Headers for API Routes
**Current State**: ❌ No caching headers on API responses
**Impact**: 🚀 High - Reduces server load and improves response times
**Effort**: 🟢 Low (2-4 hours)

**Problem**: Every API request hits the server, even for unchanging data like models list, user profiles, and project metadata.

**Solution**:
```typescript
// Add to API routes
export async function GET(request: Request) {
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'CDN-Cache-Control': 'public, s-maxage=3600',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600'
    }
  })
}
```

**Routes to Cache**:
- `GET /api/models` → 1 hour (rarely changes)
- `GET /api/profile` → 5 minutes (semi-static)
- `GET /api/projects` → 30 seconds (updates infrequently)
- `GET /api/sessions` → 30 seconds
- `GET /api/bookmarks` → 1 minute

**Expected Improvement**:
- 70-90% reduction in API calls for cached routes
- Near-instant response for cached data (< 50ms)
- Reduced Vercel function invocations = lower costs

---

### 2. Image Thumbnails with Progressive Loading
**Current State**: ❌ Full-size images loaded for galleries (4-8MB per image)
**Impact**: 🚀 High - Dramatic reduction in bandwidth and load times
**Effort**: 🟡 Medium (1-2 days)

**Problem**:
- Gallery views load full 1024x1024 images (2-8MB each)
- Session with 20 images = 40-160MB initial load
- Slow on mobile/slower connections

**Solution**:
```typescript
// 1. Generate thumbnails on upload
async function uploadWithThumbnails(imageData: Buffer, path: string) {
  const thumbnail = await sharp(imageData)
    .resize(256, 256, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer()

  await Promise.all([
    supabase.storage.from('generated-images').upload(path, imageData),
    supabase.storage.from('thumbnails').upload(path, thumbnail)
  ])
}

// 2. Use Next.js Image with blur placeholder
<Image
  src={thumbnailUrl}
  width={256}
  height={256}
  placeholder="blur"
  blurDataURL={blurHash}
  onClick={() => openFullSize(fullImageUrl)}
/>
```

**Database Schema Addition**:
```prisma
model Output {
  id            String   @id @default(cuid())
  imageUrl      String?  // Full size (4-8MB)
  thumbnailUrl  String?  // Thumbnail (50-200KB) ← Add this
  blurHash      String?  // Placeholder (< 1KB) ← Add this
  // ... existing fields
}
```

**Expected Improvement**:
- Gallery load: 40-160MB → 2-8MB (**95% reduction**)
- Initial render: 5-10s → 0.5-1s (**90% faster**)
- Perceived performance: Instant with blur placeholders

---

### 3. API Response Compression
**Current State**: ❌ No explicit compression on API responses
**Impact**: 🚀 High - Faster data transfer, lower bandwidth costs
**Effort**: 🟢 Low (1-2 hours)

**Problem**: Large JSON responses (especially generations lists) sent uncompressed.

**Solution**:
```typescript
// middleware.ts - Add compression
import { NextResponse } from 'next/server'
import { compress } from 'next/dist/compiled/compression'

export function middleware(request: Request) {
  const response = NextResponse.next()

  // Enable gzip/brotli compression
  if (request.url.startsWith('/api/')) {
    response.headers.set('Content-Encoding', 'gzip')
  }

  return response
}
```

**Vercel Configuration**:
```json
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Content-Encoding",
          "value": "gzip"
        }
      ]
    }
  ]
}
```

**Expected Improvement**:
- JSON payload size: 50-80% reduction
- Transfer time on slow connections: 50-70% faster

---

### 4. Database Query Result Caching (Prisma)
**Current State**: ⚠️ Limited - No query-level caching
**Impact**: 🚀 High - Reduces database load for repeated queries
**Effort**: 🟡 Medium (4-6 hours)

**Problem**: Same queries executed repeatedly (e.g., user profile, project lists).

**Solution**:
```typescript
// lib/prisma.ts - Add Prisma Accelerate or custom cache
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

export const prisma = new PrismaClient().$extends(withAccelerate())

// Usage in API routes
const projects = await prisma.project.findMany({
  where: { ownerId: userId },
  cacheStrategy: {
    ttl: 60,        // Cache for 60 seconds
    swr: 120        // Stale-while-revalidate for 120s
  }
})
```

**Alternative: Manual Redis Cache**:
```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function cachedQuery<T>(
  key: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const result = await queryFn()
  await redis.setex(key, ttl, JSON.stringify(result))
  return result
}

// Usage
const projects = await cachedQuery(
  `projects:user:${userId}`,
  60,
  () => prisma.project.findMany({ where: { ownerId: userId } })
)
```

**Expected Improvement**:
- Database load: 40-60% reduction
- API response time: 20-40% faster (50-100ms saved per cached query)

---

### 5. Optimize React Query Stale Times
**Current State**: ⚠️ Conservative - 1 minute global, 10s for generations
**Impact**: 🟡 Medium - Reduces unnecessary refetches
**Effort**: 🟢 Low (1 hour)

**Problem**: Data refetches more often than necessary, causing extra API calls.

**Solution**:
```typescript
// components/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes (up from 1 minute)
      gcTime: 60 * 60 * 1000,         // 1 hour (up from 30 minutes)
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

// Per-query overrides
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 10 * 60 * 1000  // 10 minutes - projects change rarely
  })
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    staleTime: 60 * 60 * 1000  // 1 hour - models list almost never changes
  })
}
```

**Expected Improvement**:
- API calls reduced by 30-50%
- Faster navigation (instant cached responses)

---

## 🟡 High Impact, Medium Effort

### 6. Implement Infinite Scroll for Generations
**Current State**: ⚠️ Backend ready, frontend not implemented
**Impact**: 🚀 High - Better UX, faster initial load
**Effort**: 🟡 Medium (1 day)

**Current Problem**: Loading all generations at once (can be 50-100+ items).

**Solution**:
```typescript
// hooks/useInfiniteGenerations.ts - Already exists!
export function useInfiniteGenerations(filters: GenerationFilters) {
  return useInfiniteQuery({
    queryKey: ['generations', 'infinite', filters],
    queryFn: ({ pageParam }) =>
      fetchGenerations({ ...filters, cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 30_000
  })
}

// components/generation/GenerationsList.tsx
import { useInView } from 'react-intersection-observer'

export function GenerationsList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteGenerations()
  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.flatMap(page => page.data).map(gen => (
        <GenerationCard key={gen.id} generation={gen} />
      ))}
      <div ref={ref}>Loading...</div>
    </div>
  )
}
```

**Expected Improvement**:
- Initial load: 5-10s → 1-2s (only loads 20 items)
- Perceived performance: Much faster
- Memory usage: Lower (only renders visible items)

---

### 7. Add Redis for Server-Side Session Cache
**Current State**: ❌ No server-side caching layer
**Impact**: 🚀 High - Dramatically reduces database load
**Effort**: 🟡 Medium (1-2 days)

**Use Cases**:
1. Session management (user auth state)
2. Rate limiting
3. API response caching
4. Generation job queue (already partially implemented)

**Solution**:
```typescript
// lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
})

// Caching wrapper
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  const fresh = await fetchFn()
  await redis.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}

// Usage in API routes
export async function GET(request: Request) {
  const userId = await getUserId(request)

  const projects = await withCache(
    `projects:${userId}`,
    300,  // 5 minutes
    () => prisma.project.findMany({ where: { ownerId: userId } })
  )

  return NextResponse.json(projects)
}
```

**Redis Setup** (Vercel KV or Upstash):
```bash
# .env
REDIS_URL=redis://...
```

**Expected Improvement**:
- Database queries: 50-70% reduction
- API latency: 100-200ms → 10-30ms for cached queries
- Handles 10x more concurrent users

---

### 8. Implement Link Prefetching and Hover Preloading
**Current State**: ⚠️ Basic Next.js prefetch, not aggressive
**Impact**: 🟡 Medium - Perceived instant navigation
**Effort**: 🟢 Low (2-3 hours)

**Solution**:
```typescript
// components/ProjectCard.tsx
export function ProjectCard({ project }: { project: Project }) {
  const prefetchProject = usePrefetchQuery({
    queryKey: ['project', project.id],
    queryFn: () => fetchProject(project.id)
  })

  return (
    <Link
      href={`/projects/${project.id}`}
      prefetch={true}
      onMouseEnter={() => {
        prefetchProject()  // Prefetch data on hover
      }}
    >
      <div>{project.name}</div>
    </Link>
  )
}

// Prefetch critical data on hover
export function usePrefetchOnHover(href: string, data: object) {
  const queryClient = useQueryClient()

  const handleHover = () => {
    // Warm up the cache
    queryClient.prefetchQuery({
      queryKey: [href],
      queryFn: () => fetch(href).then(r => r.json())
    })
  }

  return handleHover
}
```

**Expected Improvement**:
- Navigation feels instant (0ms perceived delay)
- Data ready before user clicks

---

### 9. Optimize Image Generation Storage Pipeline
**Current State**: ⚠️ Multiple conversions and re-uploads
**Impact**: 🟡 Medium - Faster generation completion
**Effort**: 🟡 Medium (1 day)

**Current Inefficiency** (lib/supabase/storage.ts):
```typescript
// Downloads external URL → Re-uploads to Supabase
uploadUrlToStorage(geminiUrl, bucket, path)

// Better: Stream directly without re-download
```

**Solution**:
```typescript
// Streaming upload (no intermediate storage)
import { pipeline } from 'stream/promises'

export async function streamToStorage(
  sourceUrl: string,
  bucket: string,
  path: string
) {
  const response = await fetch(sourceUrl)
  const buffer = await response.arrayBuffer()

  // Upload directly
  return supabase.storage.from(bucket).upload(path, buffer, {
    contentType: response.headers.get('content-type') || 'image/png',
    cacheControl: '3600',
    upsert: true
  })
}

// Parallel uploads for multiple outputs
export async function uploadBatch(outputs: Array<{url: string, path: string}>) {
  const uploads = outputs.map(o => streamToStorage(o.url, 'generated-images', o.path))
  return Promise.all(uploads)  // Parallel instead of sequential
}
```

**Expected Improvement**:
- Generation completion time: 20-30% faster
- Reduced serverless execution time = lower costs

---

## 🔵 Medium Impact, Various Effort

### 10. Static Generation for Public Pages
**Current State**: ❌ All pages server-rendered
**Impact**: 🟡 Medium - Faster public page loads
**Effort**: 🟡 Medium (1 day)

**Pages to Make Static**:
- Landing page (`/`)
- Pricing page (`/pricing`)
- Marketing pages
- Documentation

**Solution**:
```typescript
// app/page.tsx (landing)
export const revalidate = 3600  // ISR: regenerate hourly

export default async function HomePage() {
  return <LandingPage />
}

// app/pricing/page.tsx
export const revalidate = 86400  // Daily

export default async function PricingPage() {
  return <Pricing />
}
```

**Expected Improvement**:
- Landing page TTFB: 500ms → 50ms
- Global CDN distribution
- Handles viral traffic spikes

---

### 11. Optimize Database Indexes
**Current State**: ✅ Good basic indexes, can improve
**Impact**: 🟡 Medium - Faster complex queries
**Effort**: 🟢 Low (2-3 hours)

**Missing Indexes**:
```prisma
// prisma/schema.prisma

model Generation {
  // Add compound indexes for common query patterns
  @@index([sessionId, createdAt(sort: Desc)])  // Session timeline
  @@index([userId, status, createdAt(sort: Desc)])  // User dashboard
  @@index([status, createdAt])  // Queue processing
}

model Output {
  @@index([generationId, createdAt(sort: Desc)])  // Generation outputs
  @@index([userId, createdAt(sort: Desc)])  // User gallery
}

model Project {
  @@index([ownerId, updatedAt(sort: Desc)])  // Recent projects
  @@index([ownerId, createdAt(sort: Desc)])  // Project list
}
```

**Expected Improvement**:
- Complex query performance: 20-40% faster
- Dashboard load: 200ms → 120ms

---

### 12. Implement Service Worker for Offline/Caching
**Current State**: ❌ No service worker
**Impact**: 🟡 Medium - Better offline experience, faster repeat visits
**Effort**: 🟡 Medium (2-3 days)

**Solution** (Next.js PWA):
```bash
npm install next-pwa
```

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
  // ... existing config
})
```

**Cache Strategies**:
- **Static assets**: Cache-first
- **API calls**: Network-first with cache fallback
- **Images**: Cache-first with expiration

**Expected Improvement**:
- Repeat visit load time: 50-70% faster
- Works offline (view cached generations)
- App-like experience

---

### 13. Batch API Endpoints
**Current State**: ⚠️ Multiple round trips for related data
**Impact**: 🟡 Medium - Reduces waterfall requests
**Effort**: 🟡 Medium (1 day)

**Problem**: Frontend makes 3-4 sequential requests to load a page.

**Solution**:
```typescript
// app/api/batch/route.ts
export async function POST(request: Request) {
  const { queries } = await request.json()

  // queries = [
  //   { key: 'projects', endpoint: '/api/projects' },
  //   { key: 'sessions', endpoint: '/api/sessions' },
  //   { key: 'profile', endpoint: '/api/profile' }
  // ]

  const results = await Promise.all(
    queries.map(q => fetch(q.endpoint).then(r => r.json()))
  )

  return NextResponse.json(
    Object.fromEntries(queries.map((q, i) => [q.key, results[i]]))
  )
}

// Frontend usage
const { data } = useQuery({
  queryKey: ['batch', 'dashboard'],
  queryFn: async () => {
    const res = await fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        queries: [
          { key: 'projects', endpoint: '/api/projects' },
          { key: 'sessions', endpoint: '/api/sessions' },
          { key: 'profile', endpoint: '/api/profile' }
        ]
      })
    })
    return res.json()
  }
})
```

**Expected Improvement**:
- Page load: 3-4 round trips → 1 round trip
- Reduced latency: 600ms → 200ms

---

### 14. Optimize Realtime Subscriptions
**Current State**: ✅ Implemented, can be more selective
**Impact**: 🟢 Low-Medium - Reduced WebSocket overhead
**Effort**: 🟢 Low (1-2 hours)

**Optimization**:
```typescript
// hooks/useGenerationsRealtime.ts
export function useGenerationsRealtime(filters?: { sessionId?: string }) {
  useEffect(() => {
    // Only subscribe to user's own generations
    const channel = supabase
      .channel(`generations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: `userId=eq.${userId}${filters?.sessionId ? ` AND sessionId=eq.${filters.sessionId}` : ''}`
        },
        handleChange
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId, filters])
}
```

**Expected Improvement**:
- Reduced broadcast noise
- Lower server load on Supabase Realtime

---

## 🟢 Lower Priority / Future Optimizations

### 15. Database Read Replicas
**Impact**: 🟡 Medium at scale
**Effort**: 🔴 High
**When**: > 1000 concurrent users

Supabase supports read replicas for horizontal scaling.

---

### 16. Edge Functions for Global Performance
**Impact**: 🟡 Medium
**Effort**: 🟡 Medium
**When**: Global user base

Deploy API routes as Vercel Edge Functions for sub-100ms latency globally.

---

### 17. GraphQL API for Flexible Queries
**Impact**: 🟢 Low
**Effort**: 🔴 High
**When**: Complex client needs

Replace REST with GraphQL to reduce over-fetching.

---

### 18. Video Streaming Optimization
**Impact**: 🟡 Medium (when video usage grows)
**Effort**: 🟡 Medium

- HLS/DASH streaming instead of full file download
- Adaptive bitrate streaming
- Video thumbnails/previews

---

## Implementation Priority Matrix

| Priority | Optimization | Impact | Effort | ROI | ETA |
|----------|-------------|--------|--------|-----|-----|
| 🥇 **P0** | HTTP Cache-Control headers | High | Low | ⭐⭐⭐⭐⭐ | 2-4h |
| 🥇 **P0** | Image Thumbnails | High | Medium | ⭐⭐⭐⭐⭐ | 1-2d |
| 🥇 **P0** | API Response Compression | High | Low | ⭐⭐⭐⭐⭐ | 1-2h |
| 🥈 **P1** | Database Query Caching | High | Medium | ⭐⭐⭐⭐ | 4-6h |
| 🥈 **P1** | Optimize React Query Stale Times | Medium | Low | ⭐⭐⭐⭐ | 1h |
| 🥈 **P1** | Infinite Scroll (Frontend) | High | Medium | ⭐⭐⭐⭐ | 1d |
| 🥉 **P2** | Redis Cache Layer | High | Medium | ⭐⭐⭐ | 1-2d |
| 🥉 **P2** | Link Prefetching | Medium | Low | ⭐⭐⭐ | 2-3h |
| 🥉 **P2** | Storage Pipeline Optimization | Medium | Medium | ⭐⭐⭐ | 1d |
| 🥉 **P2** | Static Generation | Medium | Medium | ⭐⭐⭐ | 1d |

---

## Expected Cumulative Impact

### If P0 Implemented (1 week):
- API response times: **50-70% faster**
- Bandwidth usage: **80-90% reduction**
- Gallery load times: **90% faster**
- Server costs: **30-40% lower**

### If P0 + P1 Implemented (2 weeks):
- Database load: **60-70% reduction**
- Page navigation: **Feels instant**
- API calls: **50-60% reduction**
- Initial page load: **70% faster**

### If P0 + P1 + P2 Implemented (1 month):
- Can handle **5-10x more traffic**
- **Sub-100ms** API responses for cached queries
- **Near-zero** perceived latency
- **Production-ready at scale**

---

## Cost-Benefit Analysis

### Current Monthly Costs (estimated for 1000 active users):
- Vercel Functions: $50-100
- Supabase Storage: $20-30
- Database: $25 (included in Supabase Pro)
- **Total: ~$95-155/month**

### After Optimizations (same 1000 users):
- Vercel Functions: $20-40 (60% fewer invocations)
- Supabase Storage: $15-20 (better caching, thumbnails)
- Database: $25
- Redis: $10 (Upstash)
- **Total: ~$70-95/month**

**Savings**: $25-60/month (20-40%) + handles 5-10x traffic

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize** based on current bottlenecks (use metrics.ts logs)
3. **Start with P0 items** (quick wins, high impact)
4. **Measure impact** after each implementation
5. **Iterate** to P1 and P2 as needed

Would you like me to implement any of these optimizations?
