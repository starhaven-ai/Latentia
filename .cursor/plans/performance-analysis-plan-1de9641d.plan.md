<!-- 1de9641d-79b4-44a2-9518-c07b88acb356 8b93f87a-dbf9-416e-b5af-21f1eb47b4b4 -->
# Performance Optimization Plan

## Current Performance Issues

Based on analysis, here are the bottlenecks causing slow loads:

1. **Projects page (2s load)**: N+1 query pattern - each ProjectCard fetches sessions, then generations separately
2. **Session sidebar (few seconds)**: Loads all sessions with nested creator data
3. **Initial generation load (longer)**: Fetches 20-50 generations with full outputs at once
4. **No intelligent prefetching**: Missing hover prefetch, route prefetch, and smart caching

## Industry Best Practices (Instagram, X, Krea)

These platforms use:
- **Aggressive prefetching**: Preload data on hover, anticipate user navigation
- **Infinite scroll with virtualization**: Load only visible content
- **Optimized thumbnail delivery**: Separate thumbnail/full-size endpoints
- **CDN + edge caching**: Next.js on Vercel already provides this
- **React Query with stale-while-revalidate**: Show cached data instantly, update in background
- **Database query optimization**: Single queries with proper joins, no N+1 patterns

**Note on Supabase vs AWS**: Supabase Storage is built on S3 and uses CloudFront CDN. Performance-wise, it's equivalent to AWS. The bottleneck is NOT storage - it's how we're querying and loading data. Keep Supabase.

---

## Implementation Plan

### Phase 1: Database Query Optimization (Biggest Impact)

**Fix N+1 queries and optimize data loading**

#### 1.1 Optimize Projects Page
- Create `/api/projects/with-thumbnails` endpoint
- Single query with joins to get latest generation thumbnail for each project
- Use SQL aggregation instead of client-side loops
- Expected improvement: 2s → 300ms

#### 1.2 Optimize Session Loading
- Already fairly optimal (single query with creator join)
- Add light prefetching on hover for session generations
- Cache session list in React Query with 5-minute stale time

#### 1.3 Fix ProjectCard Thumbnail Loading
- Currently does: fetch sessions → fetch generations (N+1 pattern)
- New: Get thumbnail from optimized projects endpoint
- Fallback: Use project preview image or placeholder

---

### Phase 2: Infinite Scroll for Generations (Major UX Win)

**Implement virtual scrolling with progressive loading**

#### 2.1 Add Cursor-Based Pagination to API
- Update `/api/generations` to support cursor (use generation ID)
- Return `{ data, nextCursor, hasMore }` format
- Limit to 10 generations per page initially

#### 2.2 Implement useInfiniteQuery
- Replace `useQuery` with `useInfiniteQuery` in `hooks/useGenerations.ts`
- Add "Load More" button or intersection observer for auto-load
- Maintain existing real-time updates for new generations

#### 2.3 Optimize Image Loading
- Use Next.js Image component everywhere (already started)
- Add `priority` for first 3 images, lazy load rest
- Implement blur placeholder using `placeholder="blur"`

---

### Phase 3: Intelligent Prefetching & Caching

**Preload data before users need it**

#### 3.1 Prefetch on Hover
- Sessions: Already implemented in SessionSidebar
- Projects: Add hover prefetch to ProjectCard (sessions + first 10 generations)
- Use React Query's `prefetchQuery` with 30s stale time

#### 3.2 Route-Level Prefetching
- Add `<Link prefetch>` for project navigation
- Preload critical data in Link hover

#### 3.3 Optimize React Query Cache Settings
- Projects: `staleTime: 5 * 60 * 1000` (5 min) - rarely changes
- Sessions: `staleTime: 3 * 60 * 1000` (3 min)
- Generations: Keep current aggressive refetch for active sessions
- Use `gcTime: 30 * 60 * 1000` (30 min) to keep in memory

---

### Phase 4: Thumbnail Strategy (Like Instagram)

**Separate thumbnail/full-size loading**

#### 4.1 Generate Thumbnails on Upload
- Modify storage upload to create 400px thumbnail
- Store both URLs: `thumbnail_url` and `file_url` in outputs table
- Use Next.js Image with `sizes` prop for responsive loading

#### 4.2 Progressive Image Loading
- Gallery: Load thumbnails first (fast)
- Lightbox: Load full resolution on open
- Use Next.js automatic WebP/AVIF conversion

---

### Phase 5: Background Job Optimization

**Already implemented but ensure it's working optimally**

