# PostgreSQL R4 — Dual Database Instances: Read-Only Audit

**Task:** Blocker 2 — Dual Database Instances (READ-ONLY AUDIT ONLY)
**Date:** 2026-08-23
**Mode:** Audit. No production code, SQL, schema, migrations, UI, tests,
package.json, or PostgreSQL configuration were modified. `getRealmDB` /
`saveRealmDB` were NOT deleted. The 28 browser-local screens were NOT modified.
No PostgreSQL implementation was started.

---

## 1. Executive Summary

The application today maintains **two independent physical SQLite databases**
that hold the same business schema but are never synchronized:

1. **Browser-local SQLite (sql.js)** — persisted to `localStorage` key
   `al_salam_school_sqlite_db_v1` (Base64 sql.js binary). The SPA reads and
   writes this database **directly** from React screens via `src/lib/db.ts`
   (`getRealmDB` / `saveRealmDB`) and `src/lib/sqlite-repository.ts`
   (`SQLiteRepository`), and also through the DDD service/repository layer
   (`DataSourceFactory` -> `SQLiteDataSource` -> the same browser `getSQLiteDB()`).
2. **Server-side SQLite (sql.js)** — persisted to `data/al-salam-server.db`
   on the Node/Express host. Only the **Academic module** and the AI proxy
   reach it, exclusively through the REST API
   (`/api/academic/*`, `/api/ai/*`).

Both databases are initialized from the identical `sqlite-schema.sql` +
`sqlite-seed.sql`, so they start identical but **diverge immediately** because
every write goes to only one of them and **no synchronization mechanism exists**
between browser and server (only an in-process `subscribeDB` pub/sub exists,
within a single browser tab).

Consequence: the 28 legacy screens, `MasterDataCenter`, `AdminDashboard`, and
the master-data/reference-data lookups operate against the **browser-local**
store, while the Academic module operates against the **server** store. For a
PostgreSQL migration the canonical rule is *Browser UI -> Hooks -> API client ->
REST API -> Services -> Repository -> IDataSource -> PostgreSQL*; the browser
store must stop being an authoritative business-data store.

**Verdict: BLOCKED — SPECIFICATION/ARCHITECTURE DECISION REQUIRED** (see §20).
Blocking decisions: (a) offline / browser-local fallback policy, (b) ownership
of Calendar events, Documents, and Audit logs, (c) session/credential strategy,
(d) data-migration plan for existing browser-local business data, and (e) the
large missing REST API surface (~15 domains have no server endpoint today).

---

## 2. Current Architecture

```
[ Browser SPA ]                                      [ Node/Express Server ]
                                                 
Screens (28) ──getRealmDB/saveRealmDB──> lib/db.ts      
   │                                            SQLiteRepository ──> getSQLiteDB()  (localStorage sql.js)
   │                                                                     
MasterDataCenter ──masterDataService──> masterDataRepository               
   │                                            └─> DataSourceFactory ─> SQLiteDataSource ─> getSQLiteDB()  (BROWSER DB)
useReferenceData/ReferenceDataProvider ──querySqlSync──> getSQLiteDB()  (BROWSER DB)
                                                 
AdminDashboard ──dashboardService──> *Repositories ─> DataSourceFactory ─> SQLiteDataSource (BROWSER DB)
                                                 
Academic hooks ──academicApiClient(fetch)──> /api/academic/* ──> controllers                 
                                                              └─> *Repositories ─> DataSourceFactory ─> SQLiteDataSource ─> getSQLiteDB()  (SERVER DB: data/al-salam-server.db)
                                                 
ai-client ──fetch──> /api/ai/* ──> server (analysis only)
```

Two `getSQLiteDB()` singletons exist at runtime, one per process:
- In the browser, `sqlite-engine.getSQLiteDB()` resolves to the **localStorage** sql.js instance.
- In the Node server, the same function resolves to the **file** sql.js instance
  (`data/al-salam-server.db`); `sqlite-engine.ts:51` shows the file path, and
  `:158` persists to it.

