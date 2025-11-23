create extension if not exists "pgcrypto";

-- Generation queue jobs table
create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references generations(id) on delete cascade,
  run_after timestamptz null,
  attempts integer not null default 0,
  locked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_generation_jobs_locked on generation_jobs(locked_at);
create index if not exists idx_generation_jobs_run_after on generation_jobs(run_after);

