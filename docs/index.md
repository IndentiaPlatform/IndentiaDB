# IndentiaDB

**Multi-Model Database for Knowledge Graphs & Enterprise AI**

IndentiaDB unifies RDF graphs, JSON documents, full-text search, vector embeddings, and labeled property graphs into a single ACID-compliant engine. Built in Rust. Native SPARQL 1.2, Elasticsearch-compatible API on port 9200, first-class AI/RAG integration — all in one binary.

---

## Why IndentiaDB?

Modern AI and enterprise applications require multiple data paradigms simultaneously: knowledge graphs for reasoning, vector stores for semantic search, document stores for flexible schemas, and full-text search for discovery. The traditional answer is polyglot persistence — running 4–6 separate databases, each with its own operations, scaling, and consistency guarantees.

IndentiaDB eliminates that complexity.

!!! success "One binary. Five data models. Zero compromises."
    ACID transactions span all five models simultaneously. A single SPARQL query can join RDF triples with vector similarity results and full-text BM25 scores — without ETL, without data duplication, without distributed transactions across separate systems.

---

## Feature Highlights

**SPARQL 1.2 & RDF 1.2 — with RDF-star**
Full W3C Working Draft compliance, including RDF-star quoted triples. In RDF 1.1, annotating a single fact with a confidence score and source required 6 extra triples and a blank node (reification). RDF-star does it in one line:

```sparql
# One line instead of six:
<< ex:alice ex:worksAt ex:Acme >> ex:confidence 0.9 ; ex:source ex:HRSystem .
```

Named graphs, SEMIJOIN/ANTIJOIN, TripleTerms, federated SERVICE queries — all natively supported. See the [RDF-star Guide](concepts/rdf-star.md).

**Elasticsearch-Compatible API**
Drop the ES client into your existing stack and point it at port 9200. IndentiaDB responds to the same REST API: `_search`, `_bulk`, `_doc`, KNN search, index mappings. No code changes required.

**Bayesian Hybrid Search**
BM25 full-text + HNSW dense vector search fused with Bayesian probability calibration. Outperforms Reciprocal Rank Fusion (RRF) at NDCG@10: **0.9149 vs 0.8874** on SQuAD benchmarks.

**Triple-Level Security**
The only database with ACL policies embedded directly in RDF-star quoted triples. Combine LDAP/OIDC/JWT authentication with RBAC/ABAC authorization and per-triple access control — including Windows SID support for Active Directory integration.

**Raft High Availability**
OpenRaft consensus, leader election, automatic failover, and log compaction. Three-node clusters with configurable replication factors. The Kubernetes operator manages StatefulSets, rolling upgrades, and cluster membership automatically.

**Real-Time Reactive Queries**
`LIVE SELECT` over WebSocket pushes results to clients the moment data changes. `DEFINE EVENT` triggers fire SurrealQL logic on record mutations — enabling reactive pipelines, alerting, and AI agent loops without polling.

**RDFS/OWL Inference**
Forward-chaining materialization with incremental updates. Entailed triples are stored and indexed like any other triple — queries over inferred knowledge are as fast as queries over asserted data.

---

## Quick Start

=== "Docker"

    ```bash
    docker run -p 7001:7001 -p 9200:9200 ghcr.io/indentiaplatform/indentiadb-trial:latest
    ```

=== "Docker Compose"

    ```bash
    git clone https://github.com/Indentia/indentiagraph.git
    cd indentiagraph
    docker compose up -d
    ```

=== "Binary"

    ```bash
    curl -L https://github.com/Indentia/indentiagraph/releases/latest/download/indentiagraph-$(uname -s)-$(uname -m) \
      -o indentiagraph
    chmod +x indentiagraph
    ./indentiagraph serve --port 7001
    ```

### First SPARQL Query

```bash
# Insert a triple
curl -X POST http://localhost:7001/update \
  -H "Content-Type: application/sparql-update" \
  -d 'INSERT DATA { <http://example.org/alice> <http://xmlns.com/foaf/0.1/name> "Alice" }'

# Query it back
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d 'SELECT ?name WHERE { ?p <http://xmlns.com/foaf/0.1/name> ?name }'
```

### First Elasticsearch-compatible Search

```bash
# Index a document
curl -X POST http://localhost:9200/articles/_doc \
  -H "Content-Type: application/json" \
  -d '{"title": "Knowledge Graphs", "content": "RDF triples and SPARQL queries"}'

# Search it
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match": {"content": "knowledge graph"}}}'
```

---

## Performance at a Glance

| Benchmark | System | Result |
|-----------|--------|--------|
| SPARQL (Olympics, M2 Max) | IndentiaDB | **344ms avg** (5x faster than Oxigraph) |
| SPARQL (Olympics, M2 Max) | QLever (C++) | 52ms avg |
| SPARQL (Olympics, M2 Max) | Oxigraph (Rust) | 1,764ms avg (baseline) |
| Hybrid Search NDCG@10 | IndentiaDB (Bayesian) | **0.9149** |
| Hybrid Search NDCG@10 | RRF baseline | 0.8874 |

---

## Navigation

<div class="grid cards" markdown>

- **[Getting Started](getting-started/index.md)**
  Installation, quickstart, and configuration reference.

- **[Concepts](concepts/index.md)**
  Architecture, data models, and core design decisions.

- **[Query Languages](query-languages/index.md)**
  SPARQL 1.2, SurrealQL, LPG, and hybrid query patterns.

- **[Features](features/index.md)**
  Enterprise search, RAG, inference, bitemporal, geospatial, and more.

- **[Security](security/index.md)**
  Authentication, RBAC/ABAC, triple-level ACL, audit logging.

- **[API Reference](api-reference/index.md)**
  Complete REST, SPARQL, and Elasticsearch-compatible API documentation.

- **[Deployment](deployment/index.md)**
  Docker, Kubernetes, OpenShift, and production tuning.

- **[Examples](examples/index.md)**
  98 runnable examples across all data models.

</div>

---

## Why Not Just Use…?

| If you need… | Common choice | IndentiaDB advantage |
|---|---|---|
| SPARQL triple store | Oxigraph, Blazegraph | 5x faster SPARQL + 4 additional data models + HA clustering |
| Document + graph DB | ArangoDB | Full SPARQL 1.2 + RDF 1.2 + triple-level ACL + ES-compatible API |
| Enterprise search | Elasticsearch | Native SPARQL knowledge graph + vector RAG in the same store |
| AI knowledge base | Chroma + Neo4j + ES | All three replaced by one ACID-compliant engine |
| Semantic reasoning | Apache Jena | Rust performance + HNSW vectors + live queries + Kubernetes operator |

---

## License

Copyright 2024–2026 Indentia B.V.
