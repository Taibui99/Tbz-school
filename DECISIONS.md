# Tbz cloud — Architecture Decision Record

This file records important decisions. Do not silently reverse an accepted decision.

## ADR-001 — Product type
Status: Accepted

Decision:
Tbz cloud is a learning-resource storage and interaction platform, not a conventional LMS.

Reason:
The primary value is organizing, storing, opening, annotating, and sharing learning resources.

## ADR-028 — Tên thương hiệu chính thức
Status: Accepted (2026-08-24)

Decision:
Tên chính thức của hệ thống là **Tbz cloud** (trước đây tạm dùng "TBZ School"). Toàn bộ UI, metadata, tiêu đề video YouTube và tài liệu dùng tên mới. Tên kỹ thuật không đổi: package `tbz-school`, thư mục dự án, repository GitHub.

Reason:
Chủ dự án xác nhận tên chính thức khi chuẩn bị ra mắt.

## ADR-002 — Core hierarchy
Status: Accepted

Decision:
Use:
`Workspace → Collection → Lesson → Resource`

Reason:
This keeps organization explicit while allowing resources to remain first-class objects.

## ADR-003 — Database
Status: Accepted

Decision:
Use Supabase PostgreSQL.

Reason:
Authentication integration, relational data model, RLS, and a useful free tier make it suitable for the initial stage.

## ADR-004 — Authentication
Status: Accepted

Decision:
Use Supabase Auth.

Reason:
Integrated auth/session management with PostgreSQL/RLS.

## ADR-005 — Large-file storage
Status: Amended (ADR-027) — R2 deferred

Decision:
Use Cloudflare R2 as the primary large-file object storage.

Reason:
S3-compatible API, useful free tier, and Internet egress is currently free.

## ADR-027 — Supabase Storage là provider production; R2 hoãn lại
Status: Accepted (2026-08-24)

Decision:
Supabase Storage là storage duy nhất cho môi trường production hiện tại. R2 bị hoãn vô thời hạn vì yêu cầu thẻ tín dụng để kích hoạt (người vận hành không có). Nếu sau này vượt 1 GB free tier, phương án không cần thẻ là Backblaze B2 (10 GB free, S3-compatible) — thêm provider mới qua abstraction sẵn có mà không đổi product logic.

Reason:
Video đã chuyển lên YouTube (ADR-024) nên không còn "large file" trong object storage. Tệp thường giới hạn 50 MB/file + 250 MB/user (ADR-022) — nằm gọn trong hạn mức Supabase free (1 GB, 50 MB/file). Toàn bộ hệ thống đang chạy ổn định trên supabase_storage.

## ADR-006 — Small-file/fallback storage
Status: Accepted

Decision:
Keep Supabase Storage as an optional provider for small/fallback files.

Reason:
Simple integration and useful for certain small assets.

## ADR-007 — Storage abstraction
Status: Accepted

Decision:
All storage is accessed through a provider abstraction.

Reason:
Free tiers change, providers change, and the project must be able to migrate storage without rewriting product logic.

## ADR-008 — External resources
Status: Accepted

Decision:
External URLs are first-class resources.

Reason:
Reducing storage/bandwidth costs is a core product constraint.

## ADR-009 — Direct upload
Status: Accepted

Decision:
Large uploads go directly from browser to object storage using signed/multipart flows.

Reason:
Prevents the application server from becoming a bandwidth bottleneck.

## ADR-010 — Private files
Status: Accepted

Decision:
Private files are not public objects. Access is granted through server authorization and short-lived signed URLs.

Reason:
Frontend-only privacy is not sufficient.

## ADR-011 — Annotations
Status: Accepted

Decision:
Annotations are stored separately from original file bytes.

Reason:
The original file must remain intact and reusable.

## ADR-012 — Search
Status: Accepted

Decision:
Start with PostgreSQL search.

Reason:
Avoid unnecessary infrastructure at small scale.

## ADR-013 — Deduplication
Status: Accepted

Decision:
Use content hashing to identify possible duplicate files, with reference counting before physical deletion.

