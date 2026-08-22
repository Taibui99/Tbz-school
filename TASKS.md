# TBZ School — Master Task List

Status values:
- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked
- `[?]` needs decision

Do not mark a task complete until its acceptance criteria pass.

---

## PHASE 0 — Product and repository preparation
- [ ] Confirm basic branding (tên "TBZ School" + giao diện tiếng Việt tạm dùng, chờ xác nhận)
- [x] Add README
- [x] Add project docs
- [x] Define development/staging/production conventions (AGENTS.md, .env.example, env validation)

Acceptance: a new developer/agent can understand product, architecture, decisions, and tasks without chat history.

## PHASE 1 — Application foundation
- [x] Initialize Next.js app (Next.js 16.3.1, App Router, Turbopack)
- [x] Configure TypeScript strict mode
- [x] Configure Tailwind
- [x] Configure shadcn/ui (Base UI, preset Nova)
- [x] Configure linting/formatting (eslint-config-next)
- [x] Create app shell (layout + header/footer + landing page)
- [x] Create error/not-found/loading states
- [x] Create health check (`/api/health`)
- [x] Create `app`, `components`, `features`, `services`, `lib`, `types`, `hooks`, `tests` structure
- [x] Add environment validation (`lib/env.ts` + `.env.example`)
- [x] Add basic tests (vitest: env + cn, 9 tests pass)
- [x] Run typecheck/lint/build (đều pass)

## PHASE 2 — Supabase and database
- [x] Configure Supabase clients (`lib/supabase/client.ts` + `lib/supabase/server.ts`, @supabase/ssr)
- [x] Create migrations (`supabase/migrations/20260814000001_phase2_initial_schema.sql`, đã push lên production DB)
- [x] Create profiles
- [x] Create workspaces
- [x] Create collections
- [x] Create lessons
- [x] Create resources
- [x] Create resource_files
- [x] Create external_resources
- [x] Create permissions/shares (resource_shares)
- [x] Create annotations
- [x] Create favorites
- [x] Create tags/resource_tags
- [x] Create activity_logs
- [x] Create notifications
- [x] Create reports
- [x] Create storage_usage
- [x] Create resource_versions
- [x] Add indexes
- [x] Add RLS
- [x] Add seed/dev data (6 tag mẫu)

Acceptance: migrations apply cleanly and RLS prevents cross-user access. (Đã verify qua REST API: tags trả 6 bản ghi, workspaces/profiles ẩn danh trả `[]`)

## PHASE 3 — Authentication/profile
- [x] Register
- [x] Login
- [x] Logout
- [x] Session persistence
- [x] Password reset
- [x] Profile page
- [x] Avatar support
- [x] Account settings
- [x] Protected routes

Acceptance: đăng ký/đăng nhập/đăng xuất hoạt động với Supabase Auth (email xác nhận), session duy trì qua `proxy.ts`, routes bảo vệ redirect về `/dang-nhap`, đặt lại mật khẩu qua email + `/auth/confirm`, trang `/ho-so` cập nhật họ tên + ảnh đại diện (bucket `avatars` public-read, upload giới hạn thư mục user, migration `20260815000001_phase3_avatars_bucket.sql` đã push). Account settings (đổi email/mật khẩu ngay tại trang hồ sơ, xóa tài khoản) chuyển sang Phase 3.5.

## PHASE 4 — Workspace and organization
- [x] Workspace creation/settings
- [x] Collection CRUD
- [x] Lesson CRUD
- [x] Reorder collections/lessons
- [x] Move resources
- [x] Breadcrumbs
- [x] Sidebar navigation
- [x] Empty/loading states

Acceptance: tạo/sửa/xóa workspace, collection, lesson qua server actions + RLS; sắp xếp lên/xuống; di chuyển resource giữa các bài học cùng workspace; sidebar tree + breadcrumbs; empty states; `/kho` bảo vệ bởi proxy (redirect khi chưa đăng nhập, 404 thật cho workspace không tồn tại/không thuộc user). Fix bug RLS: infinite recursion giữa `resources` ↔ `resource_shares` (migration `20260815000002_fix_rls_recursion.sql`, dùng hàm `security definer is_resource_owner`). Data test trên production: workspace "Kho Toán 11" (tbztest@gmail.com) với 2 collection, 2 lesson, 1 resource.

## PHASE 5 — Resource core
- [x] Resource CRUD
- [x] Resource type/lifecycle model
- [x] File metadata
- [x] External resource model
- [x] Tags
- [x] Favorites
- [x] Recently opened model
- [x] Resource details
- [x] Download rules