`DataSourceFactory` (`core/datasource/DataSourceFactory.ts`) currently returns
only `SQLiteDataSource` for both browser and server builds. There is **no**
`RestApiDataSource` yet (commented-out future in `:39-43`).

---

## 3. Browser Database Inventory

All entries below write/read the **browser-local** sql.js database unless noted
as raw `localStorage` JSON (a separate store from sql.js).

### 3.1 Direct `lib/db.ts` consumers (getRealmDB / saveRealmDB / addAuditLog /
subscribeRealmDB / addSavedReportLog / deleteSavedReportLog / setCurrentUser /
getCurrentUser)

| # | File | Symbols imported | Persists via |
|---|------|------------------|--------------|
| 1 | src/App.tsx | getCurrentUser, setCurrentUser | lib/db (current user) |
| 2 | src/screens/AIInsightsScreen.tsx | getRealmDB | lib/db |
| 3 | src/screens/CalendarScreen.tsx | getRealmDB, getCurrentUser, addAuditLog | lib/db + localStorage(STORAGE_KEY) |
| 4 | src/components/UnifiedPrintLayout.tsx | getRealmDB | lib/db |
| 5 | src/screens/CertificatesScreen.tsx | getRealmDB | lib/db |
| 6 | src/components/TeacherProfileDashboard.tsx | getRealmDB, addAuditLog | lib/db |
| 7 | src/screens/DocumentCenterScreen.tsx | getRealmDB, getCurrentUser, addAuditLog | lib/db + localStorage(STORAGE_KEY) |
| 8 | src/components/SwitchUserModal.tsx | getRealmDB, setCurrentUser | lib/db |
| 9 | src/screens/ClassesScreen.tsx | getRealmDB, saveRealmDB, addAuditLog | lib/db |
| 10 | src/components/StudentProfileDashboard.tsx | getRealmDB, saveRealmDB, addAuditLog | lib/db |
| 11 | src/screens/GradesScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 12 | src/components/AIChatAssistant.tsx | getCurrentUser, getRealmDB | lib/db |
| 13 | src/screens/FinancialScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 14 | src/components/ActiveReportPrintView.tsx | RealmDatabase (type) | (type only; data passed in) |
| 15 | src/screens/AttendanceScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 16 | src/screens/ReportsScreen.tsx | getRealmDB, subscribeRealmDB, addSavedReportLog, deleteSavedReportLog | lib/db |
| 17 | src/screens/TimetableScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 18 | src/screens/LibraryScreen.tsx | getRealmDB, saveRealmDB, addAuditLog | lib/db |
| 19 | src/screens/ParentDashboard.tsx | getRealmDB, getCurrentUser | lib/db |
| 20 | src/screens/TeachersScreen.tsx | getRealmDB, saveRealmDB, addAuditLog | lib/db |
| 21 | src/components/ReportPreviewModal.tsx | getRealmDB, addSavedReportLog | lib/db |
| 22 | src/screens/StudentsScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 23 | src/screens/SubjectsScreen.tsx | getRealmDB, saveRealmDB, addAuditLog | lib/db |
| 24 | src/screens/TeacherDashboard.tsx | getRealmDB, getCurrentUser | lib/db |
| 25 | src/screens/StudentDashboard.tsx | getRealmDB, getCurrentUser | lib/db |
| 26 | src/components/GlobalSearchBar.tsx | getRealmDB | lib/db + localStorage(user docs) |
| 27 | src/components/NotificationCenter.tsx | getRealmDB, saveRealmDB, addAuditLog, getCurrentUser | lib/db |
| 28 | src/screens/SettingsScreen.tsx | getRealmDB, saveRealmDB, addAuditLog, subscribeRealmDB, getCurrentUser | lib/db |
| 29 | src/components/LoginScreen.tsx | getRealmDB, setCurrentUser, addAuditLog | lib/db |

### 3.2 Indirect browser-local consumers (through DDD layer / engine)