Reason:
Storage cost is a primary constraint.

## ADR-014 — Free-first policy
Status: Accepted

Decision:
Target zero recurring cost at initial scale, but never assume free tiers are unlimited or permanent.

Reason:
Budget is constrained and free-tier limits can change.

## ADR-018 — Upload limits
Status: Accepted (updated Phase 22)

Decision:
Maximum file size is 50 MB per file; per-user storage quota is 250 MB (Phase 7, `lib/upload/validate.ts`).

Reason:
50 MB keeps single-shot direct uploads (presigned PUT from browser) reliable within Supabase Storage/R2 limits. Quota ban đầu là 1 GB nhưng Supabase free-tier chỉ cấp **1 GB tổng** storage/project — 1 user có thể ngốn hết bucket nên hạ xuống 250 MB/user (ADR-022). Limits are constants that can be raised later.

## ADR-022 — Video qua YouTube (không tốn storage)
Status: Accepted (Phase 22)

Decision:
Resource loại video có thể lưu `youtube_id` thay vì file mp4 trong storage. Khi có `youtube_id`, viewer hiển thị **YouTube embed** (`youtube-nocookie.com/embed`) — không tốn dung lượng lưu trữ, không tính egress. Video mp4 nội bộ nhỏ vẫn dùng đường cũ (Supabase/R2).

Reason:
Video là thứ ngốn dung lượng nhất (1 bài giảng 100–500 MB, vượt xa 1 GB free-tier Supabase). Trường học dùng kênh YouTube chuyên dụng của trường (unlisted) là miễn phí, không giới hạn, không cần thẻ. Upload tự động qua YouTube Data API v3 (OAuth 1 lần bằng account Google, `GOOGLE_CLIENT_ID`/`SECRET` server-side) đã triển khai ở Phase 32 phần 2.

### ADR-023 — YouTube auto-upload & OAuth (kho video trung tâm)
Status: Accepted (Phase 32)

Decision:
**Mô hình kho video trung tâm:** account Google của admin (`ADMIN_EMAILS`) là nơi lưu video của **toàn web**. Admin kết nối 1 lần (OAuth 2.0, scope `https://www.googleapis.com/auth/youtube.upload`, `access_type=offline`, `prompt=consent`); refresh token lưu server-side trong bảng `google_oauth` (1 dòng `id=1`, RLS không policy — chỉ service role). Mọi user sở hữu video đều bấm "Đăng lên kênh Tbz cloud (unlisted)" → server: kiểm tra quyền → tạo resumable session (`initiateResumableVideoUpload`) → **client PUT thẳng bytes tới session URL** (không qua server, không giới hạn dung lượng, không tính quota/user) → đọc `videoId` → gán `youtube_id` + `ready`. Video không còn lưu vào R2 nữa (bỏ `MAX_FILE_SIZE_BYTES` 50 MB cho video). Tiêu đề video: `[<họ tên user> | Tbz cloud | <original_filename>]` (≤100 ký tự). **Không dùng playlist** vì YouTube giới hạn ~200 playlist/kênh. Chỉ admin được kết nối/ngắt kết nối tài khoản trung tâm; người khác bị chặn ở API lẫn UI.

Reason:
User dùng 1 account Google cá nhân làm "ổ cứng" cho toàn web — đơn giản, miễn phí, không giới hạn dung lượng. Video unlisted nên chỉ ai có link tài liệu trong app mới xem được; tổ chức thật nằm ở cây workspace→collection→lesson (mỗi tài liệu 1 link). Playlist bỏ vì không phản ánh được cây phân cấp (playlist phẳng) và chạm trần 200/kênh khi user đông. Token tuyệt đối không vào client; `google_oauth` không có policy RLS nào. OAuth consent screen đã **Publish lên production** — refresh token tồn tại vĩnh viễn (trước đó chế độ Testing giới hạn token 7 ngày); admin đã ngắt/kết nối lại một lần để lấy token production. Scope `youtube.upload` nhạy cảm → app unverified vẫn dùng được cho ≤100 tài khoản test, chỉ admin kết nối nên không cần verification của Google.

