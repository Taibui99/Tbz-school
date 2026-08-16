# TBZ School — Architecture Decision Record

This file records important decisions. Do not silently reverse an accepted decision.

## ADR-001 — Product type
Status: Accepted

Decision:
TBZ School is a learning-resource storage and interaction platform, not a conventional LMS.

Reason:
The primary value is organizing, storing, opening, annotating, and sharing learning resources.

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
Status: Accepted

Decision:
Use Cloudflare R2 as the primary large-file object storage.

Reason:
S3-compatible API, useful free tier, and Internet egress is currently free.

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
Status: Accepted

Decision:
Maximum file size is 50 MB per file; per-user storage quota is 1 GB (Phase 7, `lib/upload/validate.ts`).

Reason:
50 MB keeps single-shot direct uploads (presigned PUT from browser) reliable within Supabase Storage/R2 limits; 1 GB matches the Supabase free-tier storage allowance under the free-first policy. Limits are constants that can be raised later.

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
