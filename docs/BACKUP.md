# Sao lưu & Khôi phục — Tbz cloud

Quy trình sao lưu dữ liệu Tbz cloud (Supabase Postgres + Supabase Storage).
Xem thêm ADR-027: production dùng Supabase Storage, không dùng R2.

## 1. Những gì cần sao lưu

| Thành phần | Vị trí | Chu kỳ đề xuất |
|---|---|---|
| Database (schema + data) | Supabase Postgres | Hàng tuần (hoặc trước mỗi deploy lớn) |
| Tệp người dùng | Storage bucket `files` (private) | Hàng tuần |
| Avatar | Storage bucket `avatars` | Hàng tháng |
| Cấu hình | `next.config.ts`, env trên Vercel/Supabase | Khi thay đổi |

## 2. Export database

Dùng connection string **direct** (không phải pooler) từ
Supabase Dashboard → Project Settings → Database:

```bash
# Cài postgresql-client >= 14 (chứa pg_dump)
pg_dump \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file=tbzcloud-$(date +%Y%m%d).dump \
  "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"
```

Lưu file `.dump` vào nơi an toàn (máy cá nhân mã hóa / Google Drive riêng).
KHÔNG commit file dump hoặc password vào repository.

## 3. Export tệp storage

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase storage download /files --destination ./backup-files
```

Hoặc tải thủ công qua Dashboard → Storage → bucket `files`.

## 4. Khôi phục

1. Tạo/trỏ tới project Supabase đích.
2. Chạy lại toàn bộ migration theo thứ tự tên file:
   ```bash
   npx supabase db push
   ```
3. Restore data:
   ```bash
   pg_restore \
     --no-owner \
     --no-privileges \
     --clean \
     --if-exists \
     --dbname "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
     tbzcloud-YYYYMMDD.dump
   ```
4. Upload lại tệp vào bucket `files` giữ nguyên đường dẫn
   (`<userId>/<resourceId>/...`) — `storage_key` trong DB phải khớp.
5. Kiểm tra smoke: đăng nhập → mở một tài liệu → xem PDF/DOCX.

## 5. Kiểm tra định kỳ

- Mỗi quý: thử khôi phục bản backup gần nhất lên môi trường tạm.
- Sau mỗi lần thêm migration: chạy backup ngay sau khi deploy thành công.
