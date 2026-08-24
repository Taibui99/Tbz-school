# Tbz cloud — Architecture

## 1. High-level architecture

Browser
  ↓
Next.js application
  ├── UI
  ├── Server actions / route handlers
  ├── feature services
  └── authorization checks
       ↓
Supabase
  ├── PostgreSQL
  └── Auth

Storage abstraction
  ├── Cloudflare R2
  ├── Supabase Storage
  └── External URL/provider

The UI must never contain provider-specific storage logic.

## 2. Technology baseline

- Next.js
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Cloudflare R2
- Vercel deployment

Use the current stable versions compatible with the repository. Do not upgrade major dependencies arbitrarily.

## 3. Application layers

### Presentation
`app/`, `components/`

Responsible for:
- rendering;
- interaction;
- loading/error/empty states;
- accessibility.

Must not contain storage-provider implementation.

### Features
`features/`

Domain-focused UI and workflows:
- auth;
- workspace;
- resources;
- viewer;
- annotations;
- sharing;
- search;
- library;
- admin.

### Services
`services/`

Business logic:
- resource service;
- permission service;
- storage service;
- quota service;
- search service;
- activity service.

### Infrastructure
`lib/`

Clients, validators, adapters, utilities.

## 4. Storage abstraction

Define a provider interface similar to:

```ts
interface StorageProvider {
  createUploadSession(input: CreateUploadInput): Promise<UploadSession>;
  completeUpload(input: CompleteUploadInput): Promise<StoredObject>;
  getSignedReadUrl(input: SignedReadUrlInput): Promise<string>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  getMetadata(input: GetMetadataInput): Promise<StorageMetadata>;
  objectExists(input: ObjectExistsInput): Promise<boolean>;
}
```

Implementations:
- `R2StorageProvider`
- `SupabaseStorageProvider`
- `ExternalResourceProvider` only for reference-style resources

Provider selection belongs to service/configuration layers, not React components.

## 5. Resource model

A resource contains:
- identity;
- owner/workspace relationships;
- title/description;
- type/mime;
- visibility;
- storage provider/reference;
- size/hash;
- lifecycle state;
- metadata.

For stored files:
- metadata is in PostgreSQL;
- bytes are in object storage.

For external resources:
- URL/reference is in PostgreSQL;
- no local object is required.

## 6. Upload architecture

Preferred flow:

1. Client requests an upload session.
2. Server authenticates user.
3. Server validates file name/type/size/quota.
4. Server creates a pending resource.
5. Server returns a signed upload target.
6. Browser uploads directly to the storage provider.
7. Client asks server to complete the upload.
8. Server verifies object metadata.
9. Resource becomes `ready`.

For large files use multipart/resumable upload where the provider supports it.

Never send large media through the Next.js server unless a specific processing step requires it.

## 7. Private access

Private objects must not be publicly exposed.

Flow:
1. User asks to open a resource.
2. Server resolves resource.
3. Server checks authorization.
4. Server requests short-lived signed access URL.
5. Browser loads from storage/CDN.

Signed URLs must have short practical expiry times.

## 8. Database and authorization

Use Supabase RLS as a database-level safety layer.

Server-side authorization must also exist for sensitive operations.

Never trust:
- owner_id from the browser;
- visibility from the browser;
- permission claims from the browser.

The server determines the acting user from the authenticated session.

## 9. Core data relationships

```text
profiles
  ↓
workspaces
  ↓
collections
  ↓
lessons
  ↓
resources
  ├── resource_files
  ├── external_resources
  ├── annotations
  ├── favorites
  ├── tags
  └── activity
```

Sharing/permissions are separate relationships.

## 10. Resource lifecycle

```text
draft
→ uploading
→ processing
→ ready
→ failed

ready
→ deleting
→ deleted
```

Soft deletion is preferred before permanent deletion.

## 11. Annotation architecture

Annotations never mutate the original file.

Store:
- resource id;
- user id;
- annotation type;
- page/time position;
- coordinates;
- visual properties;
- content;
- timestamps.

Render original + annotation layer.

## 12. Viewer architecture

Create one entry component:

`ResourceViewer`

It dispatches based on resource type:

- `PdfViewer`
- `VideoViewer`
- `ImageViewer`
- `OfficeViewer`
- `AudioViewer`
- `ExternalViewer`
- `UnsupportedViewer`

Viewer-specific state must be isolated from the generic resource model.

## 13. Deduplication

Compute SHA-256 or equivalent content hash when feasible.

Do not expose storage internals to clients.

Future model:
- one physical object;
- multiple logical resources/references.

Do not delete a physical object while logical references still exist.

## 14. Quotas

Track:
- storage used;
- storage limit;
- file count;
- optional upload/day limits.

Quota enforcement must happen server-side before upload sessions are issued.

## 15. Search

Start with PostgreSQL search:
- indexed title;
- description;
- tags;
- optionally extracted text later.

Do not add Algolia/Elasticsearch/Typesense until scale requires it.

## 16. Public content

Public resources are discoverable.

Public resource pages must not leak:
- private annotations;
- private owner metadata;
- private folder structure;
- storage credentials.

## 17. External resources

External resources are first-class resources.

Store:
- canonical URL;
- provider/type;
- title;
- optional thumbnail/metadata;
- visibility;
- owner relationships.

External resources may not be downloadable through Tbz cloud unless the provider explicitly permits it.

## 18. Security requirements

Never:
- commit secrets;
- expose Supabase service role keys in the browser;
- expose R2 credentials;
- use public buckets for private data;
- trust client-provided owner/permission fields;
- bypass authorization to simplify a viewer.

Must use:
- input validation;
- authorization;
- RLS;
- signed URLs;
- rate limiting where appropriate;
- safe filename handling;
- file-size/type limits;
- security headers as appropriate.

## 19. Performance requirements

- paginate large lists;
- lazy-load viewers;
- avoid loading entire file lists unnecessarily;
- use thumbnails/previews;
- use CDN/storage URLs for large media;
- index frequent database queries;
- avoid N+1 requests.

## 20. Mobile

All core flows must work on narrow screens:
- login;
- browse;
- upload;
- resource open;
- search;
- share.

## 21. Deployment

Production:
- Vercel: application
- Supabase: database/auth
- Cloudflare R2: large files

Development and production must use separate environment configurations.

## 22. Environment variables

Never commit `.env`.

Provide `.env.example` with variable names only.

Separate public browser-safe variables from server-only secrets.

## 23. Architectural change rule

If a task requires changing a core architecture decision:
1. stop;
2. explain why;
3. update `DECISIONS.md`;
4. update affected docs;
5. wait for approval unless the change is explicitly authorized.
