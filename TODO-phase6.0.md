# PHASE 6.0 — Academic Application Layer

Build the Academic Application Layer only (CQRS). Reuse existing Domain, Repository interfaces, UnitOfWork, EventBus. Controllers call Application Services only. No UI. No SQL changes. No architecture redesign.

## Steps

- [ ] 1. Create `application/dtos/index.ts` — DTOs (AcademicYear, AcademicTerm, Curriculum, CourseAssignment, AcademicCalendar)
- [ ] 2. Create `application/mappers/index.ts` — Request DTO → Domain, Domain → Response DTO
- [ ] 3. Create `application/commands/index.ts` — CQRS command interfaces
- [ ] 4. Create `application/queries/index.ts` — CQRS query interfaces
- [ ] 5. Create `application/services/AcademicYearService.ts` — year lifecycle command orchestration
- [ ] 6. Create `application/services/CurriculumService.ts`
- [ ] 7. Create `application/services/CourseAssignmentService.ts`
- [ ] 8. Create `application/services/AcademicCalendarService.ts`
- [ ] 9. Create `application/services/index.ts` — exports + singletons
- [ ] 10. Create `application/use-cases/AcademicYearUseCases.ts`
- [ ] 11. Create `application/use-cases/index.ts`
- [ ] 12. Create `application/controllers/academicController.ts` — thin controller (services only)
- [ ] 13. Create `api/academicRoutes.ts` — REST endpoints
- [ ] 14. Create `application/index.ts` — barrel export
- [ ] 15. Edit `src/core/bootstrap/index.ts` — register application services in DI
- [ ] 16. Edit `server.ts` — mount academic REST router
- [ ] 17. Create `scripts/verify-academic-api-smoke.ts` — API smoke tests
- [ ] 18. Create `scripts/run-academic-api-smoke.mjs` — runner
- [ ] 19. Verify: `npx tsc --noEmit`, `npm run build`, API smoke tests
- [ ] 20. Generate `ACADEMIC_APPLICATION_LAYER_REPORT.md`