Acceptance: tạo (metadata-only + external URL), sửa, xóa mềm/khôi phục resource trên lesson page; resource details page hiển thị type/lifecycle/file metadata/external URL/download rules; tags (12 thẻ, picker toggle), favorites (star trên row + details), recently opened (activity_logs action=open, section "Đã mở gần đây" trên workspace page), download rules module `lib/resource/download.ts` (external luôn chặn, file chỉ khi ready + có storage). Migration `20260815000003_phase5_resource_core.sql` (index activity_logs). Fix 2 bug Next/Supabase phát hiện khi verify: (1) form action dùng `asVoidAction` trong SERVER component gây lỗi flight "Functions cannot be passed to Client Components" → chuyển move/restore thành client components; (2) supabase-js v2 join to-one trả object (types nói array) → dùng `Array.isArray` guard. Tests: 54 (thêm resource-validate 19, resource-download 6).

## PHASE 6 — Storage abstraction
- [x] Define `StorageProvider`
- [x] Implement R2 provider
- [x] Implement Supabase Storage provider
- [x] Implement external reference provider
- [x] Add provider selection
- [x] Signed read URLs
- [x] Object metadata
- [x] Delete/exists operations
- [x] Error mapping

Acceptance: `lib/storage/*` — interface `StorageProvider` (uploadObject, getSignedReadUrl, getSignedUploadUrl, getObjectMetadata, objectExists, deleteObject); `R2StorageProvider` (AWS SDK, presigned GET/PUT, Head/Delete, chỉ khởi tạo khi đủ R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET/BUCKET — chưa cấu hình → StorageError provider-error); `SupabaseStorageProvider` (bucket `files` private, service role qua `lib/supabase/admin.ts`, createSignedUrl/createSignedUploadUrl/info/remove); `ExternalStorageProvider` (URL trực tiếp, không upload/delete). Factory `getStorageProvider` + `createExternalStorageProvider(url)`. Error mapping: R2 (S3 error codes + HTTP status) và Supabase Storage (statusCode number/string, code NoSuchKey, message heuristic) → StorageError codes (not-found/forbidden/invalid-key/already-exists/quota-exceeded/provider-error). R2_* tách thành env OPTIONAL (bắt buộc chỉ khi dùng R2). Migration `20260815000004_phase6_storage.sql` (bucket `files` private + `avatars`). Verified: unit 84 tests (storage 21+) + live smoke trên Supabase Storage thật (upload→signed→read→metadata→exists→delete, missing→not-found). Đã gỡ lock treo `storage.buckets` (idle-in-transaction giữ RowExclusiveLock từ lần `db push` bị connection error — terminate backend để giải phóng).

## PHASE 7 — Upload engine
- [x] Upload session endpoint/action
- [x] Auth and validation
- [x] Quota checks
- [x] Direct storage upload
- [x] Multipart/resumable upload where needed

Acceptance: flow tải tệp trực tiếp từ trình duyệt (ADR-009) trên resource details page: `createUploadSessionAction` (auth + chủ sở hữu + validate file + hạn mức 1 GB + `getSignedUploadUrl` 15 phút + set lifecycle `uploading`) → client PUT thẳng lên storage (Supabase Storage / R2 qua `getActiveStorageProvider`) → tính SHA-256 trong trình duyệt → `finalizeUploadAction` (verify object tồn tại + kích thước khớp, version++ trên `resource_files`, set `ready` + metadata) → `cancelUploadAction` (reset `draft` + dọn object). Giới hạn: 50 MB/tệp, 1 GB/user (ADR-018, `lib/upload/validate.ts`). Multipart/resumable không cần ở giới hạn hiện tại — để dành khi nâng >50 MB. Tests: +17 upload-validate (98 unit), live smoke 4/4 (signed PUT → object → metadata → finalize ready → cleanup). UI: nút "Tải tệp lên" trên detail page cho resource draft/failed.
- [x] Progress UI
- [x] Cancel/retry
- [x] Complete/verify upload
- [x] Failed upload handling
- [x] Abandoned upload cleanup

