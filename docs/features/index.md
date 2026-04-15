# Features

IndentiaDB bundles capabilities that would normally require six separate systems into a single ACID-compliant engine. This section documents every major feature area in depth.

---

## Feature Overview

| Feature | Description | Page |
|---------|-------------|------|
| **Enterprise Search** | BM25 full-text indexing with an Elasticsearch-compatible API on port 9200, hybrid BM25+vector search with Bayesian fusion, SPARQL extension patterns for RAG, and access-controlled search with audit logging | [Enterprise Search](enterprise-search.md) |
| **Vector Search & RAG** | HNSW approximate nearest-neighbour index, SurrealQL and SPARQL vector operators, hybrid text+vector queries, stored-value filtering, Vector K-NN in LPG, and a complete RAG pipeline with Knowledge Graph provenance | [Vector Search](vector-search.md) |
| **Graph Algorithms** | 35 graph algorithms over the LPG projection: community detection (Louvain, Label Propagation), centrality (PageRank, Betweenness, Eigenvector), structural (SCC, bridges, cliques), paths (Dijkstra, A*, Bellman-Ford, k-shortest), flow (Dinic), and more — all via `POST /algo/:name` | [Graph Algorithms](graph-algorithms.md) |
| **Logic Programming (Locy)** | Datalog-with-Cypher-syntax rule engine: recursive rules, transitive closure, stratified negation, IS-reference joins, and FOLD aggregations — evaluated bottom-up to fixpoint over the LPG | [Locy Reference](../query-languages/locy.md) |
| **Live Queries** | `LIVE SELECT` over WebSocket, `DEFINE EVENT` triggers, a REST-based SPARQL alerting engine, Rust live-query API with triple-level filtering, and AI agent patterns (inbox, task queue, pub/sub, event sourcing) | [Live Queries](live-queries.md) |
| **Federated Queries** | SPARQL `SERVICE` clause, `SERVICE SILENT` fault-tolerant federation, R2RML virtual graphs mapping SQL databases to RDF, and a source registry supporting local, HTTP, and relational sources | [Federation](federation.md) |
| **Semantic Inference** | RDFS/OWL forward-chaining materialization with incremental updates, `rdfs:subClassOf` / `rdfs:subPropertyOf` / `owl:sameAs` / `owl:equivalentClass` support, and configurable per-query inference toggle | [Inference](inference.md) |
| **Bitemporal Time-Travel** | Dual-timeline queries (transaction time + valid time), `TEMPORAL AS OF`, `TEMPORAL BETWEEN`, and a configurable purge policy for regulatory retention compliance | [Bitemporal](bitemporal.md) |
| **Geospatial** | 60-bit geospatial encoding, WKT parsing, GeoSPARQL functions (`geof:distance`, `geof:buffer`, `geof:within`), nearest-neighbour queries, and distance joins | [Geospatial](geospatial.md) |
| **Holonic Four-Graph Layer** | Native Cagle/Koestler holon layer (Interior / Boundary / Context / Meta) on named graphs. SHACL shapes act as formal membranes; `/holonic/*` routes are opt-in via config with startup guards against cluster mode. Dedicated authz middleware enforces `Read` for GET and `Write` for POST; anonymous calls rejected when authn is configured. | [Holonic](holonic.md) |

---

## Cross-Cutting Feature Matrix

| Capability | SPARQL | SurrealQL | ES API | LPG / Algo | Locy | Cypher |
|------------|--------|-----------|--------|------------|------|--------|
| Full-text search | `ql:contains-word` | `@@` operator | `match` query | — | — | — |
| Vector similarity | `vec:approxNearCosine` | `<\|>` operator | `knn` field | `VectorKnn` | — | — |
| Hybrid search | `ql:contains-word` + `vec:approxNear` | Combined | `knn` + `match` | — | — | — |
| Graph algorithms | — | — | — | 35 via `/algo/:name` | — | — |
| Logic programming | — | — | — | — | Recursive rules | — |
| Pattern matching | BGP + SPARQL | `->edge->` | — | `Traverse` | `MATCH` | `MATCH` |
| Write/mutate | `SPARQL UPDATE` | CRUD | `_bulk` | — | — | `CREATE`/`MERGE` |
| Aggregation | `GROUP BY` | Inline | `aggs` | — | `FOLD` | `count()`/`sum()` |
| Live queries | Via WebSocket/events | `LIVE SELECT` | — | — | — | — |
| Inference | `inference = true` | — | — | — | Derived rules | — |
| Bitemporal | `TEMPORAL AS OF` | — | — | — | — | — |
| Federation | `SERVICE` clause | `SPARQL()` call | — | — | — | — |
| Geospatial | `geof:distance` | `geo::distance` | `geo_distance` filter | — | — | — |
| ACL filtering | Transparent | Transparent | Transparent | Transparent | Transparent | Transparent |

---

## Where to Go Next

- If you are building a **search application** or replacing Elasticsearch: start with [Enterprise Search](enterprise-search.md).
- If you are building a **RAG pipeline or AI application**: start with [Vector Search](vector-search.md).
- If you need **graph analytics** (community detection, centrality, path analysis): start with [Graph Algorithms](graph-algorithms.md).
- If you need **recursive inference or logic rules** over graph data: start with [Locy](../query-languages/locy.md).
- If you need **real-time dashboards or event-driven automation**: start with [Live Queries](live-queries.md).
- If you are **federating multiple data sources**: start with [Federation](federation.md).
- If you need **regulatory audit trails or historical reporting**: start with [Bitemporal](bitemporal.md).
- For **security configuration** (authentication, authorization, ACL): see the [Security](../security/index.md) section.
