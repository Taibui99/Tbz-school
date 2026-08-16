-- ============================================================
-- Phase 14 — Search
-- pg_trgm GIN indexes for fast ILIKE '%q%' search
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists resources_title_trgm_idx
  on public.resources using gin (title gin_trgm_ops);

create index if not exists resources_description_trgm_idx
  on public.resources using gin (description gin_trgm_ops);

create index if not exists collections_name_trgm_idx
  on public.collections using gin (name gin_trgm_ops);

create index if not exists lessons_name_trgm_idx
  on public.lessons using gin (name gin_trgm_ops);

create index if not exists resources_owner_visibility_created_idx
  on public.resources (owner_id, visibility, created_at desc);