| File | Mechanism | Store |
|------|-----------|-------|
| src/modules/master-data/screens/MasterDataCenter.tsx | masterDataService -> masterDataRepository -> DataSourceFactory -> SQLiteDataSource -> getSQLiteDB() | BROWSER sql.js |
| src/modules/master-data/hooks/useMasterData.ts | masterDataService | BROWSER sql.js |
| src/modules/master-data/hooks/useMasterLookup.ts | masterDataService | BROWSER sql.js |
| src/modules/master-data/services/masterDataService.ts | masterDataRepository | BROWSER sql.js |
| src/screens/AdminDashboard.tsx | dashboardService -> dashboardRepository -> DataSourceFactory -> SQLiteDataSource | BROWSER sql.js |
| src/modules/dashboard/services/dashboardService.ts | *Repositories -> DataSourceFactory | BROWSER sql.js |
| src/modules/dashboard/repository/dashboardRepository.ts | studentRepository/teacherRepository/financialRepository -> DataSourceFactory | BROWSER sql.js |
| src/lib/reference-data/useReferenceData.ts | querySqlSync / getSQLiteDB() | BROWSER sql.js |
| src/lib/reference-data/ReferenceDataProvider.tsx | querySqlSync | BROWSER sql.js |
| src/modules/teachers/repository/teacherRepository.ts | DataSourceFactory (registered in bootstrap) | BROWSER sql.js (when run in browser) |
| src/modules/students/repository/studentRepository.ts | DataSourceFactory | BROWSER sql.js |
| src/modules/financial/repository/financialRepository.ts | DataSourceFactory | BROWSER sql.js |
| src/modules/teachers/services/teacherService.ts | teacherRepository | BROWSER sql.js |
| src/modules/students/services/studentService.ts | studentRepository | BROWSER sql.js |
| src/modules/financial/services/financialService.ts | financialRepository | BROWSER sql.js |

### 3.3 Raw `localStorage` JSON stores (separate from sql.js)

| Key | File | Contents | Class |
|-----|------|----------|-------|
| al_salam_school_sqlite_db_v1 | sqlite-engine.ts:86,176,193 | Full sql.js binary (the browser DB itself) | (infra) |
| al_salam_school_current_user_v1 | db.ts:10,178,193 | Active user object | B |
| al_salam_school_extended_settings_v1 | sqlite-repository.ts:95,129 | Extended school settings overlay | B/D |
| (CalendarScreen STORAGE_KEY) | CalendarScreen.tsx:153,181 | Calendar events JSON | A/D |
| (DocumentCenterScreen STORAGE_KEY) | DocumentCenterScreen.tsx:214,250 | Documents JSON | A/D |
| al_salam_school_user_documents_v2 | GlobalSearchBar.tsx:206 | User documents | A/D |
| (AuditService storageKey) | core/audit/AuditService.ts:20,31 | Audit log entries JSON | A |
| SESSION_KEY | core/security/SessionService.ts:60,105,133 | Auth session | B |
| LocalStorageProvider keys | core/storage/LocalStorageProvider.ts | Generic KV (UI/prefs) | B |

---

## 4. Server Database Inventory

- **Physical store:** `data/al-salam-server.db` (sql.js binary on disk), created
  in `sqlite-engine.ts:getSQLiteDB()` -> `persistSQLiteDB()` when `nodeRuntime`
  is present.
- **Schema/seed:** identical `sqlite-schema.sql` + `sqlite-seed.sql`.
- **Writers (today):**
  - Academic REST controllers -> `SQLiteAcademicYearRepository`,
    `SQLiteCurriculumRepository`, `SQLiteCourseAssignmentRepository`,
    `SQLiteAcademicCalendarRepository` (all via `DataSourceFactory` ->
    `SQLiteDataSource` -> server `getSQLiteDB()`).
  - AI proxy (`/api/ai/*`) reads/derives only; no authoritative business write.
- **Readers (today):** only the Academic UI hooks (`useAcademicYears`,
  `useCurriculums`, `useCourseAssignments`, `useAcademicCalendar`) via
  `academicApiClient` (fetch `/api/academic/*`).
