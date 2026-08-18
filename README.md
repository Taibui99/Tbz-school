# TBZ School

Nền tảng lưu trữ, tổ chức và tương tác tài liệu học tập dành cho học sinh.

Mô hình tổ chức: **Workspace → Collection → Lesson → Resource**

Tài liệu đặc tả nằm tại:

- [PRD.md](./PRD.md) — sản phẩm
- [ARCHITECTURE.md](./ARCHITECTURE.md) — kiến trúc kỹ thuật
- [DECISIONS.md](./DECISIONS.md) — quyết định kiến trúc (ADR)
- [TASKS.md](./TASKS.md) — danh sách nhiệm vụ theo phase
- [AGENTS.md](./AGENTS.md) — hướng dẫn cho coding agent

## Công nghệ

- Next.js (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui (Base UI)
- Supabase PostgreSQL + Auth
- Cloudflare R2 (lưu file lớn)
- Vercel (deploy)

## Bắt đầu

```bash
npm install
cp .env.example .env.local   # điền giá trị thật khi cần
npm run dev                  # http://localhost:3000
```

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # chạy bản build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

## Cấu trúc

```
app/          routes, layouts, error/loading/not-found states
components/   UI components (components/ui = shadcn)
features/     UI & workflow theo từng domain (auth, workspace, resources, ...)
services/     business logic (resource, permission, storage, quota, ...)
lib/          clients, validators, utils, env validation
hooks/        React hooks dùng chung
types/        type dùng chung
tests/        unit tests (vitest)
```

## Trạng thái

- [x] Phase 0–1: khởi tạo ứng dụng (Next.js, TypeScript, Tailwind, shadcn/ui, app shell, error states, health check, env validation, tests)
- [x] Phase 2: Supabase + database (migration 17 bảng + indexes + RLS + grants + seed, đã push lên production; Supabase clients)
- [x] Phase 3: Authentication (đăng ký/đăng nhập/đăng xuất, session qua `proxy.ts`, đặt lại mật khẩu, hồ sơ + avatar, routes bảo vệ)
- [x] Phase 4: Workspace & organization (`/kho`: workspace/collection/lesson CRUD, reorder, move resource, sidebar + breadcrumbs, fix RLS recursion)
- [x] Phase 5: Resource core (CRUD + soft delete/restore, external resource, tags, favorites, recently opened, download rules, resource details page)
- [x] Phase 6: Storage abstraction (StorageProvider, R2 + Supabase Storage + external providers, signed read/upload URLs, error mapping)
- [x] Phase 7: Upload engine (session action, direct browser→storage via signed PUT, finalize with SHA-256, quota 250 MB, cancel/cleanup)
- [x] Phase 7.2: Upload UX (progress bar via XHR, cancel/retry/error states, abandoned-upload cleanup)
- [x] Phase 32: Video qua YouTube (ADR-022 — resource video lưu `youtube_id`, viewer embed YouTube không tốn storage; quota/user 250 MB; ADR-023 — kho video trung tâm qua YouTube Data API v3 + Google OAuth, tiêu đề `[User | TBZ School | tên file]`, connect admin-only; ADR-024 — đăng nhập bằng Google)
- [ ] Phase 8+: xem [TASKS.md](./TASKS.md)