Acceptance (phase 7.2 — UX/UI): supported files upload without unnecessarily passing large bytes through the application server. `UploadFileButton` (client) với trạng thái idle → creating → uploading (thanh tiến trình % qua XHR `upload.onprogress`) → verifying (SHA-256 + finalize) → done | error; nút "Hủy tải lên" (abort XHR + `cancelUploadAction`), "Thử lại" (giữ file, chạy lại flow) và "Bỏ qua" khi lỗi; hint "Tối đa 50 MB mỗi tệp". Abandoned cleanup: `cleanupStaleUploadAction` + `StaleUploadCleaner` (client) — resource ở `uploading` quá 20 phút (`isUploadSessionStale`, `lib/upload/validate.ts`) tự reset về `draft` + xóa object best-effort khi mở detail page. Tests: +4 staleness (102 unit). Live verify: SSR idle state hiển thị nút + hint + "Chờ tải lên".

## PHASE 8 — File management
- [x] Rename
- [x] Delete
- [x] Move
- [x] Copy/reference
- [x] Bulk select/delete/move
- [x] Sort/filter
- [x] Resource details

Acceptance: `ResourceList` (client) trên lesson page — tìm theo tên/loại/tag, lọc theo type + visibility, sắp xếp (created/updated/title/type) + đảo chiều, chọn hàng loạt → xóa/di chuyển (server actions `bulkDeleteResourceAction`/`bulkMoveResourceAction` soft-delete/verify ownership + cùng workspace), di chuyển/sao chép từng tài liệu (`copyResourceAction` — url/external giữ ready, file → draft, redirect sang bản copy), edit dialog (đổi tên/loại/tags, Phase 5), section "Đã xóa" + khôi phục. Server actions đều xác thực owner qua `lib/resource/access.ts`, revalidate path.

## PHASE 9 — Viewer framework
- [x] Generic ResourceViewer
- [x] Type dispatcher
- [x] Viewer loading/error states
- [x] Permission gate
- [x] Download fallback
- [x] Fullscreen where appropriate

Acceptance: `lib/resource/view.ts` — `viewerKindFor(resource)` (pdf/video/image/audio/text/url/office/unsupported theo type + storage) và `resolveViewer(resource)` trả signed URL (3600s) qua `getStorageProvider().getSignedReadUrl`; `components/viewer/resource-viewer.tsx` là client dispatcher lazy-load từng viewer (`PdfViewer`, `VideoViewer`, `TextViewer`) chỉ khi cần, url → ExternalLink, office/unsupported → fallback "chưa xem được trực tiếp" + nút tải. Permission gate ở server (detail page chỉ resolve khi user có quyền — RLS + `getResourceDetails`); download button chỉ hiện khi `evaluateDownload.allowed`.

## PHASE 10 — PDF viewer
- [x] Render
- [x] Pagination
- [x] Zoom/fit
- [x] Search
- [x] Fullscreen
- [x] Last-page persistence
- [x] Permission-aware download

Acceptance: `components/viewer/pdf-viewer.tsx` — pdf.js v6 (`new URL(...pdf.worker.min.mjs, import.meta.url)` để Turbopack bundle worker; API mới: `render({canvas})`, không có `isEvalSupported`/`doc.destroy`), danh sách trang ảo hóa (absolute positioning + ResizeObserver + rAF scroll, chỉ render trang trong viewport ±1, cache canvas + hủy render đang dở khi zoom), zoom 0.5–4 + vừa bề rộng, điều hướng/nhập số trang, tìm kiếm (`getTextContent` lazy) với prev/next match highlight, fullscreen API, ghi nhớ trang cuối (`tbz:pdf:{resourceId}`), nút tải gated theo quyền. Worker là blob/URL asset do Turbopack copy — không dùng CDN bên ngoài.

## PHASE 11 — Video viewer
- [x] Playback controls
- [x] Seek/volume/speed/fullscreen
- [x] Keyboard controls
- [x] Resume timestamp
- [ ] Timestamp bookmarks
- [ ] Timestamp notes
- [ ] Caption support where available

Acceptance: `components/viewer/video-viewer.tsx` — `<video controls>` native (seek/volume/fullscreen/keyboard có sẵn), tốc độ phát 0.5/1/1.25/1.5/2×, resume từ vị trí đã lưu `tbz:video:{resourceId}` (lưu khi >5s và < duration-30s), nút tải gated theo quyền. Bookmark/notes/caption để dành cùng Phase 13/26.

## PHASE 12 — Office viewers
- [x] DOC/DOCX preview strategy
- [x] PPT/PPTX preview strategy
- [x] XLS/XLSX preview strategy
- [x] Processing status
- [x] Download fallback
- [ ] Presentation mode
- [ ] Slide navigation

