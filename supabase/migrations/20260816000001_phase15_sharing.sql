-- ============================================================
-- Phase 15 — Sharing & public access
-- - Unlisted share-link access via security-definer token lookup
-- - Public library: allow anon SELECT on public/ready resources
-- ============================================================

-- ---------- Token lookup for unlisted share links ----------
-- Security definer: bypasses RLS so an anon caller (or server) can
-- resolve a resource purely from the unguessable token. Only returns
-- resources that are unlisted, ready, and not soft-deleted.
create or replace function public.get_public_resource_by_token(p_token text)
returns setof public.resources
language sql
security definer
set search_path = public
as $$
  select r.*
  from public.resources r
  join public.resource_shares rs on rs.resource_id = r.id
  where rs.token = p_token
    and rs.granted_to is null
    and (rs.expires_at is null or rs.expires_at > now())
    and r.visibility = 'unlisted'
    and r.lifecycle_state = 'ready'
    and r.deleted_at is null;
$$;

grant execute on function public.get_public_resource_by_token(text) to anon, authenticated;

-- Public library (PRD: PUBLIC is discoverable; ready + not deleted)
grant select on public.resources to anon;
grant select on public.resource_files to anon;
grant select on public.external_resources to anon;
grant select on public.resource_tags to anon;

-- Fast token lookup for share links
create index if not exists resource_shares_token_idx
  on public.resource_shares (token)
  where token is not null;

-- One grant per (resource, user); link rows (granted_to null) stay per-token
create unique index if not exists resource_shares_resource_granted_uidx
  on public.resource_shares (resource_id, granted_to)
  where granted_to is not null;