- **No other domain** (students, teachers, finance, library, master data,
  attendance, grades, etc.) is ever written or read on the server. The server DB
  therefore holds **only Academic-domain data**; all other domains exist on the
  server only as seed.

---

## 5. Complete Caller Matrix

Each caller below is the browser-local path. Direction: **R** = read,
**W** = write, **both** = read+write — all against the **browser-local** store.
API equiv. = current REST equivalent (almost all = none / to-be-built).

| Caller | Mechanism | Tables / data | Dir | API equiv. | Divergence risk | Class |
|--------|-----------|---------------|-----|------------|-----------------|-------|
| App.tsx | getCurrentUser/setCurrentUser | users (session) | R/W | none | low (session) | B |
| AIInsightsScreen | getRealmDB | students/teachers/grades/payments | R | none | high | A |
| CalendarScreen | getRealmDB + localStorage | schedule + events JSON | R/W | none | high | A/D |
| UnifiedPrintLayout | getRealmDB | many (print) | R | none | high | A |
| CertificatesScreen | getRealmDB | certificates | R | none | high | A |
| TeacherProfileDashboard | getRealmDB + addAuditLog | teachers + audit | R/W | none | high | A |
| DocumentCenterScreen | getRealmDB + localStorage | documents JSON | R/W | none | high | A/D |
| SwitchUserModal | getRealmDB + setCurrentUser | users/session | R/W | none | med | B/A |
| ClassesScreen | getRealmDB/saveRealmDB | school_classes/sections | R/W | none | high | A |
| StudentProfileDashboard | getRealmDB/saveRealmDB | students | R/W | none | high | A |
| GradesScreen | getRealmDB/saveRealmDB | grade_records | R/W | none | high | A |
| AIChatAssistant | getRealmDB + getCurrentUser | users + AI ctx | R | none | med | A |
| FinancialScreen | getRealmDB/saveRealmDB | fee_payments/expense_records | R/W | none | high | A |
| ActiveReportPrintView | RealmDatabase (type) | passed-in snapshot | R | n/a | med | A |
| AttendanceScreen | getRealmDB/saveRealmDB | attendance_records | R/W | none | high | A |
| ReportsScreen | getRealmDB/subscribeRealmDB/addSavedReportLog/deleteSavedReportLog | saved_reports + audit | R/W | none | high | A |
| TimetableScreen | getRealmDB/saveRealmDB | schedule_periods | R/W | none | high | A |
| LibraryScreen | getRealmDB/saveRealmDB | library_books/book_borrowings | R/W | none | high | A |
| ParentDashboard | getRealmDB | students/parents | R | none | med | A |
| TeachersScreen | getRealmDB/saveRealmDB | teachers | R/W | none | high | A |
| ReportPreviewModal | getRealmDB/addSavedReportLog | saved_reports | R/W | none | med | A |
| StudentsScreen | getRealmDB/saveRealmDB | students | R/W | none | high | A |
| SubjectsScreen | getRealmDB/saveRealmDB | subjects | R/W | none | high | A |
| TeacherDashboard | getRealmDB | teachers | R | none | med | A |
| StudentDashboard | getRealmDB | students | R | none | med | A |
| GlobalSearchBar | getRealmDB + localStorage(docs) | users/students + docs | R | none | med | A |
| NotificationCenter | getRealmDB/saveRealmDB | app_notifications | R/W | none | high | A |
| SettingsScreen | getRealmDB/saveRealmDB + subscribeRealmDB | school_settings | R/W | none | high | A |
| LoginScreen | getRealmDB/setCurrentUser/addAuditLog | users/session/audit | R/W | none | med | B/A |
| MasterDataCenter | masterDataService->repo->SQLiteDataSource | all 33 master_data tables + master_data_audit_log | R/W | none | high | A |
| useMasterData / useMasterLookup | masterDataService | master_data tables | R/W | none | high | A |
| AdminDashboard | dashboardService->repos | students/teachers/payments/expenses + KPIs | R | none | high | A |
| useReferenceData / ReferenceDataProvider | querySqlSync | master_data tables (lookups) | R | none | high | A |
| teacherRepository/studentRepository/financialRepository (DDD) | DataSourceFactory | students/teachers/finance | R/W | none (bypassed by screens) | high | A/C |
| AuditService | localStorage | audit entries JSON | R/W | (none) | high | A |
| CalendarScreen/DocumentCenterScreen localStorage | localStorage | events/docs JSON | R/W | none | high | A/D |