Acceptance (quyết định thực tế): file office là private signed URL nên KHÔNG dùng Google/Microsoft Docs viewer (sẽ phải phơi file công khai — vi phạm rule privacy, xem DECISIONS). Strategy: kind `office` → honest fallback panel trong `resource-viewer.tsx` (giải thích + nút tải về) cho đến khi có pipeline server chuyển đổi/OCR. Processing status n/a (không có server processing). Presentation mode/slide navigation để dành.

## PHASE 13 — Annotation engine
- [x] Annotation schema (bảng `annotations` đã có từ Phase 2; migration `20260816000003_phase13_annotations.sql` thêm index `(resource_id, user_id)`)
- [x] Permission rules (RLS select/insert/update/delete theo `user_id` = riêng tư theo user)
- [x] Text annotation
- [x] Sticky notes
- [x] Bookmarks
- [x] Video timestamp notes (nút thêm tại thời điểm hiện tại qua `onTimeChange`)
- [x] CRUD persistence (server actions create/update/delete + load)
- [x] Annotation loading (panel `AnnotationSection` dưới viewer, PDF gắn với trang hiện tại qua `onPageChange`)
- [ ] PDF highlight
- [ ] Underline/strike-through
- [ ] Freehand drawing
- [ ] Shapes
- [ ] Backup/export strategy

Acceptance: annotations persist and never modify original file bytes. Ghi chú gắn vị trí (trang PDF / giây video) hoặc cấp tài liệu; mỗi user chỉ thấy ghi chú của mình. Highlight/underline/strike/freehand/shapes và export để dành (cần text-layer + overlay render trên canvas PDF).

## PHASE 14 — Search
- [x] PostgreSQL search indexes
- [x] Search collections/lessons/resources
- [x] Search tags
- [ ] Search annotations/notes where practical
- [x] Filters
- [x] Sorting
- [x] Pagination

Acceptance: migration `20260816000002_phase14_search.sql` (pg_trgm + GIN index trên title/description resources + name collections/lessons + index owner/visibility/created). `/tim-kiem` (trong NAV_LINKS, anon tìm được tài liệu public qua RLS): lọc type/tag/scope (Toàn bộ/Của tôi/Công khai), sort (mới nhất/cập nhật/tên), phân trang (10/trang); tìm collections/lessons của user + thẻ phù hợp hiện chip filter. Annotation search để dành khi có Phase 13.

## PHASE 15 — Sharing and permissions
- [x] Private
- [x] Unlisted
- [x] Public
- [x] Shared users
- [x] Share link generation
- [x] Revoke share
- [x] Server-side permission checks
- [x] Public preview
- [x] Permission-aware downloads
- [x] Private metadata isolation

Acceptance: migration `20260816000001_phase15_sharing.sql` — security-definer `get_public_resource_by_token` (liên kết unlisted chỉ trả tài liệu unlisted/ready/không xóa), unique index (resource_id, granted_to), grant anon SELECT trên resources/resource_files/external_resources/resource_tags. `lib/resource/share-actions.ts`: `ensureShareLinkAction` (tạo token + tự set visibility=unlisted), `revokeShareLinkAction`, `grantShareAction` (tra email → uid bằng admin client, upsert viewer/editor, set visibility=shared), `revokeGrantAction`, `savePublicResourceAction`. `SharePanel` trên detail page (copy link, thu hồi, thêm/thu hồi người được chia sẻ). Trang công khai: `/x/[token]` (unlisted, anon), `/thu-vien/[id]` (public), dùng chung `PublicResourceBody` — viewer + nút tải gated theo `evaluateDownload` + ghi chú chủ sở hữu (attribution qua admin, không lộ email). Private metadata isolation: anon chỉ thấy bản ghi public-ready; private/anonymous ko truy cập được (verified smoke: private resource trả trang 404 UI). Known: page-level `notFound()` trả HTTP 200 (UI 404 đúng) — hành vi có sẵn của Next 16 trong app, không phải regression; proxy-trả 404 vẫn đúng status.

## PHASE 16 — Public library
- [x] Explore page
- [x] Public cards
- [x] Public search
- [x] Filters by subject/type/tag
- [x] Public resource pages
- [x] Attribution
- [x] Favorite/save/reference
- [x] Report resource

