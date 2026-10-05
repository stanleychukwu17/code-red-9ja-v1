# Election Day Operations & Collation Guide

A comprehensive guide to polling unit procedures, Form EC8 result sheets, the collation waterfall, party agent hierarchy, and parallel dataset tracking for elections in Nigeria.

---

## 📑 Contents

1. [Polling Unit Operations & Close of Polls](#-polling-unit-operations--close-of-polls)
2. [Legal Primacy of Form EC8A (Electoral Act)](#-legal-primacy-of-form-ec8a-electoral-act)
3. [Collation Waterfall & Form Progression](#-collation-waterfall--form-progression)
4. [Party Agent Deployment & Hierarchy](#-party-agent-deployment--hierarchy)
5. [Parallel Dataset Workflow](#-parallel-dataset-workflow)
6. [Form Types Matrix by Elective Position](#-form-types-matrix-by-elective-position)
7. [INEC Election Day Rules](#-inec-election-day-rules)
8. [Agent Safety Protocol & Code of Conduct](#-agent-safety-protocol--code-of-conduct)

---

## ⏱️ Polling Unit Operations & Close of Polls

> **Polling Hours**: Polling units normally open at **8:30 AM** and close at **2:30 PM**. Any voter already in line by 2:30 PM must be permitted to vote.

### Ballot Counting at the Polling Unit
1. When voting closes, ballots are counted right there at the polling unit, in the open, in front of whoever has stayed behind.
2. The Presiding Officer writes the votes for every party on a form called the **EC8A**, calls the figures out loud, signs and stamps it.
3. The Presiding Officer has the party agents countersign, distributes official copies to each party agent, and pastes one copy at the unit.

> [!NOTE]
> **Summary**: The Presiding Officer signs the EC8A form with total votes for each party and hands over a copy of the EC8A form to each party agent.

> [!IMPORTANT]
> **Public Display**: The EC8A should be pasted on the wall for all to see, allowing observers and citizens to photograph it.

---

## ⚖️ Legal Primacy of Form EC8A (Electoral Act)

The Electoral Act specifies that in all cases **Form EC8A remains the primary source of collation and declaration of the result**.

- **Paper Fallback**: Where electronic transmission fails for network or technical reasons, collation simply proceeds on the signed paper form.
- **Ambiguity**: Critics have pointed out that the Electoral Act never explicitly defines what legally constitutes a "communication failure."

---

## 📈 Collation Waterfall & Form Progression

The unit figures on the EC8A progress upward through successive administrative tiers:

1. **Polling Unit (`EC8A`)**: Initial counts recorded by the Presiding Officer.
2. **Ward Collation (`EC8B`)**: The Ward Collation Officer aggregates all polling unit results in the ward onto an EC8B.
3. **LGA Collation (`EC8C`)**: Wards are aggregated into Local Government Area totals on EC8C forms.
4. **State Collation (`EC8D`)**: LGAs are aggregated into a State total on an EC8D.
5. **Final Declaration (`EC8E`)**: The Returning Officer declares the final figure on an EC8E.

### Collation Tiers at a Glance
```
Polling Units: EC8A
  └── Wards:     EC8B
        └── LGA:       EC8C
              └── State:     EC8D
                    └── Final:     EC8E (DECLARATION)
```

### Presidential Collation Progression
For presidential elections, the collation sequence extends to the national level:
- **Polling units**: `EC8A`
- **Wards**: `EC8B` *(total of all polling units in the ward)*
- **LGA**: `EC8C` *(total of all wards in the LGA)*
- **State**: `EC8D` *(total of all LGAs in the state)*
- **National**: `EC8D(A)` *(total of all states)*
- **Final Declaration**: `EC8E` (`DECLARATION`)

---

## 👥 Party Agent Deployment & Hierarchy

For each collation level, party agents are entitled to receive a copy of each result sheet. INEC’s official materials explicitly describe distributing signed and stamped result and collation forms to polling and party agents.

A political party must deploy an accredited agent at each tier:
- **1 Agent** for each polling unit (Polling Agent)
- **1 Agent** for each ward collation center (Collation Agent)
- **1 Agent** for each LGA collation center (Collation Agent)
- **1 Agent** for each state collation center (Collation Agent)
- **1 Agent** for the National collation center (National Collation Agent)

### Organizational Structure

```text
                           PARTY
                           │
             ┌─────────────┴─────────────┐
             │                           │
       POLLING AGENTS              COLLATION AGENTS
             │                           │
       ┌─────┼─────┐             ┌───────┼────────┐
       PU1   PU2   PU3           WARD    LGA      STATE
        │     │     │             │       │         │
       EC8A  EC8A  EC8A          EC8B    EC8C      EC8D
        │     │     │             │       │         │
        └─────┴─────┘             └───────┴─────────┘
                │
                ▼
          Party's result
             records
```

- **Polling-Unit Agents**: Primarily the party's eyes at the bottom of the process. They obtain/observe the EC8A and report the result into the party's internal collation structure.
- **Collation Agents**: The party's eyes at the subsequent aggregation stages.

---

## 🔄 Parallel Dataset Workflow

```text
PU agent sees EC8A
→ sends/records result internally
→ Ward agent checks EC8B against the PU results
→ LGA agent checks EC8C against the ward results
→ State agent checks EC8D against the LGAs
→ Party headquarters maintains the parallel dataset
```

> [!TIP]
> **Why Collation Agents Matter**: The identity and deployment of party collation agents is critical—they are the personnel who can actively cross-examine and verify the aggregation at each level against primary records, rather than relying solely on the party's thousands of PU agents.

---

## 📋 Form Types Matrix by Elective Position

Different elective positions utilize distinct form variants across the collation chain:

| Election | Polling Unit (PU) | Ward / RA | LGA | Final / Constituency Declaration |
|---|:---:|:---:|:---:|:---:|
| **Presidential** | `EC8A` | `EC8B` | `EC8C` | `EC8D` $\rightarrow$ `EC8D(A)` $\rightarrow$ `EC8E` |
| **Senatorial** | `EC8A(I)` | `EC8B(I)` | `EC8C(I)` | `EC8D(I)` $\rightarrow$ `EC8E(I)` |
| **House of Representatives** | `EC8A(II)` | `EC8B(II)` | `EC8C(II)` | `EC8D(II)` $\rightarrow$ `EC8E(II)` |
| **Governorship** | `EC8A` | `EC8B` | `EC8C` | `EC8D` $\rightarrow$ `EC8E` |
| **State House of Assembly** | `EC8A(I)` | `EC8B(I)` | `EC8C(I)` | `EC8D(I)` $\rightarrow$ `EC8E(I)` |

---

## 🚫 INEC Election Day Rules

INEC's rules for election day are concise and strictly enforced:
- **Do not snatch or destroy ballot boxes.**
- **Do not campaign at a polling unit.**
- **No violence, no intimidation.**
- **Do not buy or sell votes.**
- **Do not interfere with the electoral process.**

---

## 🛡️ Agent Safety Protocol & Code of Conduct

> [!CAUTION]
> **Field Safety First**:
> - **Do not confront anybody.**
> - **Record, do not argue.**
> - **Your safety comes first, always.**
