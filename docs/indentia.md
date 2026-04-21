# indentia.ai

**The European Sovereign AI Knowledge Platform**

Indentia.ai is a European-sovereign AI knowledge platform that fundamentally transforms how knowledge-intensive organizations make decisions and perform work.

For more information about the Indentia.ai platform, visit [www.indentia.ai](https://www.indentia.ai) (coming soon).

---

## The Fragmentation of Enterprise Knowledge

In modern organizations, critical business knowledge is scattered across dozens of systems — SharePoint, Slack, CRM, databases, documents, and more. Employees spend hours every day searching, comparing, and verifying information. But search is not the end goal — it is the starting point of value creation.

This challenge is accelerating. The AI market is growing exponentially, and as AI integration in business processes deepens — chatbots, workflow automation, agent-based applications — the demand for a reliable, sovereign knowledge foundation grows with it. Organizations don't just need AI capabilities; they need a platform that connects AI to their actual enterprise knowledge with full traceability and control. Indentia is built as that platform: a complete AI knowledge engine that turns fragmented data into autonomous, verifiable work.

The rise of edge AI reinforces this need. Organizations cannot allow sensitive data to leave their premises — hospitals, banks, defense, government. Nearly half of enterprises already run hybrid cloud/edge architectures. For high-volume, privacy-sensitive tasks like document processing, speech-to-text, and local code assistance, on-premise inference is not just viable but essential. Indentia's [flexible deployment model](#compliance-and-flexible-deployment) — including fully air-gapped on-premise installations — is designed for exactly this reality: the hybrid model where cloud handles complex agentic reasoning while local infrastructure processes sensitive data at the edge.

---

## Architecture

<div style="overflow-x: auto; margin: 1rem 0 0.5rem;">
<style>
.arch-wrapper {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    padding: 48px 56px 56px 56px;
    min-width: 1200px;
    color: #111827;
  }
  .arch-wrapper .arch-h1 { font-size: 58px; font-weight: 800; letter-spacing: -1.5px; text-align: center; line-height: 1; }
  .subtitle { text-align: center; font-size: 22px; color: #9ca3af; margin-top: 10px; margin-bottom: 30px; font-weight: 500; }

  .frame { position: relative; padding: 0 80px; }

  .stack { display: flex; flex-direction: column; gap: 10px; }

  .rail {
    position: absolute; top: 0; bottom: 0; width: 62px;
    display: flex; flex-direction: column; gap: 10px; padding: 0;
  }
  .rail.left { left: 0; }
  .rail.right { right: 0; }

  .chip {
    flex: 1;
    background: linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%);
    border: 1px solid #6EE7B7;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(6,150,105,0.15);
    color: #064E3B;
    display: flex; flex-direction: row; align-items: center; justify-content: center;
    gap: 6px; padding: 14px 0;
    position: relative;
    overflow: hidden;
  }
  .chip::before {
    content: ""; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
    background: #059669; border-radius: 0 3px 3px 0;
  }
  .chip .label {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-weight: 800; font-size: 14px; letter-spacing: 2.5px;
    text-transform: uppercase; white-space: nowrap;
  }
  .chip .sub {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-weight: 600; font-size: 10px; color: #047857;
    letter-spacing: 1.2px; white-space: nowrap;
  }
  .rail-title {
    position: absolute; left: 0; right: 0; text-align: center;
    font-size: 10px; font-weight: 700; letter-spacing: 3px; color: #059669;
    text-transform: uppercase;
  }
  .rail-title.top { top: -18px; }

  .storage-hero {
    display: grid; grid-template-columns: 260px 1fr; gap: 14px;
    background: linear-gradient(135deg, #0F172A 0%, #064E3B 55%, #059669 100%);
    border-radius: 10px; padding: 14px 16px; color: #fff;
    box-shadow: 0 4px 16px rgba(6,78,59,0.30);
  }
  .hero-left { display: flex; flex-direction: column; justify-content: center; }
  .hero-title { font-size: 22px; font-weight: 800; letter-spacing: 0.3px; }
  .hero-sub { font-size: 13px; color: #6EE7B7; font-weight: 700; margin-top: 2px; letter-spacing: 0.5px; }
  .hero-hint { font-size: 11.5px; color: #A7F3D0; margin-top: 8px; line-height: 1.35; }
  .models { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .model {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
    border-radius: 8px; padding: 10px 8px; text-align: center;
    display: flex; flex-direction: column; gap: 3px;
  }
  .m-num {
    align-self: center; width: 20px; height: 20px; border-radius: 50%;
    background: #10B981; color: #0F172A; font-size: 11px; font-weight: 800;
    display: flex; align-items: center; justify-content: center; margin-bottom: 2px;
  }
  .m-name { font-weight: 800; font-size: 13px; color: #fff; }
  .m-desc { font-size: 10px; color: #A7F3D0; line-height: 1.25; font-weight: 500; }

  .badge-600 {
    margin-top: 8px; display: inline-block; align-self: flex-start;
    background: #10B981; color: #0F172A;
    font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px;
    letter-spacing: 0.3px; width: fit-content;
  }

  .runtime-bar {
    margin-top: 14px;
    display: grid; grid-template-columns: 220px 1fr; gap: 0;
    background: linear-gradient(135deg, #0F172A 0%, #064E3B 100%); color: #fff; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 14px rgba(6,78,59,0.30);
  }
  .runtime-label { background: linear-gradient(135deg, #059669, #06B6D4); color: #fff; padding: 12px 16px;
    display: flex; flex-direction: column; justify-content: center; }
  .runtime-label .tag { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #D1FAE5; }
  .runtime-label .big { font-weight: 800; font-size: 17px; letter-spacing: 0.3px; }
  .runtime-body { padding: 10px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .rt-tile {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
    padding: 8px 12px; border-radius: 8px;
    font-size: 12.5px; font-weight: 600; color: #fff;
  }
  .rt-tile b { color: #6EE7B7; font-weight: 800; }
  .rt-arrow { color: #6EE7B7; font-size: 16px; }

  .row {
    display: grid; grid-template-columns: 230px 1fr;
    background: #eef1f9; border-radius: 6px; overflow: hidden; min-height: 92px;
  }
  .row-label { background: #0F172A; color: #fff; padding: 16px 20px; display: flex; flex-direction: column; justify-content: center; }
  .row-label .title { font-weight: 800; font-size: 20px; letter-spacing: 0.5px; }
  .row-label .desc { font-size: 13px; color: #A7F3D0; margin-top: 6px; font-style: italic; line-height: 1.3; }
  .row-body { padding: 12px 20px; display: flex; flex-direction: column; justify-content: center; }

  .tile {
    background: #fff; border-radius: 8px; padding: 10px 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    font-size: 13.5px; font-weight: 600; color: #1f2937;
    text-align: center; min-width: 110px; line-height: 1.2;
  }
  .tile.dashed { border: 2px dashed #6EE7B7; background: #eef1f9; color: #374151; }
  .tile small { display: block; font-weight: 400; color: #6b7280; font-size: 11px; margin-top: 2px; }
  .tile.highlight { background: #ECFDF5; border: 1.5px solid #10B981; }

  .caption { font-size: 12px; color: #6b7280; text-align: center; margin-top: 8px; font-style: italic; }

  .flow { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
  .flow .tile { flex: 1; }

  .curation-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .stage { border-radius: 6px; padding: 10px 14px; font-weight: 800; text-align: center; font-size: 16px; border: 1px solid rgba(0,0,0,0.08); }
  .stage.bronze { background: #c78b5b; color: #fff; }
  .stage.silver { background: #cfd3d8; color: #1f2937; }
  .stage.gold { background: #f0c24a; color: #1f2937; }
  .stage.platinum { background: #e9ecef; color: #1f2937; border: 2px solid #374151; }
  .curation-note { margin-top: 10px; padding: 12px 16px; background: #fff; border-radius: 6px; font-size: 13px; color: #374151; line-height: 1.5; }
  .curation-note b { color: #111827; }

  .arrow { align-self: center; color: #6b7280; font-size: 20px; margin: 0 -2px; }

  .intel-grid { display: grid; grid-template-columns: 160px 1fr; gap: 14px; align-items: center; }
  .intel-right { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

  .footer { margin-top: 18px; text-align: right; font-size: 12px; color: #059669; font-weight:600; }
  .header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .header-bar img { height: 44px; }
  .header-bar .ribbon { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #059669; text-transform: uppercase; }
</style>
<div class="arch-wrapper">
<div class="header-bar"><img src="../assets/indentia-arch-logo.png" alt="Indentia"><div class="ribbon">Reference Architecture · 2026</div></div>
  <h1 class="arch-h1" style="color:#0F172A;">The Indentia Stack</h1>
  <div class="subtitle" style="color:#047857;">Sovereign Second Brain — Reference Architecture</div>

  <div class="frame">
    <div class="rail left">
      <div class="rail-title top">Trust</div>
      <div class="chip"><span class="label">Encryption</span><span class="sub">at rest · in transit</span></div>
      <div class="chip"><span class="label">Key Management</span><span class="sub">HSM · KMS</span></div>
      <div class="chip"><span class="label">Zero-Trust</span><span class="sub">mTLS · identity-aware</span></div>
    </div>
    <div class="rail right">
      <div class="rail-title top">Control</div>
      <div class="chip"><span class="label">Logging</span><span class="sub">immutable · tenant-scoped</span></div>
      <div class="chip"><span class="label">Observability</span><span class="sub">metrics · traces</span></div>
      <div class="chip"><span class="label">Oversight</span><span class="sub">audit · alerting</span></div>
    </div>

    <div class="stack">

      <!-- INTELLIGENCE -->
      <div class="row">
        <div class="row-label">
          <div class="title">INTELLIGENCE</div>
          <div class="desc">Autonomous agents and decisioning</div>
        </div>
        <div class="row-body">
          <div class="intel-grid">
            <div class="tile dashed">Policy<br>Gate</div>
            <div class="intel-right">
              <div class="tile highlight">Autonomous Agents</div>
              <div class="tile">Decision Services</div>
              <div class="tile">Context APIs</div>
            </div>
          </div>
        </div>
      </div>

      <!-- EXPERIENCE -->
      <div class="row">
        <div class="row-label">
          <div class="title">EXPERIENCE</div>
          <div class="desc">Workspaces and channels for humans and agents</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile highlight">AI Workspaces<small>Squad</small></div>
            <div class="tile highlight">Browser Extension</div>
            <div class="tile">Copilot &amp; Chat</div>
            <div class="tile">Desktop &amp; Mobile</div>
            <div class="tile">Notifications</div>
          </div>
        </div>
      </div>

      <!-- DELIVERY -->
      <div class="row">
        <div class="row-label">
          <div class="title">DELIVERY</div>
          <div class="desc">Efficient tenant-scoped access</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile">Serving API</div>
            <div class="tile highlight">Unified Search</div>
            <div class="tile">Context Compression</div>
            <div class="tile">Semantic Tagging</div>
            <div class="tile">SLA Monitoring</div>
          </div>
          <div class="caption">Compressed, tagged, fresh, governed — per tenant</div>
        </div>
      </div>

      <!-- SEMANTIC -->
      <div class="row">
        <div class="row-label">
          <div class="title">SEMANTIC</div>
          <div class="desc">Meaning, metrics and context</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile">Knowledge Graph</div>
            <div class="tile highlight">Ontology</div>
            <div class="tile">Entity Resolution</div>
            <div class="tile">Metrics Catalog</div>
            <div class="tile">Active Metadata</div>
          </div>
          <div class="caption">Shared business definitions as a queryable, federated structure</div>
        </div>
      </div>

      <!-- STORAGE -->
      <div class="row">
        <div class="row-label">
          <div class="title">STORAGE</div>
          <div class="desc">One multi-model database — five data models</div>
        </div>
        <div class="row-body">
          <div class="storage-hero">
            <div class="hero-left">
              <div class="hero-title">IndentiaDB</div>
              <div class="hero-sub">Five Data Models in one engine</div>
              <div class="hero-hint">The database where storage, context, and memory are one transaction, regardless of data structure</div>
            </div>
            <div class="models">
              <div class="model"><span class="m-num">1</span><span class="m-name">Relational</span><span class="m-desc">schemas · JOINs · aggregations</span></div>
              <div class="model"><span class="m-num">2</span><span class="m-name">Document</span><span class="m-desc">nested JSON · flexible</span></div>
              <div class="model"><span class="m-num">3</span><span class="m-name">Graph RDF</span><span class="m-desc">ontology · provenance · inference</span></div>
              <div class="model"><span class="m-num">4</span><span class="m-name">Graph LPG</span><span class="m-desc">traversals · PageRank · paths</span></div>
              <div class="model"><span class="m-num">5</span><span class="m-name">Vector</span><span class="m-desc">similarity · RAG · semantic</span></div>
            </div>
          </div>
          <div class="flow" style="margin-top:10px;">
            <div class="tile">Lakehouse<small>tables &amp; catalog</small></div>
            <div class="tile">Feature Store<small>real-time</small></div>
            <div class="tile">Object Store<small>raw &amp; media</small></div>
            <div class="tile">Full-text Search<small>BM25 · hybrid</small></div>
            <div class="tile">Tenant Isolation<small>per-tenant keyspace</small></div>
          </div>
        </div>
      </div>

      <!-- ORCHESTRATION -->
      <div class="row">
        <div class="row-label">
          <div class="title">ORCHESTRATION<br>&amp; COMPUTE</div>
          <div class="desc">Transformation and workflow execution</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile highlight">Workflow Engine</div>
            <div class="tile highlight">Document Intelligence</div>
            <div class="tile">Transformation</div>
            <div class="tile">Embedding Pipeline</div>
            <div class="tile">Feature Engineering</div>
            <div class="tile">Scheduling</div>
          </div>
        </div>
      </div>

      <!-- CURATION -->
      <div class="row">
        <div class="row-label">
          <div class="title">CURATION</div>
          <div class="desc">Data progression to AI-Ready</div>
        </div>
        <div class="row-body">
          <div class="curation-tiles">
            <div class="stage bronze">Bronze →</div>
            <div class="stage silver">Silver →</div>
            <div class="stage gold">Gold →</div>
            <div class="stage platinum">Platinum</div>
          </div>
          <div class="curation-note">
            Curation must progress beyond <b>Business-Ready (Gold)</b> to <b>AI-Ready (Platinum)</b>:
            entity-linked, embedding-indexed, provenance-tagged, freshness-scored.
          </div>
        </div>
      </div>

      <!-- GOVERNANCE -->
      <div class="row">
        <div class="row-label">
          <div class="title">GOVERNANCE</div>
          <div class="desc">Policy, attribute-based access &amp; compliance</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile">Lineage &amp; Audit</div>
            <div class="tile highlight">ABAC / RBAC</div>
            <div class="tile">Data Contracts</div>
            <div class="tile">Runtime Enforcement</div>
            <div class="tile">Audit Trail</div>
          </div>
          <div class="caption">Per-decision governance, tenant-aware, continuous — not quarterly reviews</div>
        </div>
      </div>

      <!-- INGESTION -->
      <div class="row">
        <div class="row-label">
          <div class="title">INGESTION</div>
          <div class="desc">Real-time, multi-tenant capture</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile">Streaming CDC</div>
            <div class="tile">Batch</div>
            <div class="tile">Event Triggers</div>
            <div class="tile">Schema Registry</div>
            <div class="tile">Connector Fabric</div>
            <div class="tile">Quarantine</div>
          </div>
        </div>
      </div>

      <!-- SOURCES -->
      <div class="row">
        <div class="row-label">
          <div class="title">SOURCES</div>
          <div class="desc">Raw signals from diverse systems</div>
          <div class="badge-600">610+ connectors</div>
        </div>
        <div class="row-body">
          <div class="flow">
            <div class="tile">Operational DBs</div>
            <div class="tile">SaaS APIs</div>
            <div class="tile">Event Streams</div>
            <div class="tile">Documents</div>
            <div class="tile">Chats &amp; Mail</div>
            <div class="tile">Sensor Data<small>IoT · telemetry</small></div>
            <div class="tile">Video &amp; Imagery<small>CCTV · drones · media</small></div>
            <div class="tile">Logs &amp; Traces</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="runtime-bar">
    <div class="runtime-label">
      <div class="tag">RUNTIME &amp; MODELS</div>
      <div class="big">Local-first · Cloud-ready</div>
    </div>
    <div class="runtime-body">
      <div class="rt-tile"><b>Local AI</b> · NVIDIA GPU</div>
      <div class="rt-arrow">↔</div>
      <div class="rt-tile"><b>OpenShift / OKD</b> · sovereign on-prem</div>
      <div class="rt-arrow">↔</div>
      <div class="rt-tile"><b>LiteLLM</b> gateway</div>
      <div class="rt-arrow">→</div>
      <div class="rt-tile">any frontier LLM provider</div>
    </div>
  </div>

  <div class="footer">© Indentia.ai — Sovereign, multi-tenant, agent-ready</div>
</div>
</div>

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

