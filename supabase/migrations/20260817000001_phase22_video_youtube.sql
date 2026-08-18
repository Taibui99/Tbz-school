-- Phase 22: Video qua YouTube (phần 1)
-- Cho phép resource loại video lưu youtube_id thay vì file mp4
-- (video được phát qua YouTube embed, không tốn storage của app).

alter table public.resources
  add column youtube_id text;

create index resources_youtube_id_idx on public.resources (youtube_id);

alter table public.resources
  add constraint resources_youtube_id_check
  check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$');

comment on column public.resources.youtube_id is
  'ID video YouTube (11 ký tự). Nếu có, viewer hiển thị YouTube embed thay vì file storage.';
