-- Phase 32: Đăng nhập bằng Google + họ tên tự động
-- Khi user đăng ký qua Google OAuth, raw_user_meta_data chứa full_name.
-- Cập nhật trigger để điền full_name vào profiles (email đã có sẵn).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;