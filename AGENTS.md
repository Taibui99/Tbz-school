# TBZ School — Agent Instructions

You are a coding agent working on TBZ School.

## Mandatory reading

Before making changes, read:
1. `PRD.md`
2. `ARCHITECTURE.md`
3. `TASKS.md`
4. `DECISIONS.md`

Then inspect the existing repository.

## Mission

Build TBZ School as specified by the project documents.

The most important product concerns are:
1. safe and flexible resource storage;
2. correct permissions/privacy;
3. reliable viewing and interaction;
4. low-cost/free-first infrastructure;
5. maintainable architecture.

## Non-negotiable rules

1. Do not implement the whole roadmap in one pass.
2. Work on one phase or explicit task group at a time.
3. Do not silently change architecture.
4. Do not add unrequested product features.
5. Do not expose secrets to the browser.
6. Never put Supabase service-role credentials or storage secrets in client code.
7. Never make private files public just to make a viewer easier.
8. Never trust owner_id, visibility, or permission values supplied by the client.
9. Every sensitive database table must have appropriate RLS.
10. Every sensitive server operation must perform authorization.
11. Large files must not unnecessarily pass through the application server.
12. Keep storage provider APIs behind the storage abstraction.
13. Database schema changes must be migrations.
14. Do not modify production data manually during development.
15. Preserve working functionality.
16. Prefer small, reversible changes.
17. Use strict TypeScript.
18. Avoid `any`.
19. Validate all external input.
20. Handle loading, empty, error, and permission-denied states.
21. Write tests for critical logic.
22. Update documentation when architecture changes.
23. Do not commit secrets, `.env`, service keys, or generated credentials.
24. Do not claim a task is complete unless acceptance criteria pass.

## Workflow

For each task:

1. Read the relevant project docs.
2. Inspect existing implementation.
3. State a short implementation plan.
4. Implement the smallest coherent change.
5. Run relevant tests.
6. Run typecheck.
7. Run lint.
8. Run build when relevant.
9. Fix failures caused by your change.
10. Update `TASKS.md`.
11. Update `DECISIONS.md` if a decision changed.
12. Summarize:
   - files changed;
   - behavior added;
   - commands run;
   - test results;
   - known limitations.
13. Stop.

Do not continue to a later phase without instruction.

## Database rules

- Use migrations.
- Use explicit foreign keys.
- Use appropriate indexes.
- Use timestamps.
- Prefer soft deletion where required.
- Review RLS for every new table.
- Never use application-only authorization as the sole security layer.

## Storage rules

- Use the storage provider abstraction.
- Private files use short-lived signed URLs.
- Do not expose object-storage credentials.
- Validate uploads before creating/finalizing objects.
- Track provider, key, MIME, size, and hash.
- Do not physically delete shared/deduplicated objects while references exist.
- Clean abandoned multipart uploads where applicable.

## Viewer rules

- Viewer selection is resource-type driven.
- Unsupported types get an honest fallback.
- Viewer state must not become the source of truth for permissions.
- Annotation data is separate from original bytes.

## UI rules

- Reuse existing components.
- Prefer accessible semantic controls.
- Do not introduce visual complexity without product value.
- Keep responsive behavior in mind.
- Do not hide authorization failures as generic 404s unless there is a security reason.

## Git rules

Use clear commits:
- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

Do not rewrite history unless explicitly asked.

## Stopping conditions

Stop and ask for clarification if:
- a required architecture decision is missing;
- credentials/service configuration is unavailable;
- a task conflicts with `PRD.md` or `ARCHITECTURE.md`;
- a change would materially alter storage/privacy/security architecture;
- requirements are ambiguous enough that guessing could create data loss or security risk.
