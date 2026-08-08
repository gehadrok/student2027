# ACADEMIC_INTEGRATION_READINESS.md

**Status:** ❌ NOT READY — Integration Tests BLOCKED
**Scope:** Academic Domain only
**Date:** Implementation Readiness Review
**Constraint:** Documentation Freeze active. No UI, no SQL, no architecture changes in this review.

---

## Decision

Per the Step 8 (Integration Tests) gate: *"If any dependency is not ready, do NOT implement Integration Tests."*

Several critical dependencies are **NOT READY**. Therefore **Integration Tests must NOT be implemented at this time**. The blockers below must be resolved first.

---

## Readiness Assessment

| # | Item | Status | Evidence / Blocker |
|---|------|--------|--------------------|
| 1 | **Repository interfaces** | 🔴 NOT READY | `src/core/repositories/index.ts` exports only Student/Teacher/Financial/MasterData/Dashboard. **No `IAcademicYearRepository`, `IAcademicReadRepository`, `IAcademicStructureRepository`, `ICurriculumRepository`, `ICourseAssignmentRepository`, etc. exist as files.** `TODO-phase5.0.md` Step 5 is marked ✅ but no interface files are present on disk. |
| 2 | **Repository implementations** | 🔴 NOT READY | `src/modules/academic/` contains only `domain/` and `tests/`. **No `infrastructure/repositories/` folder exists.** No mappers, no SQL statements, no concrete repository classes. |
| 3 | **IDataSource wiring** | 🟢 READY | `IDataSource` (query/queryOne/execute/transaction/prepare/count/exists/beginTransaction/commit/rollback), `SQLiteDataSource`, and `DataSourceFactory` are all present and functional. `bootstrap/index.ts` registers `DataSource` in DI. |
| 4 | **DI registrations** | 🔴 NOT READY | `src/core/bootstrap/index.ts` `SERVICE_IDS` and registrations cover only Student/Teacher/Financial/MasterData/Dashboard repositories. **No academic repository or academic application service is registered.** |
| 5 | **UnitOfWork integration** | 🟡 PARTIAL | `UnitOfWork` class exists in `src/core/datasource/UnitOfWork.ts` and `IDataSource.transaction()` is available. However, **no academic repository uses UnitOfWork** — there is no academic persistence code to integrate it with. |
| 6 | **Transaction support** | 🟢 READY | `IDataSource` provides `transaction(queries)`, `beginTransaction()`, `commit()`, `rollback()`. `MasterDataRepository.bulkDelete` demonstrates working transaction usage. |
| 7 | **Aggregate persistence** | 🔴 NOT READY | `AcademicYear` aggregate has `rehydrate()` and `pullDomainEvents()`, but **no repository/mapper exists to persist or load it** from the data source. No SQL mapping layer present. |
| 8 | **Event dispatch readiness** | 🟡 PARTIAL | `EventBus` (publish/subscribe) exists and `AcademicYear.pullDomainEvents()` returns domain events. However, **no wiring dispatches academic domain events to the EventBus** — no repository/application service publishes them. |

---

## Summary

| Status | Count |
|--------|-------|
| 🟢 READY | 2 (`IDataSource wiring`, `Transaction support`) |
| 🟡 PARTIAL | 2 (`UnitOfWork integration`, `Event dispatch readiness`) |
| 🔴 NOT READY | 4 (`Repository interfaces`, `Repository implementations`, `DI registrations`, `Aggregate persistence`) |

---

## Blockers (must be resolved before Integration Tests)

### Blocker 1 — Academic Repository Interfaces Do Not Exist
- **What is missing:** `IAcademicYearRepository`, `IAcademicReadRepository`, `IAcademicStructureRepository`, `ICurriculumRepository`, `ICourseAssignmentRepository`, `IAcademicCalendarRepository`, `IClassScheduleRepository`, `ITeachingLoadReadRepository`.
- **Why it blocks:** Integration tests require a repository contract to test against. The interfaces listed in `TODO-phase5.0.md` Step 5 are not present on disk.
- **Required before unblocking:** Create the repository interface files and export them from a barrel.

### Blocker 2 — Academic Repository Implementations Do Not Exist
- **What is missing:** The `infrastructure/repositories/` layer under `src/modules/academic/` with concrete repository classes, mappers, and SQL.
- **Why it blocks:** There is nothing to integrate with the data source.
- **Required before unblocking:** Implement concrete repositories injecting `IDataSource` (following the `MasterDataRepository` constructor-DI pattern) plus entity↔row mappers.

### Blocker 3 — No DI Registration for Academic Servs
- **What is missing:** Academic repositories/services are not registered in `src/core/bootstrap/index.ts` `SERVICE_IDS` or the container.
- **Why it blocks:** Integration tests resolving repositories through the container (or the app wiring) will fail fast.
- **Required before unblocking:** Register academic repository singletons and add them to the mandatory-registration audit.

### Blocker 4 — No Aggregate Persistence Layer
- **What is missing:** A mapper/repository that persists `AcademicYear` (with child `AcademicTerm`, `AcademicYearStatusHistory`) to `academic_years` / `academic_terms` tables and rehydrates it from the DB.
- **Why it blocks:** Integration tests verify round-trip persistence (save → load → compare). Without a persistence layer this cannot be tested.
- **Required before unblocking:** Implement the aggregate persistence + rehydration path.

### Blocker 5 — UnitOfWork Not Used by Academic Repos
- **What is missing:** Academic repositories must group multi-entity writes (year + terms + status history) through `UnitOfWork`/`IDataSource.transaction()`.
- **Why it blocks:** Integration tests verify atomic multi-row writes and rollback behavior.
- **Required before unblocking:** Wire `UnitOfWork` into the academic repository commit paths.

### Blocker 6 — Domain Events Not Dispatched to EventBus
- **What is missing:** After persisting, academic repositories/services must call `pullDomainEvents()` and `EventBus.publish(...)` for each event.
- **Why it blocks:** Integration tests verify side effects (e.g. `AcademicYearCreated` published after save).
- **Required before unblocking:** Add event dispatch wiring in the academic persistence/application layer.

---

## Recommended Next Phase (defer Integration Tests)

Resolve the blockers in this order:

1. **Create academic repository interfaces** (Blocker 1)
2. **Implement academic infrastructure repositories + mappers** (Blockers 2 & 4)
3. **Wire UnitOfWork into academic persistence** (Blocker 5)
4. **Wire event dispatch to EventBus** (Blocker 6)
5. **Register academic services in `bootstrap` DI** (Blocker 3)
6. **Re-run this readiness review** — expect all 8 items READY
7. **Then implement Step 8 Integration Tests**

---

## Constraint Compliance

- ✅ No UI modified
- ✅ No SQL modified
- ✅ No architecture modified
- ✅ Documentation Freeze respected (no new ADR/RFC/governance docs)
