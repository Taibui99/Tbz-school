-- Phase 32 (phần 2): Upload video tự động lên YouTube
-- Lưu refresh token OAuth Google (một tài khoản duy nhất — account quản lý kênh).
-- Chỉ server đọc qua service role; RLS bật và không có policy nào
-- => anon/authenticated không thể truy cập.

create table if not exists public.google_oauth (
  id smallint primary key default 1 check (id = 1),
  email text,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth enable row level security;

comment on table public.google_oauth is
  'Kết nối Google OAuth (YouTube Data API) — chỉ server dùng qua service role.';
