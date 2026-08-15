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
- [ ] Workspace creation/settings
- [ ] Collection CRUD
- [ ] Lesson CRUD
- [ ] Reorder collections/lessons
- [ ] Move resources
- [ ] Breadcrumbs
- [ ] Sidebar navigation
- [ ] Empty/loading states

## PHASE 5 — Resource core
- [ ] Resource CRUD
- [ ] Resource type/lifecycle model
- [ ] File metadata
- [ ] External resource model
- [ ] Tags
- [ ] Favorites
- [ ] Recently opened model
- [ ] Resource details
- [ ] Download rules

## PHASE 6 — Storage abstraction
- [ ] Define `StorageProvider`
- [ ] Implement R2 provider
- [ ] Implement Supabase Storage provider
- [ ] Implement external reference provider
- [ ] Add provider selection
- [ ] Signed read URLs
- [ ] Object metadata
- [ ] Delete/exists operations
- [ ] Error mapping

## PHASE 7 — Upload engine
- [ ] Upload session endpoint/action
- [ ] Auth and validation
- [ ] Quota checks
- [ ] Direct storage upload
- [ ] Multipart/resumable upload where needed
- [ ] Progress UI
- [ ] Cancel/retry
- [ ] Complete/verify upload
- [ ] Failed upload handling
- [ ] Abandoned upload cleanup

Acceptance: supported files upload without unnecessarily passing large bytes through the application server.

## PHASE 8 — File management
- [ ] Rename
- [ ] Delete
- [ ] Move
- [ ] Copy/reference
- [ ] Bulk select/delete/move
- [ ] Sort/filter
- [ ] Resource details

## PHASE 9 — Viewer framework
- [ ] Generic ResourceViewer
- [ ] Type dispatcher
- [ ] Viewer loading/error states
- [ ] Permission gate
- [ ] Download fallback
- [ ] Fullscreen where appropriate

## PHASE 10 — PDF viewer
- [ ] Render
- [ ] Pagination
- [ ] Zoom/fit
- [ ] Search
- [ ] Fullscreen
- [ ] Last-page persistence
- [ ] Permission-aware download

## PHASE 11 — Video viewer
- [ ] Playback controls
- [ ] Seek/volume/speed/fullscreen
- [ ] Keyboard controls
- [ ] Resume timestamp
- [ ] Timestamp bookmarks
- [ ] Timestamp notes
- [ ] Caption support where available

## PHASE 12 — Office viewers
- [ ] DOC/DOCX preview strategy
- [ ] PPT/PPTX preview strategy
- [ ] XLS/XLSX preview strategy
- [ ] Processing status
- [ ] Download fallback
- [ ] Presentation mode
- [ ] Slide navigation

## PHASE 13 — Annotation engine
- [ ] Annotation schema
- [ ] Permission rules
- [ ] PDF highlight
- [ ] Underline/strike-through
- [ ] Freehand drawing
- [ ] Shapes
- [ ] Text annotation
- [ ] Sticky notes
- [ ] Bookmarks
- [ ] Video timestamp notes
- [ ] CRUD persistence
- [ ] Annotation loading
- [ ] Backup/export strategy

Acceptance: annotations persist and never modify original file bytes.

## PHASE 14 — Search
- [ ] PostgreSQL search indexes
- [ ] Search collections/lessons/resources
- [ ] Search tags
- [ ] Search annotations/notes where practical
- [ ] Filters
- [ ] Sorting
- [ ] Pagination

## PHASE 15 — Sharing and permissions
- [ ] Private
- [ ] Unlisted
- [ ] Public
- [ ] Shared users
- [ ] Share link generation
- [ ] Revoke share
- [ ] Server-side permission checks
- [ ] Public preview
- [ ] Permission-aware downloads
- [ ] Private metadata isolation

## PHASE 16 — Public library
- [ ] Explore page
- [ ] Public cards
- [ ] Public search
- [ ] Filters by subject/type/tag
- [ ] Public resource pages
- [ ] Attribution
- [ ] Favorite/save/reference
- [ ] Report resource

## PHASE 17 — Dashboard/history
- [ ] Favorites
- [ ] Recently opened
- [ ] Continue reading
- [ ] Continue watching
- [ ] Last position
- [ ] Dashboard widgets
- [ ] Basic activity timeline

## PHASE 18 — Trash/versioning
- [ ] Soft delete
- [ ] Trash view
- [ ] Restore
- [ ] Permanent delete
- [ ] Cleanup policy
- [ ] Resource versions
- [ ] Upload new version
- [ ] Restore version
- [ ] Safe physical-object lifecycle

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

Definition of done:
User can register → create workspace → create collection → create lesson → upload/import resource → store safely → open in browser → interact with supported formats → retain annotations/state → choose visibility → share/discover according to permissions → search → favorite → delete/restore → manage quota.
