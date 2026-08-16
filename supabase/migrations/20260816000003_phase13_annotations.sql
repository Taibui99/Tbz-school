-- Phase 13 — annotations lookup index

create index if not exists annotations_resource_user_idx
  on public.annotations (resource_id, user_id);