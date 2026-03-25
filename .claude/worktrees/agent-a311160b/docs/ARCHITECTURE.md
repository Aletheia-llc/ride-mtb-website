# Ride MTB — Architecture Reference

## Module-Based Architecture

The codebase is organized into self-contained modules under `src/modules/`. Each module owns its components, actions, queries, hooks, and types.

### Directory Structure

- `src/app/` — Thin route wrappers (metadata, Suspense, dynamic imports)
- `src/modules/` — Self-contained feature modules
- `src/ui/` — Pure design system (zero server imports)
- `src/lib/` — Server infrastructure (db, auth, middleware)
- `src/shared/` — Shared types, Zod schemas, constants

## Module Boundary Rules

1. **Modules import from `ui/`, `lib/`, `shared/`, `generated/` — never from other modules' internals**
2. **Types can be imported across modules via barrel files** (type-only imports)
3. **Cross-module UI composition happens in the route layer** (render props)
4. **Barrel files define the public API** — direct internal imports are banned

### ESLint Enforcement

The `no-restricted-imports` rule bans: `@/modules/*/components/*`, `@/modules/*/lib/*`, `@/modules/*/hooks/*`, `@/modules/*/actions/*`

## Thin Route Wrapper Convention

Route files in `src/app/` handle:
- `export const metadata` — SEO
- `export const revalidate` — ISR
- `<Suspense>` boundaries — streaming
- `dynamic()` imports — heavy components
- Cross-module composition

Route files do NOT contain: business logic, database queries, state management, component implementation.

## Server Actions Convention

Server Actions live in `modules/{name}/actions/`. Pattern:
1. `requireAuth()` — verify user
2. `rateLimit()` — prevent abuse
3. Validate input (Zod schema)
4. Sanitize content (if UGC)
5. Call query function
6. Grant XP (if applicable)

## Database Queries Convention

ALL Prisma queries live in `modules/{name}/lib/queries.ts`. Direct Prisma calls in `app/` routes are banned.

## Testing Strategy

| Type | Tool | Location |
|------|------|----------|
| Unit | Vitest | Colocated `*.test.ts` |
| Component | Vitest + RTL | Colocated `*.test.tsx` |
| E2E | Playwright | `e2e/` directory |

## How to Add a New Module

1. Create `src/modules/yourmodule/` with `index.ts`, `components/`, `actions/`, `lib/queries.ts`, `hooks/`, `types/`
2. Create `src/app/yourmodule/` with `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `page.tsx`
3. Create `src/app/api/yourmodule/` for REST endpoints
4. Add barrel exports in `modules/yourmodule/index.ts`
5. Add to `src/shared/constants/routes.ts`
6. Add XP events (if applicable): enum values + `XP_VALUES` + `XP_MODULES`
7. Add feature flag (if not public): `lib/flags.ts` + layout guard
8. Add E2E test: `e2e/yourmodule.spec.ts`
9. Generate Prisma migration (from main branch only)
10. Update this document with module-specific conventions

## Key Files

- `src/lib/db/client.ts` — Prisma singleton with PgBouncer pool
- `src/lib/auth/config.ts` — NextAuth v5 configuration
- `src/lib/auth/guards.ts` — requireAuth(), requireAdmin(), requireRole()
- `src/lib/rate-limit.ts` — Upstash Redis rate limiter
- `src/lib/sanitize.ts` — DOMPurify HTML sanitization
- `src/lib/env.ts` — Zod environment validation
- `src/lib/flags.ts` — Feature flags
- `src/modules/xp/lib/engine.ts` — XP grant engine
- `src/shared/constants/routes.ts` — Typed route manifest
