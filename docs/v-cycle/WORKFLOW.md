# High-Assurance V-Cycle Governance Framework

This repository operates under a **Mission-Critical Multi-Agent Governance Model**, featuring separation of concerns, the **Four-Eyes Principle**, and **Independent Verification and Validation (IV&V)**.

```
                         [Customer (You)]
                            |         \
                            |          +--- [Direct Audit Trigger]
                            |                     |
               [Tech Lead / Customer Liaison]     v
                            |           [Process / QMS Compliance Auditor]
             +--------------+---------------+     | (Findings / NCRs)
             |                              |     v
   [Scrum Master / Reporting]     [V-Cycle Core] [Tech Lead Remediation]
                                            |      | (CAPA / Re-Audit)
                                +-----------+      v
                                |              [Re-Audit Verified]
                        [Left-V: Design]           |
                        - Requirements             v
                        - Architecture      [Executive Report to Customer]
                                \       
                                 +-- [Developer Core] --+
                                            |
                                   [L1 Tech Reviewer]
                                            |
                                   [L2 Principal Auditor]
                                            |
                                 [Customer Sign-off Gate]
```

---

## Git Branching & Dual-Target Deployment Policy

Strict separation between development and delivery, governing both **Web Application** and **Native Android Application** targets:

1. **`main` Branch (Production Delivery Only)**:
   - Houses only certified, customer-facing releases.
   - **Dual Production Releases**:
     - **Web Deployment**: Deploys live automatically to GitHub Pages: `https://sumantmarathe.github.io/PersonalAssistant/`.
     - **Android Release**: Builds and packages the production Android APK (`personal-assistant-release.apk`).
   - **Rule**: Direct development or untested commits on `main` are strictly forbidden. Only merged when Gate 5 (L2 Audit Clearance) certifies BOTH Web and Android targets.
2. **`feat/<task-id>-<name>` Branches (Feature Development)**:
   - Created by the Lead Developer for every sprint task.
   - Implementation, unit tests, Android wrapper logic, and integration tests execute on this side branch.
3. **`fix/<issue-id>-<name>` Branches (Bug & Defect Remediation)**:
   - Dedicated side branches to reproduce, patch, and re-verify defects without risking production stability.
4. **Merge Clearance (Dual-Target Verification)**:
   - Merging from side branch to `main` requires:
     - 100% unit tests passing across web logic and Android bridge components.
     - 100% integration tests passing (storage persistence and cloud sync).
     - Live browser QA validation (`browser_subagent`) with video and screenshot evidence.
     - Android device/emulator QA validation (`android` CLI / `adb` / layout / screen inspection) with screenshot evidence.
     - L1 Review sign-off and L2 Principal Audit certification covering both targets.


---

## The Roles & Hierarchy

### 1. Customer Relationship & Management
- **The Customer (User)**: Defines vision, priorities, and gives final sign-off.
- **Tech Lead**: The single point of contact for the Customer. Speaks business & technical language, formulates tasks, sets Definition of Ready (DoR) / Definition of Done (DoD), and guards entry/exit gates.
- **Scrum Master**: Tracks sprint progress, removes bottlenecks, maintains task documentation, and generates customer-facing progress reports and release notes.

### 2. V-Cycle Engineering Core
- **Requirements Analyst**: Elaborates User Stories into Gherkin scenarios and explicit Acceptance Criteria (ACs).
- **System Architect**: Designs data schemas, state machines, component topologies, and API contracts.
- **Lead Developer**: Implements clean, maintainable, modular code on side branches strictly conforming to architecture specs.
- **Unit Test Engineer**: Tests isolated components, mock dependencies, and boundary cases.
- **Integration Test Engineer**: Verifies inter-module communication, storage persistence, and data flow.
- **QA / E2E System Validator**: Drives real browser sessions to validate user-facing ACs and captures session video evidence.

