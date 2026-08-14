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
- [ ] Confirm basic branding
- [ ] Add README
- [ ] Add project docs
- [ ] Define development/staging/production conventions

Acceptance: a new developer/agent can understand product, architecture, decisions, and tasks without chat history.

## PHASE 1 — Application foundation
- [ ] Initialize Next.js app
- [ ] Configure TypeScript strict mode
- [ ] Configure Tailwind
- [ ] Configure shadcn/ui
- [ ] Configure linting/formatting
- [ ] Create app shell
- [ ] Create error/not-found/loading states
- [ ] Create health check
- [ ] Create `app`, `components`, `features`, `services`, `lib`, `types`, `hooks`, `tests` structure
- [ ] Add environment validation
- [ ] Add basic tests
- [ ] Run typecheck/lint/build

## PHASE 2 — Supabase and database
- [ ] Configure Supabase clients
- [ ] Create migrations
- [ ] Create profiles
- [ ] Create workspaces
- [ ] Create collections
- [ ] Create lessons
- [ ] Create resources
- [ ] Create resource_files
- [ ] Create external_resources
- [ ] Create permissions/shares
- [ ] Create annotations
- [ ] Create favorites
- [ ] Create tags/resource_tags
- [ ] Create activity_logs
- [ ] Create notifications
- [ ] Create reports
- [ ] Create storage_usage
- [ ] Create resource_versions
- [ ] Add indexes
- [ ] Add RLS
- [ ] Add seed/dev data

Acceptance: migrations apply cleanly and RLS prevents cross-user access.

## PHASE 3 — Authentication/profile
- [ ] Register
- [ ] Login
- [ ] Logout
- [ ] Session persistence
- [ ] Password reset
- [ ] Profile page
- [ ] Avatar support
- [ ] Account settings
- [ ] Protected routes

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