#### 5.1 Verify Async Generation Pattern
- Confirm background processor is working
- Check that generations show as "processing" immediately
- Verify real-time updates are triggering

#### 5.2 Add Generation Queuing (Optional)
- If multiple generations slow down, add proper queue
- Vercel Queue or simple database-based queue
- Rate limiting per user

---

## Implementation Order (Safest Refactor Path)

### Week 1: Low-Risk, High-Impact Fixes
1. **Optimize projects endpoint** (new endpoint, no breaking changes)
2. **Add React Query cache optimization** (just config changes)
3. **Add prefetch on hover** (progressive enhancement)
4. **Test thoroughly** - no existing functionality breaks

### Week 2: Infinite Scroll (Moderate Risk)
1. **Add pagination to generations API** (backward compatible)
2. **Create new useInfiniteGenerations hook** (keep old one)
3. **Update GenerationInterface to use new hook**
4. **Test with 200+ generations** 
5. **Monitor for issues**, rollback if needed

### Week 3: Thumbnail Strategy (Lower Priority)
1. **Add thumbnail generation** (new feature)
2. **Migrate existing images** (background task)
3. **Update components to use thumbnails**

---

## Expected Performance Improvements

| Metric | Current | After Phase 1 | After Phase 2 | Target |
|--------|---------|---------------|---------------|--------|
| Projects page load | 2s | 300ms | 300ms | 200-500ms |
| Session switch | 1-2s | 500ms | 200ms | 200-400ms |
| Initial 50 generations | 5-10s | 2-3s | 1s (loads 10) | <1s |
| Scroll to 200+ generations | N/A | N/A | Progressive | Smooth |
| Perceived performance | Slow | Fast | Very Fast | Instagram-level |

---

## Risk Mitigation

1. **Create new endpoints alongside old ones** - No breaking changes
2. **Feature flags for infinite scroll** - Easy rollback
3. **Extensive testing at each phase** - Don't compound issues
4. **Database query testing with realistic data** - Test with 200+ generations
5. **Monitor Vercel analytics** - Watch for regressions

---

## Testing Checklist Per Phase

### Phase 1 Tests
- [ ] Projects page loads in <500ms
- [ ] All project thumbnails display correctly
- [ ] No N+1 queries in logs
- [ ] React Query cache persists between navigations

### Phase 2 Tests
- [ ] Infinite scroll loads smoothly
- [ ] Real-time updates still work during scroll
- [ ] Can load 200+ generations without performance issues
- [ ] "Load more" works correctly

### Phase 3 Tests
- [ ] Hover prefetch reduces perceived load time
- [ ] Cache hit rate >80% for repeat navigations
- [ ] Memory usage stays reasonable

---

## Files to Modify

### Phase 1
- `app/api/projects/with-thumbnails/route.ts` (new)
- `app/projects/page.tsx` (update to use new endpoint)
- `components/projects/ProjectCard.tsx` (remove thumbnail fetch)
- `hooks/useGenerations.ts` (add better cache config)

### Phase 2
- `app/api/generations/route.ts` (add cursor pagination)
- `hooks/useInfiniteGenerations.ts` (new)
- `components/generation/GenerationInterface.tsx` (use new hook)
- `components/generation/GenerationGallery.tsx` (add infinite scroll UI)

### Phase 3
- `components/projects/ProjectCard.tsx` (add hover prefetch)
- `components/sessions/SessionSidebar.tsx` (already has prefetch, verify)
- `hooks/useProjects.ts` (new, centralize project queries)

---

## Key Principles

1. **Backward compatibility first** - Never break existing functionality
2. **Measure before optimizing** - Add timing logs to verify improvements
3. **Progressive enhancement** - New features degrade gracefully
4. **Keep it simple** - Don't over-engineer, follow Next.js/React Query patterns
5. **Test with realistic data** - Use 50-200 generations per session

### To-dos

- [ ] Create optimized /api/projects/with-thumbnails endpoint with single query + joins
- [ ] Update projects page to use new optimized endpoint
- [ ] Add aggressive React Query cache settings (5min staleTime for projects, 3min for sessions)
- [ ] Test Phase 1 - verify <500ms project loads and no N+1 queries
- [ ] Add cursor-based pagination to /api/generations route
- [ ] Create hooks/useInfiniteGenerations.ts with useInfiniteQuery
- [ ] Update GenerationInterface and GenerationGallery for infinite scroll UI
- [ ] Test Phase 2 - verify smooth infinite scroll with 200+ generations
- [ ] Add hover prefetch to ProjectCard for sessions and generations
- [ ] Test Phase 3 - verify prefetch works and cache hit rate >80%