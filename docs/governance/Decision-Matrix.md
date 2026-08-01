# Decision Matrix

**Phase:** 4.0 — Enterprise Platform Governance
**Status:** Official governance — architecture only
**Scope:** Education ERP Platform — governance owners, rule sources, decision types, exception tracking
**Canonical source:** `docs/governance/Architecture-Governance.md`

**Rule:** Architecture only. No implementation introduced by this document.

---

## 1. Purpose

The Decision Matrix is the single reference for who owns each governance area, which document is canonical for each rule set, which approval path a change follows, and which exceptions are currently recorded. It prevents ambiguity when a change spans multiple governance areas.

---

## 2. Governance Ownership

| # | Governance Area | Canonical Document | Owner Role |
|---|---|---|---|
| 1 | Architecture principles, dependency rules, naming, versioning, deprecation, backward compatibility, extension | `Architecture-Governance.md` | Platform Architect |
| 2 | Coding standards, module structure, review, testing, DoD | `Engineering-Governance.md` | Engineering Lead |
| 3 | Data ownership, classification, PII, retention, migration, backup | `Data-Governance.md` | Data Owner / DBA |
| 4 | Published contracts, APIs, events, error codes, ACLs | `Integration-Governance.md` | Integration Architect |
| 5 | Security, identity, authorization, secrets, incident response | `Security-Governance.md` | Security Officer |
| 6 | AI usage, model registry, human-in-the-loop, output validation | `AI-Governance.md` | AI Governance Lead |
| 7 | Versioning, release lifecycle, environments, rollback | `Release-Governance.md` | Release Manager |
| 8 | Architecture decisions | `docs/adr/` | Platform Architect |
| 9 | Change proposals | `docs/rfc/Architecture-Change-Process.md` | Any contributor |

---

## 3. Rule Source Matrix

| Rule Set | Canonical Location | Referenced In |
|---|---|---|
| Architecture Principles (AP-xx) | Architecture-Governance §2 | All governance docs |
| Dependency Rules (DR-xx) | Architecture-Governance §3 | Engineering, Integration |
| Naming Rules | Architecture-Governance §4 | Engineering, Data, Integration |
| Versioning Rules (VR-xx) | Architecture-Governance §5 | Integration, Release |
| Deprecation Rules (DPR-xx) | Architecture-Governance §6 | Integration, Release, AI |
| Backward Compatibility (BC-xx) | Architecture-Governance §7 | Integration, Release |
| Extension Governance | Architecture-Governance §8 | AI, Engineering |
| Data Classification | Data-Governance §3 | Security, AI |
| Migration Governance | Data-Governance §7 | Release |
| Backup Governance | Data-Governance §8 | Security, Release |
| Error Code Standard | Integration-Governance §6 | Engineering |
| Model Registry | AI-Governance §4 | Security, Data |

---

## 4. Decision Approval Paths

| Change Type | Path | Approver |
|---|---|---|
| Documentation-only clarification | Lightweight review | Platform Architect |
| Additive, backward-compatible contract | RFC + version bump | Integration Architect |
| Breaking contract change | RFC + ADR + deprecation plan | Platform Architect + Integration Architect |
| New bounded context / boundary change | RFC + ADR + Bounded Context Map update | Architecture Review |
| New domain module | Standard per Student Domain Standard | Engineering Lead |
| Non-additive schema change | RFC + ADR + migration + rollback plan | Data Owner + Platform Architect |
| New external integration | RFC + ADR + ACL + security review | Security Officer + Integration Architect |
| New AI use case / model | RFC + AI review + model registry | AI Governance Lead |
| New dependency/library | Review + dependency scan | Engineering Lead + Security Officer |
| Irreversible workflow change | RFC + ADR + human-in-the-loop review | Workflow Owner |
| Release promotion | Release checklist | Release Manager |
| Exception to a rule | RFC (exception) + tracking here | Platform Architect |

---

## 5. Exception Log

Exceptions are approved deviations recorded here and reviewed at each architecture review. Exceptions do not override the Constitution's non-negotiable rules.

| Exception ID | Date | Area | Description | Rationale | Owner | Expiry |
|---|---|---|---|---|---|---|
| — | — | — | No exceptions recorded | — | — | — |

---

## 6. Certification Checklist

- [ ] Governance ownership is defined.
- [ ] Rule source matrix is defined.
- [ ] Approval paths are defined.
- [ ] Exception log exists.
- [ ] Consistent with Architecture Governance and all subordinate governance documents.
- [ ] No code, SQL, UI, or implementation introduced.

---

*End of Decision Matrix*

