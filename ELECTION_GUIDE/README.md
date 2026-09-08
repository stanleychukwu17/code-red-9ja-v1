# Free9ja Election Guide

Welcome to the **Free9ja Election Guide**. This directory contains operational documentation, architecture notes, electoral process workflows, and role guides for the Free9ja election platform.

---

## 📑 Contents

1. **[Guide to Elective Positions in Nigeria](./ELECTIVE_POSITIONS.md)** — Breakdown of all elected offices, seat counts, presiding officers vs. public votes, and electoral commissions (INEC vs. SIEC).
2. **[Electoral Structure & Hierarchy](#electoral-structure--hierarchy)**
3. **[Agent Roles & Responsibilities](#agent-roles--responsibilities)**
4. **[Agent Readiness & Practice Tests](#agent-readiness--practice-tests)**
5. **[Polling Unit Reporting & Result Verification](#polling-unit-reporting--result-verification)**
6. **[Relevant Applications & Services](#relevant-applications--services)**

---

## 🏛 Electoral Structure & Hierarchy

The Nigerian electoral structure modeled in the Free9ja platform follows the standard administrative and collation hierarchy:

```
National (Presidency / Senate / House of Reps)
 └── State (Governorship / State Assembly)
      └── Senatorial District
           └── Federal Constituency
                └── State Constituency
                     └── Local Government Area (LGA)
                          └── Registration Area / Ward (RA)
                               └── Polling Unit (PU)
```

- **Polling Unit (PU)**: The primary voting location where voters cast their ballots and initial counts (EC8A form) are recorded.
- **Ward (RA)**: Collation center for all polling units within the ward (EC8B form).
- **LGA**: Local government collation center consolidating ward results (EC8C form).
- **State & National**: State-level and national tally collation centers (EC8D / EC8E forms).

---

## 👥 Agent Roles & Responsibilities

The platform accommodates distinct tiers of election monitoring agents representing political parties, independent observers, and administrators:

| Role | Scope | Key Responsibilities |
|---|---|---|
| **Polling Unit Agent** | Single Polling Unit | Verify voter accreditation, monitor ballot casting, record votes, upload signed EC8A sheets, report incidents. |
| **Ward Election Supervisor** | Electoral Ward / RA | Supervise PU agents within the ward, review submitted PU results, monitor Ward collation (EC8B). |
| **LGA Election Supervisor** | Local Government Area | Oversee all ward supervisors in the LGA, reconcile ward tallies, monitor LGA collation (EC8C). |
| **State Election Supervisor** | Entire State | Coordinate statewide party monitoring operations, verify state collation (EC8D). |
| **Platform Administrator** | Nationwide / System | Supervise platform-wide telemetry, verify submitted incident reports, audit election results. |

---

## 🎯 Agent Readiness & Practice Tests

To ensure agent competence and accuracy on election day, agents undergo structured readiness testing:

- **Readiness Windows**: Practice test quotas scheduled across specific countdown windows leading up to election day.
- **Potential Payout Calculation**: Agent compensation allocations (configured per political party and system settings) tied to readiness test completion scores and election-day reporting performance.
- **Incident Simulation**: Mock tests simulating vote calculation discrepancies, irregular accreditation counts, and EC8A upload verification.

---

## 📊 Polling Unit Reporting & Result Verification

On election day, the reporting lifecycle proceeds through:

1. **Accreditation & Turnout Tracking**: Live reporting of BVAS / accreditation counts.
2. **Result Entry**: Itemized party vote counts recorded immediately following ballot sorting.
3. **Form EC8A Upload**: High-resolution image capture of the officially signed EC8A result sheet.
4. **Cross-Verification**: Algorithmic and supervisor verification comparing manual result entries against uploaded document photos and INEC grabber feeds.
5. **Real-time Live Feed**: Verified results aggregated and streamed to public portals (`apps/election-web`) and internal dashboards (`apps/admin`, `apps/partyadmin`).

---

## 💻 Relevant Applications & Services

- [`apps/election-web`](../apps/election-web): Public election results dashboard, analytics, and live map view.
- [`apps/partyadmin`](../apps/partyadmin): Political party portal for agent assignment, accreditation tracking, and party-specific counts.
- [`apps/admin`](../apps/admin): Central election supervision, incident moderation, and system settings.
- [`apps/mobile`](../apps/mobile): Field agent mobile app for offline-capable result submission and incident logging.
- [`apps/api`](../apps/api): Core backend handling election workflows, result audits, and background queue collation.