---

## 6. Data Ownership Matrix

| Domain | Browser-local (authoritative today?) | Server (authoritative today?) | Intended canonical owner |
|--------|----------------------------------------|--------------------------------|---------------------------|
| Academic (years/terms/curriculums/assignments/calendar) | no | YES (via REST) | Server/PostgreSQL |
| Users / Students / Teachers / Parents | YES (getRealmDB) | seed only | Server/PostgreSQL (D) |
| Classes / Sections / Subjects | YES | seed only | Server/PostgreSQL |
| Schedule / Attendance / Grades / Certificates | YES | seed only | Server/PostgreSQL |
| Finance (payments/expenses) | YES | seed only | Server/PostgreSQL |
| Library (books/borrowings) | YES | seed only | Server/PostgreSQL |
| Notifications / Saved reports / Settings | YES | seed only | Server/PostgreSQL |
| Master data (33 tables) | YES (MasterDataCenter) | seed only | Server/PostgreSQL |
| Audit logs | split: SQL audit_logs (local) + AuditService localStorage | none | Server/PostgreSQL (D) |
| Calendar events / Documents (JSON) | YES (localStorage) | none | Server/PostgreSQL (D) |
| Session / current user | YES (localStorage) | none | Server (cookie/session) (B/D) |

---

## 7. Divergence Scenarios

1. **Create student in StudentsScreen** -> written only to browser-local sql.js.
   The server DB (and every other browser/device) has no record. Any server-side
   process (reports, Academic aggregates, future multi-user) cannot see it.
2. **Create academic year via REST** -> written only to server DB. The 28 legacy
   screens and master-data lookups read the browser DB and never see it.
3. **Two browser tabs** -> `subscribeDB` listeners live in a module-level `Set`
   within ONE JS context. Writes in tab A do not notify tab B; tab B keeps a
   stale in-memory snapshot until reload. Divergence across tabs.
4. **Clear browser storage / cache** -> the entire browser business dataset is
   lost; the server DB still holds only Academic data. Permanent divergence and
   data loss (no backup of browser-local store).
5. **Audit trail split** -> `addAuditLog` writes SQL `audit_logs`; `AuditService`
   writes a *separate* localStorage audit array. Two inconsistent audit sources.
6. **Credentials exposure** -> `users.password_hash` lives in the browser-local
   DB (Base64 in localStorage), readable by any script with localStorage access.

---

## 8. REST/API Coverage

| Domain | REST endpoint today? | Notes |
|--------|----------------------|-------|
| Academic (years, terms, curriculums, course-assignments, calendar) | YES (`/api/academic/*`) | Fully server-backed |
| AI proxy | YES (`/api/ai/*`) | Analysis only |
| Users / Students / Teachers / Parents | **NO** | No `/api/students` etc. |
| Classes / Sections / Subjects | **NO** | |
| Schedule / Attendance / Grades / Certificates | **NO** | |
| Finance (payments/expenses) | **NO** | |
| Library | **NO** | |
| Notifications / Saved reports / Settings | **NO** | |
| Master data (33 tables) | **NO** | MasterDataCenter is browser-local |
| Calendar events / Documents (JSON) | **NO** | |
| Audit logs | **NO** | |

**Missing API surface:** ~15 business domains have zero server endpoints. R4
cannot complete until these are built (or explicitly scoped out).

---

## 9. Screens Requiring Migration (Class A)