### 3. Independent Oversight & Verification (IV&V)
- **L1 Technical Reviewer**: Independent code, test, and specification auditor. Cross-references code and test cases against the Requirements Traceability Matrix (RTM).
- **L2 Principal Auditor (Reviewer of Reviewer)**: Audits the L1 review for thoroughness, checks security and architecture compliance, and issues the formal Release Gate Clearance.
- **Process / QMS Compliance Auditor**: An independent quality assurance role triggered directly by the **Customer**. Audits adherence to engineering process, task tracking, branch hygiene, external dependency governance, and failure-mode analysis. Delivers reports to Tech Lead for corrective action, re-audits until resolution, and certifies completion to the Customer.

---

## Customer-Triggered Process Audit Protocol

When the Customer triggers a process audit:
1. **Trigger**: Customer invokes the Process Auditor directly.
2. **Audit & NCR Dispatch**: Process Auditor audits the repository, commits, task trackers, and engineering practices, raising Non-Conformance Reports (NCRs) in `docs/audits/PROCESS-AUDIT-*.md`.
3. **Findings Handoff to Tech Lead**: Auditor presents the detailed report directly to the Tech Lead.
4. **Tech Lead CAPA**: Tech Lead executes Corrective & Preventive Actions (CAPA) to resolve all root causes and gaps.
5. **Re-Audit**: Auditor verifies resolution. If any finding is unresolved, cycle repeats.
6. **Executive Clearance to Customer**: Auditor provides a high-level summary report directly to the Customer.

---

## Governance Gates & Lifecycle (Dual-Target Pipeline)

| Gate | Name | Mandatory Deliverables (Web + Android App) | Approver |
| :--- | :--- | :--- | :--- |
| **Gate 0** | **Requirements & DoR** | User Story, Gherkin Scenarios, ACs covering Web & Android App, DoR verified | Tech Lead & Customer |
| **Gate 1** | **Architecture & Pre-Flight** | Web architecture, Android wrapper design (`android/`), DOM storage spec, External Dependency Pre-Flight | Tech Lead |
| **Gate 2** | **Implementation** | Side feature branch (`feat/*`), Web code + Android project, clean builds | Lead Developer |
| **Gate 3** | **Verification Suite** | Unit tests + Integration tests + Browser E2E recording + Android Emulator/Device E2E screenshots | QA & Test Engineers |
| **Gate 4** | **L1 Technical Audit** | Discrepancy report, Dual-target RTM 100% check (`docs/audits/L1.md`) | L1 Reviewer |
| **Gate 5** | **L2 Meta-Audit** | Dual-release review certification (Web deploy + Android APK artifact) | L2 Auditor |
| **Gate 6** | **Customer Delivery** | Merge to `main`, Live GitHub Pages deploy, APK artifact build & release notes | Tech Lead & Customer |
| **Audit Gate** | **Customer Process Audit** | Dual-target compliance audit, NCR log, CAPA verification (`docs/audits/PROCESS-AUDIT-*.md`) | Process Auditor & Customer |


---

## Gate 1 Pre-Flight External Dependency & Credentials Protocol

To prevent late-stage delivery failures caused by missing third-party credentials or disabled cloud services:
1. **Identification**: During Gate 1 (Architecture), the System Architect must identify every external API, OAuth Client ID, third-party service, and cloud dependency.
2. **Customer Proactive Elicitation**: The Tech Lead **MUST** proactively request real production/sandbox credentials from the Customer during Gate 1. Under no circumstances should engineering proceed into Gate 2 (Implementation) with dummy or mock credentials without explicitly asking the Customer.
3. **Environment Prerequisite Checklist**: The System Architect must specify all cloud console setup requirements (e.g., enabling specific APIs like Google Drive API, configuring Authorized JavaScript Origins, setting Test Users) before Gate 2 entry.

---

## Hotfix & Patch Management Protocol (`fix/*`)

Any bug fix, patch, or post-release correction must follow the branch isolation policy:
1. Create a dedicated branch: `fix/<issue-id>-<description>`.
2. Implement and verify unit and integration tests.
3. Run L1 review verification.
4. Merge to `main` via PR / fast-forward merge and push to deployment (`gh-pages`). Direct unverified commits to `main` are strictly prohibited.