### ADR-025 — Deduplication tệp trong kho (Phase 19)
Status: Accepted (Phase 19)

Decision:
Tệp thường (không phải video YouTube, không phải url) gửi kèm SHA-256 ngay từ lúc tạo phiên tải lên. Server tra cứu resource **cùng chủ sở hữu** có hash trùng, lifecycle ready, chưa xóa, có storage_key trên r2/supabase_storage (`findReusableObject`). Trùng → tạo resource mới (hoặc hoàn tất draft) trỏ **cùng storage_key**, ghi thêm 1 dòng `resource_files` tham chiếu object cũ (`completeWithReusedObject`, `lib/upload/dedup.ts`); client nhận `duplicate: true` và bỏ qua PUT/finalize nên bytes không truyền lại. Quota per-user vẫn tính **theo tham chiếu** (mỗi resource tính full size_bytes), không trừ vì dedup. Migration `20260823000001_phase19_dedup.sql` thêm partial index `(owner_id, content_hash)`.

Reason:
Dedup giới hạn trong phạm vi owner vì khóa object chứa userId và tránh mọi câu hỏi quyền riêng tư khi tái sử dụng chéo tài khoản (chia sẻ chéo owner vẫn đi qua luồng "Lưu vào kho" ADR-021). Video bỏ qua vì đi thẳng YouTube (không có object để dùng lại). Quota tính theo tham chiếu giữ ngữ nghĩa đơn giản "mỗi tài liệu bạn thấy đều tính dung lượng của nó"; lợi ích thật của dedup là tiết kiệm bytes vật lý trên R2/Supabase — phần chi phí lớn nhất. Xóa an toàn nhờ ref-count sẵn có của Phase 18: object chỉ bị xóa vật lý khi không còn resource/resource_files nào tham chiếu.

### ADR-024 — Đăng nhập bằng Google
Status: Accepted (Phase 32)

Decision:
Thêm nút "Đăng nhập bằng Google" ở trang đăng nhập/đăng ký dùng Supabase Auth OAuth provider (Google) — cùng OAuth client Web application với "Kết nối Google", thêm redirect URI `https://<ref>.supabase.co/auth/v1/callback`. Trigger `handle_new_user` điền `full_name` từ `raw_user_meta_data` (Google) khi tạo profile. Không tự viết OAuth login — dùng Supabase provider cho an toàn và đồng bộ session.

Reason:
Người dùng mới không cần tạo mật khẩu; họ tên lấy tự động từ Google. Giữ "Kết nối Google" (kho video) tách biệt: scope khác (`youtube.upload`), chỉ admin dùng; đăng nhập Google mọi user đều dùng. Tránh lộ scope nặng nề cho người dùng thường.

## ADR-015 — Product scope
Status: Accepted

Decision:
Do not prioritize payments, live classrooms, social feeds, or AI tutoring in the initial release.

Reason:
They do not contribute to the storage-and-interaction core.

## ADR-016 — Agent autonomy
Status: Accepted

Decision:
Coding agents work phase-by-phase and stop after the assigned phase.

Reason:
Prevents uncontrolled scope expansion and architectural drift.

## ADR-017 — Architectural change process
Status: Accepted

Decision:
Material architecture changes require documentation and explicit approval.

Reason:
Storage/privacy/schema changes can be difficult to reverse once production data exists.

## Pending decisions

- Malware scanning provider/strategy.
- Production backup provider.
- Whether editor sharing is included in first public release.

## ADR-021 — Save-to-library references, not byte copies
Status: Accepted

Decision:
"Lưu vào kho của tôi" on a public resource copies the resource row (same provider/storage_key) into the user's workspace as a reference; bytes are NOT duplicated.

Reason:
Avoids paying storage twice for the same object and matches the future dedup/reference model (Phase 19). Storage stays private; signed URLs are issued server-side via the storage provider (admin), so references work for any owner.