Acceptance: `/kham-pha` (khám phá) — lọc theo từ khóa (title/description), type, tag; phân trang (12/trang, count exact); card có TypeIcon, chủ sở hữu, ngày tạo, tags → `/thu-vien/[id]`. `/thu-vien/[id]` — preview viewer + download + yêu thích (đã đăng nhập) + "Lưu vào kho của tôi" (`savePublicResourceAction`: copy reference không nhân bản bytes, xem ADR-021) + báo cáo (`reportResourceAction`, `ReportForm`). NAV_LINKS thêm "Khám phá". Subject filter n/a (chưa có taxonomy môn học).

## PHASE 17 — Dashboard/history
- [x] Favorites
- [x] Recently opened
- [x] Continue reading
- [x] Continue watching
- [x] Last position
- [x] Dashboard widgets
- [x] Basic activity timeline

Acceptance: `/tong-quan` (page-level guard đăng nhập, header có link "Tổng quan" khi đã đăng nhập) — 4 widget thống kê (tài liệu, yêu thích, đã mở, workspace), "Tiếp tục xem" (`ContinueViewing` đọc localStorage `tbz:pdf:*`/`tbz:video:*` với ngưỡng trang≥2/giây≥10, resolve context qua `getContinueContextAction` + RLS, link về `/kho/...`), "Yêu thích gần đây" (link `/kho` nếu chủ sở hữu, `/thu-vien` nếu không), "Đã mở gần đây" (activity_logs action=open, dedupe), "Hoạt động gần đây" (timeline, nhãn hành động tiếng Việt). Limitation: last position lưu localStorage (cùng thiết bị) — resume chéo thiết bị cần state server-side (để dành); hiện mới ghi log action=open. Anon vào `/tong-quan` chỉ thấy trang đăng nhập, không lộ dữ liệu (verify smoke).

## PHASE 18 — Trash/versioning
- [x] Soft delete (đã có `deleted_at` + actions delete/restore từ Phase 8)
- [x] Trash view (`/thung-rac`, index `(owner_id, deleted_at)`, link trong header)
- [x] Restore (per-item; RLS update own)
- [x] Permanent delete (xóa object chỉ khi hết tham chiếu — `shouldDeleteObject` đếm resources.storage_key + resource_files.storage_key)
- [x] Cleanup policy (nút "Dọn thùng rác" xóa toàn bộ; auto-purge theo lịch để dành cho Phase 29/30 cron)
- [x] Resource versions (resource_files đã lưu lịch sử từng upload)
- [x] Upload new version (`createVersionUploadSessionAction`/`finalizeVersionUploadAction` — không chạm resource khi đang tải, version = max+1, đổi storage_key về tệp mới)
- [x] Restore version (`restoreVersionAction` — trỏ lại storage_key của phiên bản cũ, object cũ vẫn còn)
- [x] Safe physical-object lifecycle (index storage_key 2 bảng; xóa object chỉ khi không còn ref; bản sao "Lưu vào kho" giữ ref)

Acceptance: migration `20260816000004_phase18_trash.sql`. Thùng rác liệt kê tài liệu đã xóa (owner) với Khôi phục/Xóa vĩnh viễn/Dọn thùng rác (có confirm). Xóa vĩnh viễn xóa object storage chỉ khi không còn resource hoặc resource_files nào tham chiếu (`tests/trash.test.ts`). Phiên bản tệp: panel trên detail page (phiên bản hiện tại, tải bản mới, khôi phục bản cũ); các phiên bản cũ giữ object trong lịch sử. Smoke: /thung-rac 200 (rỗng + có item), restore/permanent qua RLS OK, detail hiện "Phiên bản tệp", header có "Thùng rác". Session cookie đã refresh (expires_at 1786885065).

## PHASE 19 — Deduplication
- [ ] File hashing
- [ ] Duplicate detection
- [ ] Physical object reuse where appropriate
- [ ] Reference counting
- [ ] Safe cleanup

## PHASE 20 — Quota/cost controls
- [ ] Per-user storage quota
- [ ] File count quota
- [ ] File-size limits
- [ ] Optional upload-rate limits
- [ ] Usage tracking
- [ ] Warning thresholds
- [ ] Hard enforcement
- [ ] Admin storage metrics

Acceptance: concurrent uploads cannot bypass quota.

## PHASE 21 — Notifications/activity
- [ ] Notification model
- [ ] In-app notifications
- [ ] Share notifications
- [ ] Storage warnings
- [ ] Activity logging
- [ ] Activity filtering
- [ ] Retention policy

