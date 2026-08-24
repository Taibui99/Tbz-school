# Tbz cloud — Product Requirements Document

## 1. Product vision

Tbz cloud is a student-focused learning-resource platform.

Its core purpose is to let students:
- store learning resources;
- organize them into a clear hierarchy;
- open and interact with resources directly in the browser;
- keep private resources private;
- share selected resources by link or publicly;
- discover public learning resources;
- keep annotations, bookmarks, notes, and viewing state connected to the resource.

The product is NOT primarily an LMS, course marketplace, or social network.

The central concept is:

> Workspace → Collection → Lesson → Resource

A Resource can be:
- PDF
- DOC/DOCX
- PPT/PPTX
- XLS/XLSX
- image
- video
- audio
- text
- external URL
- supported external media URL

## 2. Product principles

1. Storage-first: reliable resource storage is more important than decorative UI.
2. Free-first: the initial deployment should target zero recurring cost using free tiers.
3. Provider-agnostic storage: storage providers must be replaceable.
4. Server-enforced permissions: privacy cannot depend on frontend hiding.
5. Original files are immutable from the annotation system.
6. A Resource is metadata + storage/external reference + user interactions.
7. Public content must be discoverable without exposing private content.
8. Build mobile-friendly from the beginning.
9. Avoid unnecessary third-party services.
10. Do not add unrelated features without an explicit product decision.

## 3. Roles

### Student/User
Can:
- create and manage their workspace;
- create collections and lessons;
- upload/import resources;
- view, annotate, bookmark, and organize resources;
- choose visibility;
- share resources;
- discover public resources;
- manage their own account.

### Admin
Can:
- inspect users/resources;
- review reports;
- moderate public resources;
- inspect storage/system usage;
- suspend abusive accounts;
- manage operational settings.

## 4. Resource visibility

### PRIVATE
Only the owner and explicitly authorized users can access.

### UNLISTED
Anyone with the valid share link can access, but it is not publicly discoverable.

### PUBLIC
Discoverable in the public library.

### SHARED
Accessible only to specifically granted users.

Permission levels:
- viewer
- editor (only where supported by the feature)

## 5. Core user journeys

### Create and organize
1. Register/login.
2. Create a workspace.
3. Create a collection.
4. Create a lesson.
5. Upload or import resources.
6. Open resources directly in the browser.

### Continue learning
1. Open Dashboard.
2. See recently opened resources.
3. Resume a PDF from its last page or video from its last timestamp.
4. Access saved notes/bookmarks.

### Share
1. Select a resource.
2. Change visibility.
3. Generate/copy a link.
4. Recipient accesses only what permissions allow.

### Public discovery
1. Open Explore/Public Library.
2. Search/filter.
3. Preview a public resource.
4. Favorite or save/reference it to the user's library.

## 6. Viewer requirements

### PDF
Phase 1:
- page navigation;
- zoom;
- fit width/page;
- search;
- fullscreen;
- download when permitted.

Phase 2:
- highlight;
- underline;
- strike-through;
- freehand drawing;
- shapes;
- text annotations;
- sticky notes;
- bookmarks.

### Video
Phase 1:
- play/pause;
- seek;
- volume;
- playback speed;
- fullscreen;
- keyboard controls.

Phase 2:
- resume position;
- timestamp bookmarks;
- timestamp notes;
- captions where available.

### Image
- zoom;
- rotate;
- pan;
- basic annotation in later phase.

### PPT/PPTX
- browser preview;
- slide navigation;
- thumbnails where practical;
- fullscreen;
- presentation mode;
- later: drawing/pointer.

### DOC/DOCX
- browser preview where technically reliable;
- download fallback;
- preserve original download.

### Unsupported files
- clear file information;
- download fallback when allowed;
- do not pretend unsupported formats are rendered.

## 7. Search

Search must be able to find:
- collections;
- lessons;
- resources;
- tags;
- user annotations/notes where practical.

Initial implementation can use PostgreSQL full-text/trigram search. Do not introduce a dedicated search service prematurely.

## 8. Organization

The user can:
- create;
- rename;
- reorder;
- move;
- archive/delete;
- restore;
- favorite.

Resources should support tags.

## 9. Storage strategy

Primary architecture:
- Supabase PostgreSQL: metadata, permissions, user data.
- Supabase Auth: authentication.
- Cloudflare R2: large-file storage.
- Supabase Storage: small files or fallback where appropriate.
- External providers/URLs: optional references, not necessarily owned by Tbz cloud.

Large files must be uploaded directly to storage using signed/multipart flows rather than passing through the application server.

## 10. Cost strategy

Target:
- $0 recurring cost at initial scale.

Must support:
- per-user quotas;
- file-size limits;
- storage usage tracking;
- provider abstraction;
- external-resource references;
- duplicate detection/hash-based reuse where practical.

No feature should assume unlimited storage or bandwidth.

## 11. Non-goals for the first production release

Do not prioritize:
- payments;
- live classes;
- chat/social feed;
- AI tutor;
- complex grading;
- classroom management;
- native mobile app.

These may be considered later.

## 12. Definition of done

The product is considered production-ready when a user can:

register → create workspace → create collection → create lesson → upload/import resource → store it safely → open it in the browser → interact with supported formats → retain annotations/state → choose visibility → share/discover according to permissions → search → favorite → delete/restore → manage quota.

Operational requirements:
- strict authorization;
- RLS;
- signed private access;
- validation;
- rate limiting/abuse controls;
- automated tests for critical flows;
- production deployment;
- error logging;
- documented backup/recovery process.
