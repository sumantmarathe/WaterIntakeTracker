# 02 - V-Cycle Governance Lifecycle & Gates

This framework enforces the **High-Assurance V-Cycle Model** with strict gate controls:

```
                         [Customer (User)]
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

## 🚪 The 6 Governance Gates

| Gate | Name | Mandatory Deliverables (Dual-Target: Web + Android) | Approver |
| :--- | :--- | :--- | :--- |
| **Gate 0** | **Requirements & DoR** | User Story, Gherkin Scenarios, ACs covering Web & Android App, DoR verified | Tech Lead & Customer |
| **Gate 1** | **Architecture & Pre-Flight** | Web architecture, Android wrapper design (`android/`), DOM storage spec, External Dependency Pre-Flight | Tech Lead |
| **Gate 2** | **Implementation** | Side feature branch (`feat/*`), Web code + Android project, clean builds | Lead Developer |
| **Gate 3** | **Verification Suite** | Unit tests + Integration tests + Browser E2E recording + Android Emulator/Device E2E screenshots | QA & Test Engineers |
| **Gate 4** | **L1 Technical Review** | RTM update with 100% test traceability, code review, `L1-REVIEW.md` | L1 Tech Reviewer |
| **Gate 5** | **L2 Principal Audit & Release** | Security audit, APK verification, `L2-AUDIT.md` clearance, **Customer Sign-off Gate** | L2 Principal Auditor & Customer |