## PHASE 22 — Admin/moderation
- [ ] Admin role
- [ ] Admin dashboard
- [ ] User management
- [ ] Resource management
- [ ] Public moderation
- [ ] Reports queue
- [ ] Suspend/restore user
- [ ] Hide/restore resource
- [ ] Storage metrics
- [ ] Audit trail

## PHASE 23 — Security hardening
- [ ] RLS audit
- [ ] Auth/session audit
- [ ] Secret handling audit
- [ ] Signed URL audit
- [ ] Upload validation audit
- [ ] Filename/path safety
- [ ] Rate limiting
- [ ] Abuse controls
- [ ] Security headers
- [ ] Dependency audit
- [ ] Error redaction

## PHASE 24 — Copyright/reporting
- [ ] Report form
- [ ] Copyright category
- [ ] Admin review flow
- [ ] Hide pending resources
- [ ] Audit log
- [ ] Terms/privacy links
- [ ] Content policy

## PHASE 25 — Performance
- [ ] Query profiling
- [ ] Database indexes
- [ ] Pagination
- [ ] Virtualized large lists
- [ ] Lazy-load viewers
- [ ] Thumbnail optimization
- [ ] CDN/storage delivery
- [ ] Avoid N+1 queries
- [ ] Safe caching
- [ ] Measure realistic datasets

## PHASE 26 — Mobile/accessibility
- [ ] Responsive dashboard/library
- [ ] Mobile upload
- [ ] Mobile viewer
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] ARIA labels
- [ ] Contrast review
- [ ] Screen-reader smoke tests

## PHASE 27 — Testing
### Unit
- [ ] permission
- [ ] quota
- [ ] storage abstraction
- [ ] resource lifecycle
- [ ] hashing/dedup
- [ ] validation

### Integration
- [ ] auth
- [ ] upload
- [ ] private access
- [ ] public access
- [ ] sharing
- [ ] delete/restore
- [ ] annotations

### E2E
- [ ] register/login
- [ ] create workspace/collection/lesson
- [ ] upload PDF/video
- [ ] open viewer
- [ ] annotate
- [ ] share
- [ ] public access
- [ ] trash/restore

Acceptance: CI passes from a clean checkout.

## PHASE 28 — Deployment
- [ ] Production Supabase project
- [ ] Production R2 bucket
- [ ] Vercel project
- [ ] Production environment variables
- [ ] Domain if available
- [ ] Database migration deployment
- [ ] Storage CORS
- [ ] Secure signed URLs
- [ ] CI/CD
- [ ] Production smoke test

## PHASE 29 — Backup/recovery
- [ ] Database export procedure
- [ ] Recovery documentation
- [ ] Storage recovery strategy
- [ ] Configuration backup
- [ ] Disaster recovery checklist
- [ ] Recovery test

## PHASE 30 — Beta
- [ ] Seed realistic learning resources
- [ ] Invite small test group
- [ ] Collect bugs
- [ ] Measure storage growth
- [ ] Measure viewer failures
- [ ] Measure upload failures
- [ ] Fix critical bugs
- [ ] Security review
- [ ] UX cleanup

## PHASE 31 — Production release
- [ ] Final security review
- [ ] Final E2E pass
- [ ] Final backup
- [ ] Monitoring check
- [ ] Publish production build
- [ ] Document release
- [ ] Define rollback procedure

