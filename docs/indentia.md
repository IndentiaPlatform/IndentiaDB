# Indentia.ai

**The European Sovereign AI Knowledge Platform**

Indentia.ai is a European-sovereign AI knowledge platform that fundamentally transforms how knowledge-intensive organizations make decisions and perform work.

For more information about the Indentia.ai platform, visit [www.indentia.ai](https://www.indentia.ai) (coming soon).

---

## The Fragmentation of Enterprise Knowledge

In modern organizations, critical business knowledge is scattered across dozens of systems — SharePoint, Slack, CRM, databases, documents, and more. Employees spend hours every day searching, comparing, and verifying information. But search is not the end goal — it is the starting point of value creation.

---

## Consolidation and Accessibility

Indentia consolidates all enterprise data through over 500 connectors into a single, unified knowledge base. This knowledge is made accessible via enterprise search, a real-time knowledge graph, and autonomous AI agents.

Employees can ask questions in natural language and receive verifiable, cited answers — not probability-based summaries, but answers that are traceable to the primary source, including the page number and the moment the information was valid.

!!! tip "Verifiable by Design"
    Every answer includes provenance metadata: the source document, extraction confidence, and [bitemporal](features/bitemporal.md) validity timestamps. The system always prefers "I don't know" over hallucination — essential for agents that act autonomously.

---

## From Information to Work

The real shift goes beyond information retrieval. We are moving from a world where people request information to a world where AI agents actually perform work. Businesses and people don't pay for information — they pay for work done. The demand for compute is growing exponentially because AI is no longer just answering questions but completing tasks end-to-end. Indentia is built for this new reality.

---

## AI Agents as Colleagues

The platform doesn't just support employees — it supports dozens of autonomous agents per user. These agents proactively analyze contracts, detect anomalies, generate reports, and identify opportunities. Every knowledge worker effectively gains a team of AI colleagues adding value 24/7.

This results in directly measurable impact:

| Impact Area | How |
|-------------|-----|
| **Revenue growth** | Faster opportunity identification through continuous monitoring |
| **Cost reduction** | Automation of knowledge work that previously required manual effort |
| **Better decisions** | Continuous monitoring replaces ad-hoc analysis |

---

## The Enterprise AI Computer

Where [OpenClaw](https://github.com/nicbarker/OpenClaw) — the fastest-growing open source project ever — provides the blueprint for the personal AI computer, Indentia builds the **enterprise AI computer**: the same paradigm shift, but with capabilities like RBAC, audit trails, compliance, and data sovereignty. Indentia's Claw implementation includes two additional security layers beyond NVIDIA's enterprise-focused NemoClaw, ensuring that autonomous agents operate within strictly enforced trust boundaries. AI agents integrate existing enterprise software and business processes with each other, using Indentia's knowledge platform as the retrieval layer.

---

## Reliability and Traceability

Reliability is not a feature — it is a fundamental system property. Every fact in the platform carries metadata about its origin source, extraction confidence, source credibility, and [bitemporal](features/bitemporal.md) validity: when was the fact true, and when was it discovered?

[Data lineage](features/lineage.md) runs end-to-end through the platform, from ingestion to presentation. Quality gates block unreliable data, and contradictory sources are escalated to data stewards. Automatic [survival rules](features/entity-resolution.md) determine which source prevails, with a review queue for human judgment where needed.

!!! warning "Garbage In, Disaster Out"
    For autonomous agents, unreliable knowledge is not merely inconvenient — it is dangerous. The system is designed to prevent cascading errors by validating data at every stage of the pipeline.

---

## The Knowledge Graph and Indentia Loom

The knowledge graph is managed by **Indentia Loom**, an active ontology engine that doesn't just describe schemas but enforces them through formal reasoning, [SHACL validation](features/shacl.md), and automatic synchronization to all downstream systems.

Under Loom runs [IndentiaDB](index.md) — a purpose-built database engine: **one engine, five models**. It serves all types of data — relational, document, RDF, LPG, vector, and full-text search — with [RBAC, ABAC](security/authorization.md) and ACID guarantees from a single database. AI agents don't need to know where knowledge lives or in what format; IndentiaDB abstracts that away. Agents never operate on stale knowledge.

```
                    ┌─────────────────────────────┐
                    │        Indentia Loom         │
                    │  (Active Ontology Engine)    │
                    │  Reasoning · SHACL · Sync    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │         IndentiaDB           │
                    │   One Engine, Five Models    │
                    ├──────┬──────┬──────┬────────┤
                    │ RDF  │ Doc  │Vector│ Search │
                    │ LPG  │ Rel  │ HNSW │  BM25  │
                    └──────┴──────┴──────┴────────┘
                                   │
              ┌────────────┬───────┴───────┬────────────┐
              ▼            ▼               ▼            ▼
        AI Agents    Enterprise       Knowledge    Real-Time
                      Search           Graph       Alerting
```

---

## Beyond Facts: Analytical Reasoning with Game Theory

For organizations such as government, defense, strategic sectors, and complex supply chains, knowing "what is there?" is not enough. They also want to know: **"what happens if we do X?"**

Indentia integrates game theory as an analytical framework. Actors, objectives, strategies, escalation patterns, and behavioral biases are captured as structured entities in the graph. This enables the platform to reason about risks, incentives, and dynamics — allowing agents to proactively warn before situations escalate.

---

## Compliance and Flexible Deployment

The platform is designed from the ground up for GDPR and EU AI Act compliance, with data sovereignty as a core principle and real-time fairness monitoring for high-risk AI applications.

| Deployment Model | Description |
|-----------------|-------------|
| **On-premise** | Fully air-gapped, no external connectivity required |
| **Multi-tenant cloud** | Shared infrastructure with strict tenant isolation |
| **Single-tenant cloud** | Dedicated infrastructure per customer |
| **Hybrid** | Sensitive data on-premise, less critical workloads in the cloud |

All deployment models run on any Kubernetes platform, including OpenShift. See the [deployment guide](deployment/index.md) for details.

---

## The European Alternative

Indentia is the European answer to platforms like Glean and Palantir. Built in the Netherlands and hosted in Europe, it is explicitly designed for organizations that refuse to entrust their knowledge advantage to American platforms.

| | Glean | Palantir | Indentia |
|--|-------|----------|----------|
| **Primary focus** | Search | Modeling & analytics | Search + Modeling + Autonomous agents |
| **AI agents** | Limited | Workflow-based | Fully autonomous, 24/7 |
| **Knowledge graph** | No | Foundry ontology | Active ontology with formal reasoning |
| **Data sovereignty** | US-hosted | US-based, EU options | EU-native, air-gap capable |
| **Compliance** | SOC 2 | FedRAMP, IL5 | GDPR, EU AI Act, Archiefwet |
| **Database engine** | External (Elasticsearch) | External (various) | [IndentiaDB](index.md) — purpose-built |

!!! success "European Sovereignty"
    Indentia is built, operated, and hosted entirely within the European Union. No data leaves EU jurisdiction. No dependency on US cloud providers or US-controlled AI infrastructure.

    This applies to all customers: European customers benefit from full EU data residency by design. International customers are also hosted from EU infrastructure — ensuring the same sovereignty guarantees regardless of where they are based.

---

## Built on IndentiaDB

The Indentia.ai platform is built on top of [IndentiaDB](index.md) — the multi-model database engine documented on this site. IndentiaDB provides the unified data layer that powers the knowledge graph, enterprise search, vector retrieval, and real-time event processing that Indentia.ai relies on.

