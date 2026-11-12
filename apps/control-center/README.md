# Free9ja Control Center (Situation Room)

The **Free9ja Control Center** is the real-time election situation room, collation command center, and incident management dashboard designed for political party leadership, election directors, and authorized collation coordinators.

---

## 🎯 Purpose & Scope

While **`apps/admin`** handles general system configuration, boundary definitions, and platform CRUD, and **`apps/partyadmin`** manages day-to-day party membership, candidates, and campaign agent recruitment, the **`control-center`** serves as the **high-stakes Election Day command nerve center**:

1. **Collation Waterfall**:
   - Tracking Form EC8 progression live: $\text{EC8A (Polling Unit)} \rightarrow \text{EC8B (Ward)} \rightarrow \text{EC8C (LGA)} \rightarrow \text{EC8D (State)} \rightarrow \text{EC8E (Final Declaration)}$.
2. **Parallel Vote Tabulation & Discrepancy Matrix**:
   - Automated side-by-side verification: Party Polling Unit Agent Form EC8A uploads vs. official INEC Scraper extractions.
   - Detects over-voting (votes cast > accredited voters), arithmetic aggregation errors, and sheet tampering.
3. **INEC Scraper Ingestion & Sync**:
   - Direct control panel for party officials to trigger on-demand scraping and AI OCR document extractions from the official INEC portal for their races.
4. **Agent Telemetry & Field Safety**:
   - Live check-in pings, network connectivity status, battery status, and direct communication with 176k+ PU agents across Nigeria.
5. **Incident & Distress Triage Desk**:
   - Real-time queue for violence, BVAS failures, delayed electoral materials, and agent distress calls.
6. **Big-Screen Wall Display Mode**:
   - High-density, high-contrast dark dashboard mode engineered for projectors and television walls at party headquarters.

---

## 🌐 Port & Environment

* **Port**: `3105` (consistent with `web:3101`, `admin:3102`, `partyadmin:3103`, `election-web:3104`)
* **Framework**: Vite + React 19 + TanStack Router (SSR / Start) + TanStack Query + Tailwind CSS v4 + `@repo/ui`
* **Dev Server**: `pnpm --filter control-center dev`

---

## 👥 Tenancy & Access Control

* **Party Scoped**: `/$partyShortName/*` routes isolate each party's parallel dataset and situation room.
* **Superadmin Dispatch**: Superadmins and authorized electoral observers can switch between political party situation rooms via `/parties`.
