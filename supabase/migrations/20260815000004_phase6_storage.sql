-- Phase 6: Storage abstraction — bucket riêng cho file tài liệu (private).
-- Objects chỉ truy cập qua short-lived signed URLs (ADR-010); service role bypasses RLS,
-- anon/authenticated không truy cập trực tiếp (không có policy public nào được tạo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, null, null)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[])
on conflict (id) do nothing;