All of the following currently persist to the browser-local store and must be
rerouted through the REST API / `RestApiDataSource`:

AIInsightsScreen, CalendarScreen, CertificatesScreen, DocumentCenterScreen,
ClassesScreen, GradesScreen, FinancialScreen, AttendanceScreen, ReportsScreen,
TimetableScreen, LibraryScreen, ParentDashboard, TeachersScreen,
StudentsScreen, SubjectsScreen, TeacherDashboard, StudentDashboard,
NotificationCenter, SettingsScreen, LoginScreen, SwitchUserModal,
GlobalSearchBar, StudentProfileDashboard, TeacherProfileDashboard,
UnifiedPrintLayout, ActiveReportPrintView, ReportPreviewModal,
**MasterDataCenter**, **AdminDashboard**.

That is the referenced set of **28 browser-local DB screens** plus the two
master-data/dashboard screens that use the DDD layer instead of `lib/db`.

---

## 10. Hooks Requiring Migration (Class A)

- `src/lib/reference-data/useReferenceData.ts` (uses `querySqlSync` directly).
- `src/lib/reference-data/ReferenceDataProvider.tsx` (uses `querySqlSync`).
- `src/modules/master-data/hooks/useMasterData.ts` (via `masterDataService` ->
  browser `SQLiteDataSource`).
- `src/modules/master-data/hooks/useMasterLookup.ts` (same).
- (The Academic hooks `useAcademicYears/useCurriculums/useCourseAssignments/
  useAcademicCalendar` already use the REST API and are **excluded** — they are
  the target pattern.)

The fix for the master-data hooks is not to rewrite the hook, but to make
`DataSourceFactory` return a `RestApiDataSource` (or hybrid) in the browser
build so `masterDataRepository` talks to the server.

---

## 11. Services Requiring Migration (Class A)

- `src/modules/master-data/services/masterDataService.ts` (browser
  `masterDataRepository`).
- `src/modules/dashboard/services/dashboardService.ts` (browser repos).
- `src/modules/dashboard/repository/dashboardRepository.ts`.
- `src/modules/teachers/repository/teacherRepository.ts` +
  `services/teacherService.ts` (DDD, currently **bypassed** by screens that use
  `lib/db` — duplicate/obsolete path, see §12).
- `src/modules/students/repository/studentRepository.ts` +
  `services/studentService.ts` (same).
- `src/modules/financial/repository/financialRepository.ts` +
  `services/financialService.ts` (same).
- `src/core/audit/AuditService.ts` (localStorage audit -> should become server
  audit via `master_data_audit_log` / a server audit endpoint).
- `src/lib/db.ts` (`getRealmDB`/`saveRealmDB`/`addAuditLog`/`addSavedReportLog`/
  `deleteSavedReportLog`) — the central browser-local facade; must be retired or
  re-pointed once screens move to API.

---

## 12. Duplicated Repositories / Data-Access Paths

- **`SQLiteRepository` (`lib/sqlite-repository.ts`)** vs **module DDD
  repositories** (`teacherRepository`, `studentRepository`,
  `financialRepository`, `dashboardRepository`, `masterDataRepository`). Two
  parallel implementations of the same CRUD over the same tables. The 28 screens
  use `SQLiteRepository` (via `lib/db`); `AdminDashboard`/DDD services use the
  module repositories. Neither talks to the server.
- **`lib/db.ts` facade** vs **`DataSourceFactory` -> `SQLiteDataSource`**. Two
  entry points to the same browser sql.js engine.
- **`AuditService` (localStorage)** vs **`audit_logs` SQL table** (written by
  `addAuditLog`). Two audit stores.
- **Raw `localStorage` JSON** (calendar events, documents, user docs, extended
  settings, session) vs structured sql.js tables. Parallel, unstructured stores.
- **Module DDD repositories are partly dead:** `teacherService`/`studentService`/
  `financialService` are registered in `core/bootstrap/index.ts` and consumed
  only indirectly (via `dashboardService`); the screens that own those domains
  use `lib/db` instead. This is duplicated/obsolete code (Class C candidate) and
  must be reconciled during migration.

