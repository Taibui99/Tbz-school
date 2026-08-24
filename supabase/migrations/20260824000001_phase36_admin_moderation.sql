-- ============================================================
-- Phase 36 — Admin & moderation + security hardening
-- - resources.hidden_at: admin ẩn tài liệu vi phạm (không xóa dữ liệu)
-- - profiles.suspended_at: khóa tài khoản
-- - audit_log: nhật ký hành động quản trị
-- - Trigger DB chặn ghi của tài khoản bị khóa (bất kể app path)
-- - RPC chia sẻ liên kết loại tài liệu đang bị ẩn
-- ============================================================

-- ---------- Cột mới ----------
alter table public.resources
  add column if not exists hidden_at timestamptz;

alter table public.profiles
  add column if not exists suspended_at timestamptz;

-- ---------- audit_log ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- Không tạo policy nào: chỉ service role (admin backend) đọc/ghi.

-- ---------- Chặn ghi từ tài khoản bị khóa ----------
-- Service role không có auth.uid() nên vẫn ghi được (hành động admin).
create or replace function public.enforce_not_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suspended timestamptz;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  select p.suspended_at into v_suspended
  from public.profiles p
  where p.id = auth.uid();

  if v_suspended is not null then
    raise exception 'Tài khoản đã bị khóa'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_no_write_when_suspended on public.workspaces;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.workspaces
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.collections;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.collections
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.lessons;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.lessons
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.resources;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.resources
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.resource_files;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.resource_files
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.annotations;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.annotations
for each row execute function public.enforce_not_suspended();

drop trigger if exists trg_no_write_when_suspended on public.resource_shares;
create trigger trg_no_write_when_suspended
before insert or update or delete on public.resource_shares
for each row execute function public.enforce_not_suspended();

-- ---------- RPC chia sẻ liên kết: bỏ tài liệu bị ẩn ----------
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
    and r.deleted_at is null
    and r.hidden_at is null;
$$;
