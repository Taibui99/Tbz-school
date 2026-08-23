-- Phase 19 — Deduplication
-- Tối ưu tra cứu trùng lặp theo hash trong phạm vi chủ sở hữu.
-- Bảng resources đã có resources_content_hash_idx (b-tree toàn cục) từ schema gốc;
-- index riêng phần này phục vụ đúng truy vấn dedup: WHERE owner_id = ? AND content_hash = ?.

create index if not exists resources_owner_hash_idx
  on public.resources (owner_id, content_hash)
  where content_hash is not null;