Limitation:
If the original owner later deletes the physical object, references to it break (viewer falls back to unsupported). Safe physical-object lifecycle (reference counting) is deferred to Phase 19.

## ADR-022 — Public attribution without email exposure
Status: Accepted

Decision:
Public pages show the owner's `full_name` only; owner email is never selected or rendered publicly. Profile lookups for attribution/grants use the server-side admin client.

Reason:
`profiles` RLS only exposes a user's own row (`profiles_select_own`). Rendering emails publicly would be a privacy leak; the admin lookup keeps attribution possible without weakening RLS.

## ADR-019 — Office viewer strategy
Status: Accepted

Decision:
Office files (DOCX/PPTX/XLSX) render as an honest fallback panel with a download button, not via third-party web viewers.

Reason:
Google/Microsoft Docs viewers require a public URL, but resources are private files behind short-lived signed URLs. Exposing them would break the privacy rule (ADR "private files must not be made public just to make a viewer easier"). A server-side conversion/OCR pipeline is deferred; revisit when storage/sharing model allows it.

## ADR-020 — PDF.js worker bundling (Turbopack)
Status: Accepted

Decision:
The pdf.js worker is loaded via `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` instead of a `?url` static import.

Reason:
Turbopack's `?url` asset import on the ESM worker bundle failed the build ("Export default doesn't exist in target module"). `new URL(..., import.meta.url)` compiles cleanly and keeps the worker self-hosted (no external CDN dependency). pdf.js v6 API differences handled: `render({ canvas })`, no `isEvalSupported`, no `PDFDocumentProxy.destroy`.

## ADR-024 — Kho explorer 2 khung + upload ưu tiên tệp
Status: Accepted

Decision:
`/kho` renders as a single two-pane explorer (tree left, content right) driven by query params (`?w=&c=&l=`). Old nested routes redirect. File uploads are the primary action at every level: dropping files on any level creates a draft resource and, when not inside a lesson, attaches it to a find-or-create default collection ("Chung") / lesson ("Tài liệu chung") server-side.

Reason:
The previous modal-driven flow was rigid and slow for bulk uploads; users think in files first. A single page also removes per-level loading waterfalls (one tree fetch per navigation instead of one per drill-down).

## ADR-025 — YouTube resumable upload finalize qua session URL
Status: Accepted

Decision:
For YouTube uploads the client passes its `uploadUrl` to `finalizeUploadAction` even when the browser cannot read the PUT response. The server queries the resumable session with an empty PUT (`Content-Range: bytes */size`) to recover the `videoId`.

Reason:
Google's PUT response lacks CORS headers, so browsers block reading it client-side even though the upload itself succeeds. Querying from the server avoids the browser restriction without proxying file bytes through the app server.

## ADR-026 — Xem trước office client-side + ký URL tải cho file office
Status: Accepted

Decision:
`resolveViewer` giờ ký URL đọc cho MỌI kind có tệp (kể cả office), trả `{kind:'office', url, previewType}`. Preview render ngay trong trình duyệt, chọn thư viện theo `officePreviewKind()`: `.docx` → `docx-preview`, `.xlsx/.xls` → SheetJS (bảng React, không innerHTML), `.pptx` → `pptx-preview`. Các loại khác (.doc/.ppt) và lỗi render giữ fallback trung thực + nút tải hoạt động. Lỗi ký URL được log server-side (`[viewer]`) thay vì nuốt im lặng. Cố tình KHÔNG dùng Google Docs Viewer / Microsoft Office Viewer vì chúng yêu cầu đưa URL file cho bên thứ ba tải về và có cache.

Reason:
Người dùng cần mở nội dung Word/Excel/PowerPoint trực tiếp trên web (kể cả người được chia sẻ). Render client-side từ signed URL giữ nguyên tính riêng tư: bytes chỉ về máy người dùng, không gửi cho dịch vụ chuyển đổi nào; đồng thời miễn phí, không phụ thuộc dịch vụ ngoài đang bị khai tử (Office viewer của Microsoft không còn được hỗ trợ chính thức).
