-- TBZ School — Phase 3: avatars storage bucket
-- Bucket public (ảnh đại diện hiển thị công khai theo thiết kế),
-- upload/update/delete giới hạn trong thư mục của chính user.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select_public"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own_folder"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own_folder"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);