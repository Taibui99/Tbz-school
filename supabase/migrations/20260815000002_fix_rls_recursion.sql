-- TBZ School — Fix RLS infinite recursion between resources <-> resource_shares
--
-- Chuỗi vòng: resources_select_shared (subquery resource_shares)
--   -> shares_select_owner (subquery resources) -> recursion.
-- Giải pháp: helper security definer bypass RLS để kiểm tra ownership,
-- cắt vòng tham chiếu 2 chiều.

create or replace function public.is_resource_owner(resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.resources r
    where r.id = resource_id and r.owner_id = auth.uid())
$$;

drop policy "shares_select_owner" on public.resource_shares;
drop policy "shares_insert_owner" on public.resource_shares;
drop policy "shares_update_owner" on public.resource_shares;
drop policy "shares_delete_owner" on public.resource_shares;

create policy "shares_select_owner" on public.resource_shares
  for select using (public.is_resource_owner(resource_shares.resource_id));
create policy "shares_insert_owner" on public.resource_shares
  for insert with check (public.is_resource_owner(resource_shares.resource_id));
create policy "shares_update_owner" on public.resource_shares
  for update using (public.is_resource_owner(resource_shares.resource_id))
  with check (public.is_resource_owner(resource_shares.resource_id));
create policy "shares_delete_owner" on public.resource_shares
  for delete using (public.is_resource_owner(resource_shares.resource_id));