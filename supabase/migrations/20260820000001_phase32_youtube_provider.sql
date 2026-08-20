-- Phase 32: cho phép resources.provider = 'youtube'
-- Video đăng thẳng lên YouTube (ADR-023): createYoutubeUploadSession set provider='youtube',
-- nhưng check constraint cũ chỉ cho ('r2','supabase_storage','external').
alter table public.resources
  drop constraint resources_provider_check;

alter table public.resources
  add constraint resources_provider_check
  check (provider in ('r2', 'supabase_storage', 'external', 'youtube'));