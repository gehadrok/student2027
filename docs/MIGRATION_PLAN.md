# Migration Plan: Master Data Center (مركز البيانات الأساسية)

## Impact Analysis Report

### 1. Existing Tables (No modifications)

| # | Table | Status |
|---|-------|--------|
| 1 | users | ✅ Unchanged |
| 2 | teachers | ✅ Unchanged |
| 3 | parents | ✅ Unchanged |
| 4 | school_classes | ✅ Unchanged |
| 5 | sections | ✅ Unchanged |
| 6 | students | ✅ Unchanged |
| 7 | subjects | ✅ Unchanged |
| 8 | schedule_periods | ✅ Unchanged |
| 9 | attendance_records | ✅ Unchanged |
| 10 | grade_records | ✅ Unchanged |
| 11 | certificates | ✅ Unchanged |
| 12 | fee_payments | ✅ Unchanged |
| 13 | expense_records | ✅ Unchanged |
| 14 | library_books | ✅ Unchanged |
| 15 | book_borrowings | ✅ Unchanged |
| 16 | app_notifications | ✅ Unchanged |
| 17 | audit_logs | ✅ Unchanged |
| 18 | school_settings | ✅ Unchanged |
| 19 | saved_reports | ✅ Unchanged |
| 20 | teacher_subjects | ✅ Unchanged |
| 21 | teacher_classes | ✅ Unchanged |
| 22 | parent_students | ✅ Unchanged |
| 23 | user_linked_students | ✅ Unchanged |

### 2. New Master Data Tables (28 tables)

| # | Table | Code | Category |
|---|-------|------|----------|
| 1 | academic_years | ACC_YR | Academic |
| 2 | academic_terms | ACC_TRM | Academic |
| 3 | education_stages | EDU_STG | Academic |
| 4 | grade_levels | GRD_LVL | Academic |
| 5 | class_rooms | CLS_RM | Academic |
| 6 | exam_types | EXM_TP | Academic |
| 7 | certificate_types | CRT_TP | Academic |
| 8 | attendance_types | ATT_TP | Academic |
| 9 | leave_types | LV_TP | HR |
| 10 | nationalities | NAT | Geographic |
| 11 | governorates | GOV | Geographic |
| 12 | districts | DST | Geographic |
| 13 | identity_types | ID_TP | Identity |
| 14 | fee_categories | FEE_CAT | Financial |
| 15 | payment_methods | PAY_MTH | Financial |
| 16 | discount_types | DSC_TP | Financial |
| 17 | currencies | CUR | Financial |
| 18 | qualifications | QLF | HR |
| 19 | specializations | SPC | HR |
| 20 | job_titles | JOB | HR |
| 21 | departments | DEPT | HR |
| 22 | buildings | BLD | Facilities |
| 23 | school_branches | SCH_BRN | System |
| 24 | academic_statuses | ACC_STS | Academic |
| 25 | employee_types | EMP_TP | HR |
| 26 | libraries | LIB | Facilities |
| 27 | transport_companies | TRN_CMP | Facilities |
| 28 | system_numbering | SYS_NUM | System |

### 3. New Files to Create

```
src/modules/master-data/
├── types/
│   ├── index.ts              # All entity interfaces
│   └── constants.ts          # Category definitions, colors, icons
├── repository/
│   ├── masterDataRepository.ts  # Generic CRUD repository
│   └── seed-data.ts          # Initial seed data
├── services/
│   ├── masterDataService.ts  # Business logic layer
│   └── auditService.ts       # Audit logging
├── hooks/
│   ├── useMasterData.ts      # Main data hook
│   └── useMasterDataCategories.ts  # Category navigation
├── components/
│   ├── MasterDataSidebar.tsx  # Tree navigation
│   ├── MasterDataTable.tsx    # Reusable data table with CRUD
│   ├── MasterDataForm.tsx     # CRUD form modal
│   ├── MasterDataCard.tsx     # Category card
│   ├── MasterDataImportExport.tsx  # Import/Export
│   └── MasterDataBulkActions.tsx   # Bulk operations
├── validators/
│   └── index.ts              # Validation rules
└── screens/
    └── MasterDataScreen.tsx   # Main screen
```

### 4. Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `MasterDataScreen` import + `master-data` tab case |
| `src/screens/AdminDashboard.tsx` | Add shortcut button to Master Data Center |
| `src/lib/db/schema.sql` | Append 28 new CREATE TABLE statements |

### 5. Dependencies

- No new npm packages required
- Uses existing: `lucide-react`, `react`, `typescript`
- No breaking changes to existing code

### 6. Risks & Mitigation

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking existing code | 🟢 None | Additive only - no modifications to existing tables |
| Performance impact | 🟢 None | Tables are small reference data |
| UI conflicts | 🟢 Low | New tab `master-data` in sidebar switch |
| Data duplication | 🟢 None | Master data is independent reference |

### 7. Rollback Strategy

1. Remove `case 'master-data'` from `App.tsx`
2. Remove import of `MasterDataScreen`
3. Revert `schema.sql` (delete appended tables)
4. Delete `src/modules/master-data/` directory

All changes are fully reversible with no data loss.

### 8. UI Architecture

The Master Data Center will render as a split-panel layout:
- **Left Panel**: Tree navigation with collapsible categories
- **Right Panel**: Content area with cards/table view

Each master data entity will have:
- Professional card display showing entity info
- Full CRUD via modal forms
- Search/filter capabilities
- Bulk delete with confirmation
- Import/Export (Excel)
- Print support
- Activity audit logging