## PHASE 32 — Video qua YouTube (ADR-022)
- [x] Migration `20260817000001_phase22_video_youtube.sql`: `resources.youtube_id` (11 ký tự, CHECK regex) + index — đã push prod
- [x] Viewer: resource video có `youtube_id` → YouTube embed (`youtube-nocookie.com/embed`), không cần storage
- [x] Tạo/sửa video: nhập link YouTube (watch/youtu.be/embed/shorts hoặc ID thô) → chuẩn hóa `youtube_id`; video không link vẫn tải mp4 như cũ
- [x] Copy/save-to-library giữ `youtube_id`
- [x] Giảm quota lưu trữ/user 1 GB → 250 MB (ADR-018, ADR-022) vì Supabase free chỉ 1 GB tổng
- [x] Tests: youtubeIdFromUrl (+11), quota 250MB; typecheck/lint/build OK
- [x] Smoke: tạo video resource youtube_id → detail page render iframe YouTube
- [ ] Upload tự động qua YouTube Data API v3 (OAuth account Google, `GOOGLE_CLIENT_ID/SECRET`) — chờ creds OAuth từ Google Cloud Console
  - [x] Migration `20260817000002_phase32_youtube_upload.sql`: bảng `google_oauth` (refresh token, RLS không policy) — đã push prod
  - [x] `lib/youtube/client.ts`: consent URL (scope `youtube.upload`, offline, prompt=consent), exchange/refresh token, upload resumable → videoId
  - [x] API `/api/auth/google/start` + `/api/auth/google/callback` (upsert `google_oauth`, redirect `/ho-so?google=connected`)
  - [x] `lib/youtube/actions.ts`: `publishToYoutubeAction` (owner check, resource video ready có file → tải qua signed URL → upload unlisted → gán `youtube_id`); `disconnectGoogleAction`
  - [x] UI: `youtube-panel.tsx` trên trang chi tiết video (kết nối / đăng lên YouTube) + thẻ kết nối trên `/ho-so`
  - [x] Tests youtube-client (+11), typecheck/lint/build OK; smoke `/ho-so` + detail video hiện panel đúng trạng thái
  - [x] **Mô hình kho video trung tâm** (ADR-023): account Google của admin = nơi lưu video toàn web; mọi user sở hữu video đều đăng được vào kênh trung tâm (unlisted)
  - [x] Tiêu đề video trên YouTube: `[<họ tên user> | TBZ School | <original_filename>]` (`lib/youtube/title.ts`, cắt ≤100 ký tự) — **không dùng playlist** (giới hạn ~200 playlist/kênh)
  - [x] Admin-only connect: `ADMIN_EMAILS` env + `isAdminUser()`; `/api/auth/google/start` + `/callback` chặn user thường; UI "Kết nối Google" chỉ hiện cho admin (`/ho-so`, `youtube-panel`)
  - [x] **Đăng nhập bằng Google**: nút Google trên `/dang-nhap` + `/dang-ky` (Supabase OAuth provider); trigger `handle_new_user` lấy `full_name` từ metadata — migration `20260818000001_phase32_google_login.sql` đã push
  - [x] Tests youtube-title (+5), isAdminUser, typecheck/lint/build OK; smoke: admin connect → Google consent, user thường → bị chặn, `/ho-so` card chỉ admin thấy
  - [x] **Upload video → thẳng YouTube** (ADR-023 cập nhật): `createUploadSessionAction` branch theo `resource.type === "video"` → tạo resumable session YouTube (`initiateResumableVideoUpload`) không qua R2, không giới hạn dung lượng (`maxSizeBytes: Infinity`), không tính quota/user; client PUT thẳng tới session URL, đọc `videoId` từ phản hồi, `finalizeUploadAction` branch `provider === "youtube"` gán `youtube_id` + `ready`
  - [x] `mimeFromFileName()` (`lib/upload/validate.ts`); `validateUploadFile` nhận `maxSizeBytes` tùy chọn; `evaluateDownload` chặn tải file gốc video YouTube (`youtubeId` → reason `external`); `/ho-so` tự xóa param `?google=` sau khi hiện notice + alert `forbidden` không còn destructive
  - [x] Tests: youtube-client `initiateResumableVideoUpload` (+3), upload-validate `maxSizeBytes`/`mimeFromFileName` (+3), resource-download `youtubeId` (+2); typecheck/lint/test (139) /build OK
  - [x] Fix bug: trang `/ho-so` crash SSR "Element type is invalid ... got: undefined" (HTTP 200 + error boundary `$RX`). Nguyên nhân: `components/profile/profile-form.tsx` export object `ProfileForm = { AvatarUpload, ProfileInfo }` (module `"use client"`) rồi truy cập `ProfileForm.AvatarUpload` từ server component — client-reference không resolve thuộc tính → `undefined`. Fix: đổi thành named exports `export { AvatarUpload, ProfileInfo }` + import trực tiếp trong `app/ho-so/page.tsx`. Verify: dev + prod build local đều `$RC` success; typecheck/lint/test (141) /build OK; production tbz-school.vercel.app/ho-so hết lỗi
  - [x] Fix bug: upload video thất bại `check constraint resources_provider_check` — migration `20260820000001_phase32_youtube_provider.sql` thêm `'youtube'` vào danh sách provider hợp lệ (đã apply prod). Fix client: PUT tới session URL YouTube dùng `mime` do server trả (khớp `X-Upload-Content-Type`), lỗi PUT hiện rõ HTTP status. E2E backend: upload video mẫu thật lên kênh admin OK (videoId `drPxYp5wrEk`, unlisted).
  - [ ] Cấu hình Google Cloud + Supabase + Vercel (xem bước triển khai) → test upload video thật

