# PHASE 4.1 — Platform Readiness Remediation

**Constraint:** Documentation Freeze is active. This phase resolves ONLY the blockers in the Implementation Readiness Report. No new features, no Academic Domain implementation.

## Steps

- [x] 1. Wire `initializeInfrastructure()` into application startup (`src/main.tsx`)
- [x] 2. Update `src/core/bootstrap/index.ts`:
  - Add `Auth: 'core.Auth'` to `SERVICE_IDS`
  - Register `AuthService`
  - Register all repository singletons + `DashboardService`
  - Add execute-once guard
  - Add fail-fast mandatory registration validation
  - Log initialization steps through platform Logger
- [x] 3. Fix security barrel exports (`src/core/security/index.ts`) — export `Session` from `SessionService`
- [x] 4. Fix master-data service static access (`src/modules/master-data/services/masterDataService.ts`) — use singleton `masterDataRepository`
- [x] 5. Fix master-data hook type (`src/modules/master-data/hooks/useMasterData.ts`) — `unknown[]` → `string[]`
- [x] 6. Fix attendance screen imports (`src/screens/AttendanceScreen.tsx`) — add `React` / `useState`
- [x] 7. Verify: TypeScript (`npx tsc --noEmit`) → 0 errors
- [x] 8. Verify: Production build (`npm run build`) → exit 0, 2346 modules
- [x] 9. Verify: Startup + health endpoint (`GET /api/health`) → HTTP 200 `{"status":"ok","aiEnabled":false}`
- [x] 10. Verify: Smoke tests + DI registration verification → 20/20 services registered & resolvable
- [x] 11. Generate `docs/platform-readiness-remediation-report.md`
- [x] 12. STOP — do not begin Phase 5.0

