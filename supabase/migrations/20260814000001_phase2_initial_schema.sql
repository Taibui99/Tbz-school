-- ============================================================
-- TBZ School — Phase 2: initial schema
-- Supabase PostgreSQL. All changes go through migrations.
-- ============================================================

-- ---------- helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- workspaces ----------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

-- ---------- collections ----------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_collections_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

-- ---------- lessons ----------

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

-- ---------- resources ----------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  description text,
  type text not null
    check (type in ('pdf','doc','docx','ppt','pptx','xls','xlsx','image','video','audio','text','url')),
  mime text,
  visibility text not null default 'private'
    check (visibility in ('private','unlisted','public','shared')),
  lifecycle_state text not null default 'draft'
    check (lifecycle_state in ('draft','uploading','processing','ready','failed','deleting','deleted')),
  provider text
    check (provider in ('r2','supabase_storage','external')),
  storage_key text,
  external_url text,
  size_bytes bigint,
  content_hash text,
  original_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

-- ---------- resource_files ----------

create table public.resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  provider text not null,
  storage_key text not null,
  mime text,
  size_bytes bigint,
  sha256 text,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- external_resources ----------

create table public.external_resources (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null unique references public.resources (id) on delete cascade,
  url text not null,
  provider_type text,
  title text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

-- ---------- permissions / shares ----------

create table public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  shared_by uuid not null references public.profiles (id) on delete cascade,
  granted_to uuid references public.profiles (id) on delete cascade,
  token text unique,
  permission_level text not null default 'viewer'
    check (permission_level in ('viewer','editor')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- annotations ----------

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  annotation_type text not null
    check (annotation_type in ('highlight','underline','strike','freehand','shape','text','sticky','bookmark','note')),
  page integer,
  time_position numeric,
  coordinates jsonb not null default '{}',
  visual jsonb not null default '{}',
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_annotations_updated_at
before update on public.annotations
for each row execute function public.set_updated_at();

-- ---------- favorites ----------

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

-- ---------- tags ----------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index tags_name_key on public.tags (lower(name));

create table public.resource_tags (
  resource_id uuid not null references public.resources (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, tag_id)
);

-- ---------- activity_logs ----------

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  resource_id uuid references public.resources (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- notifications ----------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- reports ----------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete set null,
  reason text not null,
  category text,
  status text not null default 'pending'
    check (status in ('pending','reviewing','resolved','rejected')),
  resolution text,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

-- ---------- storage_usage ----------

create table public.storage_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  bytes_used bigint not null default 0,
  file_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger trg_storage_usage_updated_at
before update on public.storage_usage
for each row execute function public.set_updated_at();

-- ---------- resource_versions ----------

create table public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  version integer not null,
  storage_key text,
  size_bytes bigint,
  sha256 text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (resource_id, version)
);

-- ============================================================
-- Indexes
-- ============================================================

create index workspaces_owner_id_idx on public.workspaces (owner_id);
create index collections_workspace_id_idx on public.collections (workspace_id);
create index collections_workspace_position_idx on public.collections (workspace_id, position);
create index lessons_collection_id_idx on public.lessons (collection_id);
create index lessons_collection_position_idx on public.lessons (collection_id, position);
create index resources_owner_id_idx on public.resources (owner_id);
create index resources_workspace_id_idx on public.resources (workspace_id);
create index resources_lesson_id_idx on public.resources (lesson_id);
create index resources_visibility_idx on public.resources (visibility);
create index resources_content_hash_idx on public.resources (content_hash);
create index resources_created_at_idx on public.resources (created_at desc);
create index resource_files_resource_id_idx on public.resource_files (resource_id);
create index resource_shares_resource_id_idx on public.resource_shares (resource_id);
create index resource_shares_granted_to_idx on public.resource_shares (granted_to);
create index annotations_resource_id_idx on public.annotations (resource_id);
create index annotations_user_id_idx on public.annotations (user_id);
create index favorites_user_id_idx on public.favorites (user_id);
create index resource_tags_tag_id_idx on public.resource_tags (tag_id);
create index activity_logs_user_created_idx on public.activity_logs (user_id, created_at desc);
create index notifications_user_read_idx on public.notifications (user_id, read_at);
create index reports_status_idx on public.reports (status);
create index resource_versions_resource_id_idx on public.resource_versions (resource_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.collections enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.resource_files enable row level security;
alter table public.external_resources enable row level security;
alter table public.resource_shares enable row level security;
alter table public.annotations enable row level security;
alter table public.favorites enable row level security;
alter table public.tags enable row level security;
alter table public.resource_tags enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.storage_usage enable row level security;
alter table public.resource_versions enable row level security;

-- profiles: user manages own profile
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: owner manages own workspaces
create policy "workspaces_select_own" on public.workspaces
  for select using (owner_id = auth.uid());
create policy "workspaces_insert_own" on public.workspaces
  for insert with check (owner_id = auth.uid());
create policy "workspaces_update_own" on public.workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "workspaces_delete_own" on public.workspaces
  for delete using (owner_id = auth.uid());

-- collections / lessons: nested ownership
create policy "collections_select_own" on public.collections
  for select using (exists (
    select 1 from public.workspaces w
    where w.id = collections.workspace_id and w.owner_id = auth.uid()));
create policy "collections_insert_own" on public.collections
  for insert with check (exists (
    select 1 from public.workspaces w
    where w.id = collections.workspace_id and w.owner_id = auth.uid()));
create policy "collections_update_own" on public.collections
  for update using (exists (
    select 1 from public.workspaces w
    where w.id = collections.workspace_id and w.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.workspaces w
    where w.id = collections.workspace_id and w.owner_id = auth.uid()));
create policy "collections_delete_own" on public.collections
  for delete using (exists (
    select 1 from public.workspaces w
    where w.id = collections.workspace_id and w.owner_id = auth.uid()));

create policy "lessons_select_own" on public.lessons
  for select using (exists (
    select 1 from public.collections c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = lessons.collection_id and w.owner_id = auth.uid()));
create policy "lessons_insert_own" on public.lessons
  for insert with check (exists (
    select 1 from public.collections c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = lessons.collection_id and w.owner_id = auth.uid()));
create policy "lessons_update_own" on public.lessons
  for update using (exists (
    select 1 from public.collections c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = lessons.collection_id and w.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.collections c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = lessons.collection_id and w.owner_id = auth.uid()));
create policy "lessons_delete_own" on public.lessons
  for delete using (exists (
    select 1 from public.collections c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = lessons.collection_id and w.owner_id = auth.uid()));

-- resources: owner full access
create policy "resources_select_own" on public.resources
  for select using (owner_id = auth.uid());
create policy "resources_insert_own" on public.resources
  for insert with check (owner_id = auth.uid());
create policy "resources_update_own" on public.resources
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "resources_delete_own" on public.resources
  for delete using (owner_id = auth.uid());

-- resources: public content discoverable
create policy "resources_select_public" on public.resources
  for select using (
    visibility = 'public'
    and lifecycle_state = 'ready'
    and deleted_at is null);

-- resources: shared with specific users
create policy "resources_select_shared" on public.resources
  for select using (exists (
    select 1 from public.resource_shares rs
    where rs.resource_id = resources.id
      and rs.granted_to = auth.uid()
      and (rs.expires_at is null or rs.expires_at > now())));

-- resource_files: readable when the resource is readable
create policy "resource_files_select_accessible" on public.resource_files
  for select using (exists (
    select 1 from public.resources r
    where r.id = resource_files.resource_id and (
      r.owner_id = auth.uid()
      or (r.visibility = 'public' and r.lifecycle_state = 'ready' and r.deleted_at is null)
      or exists (
        select 1 from public.resource_shares rs
        where rs.resource_id = r.id
          and rs.granted_to = auth.uid()
          and (rs.expires_at is null or rs.expires_at > now())))));
create policy "resource_files_insert_own" on public.resource_files
  for insert with check (exists (
    select 1 from public.resources r
    where r.id = resource_files.resource_id and r.owner_id = auth.uid()));
create policy "resource_files_delete_own" on public.resource_files
  for delete using (exists (
    select 1 from public.resources r
    where r.id = resource_files.resource_id and r.owner_id = auth.uid()));

-- external_resources: same rules as resource_files
create policy "external_resources_select_accessible" on public.external_resources
  for select using (exists (
    select 1 from public.resources r
    where r.id = external_resources.resource_id and (
      r.owner_id = auth.uid()
      or (r.visibility = 'public' and r.lifecycle_state = 'ready' and r.deleted_at is null)
      or exists (
        select 1 from public.resource_shares rs
        where rs.resource_id = r.id
          and rs.granted_to = auth.uid()
          and (rs.expires_at is null or rs.expires_at > now())))));
create policy "external_resources_insert_own" on public.external_resources
  for insert with check (exists (
    select 1 from public.resources r
    where r.id = external_resources.resource_id and r.owner_id = auth.uid()));
create policy "external_resources_delete_own" on public.external_resources
  for delete using (exists (
    select 1 from public.resources r
    where r.id = external_resources.resource_id and r.owner_id = auth.uid()));

-- resource_shares: owner manages; granted users see their grant
create policy "shares_select_owner" on public.resource_shares
  for select using (exists (
    select 1 from public.resources r
    where r.id = resource_shares.resource_id and r.owner_id = auth.uid()));
create policy "shares_select_granted" on public.resource_shares
  for select using (granted_to = auth.uid());
create policy "shares_insert_owner" on public.resource_shares
  for insert with check (exists (
    select 1 from public.resources r
    where r.id = resource_shares.resource_id and r.owner_id = auth.uid()));
create policy "shares_update_owner" on public.resource_shares
  for update using (exists (
    select 1 from public.resources r
    where r.id = resource_shares.resource_id and r.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.resources r
    where r.id = resource_shares.resource_id and r.owner_id = auth.uid()));
create policy "shares_delete_owner" on public.resource_shares
  for delete using (exists (
    select 1 from public.resources r
    where r.id = resource_shares.resource_id and r.owner_id = auth.uid()));

-- annotations: owner of the annotation manages it
create policy "annotations_select_own" on public.annotations
  for select using (user_id = auth.uid());
create policy "annotations_insert_own" on public.annotations
  for insert with check (user_id = auth.uid());
create policy "annotations_update_own" on public.annotations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "annotations_delete_own" on public.annotations
  for delete using (user_id = auth.uid());

-- favorites: owner manages
create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());
create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- tags: readable by everyone who can see resources
create policy "tags_select_all" on public.tags
  for select using (true);
create policy "resource_tags_select_accessible" on public.resource_tags
  for select using (exists (
    select 1 from public.resources r
    where r.id = resource_tags.resource_id and (
      r.owner_id = auth.uid()
      or (r.visibility = 'public' and r.lifecycle_state = 'ready' and r.deleted_at is null)
      or exists (
        select 1 from public.resource_shares rs
        where rs.resource_id = r.id
          and rs.granted_to = auth.uid()
          and (rs.expires_at is null or rs.expires_at > now())))));
create policy "resource_tags_insert_own" on public.resource_tags
  for insert with check (exists (
    select 1 from public.resources r
    where r.id = resource_tags.resource_id and r.owner_id = auth.uid()));
create policy "resource_tags_delete_own" on public.resource_tags
  for delete using (exists (
    select 1 from public.resources r
    where r.id = resource_tags.resource_id and r.owner_id = auth.uid()));

-- activity_logs: user reads/writes own
create policy "activity_logs_select_own" on public.activity_logs
  for select using (user_id = auth.uid());
create policy "activity_logs_insert_own" on public.activity_logs
  for insert with check (user_id = auth.uid());

-- notifications: user reads/updates own
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: reporter reads own, inserts own
create policy "reports_select_own" on public.reports
  for select using (reporter_id = auth.uid());
create policy "reports_insert_own" on public.reports
  for insert with check (reporter_id = auth.uid());

-- storage_usage: user reads own
create policy "storage_usage_select_own" on public.storage_usage
  for select using (user_id = auth.uid());
create policy "storage_usage_update_own" on public.storage_usage
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- resource_versions: owner reads own versions
create policy "resource_versions_select_own" on public.resource_versions
  for select using (exists (
    select 1 from public.resources r
    where r.id = resource_versions.resource_id and r.owner_id = auth.uid()));
create policy "resource_versions_insert_own" on public.resource_versions
  for insert with check (exists (
    select 1 from public.resources r
    where r.id = resource_versions.resource_id and r.owner_id = auth.uid()));

-- ============================================================
-- Grants
-- ============================================================

grant select, insert, update, delete on public.profiles,
  public.workspaces, public.collections, public.lessons,
  public.resources, public.resource_files, public.external_resources,
  public.resource_shares, public.annotations, public.favorites,
  public.tags, public.resource_tags, public.activity_logs,
  public.notifications, public.reports, public.storage_usage,
  public.resource_versions to authenticated;

grant select on public.profiles, public.tags to anon;

-- ============================================================
-- Seed / dev data
-- ============================================================

insert into public.tags (name) values
  ('toán'), ('văn'), ('anh'), ('lý'), ('hóa'), ('sinh')
on conflict do nothing;
