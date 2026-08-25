-- Phase 37: hợp nhất Workspace/Collection/Lesson thành bảng folders thống nhất
-- (kiểu Google Drive: thư mục lồng sâu tùy ý, tệp có thể nằm ở gốc).
-- Giữ nguyên UUID của workspaces/collections/lessons khi chuyển đổi để
-- liên kết cũ (redirect route /kho/...) vẫn trỏ đúng vị trí.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null,
  -- đường dẫn vật chất dạng '/<rootId>/<childId>/...' phục vụ truy vấn cây con
  path text not null default '/',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_folders_updated_at
before update on public.folders
for each row execute function public.set_updated_at();

create index if not exists folders_owner_idx on public.folders (owner_id);
create index if not exists folders_parent_idx on public.folders (parent_id);
create index if not exists folders_path_idx on public.folders (path text_pattern_ops);

alter table public.folders enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select using (owner_id = auth.uid());

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert with check (owner_id = auth.uid());

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete using (owner_id = auth.uid());

-- resources: vị trí mới theo folder (nullable = nằm ở gốc)
alter table public.resources
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

create index if not exists resources_folder_id_idx on public.resources (folder_id);

-- ---------- Chuyển dữ liệu cũ (chạy một lần, idempotent) ----------

insert into public.folders (id, owner_id, parent_id, name, path)
select w.id, w.owner_id, null::uuid, w.name, '/' || w.id || '/'
from public.workspaces w
on conflict (id) do nothing;

insert into public.folders (id, owner_id, parent_id, name, path)
select c.id, w.owner_id, c.workspace_id, c.name,
       '/' || c.workspace_id || '/' || c.id || '/'
from public.collections c
join public.workspaces w on w.id = c.workspace_id
on conflict (id) do nothing;

insert into public.folders (id, owner_id, parent_id, name, path)
select l.id, w.owner_id, l.collection_id, l.name,
       '/' || w.id || '/' || l.collection_id || '/' || l.id || '/'
from public.lessons l
join public.collections c on c.id = l.collection_id
join public.workspaces w on w.id = c.workspace_id
on conflict (id) do nothing;

update public.resources r
set folder_id = coalesce(r.lesson_id, r.workspace_id)
where r.folder_id is null
  and (r.lesson_id is not null or r.workspace_id is not null);