---

## 13. Synchronization Analysis

- **Browser <-> Server:** NONE. No polling, no push, no shared ID, no replication.
  The two `getSQLiteDB()` instances are completely independent.
- **Within a browser tab:** `subscribeDB` / `notifyListeners` (`lib/db.ts:41-52`)
  is an in-process pub/sub over a module-level `Set`. It only notifies components
  in the *same* JS context after a `saveRealmDB` call.
- **Across browser tabs / devices:** NONE. Each tab holds its own sql.js instance
  and its own `localStorage` snapshot; `storage` events are not used to reconcile.
- **Result:** any write is isolated to (a) one browser tab's sql.js, and (b) the
  browser-local store — never propagated to the server or other clients.
- **Can a screen show stale data after an API write?** Yes. If (in the future)
  some writes go through the REST API to the server DB while other screens keep
  reading the browser DB, the browser-DB screens will show stale/missing data
  indefinitely. Today the split is by *domain* (Academic=server, rest=browser),
  which already produces exactly this staleness for any cross-domain view.

---

## 14. Security / Data Integrity Risks

1. **No authoritative server copy** for 28 domains -> data loss on cache clear,
   no backup, no cross-user sharing.
2. **Credentials in browser storage:** `users.password_hash` sits in the
   Base64 localStorage sql.js blob, readable by any script with localStorage
   access. Moving to server/PostgreSQL removes client-side credential storage.
3. **Inconsistent audit trail:** SQL `audit_logs` vs `AuditService` localStorage
   array -> compliance/forensics gap.
4. **Concurrent-edit loss:** two tabs/users editing the same entity produce
   silent divergence (last writer per store wins, no conflict detection).
5. **Unstructured local JSON** (calendar/docs/user-docs) bypasses schema,
   constraints, and validation present in sql.js/PostgreSQL.
6. **No server-enforced integrity** for the majority of domains today.

---

## 15. Target Architecture (canonical, pre-PostgreSQL)

```
Browser UI
   down
Hooks (useX)              <- read/write via API client, never sql.js directly
   down
Application / API client (fetch)
   down
REST API (Express)        <- NEW endpoints for all 28 domains + master data
   down
Application services
   down
Repository (per domain)
   down
IDataSource               <- RestApiDataSource in browser build
   down
Server: Repository -> IDataSource -> PostgreSQL
```

The browser-local sql.js database must be **demoted from an authoritative
business store**. Acceptable browser-local uses after R4: session token, UI
preferences, offline read cache (if an offline decision is made — see §20).

---

## 16. Recommended Remediation Sequence

1. **Decide** the open questions in §20 (offline policy, calendar/docs/audit
   ownership, session strategy, data-migration plan). *Blocker.*
2. **Build the missing REST APIs** for all 28 domains + master data + audit +
   documents/calendar, backed by server-side repositories over `IDataSource`.
3. **Introduce `RestApiDataSource`** implementing `IDataSource`;
   `DataSourceFactory` returns it for the browser build (keep `SQLiteDataSource`
   for the server build / tests).
4. **Retire `lib/db.ts` facade and `SQLiteRepository`** once screens use API
   client / `RestApiDataSource`; delete dead DDD repos (`teacherRepository` etc.)
   or rewire them to the API.
5. **Migrate screens** (§9) and hooks (§10) off `getRealmDB`/`saveRealmDB`/
   `querySqlSync` to API-backed flows.
6. **Move raw localStorage business stores** (calendar events, documents, audit)
   to REST + server DB.
7. **PostgreSQL:** implement `PostgreSQLDataSource` on the server; `IDataSource`
   swap is then local to the server (this step is explicitly out of R4 scope).

---

## 17. Exact File Impact List

Files that currently contain browser-local persistence and will require change
during R4 (read-only audit — not modified now):

