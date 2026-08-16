-- Phase 18 — trash/versioning indexes

create index if not exists resources_owner_deleted_at_idx
  on public.resources (owner_id, deleted_at)
  where deleted_at is not null;

create index if not exists resources_storage_key_idx
  on public.resources (storage_key)
  where storage_key is not null;

create index if not exists resource_files_storage_key_idx
  on public.resource_files (storage_key);