Definition of done:
User can register → create workspace → create collection → create lesson → upload/import resource → store safely → open in browser → interact with supported formats → retain annotations/state → choose visibility → share/discover according to permissions → search → favorite → delete/restore → manage quota.

## PHASE 33 — Kho Explorer (Drive-style UX) + fix YouTube CORS
- [x] Fix upload YouTube: PUT resumable thành công nhưng thiếu `Access-Control-Allow-Origin` → client không đọc được `videoId`. Server query session URL (PUT rỗng + `Content-Range: bytes */size`) lấy videoId; client luôn gọi finalize kèm `uploadUrl` kể cả khi PUT bị chặn CORS
- [x] `/kho` → explorer 2 khung kiểu Drive: cây workspace/bộ sưu tập/bài học bên trái, nội dung bên phải (breadcrumb, grid thư mục, danh sách tệp); URL state `?w=&c=&l=`
- [x] Upload ưu tiên tệp: nút "Tải tệp lên" ở mọi cấp + kéo-thả nhiều tệp; server tự tạo resource nháp + tìm/tạo bộ sưu tập "Chung" / bài học "Tài liệu chung" nếu thả ngoài bài học; hàng đợi tải lên với tiến trình từng tệp
- [x] Tạo/đổi tên/xóa inline (không modal), optimistic update + hoàn tác khi lỗi; route cũ `/kho/[id]/...` redirect về `/kho?w=...`
- [x] Loading skeletons cho `(app)` + `kho`, animation fade/slide cho panel và thẻ; viền drop-highlight khi kéo tệp
- [x] Sửa lỗi trang bộ sưu tập gọi nhầm action xóa/đổi tên của workspace; sửa copy cũ "giai đoạn tiếp theo"
- [x] Tests: titleFromFileName/resourceTypeFromFileName (+7 mới); typecheck/lint/test (148)/build OK

## PHASE 34 — UI overhaul "Aurora Glass" (toàn bộ app)
- [x] Design tokens mới: palette tím-hồng (oklch 290/350), glass-panel/text-gradient/bg-brand-gradient, shadow 2 tầng, radius 1rem; font Be Vietnam Pro (body) + Baloo 2 (heading)
- [x] BackdropGlow: 4 aurora blobs trôi + dot-grid; landing bento kiểu Apple (thẻ 2x2 mini file-tree), spotlight chuột, border-beam CTA, shimmer text, floating chips, scroll reveal (IntersectionObserver, no-JS safe)
- [x] Header/footer floating glass pill; Button gradient pill + glow; Card glass bo 2xl
- [x] Auth layout 2 cột; PageHeader dùng chung cho các trang app; loading skeleton/error/404 đồng bộ
- [x] tsc/lint/test(148)/build OK

## PHASE 35 — Quản lý file/thư mục nâng cấp (context menu, toasts, di chuyển)
- [x] Toast system toàn cục (`components/ui/toast.tsx`, ToastProvider trong root layout): thông báo thành công/lỗi cho tạo/đổi tên/xóa/di chuyển
- [x] Context menu chuột phải trên mọi node của cây (workspace/bộ sưu tập/bài học) và từng tệp (`components/ui/context-menu.tsx` trên Base UI ContextMenu)
- [x] Đổi tên tài liệu inline trong FileList; submenu "Quyền xem" đổi visibility nhanh (private/unlisted/public) kèm dấu check; icon mắt màu theo quyền xem + badge kích thước
- [x] Actions mới có kiểm tra quyền: `renameResourceNodeAction`, `setResourceVisibilityAction`, `moveCollectionNodeAction` (giữa workspace), `moveLessonNodeAction` (giữa bộ sưu tập); vị trí mới = cuối danh sách đích
- [x] Dialog "Di chuyển…" cho cả tệp (chọn workspace → bộ sưu tập → bài học), bài học và bộ sưu tập (`components/explorer/dialogs.tsx`); mục menu ở cây + grid; optimistic update + hoàn tác khi lỗi
- [x] Drag & drop trên cây: kéo bộ sưu tập sang workspace khác, kéo bài học sang bộ sưu tập khác; drop-highlight ring-primary; badge số con trên từng node
- [x] Ghi nhớ trạng thái mở/đóng node giữa các phiên (localStorage `kho-expanded-ids`)
- [x] Dialog "Thông tin" tài liệu: loại, quyền xem, trạng thái, kích thước, ngày tạo, YouTube ID/liên kết
- [x] typecheck/lint/test (148)/build OK