- src/lib/db.ts (facade; retire/repoint)
- src/lib/sqlite-repository.ts (SQLiteRepository; retire)
- src/lib/reference-data/useReferenceData.ts (querySqlSync)
- src/lib/reference-data/ReferenceDataProvider.tsx (querySqlSync)
- src/lib/reference-data/index.ts (doc/comments)
- src/core/datasource/DataSourceFactory.ts (add RestApiDataSource branch)
- src/core/datasource/SQLiteDataSource.ts (server build only after R4)
- src/modules/master-data/repository/masterDataRepository.ts (RestApiDataSource)
- src/modules/master-data/services/masterDataService.ts
- src/modules/master-data/hooks/useMasterData.ts
- src/modules/master-data/hooks/useMasterLookup.ts
- src/modules/master-data/screens/MasterDataCenter.tsx
- src/modules/dashboard/services/dashboardService.ts
- src/modules/dashboard/repository/dashboardRepository.ts
- src/modules/teachers/repository/teacherRepository.ts (+ service)
- src/modules/students/repository/studentRepository.ts (+ service)
- src/modules/financial/repository/financialRepository.ts (+ service)
- src/core/audit/AuditService.ts
- src/core/security/SessionService.ts (session strategy decision)
- src/core/storage/LocalStorageProvider.ts (UI-only after R4)
- src/screens/*.tsx (28 screens listed in §9)
- src/components/*.tsx (UnifiedPrintLayout, StudentProfileDashboard,
  TeacherProfileDashboard, SwitchUserModal, GlobalSearchBar, NotificationCenter,
  ActiveReportPrintView, ReportPreviewModal, LoginScreen)
- src/App.tsx (getCurrentUser/setCurrentUser repoint)
- NEW: src/core/datasource/RestApiDataSource.ts; server REST routes/handlers for
  each migrated domain.

---

## 18. Acceptance Criteria (for R4 completion)

- No module in the browser bundle imports `getRealmDB`/`saveRealmDB`/
  `addAuditLog`/`SQLiteRepository`/`querySqlSync`/`getSQLiteDB` for business data.
- A single authoritative store exists (server PostgreSQL); browser-local sql.js
  is no longer an authoritative business store.
- Every CRUD/read path for the 28 screens + master data flows through the REST
  API and `IDataSource`.
- No raw `localStorage` business JSON (calendar/docs/audit) remains.
- A divergence test (write via API, read via UI, and vice-versa) passes.
- Audit logs converge to one server store.

---

## 19. Risks

- **Scope:** ~15 missing REST domains; large migration surface across 30+ files.
- **Data loss:** existing browser-local business data must be migrated to the
  server (no current export path beyond seed).
- **Offline:** eliminating the browser DB removes offline capability; needs an
  explicit product decision (§20).
- **Session/credentials:** current `password_hash` in localStorage is insecure;
  must move server-side.
- **Two audit stores:** reconciliation needed.
- **Regression:** the 28 screens are the primary UI; migration must preserve
  behavior (Academic regression suites already exist and must stay green).

---

## 20. Final Verdict

**BLOCKED — SPECIFICATION/ARCHITECTURE DECISION REQUIRED**

The audit is complete and the dual-database problem is fully characterized, but
R4 implementation cannot be cleanly specified until the following decisions are
made:

1. **Offline / browser-local fallback:** Must the SPA retain any offline
   capability after R4? If yes, a sync mechanism between browser and server is
   required (a new architectural component); if no, the browser DB is fully
   retired.
2. **Ownership of Calendar events, Documents, and Audit logs:** are these
   server-authoritative business data (-> build APIs + migrate) or explicitly
   client-only? They currently live in raw `localStorage` JSON.
3. **Session / credential strategy:** move auth to server session/cookie;
   confirm `password_hash` leaves the client.
4. **Data-migration plan:** how to relocate existing browser-local business data
   into the server/PostgreSQL store on first upgraded launch.
5. **Missing REST API surface:** confirm the full set of domains to be
   server-backed (≈15 domains today have no endpoint).

Once these are answered, R4 proceeds per §16. No code was changed during this
audit.
