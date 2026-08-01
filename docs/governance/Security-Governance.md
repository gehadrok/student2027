# Security Governance

**Phase:** 4.0 — Enterprise Platform Governance
**Status:** Official governance — architecture only
**Scope:** Education ERP Platform — security principles, identity, authorization, data protection, secrets, vulnerability management, incident response
**Canonical source:** `docs/governance/Architecture-Governance.md`
**Reference standards:**
- `docs/architecture/bounded-context-map.md` (Security context, ACLs)
- `docs/architecture/enterprise-business-interaction-architecture.md` (authorization model, audit model)
- `src/core/security/`, `src/core/auth/`, `src/core/permissions/`, `src/core/audit/` (existing infrastructure contracts)
- `docs/governance/Data-Governance.md` (data classification, PII)

**Rule:** Architecture only. No implementation introduced by this document.

---

## 1. Purpose

This document defines the security governance for the Education ERP Platform: principles, identity and authentication, authorization, data protection, secrets management, secure development, vulnerability management, and incident response. It aligns with the Security bounded context and the platform cross-cutting contracts.

---

## 2. Security Principles

| # | Principle |
|---|---|
| SP-01 | Least Privilege: every actor, role, and service gets the minimum permissions required. |
| SP-02 | Defense in Depth: multiple independent controls at every layer. |
| SP-03 | Fail Closed: authorization and validation failures deny by default. |
| SP-04 | Audit Everything: security-sensitive actions are audited and tamper-evident. |
| SP-05 | Encrypt at Rest and in Transit: sensitive data and all external traffic are encrypted. |
| SP-06 | Never Trust Input: all external payloads are validated through ACLs. |
| SP-07 | Human-in-the-Loop: irreversible and sensitive operations require approvals. |
| SP-08 | Compartmentalize: tenants/school scopes are isolated; no cross-scope access. |

---

## 3. Identity and Authentication

- Identity is owned by the Identity context: user accounts, credentials, sessions, identity links.
- Authentication providers are consumed through `IAuthProvider`.
- Sessions are validated and revocable (`SessionService`); tokens expire.
- Passwords are stored only as hashes via `HashService`; plain-text passwords never persisted.
- SSO/OAuth/OpenID providers integrate through ACLs.
- Identity links (student/teacher/parent ↔ user) follow the lifecycle events (`StudentRegistered`, `TeacherRegistered`, `DomainIdentityLinked`).

---

## 4. Authorization

- Roles, permission sets, and access policies are owned by the Security context.
- Authorization decisions are synchronous through `AuthorizeActionCommand` / `PermissionDto`.
- Every command is authorized before execution.
- Workflow task actions require re-authorization at execution time.
- Sensitive operations (graduation, certificate issuance, refunds, identity changes) require elevated permissions and audit.
- Reference-data access uses the permission resources pattern (`master_data_permissions`).
- Cross-scope (tenant/school) access is forbidden unless explicitly allowed by policy.

---

## 5. Data Protection

Reference `docs/governance/Data-Governance.md` for classification. Rules:

- Confidential and Restricted data are encrypted at rest.
- All external and internal cross-node traffic is encrypted in transit.
- PII is minimized and access is audited.
- PII is never exported to external or AI systems without an approved ACL and consent basis.
- Encryption keys are managed and rotated; key material is never embedded in code.
- `EncryptionService` is the single contract for encryption operations.

---

## 6. Secrets Management

- Secrets (API keys, credentials, tokens) are never committed to source control.
- Secrets are injected through configuration at deploy time.
- Key rotation is scheduled and tested.
- Logs never contain secrets, tokens, or PII.
- Development secrets differ from production secrets.

---

## 7. Secure Development

- Input validation at boundaries (ACLs, validators).
- Output encoding for any generated HTML/documents.
- Parameterized data access; no string-built SQL.
- No storage of secrets in client-side code.
- Dependency review before adding any library.
- Security review as part of the code review gate (`docs/governance/Engineering-Governance.md`).
- AI-generated code and outputs follow `docs/governance/AI-Governance.md`.

---

## 8. Vulnerability Management

- Known vulnerabilities in dependencies are tracked and patched within defined SLAs.
- Critical: patch immediately.
- High: patch within 30 days.
- Medium/Low: patch within next release.
- Security scans run as part of the release pipeline.

---

## 9. Incident Response

| Phase | Action |
|---|---|
| Detect | Security events and audit anomalies are monitored |
| Triage | Classify severity and scope |
| Contain | Revoke sessions/tokens, block affected access |
| Eradicate | Remove cause; patch and re-verify |
| Recover | Restore from clean backup (`Data-Governance` §8) |
| Lessons | Record findings; update threat model and controls |

Incident records are audit entries with correlation/trace IDs.

---

## 10. Threat Model

Threat modeling is required for:

- New bounded contexts or integrations.
- External provider integrations (payment, SMS/email/push, biometric, AI).
- New cross-context workflows.
- Changes to authentication or authorization.

Threat model inputs: actors, trust boundaries, data flows, assets, threat list, and mitigation mapping.

---

## 11. Certification Checklist

- [ ] Security principles defined.
- [ ] Identity and authentication governance defined.
- [ ] Authorization governance defined.
- [ ] Data protection defined.
- [ ] Secrets management defined.
- [ ] Secure development rules defined.
- [ ] Vulnerability management defined.
- [ ] Incident response defined.
- [ ] Threat modeling required.
- [ ] Consistent with Phases 3.1/3.2 and existing core/security contracts.
- [ ] No code, SQL, UI, or implementation introduced.

---

*End of Security Governance*

**Next:** AI governance.

